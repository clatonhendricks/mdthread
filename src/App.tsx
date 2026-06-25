import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { Toolbar } from './components/Toolbar';
import { EditorPane } from './components/EditorPane';
import { PreviewPane } from './components/PreviewPane';
import { SelectionToolbar } from './components/SelectionToolbar';
import { CommentComposer } from './components/CommentComposer';
import { CommentSidebar } from './components/CommentSidebar';
import {
  pickMarkdownFile,
  readMarkdown,
  writeMarkdown,
  loadSidecar,
  saveSidecar,
} from './services/fileIO';
import { watchMarkdownFile } from './services/fileWatch';
import { promptDisplayNameIfMissing } from './services/identity';
import { getRecentFiles, pushRecentFile } from './services/recentFiles';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { resolveSelectionToSource } from './services/selectionMap';
import { createAnchor, locateAnchor } from './services/anchoring';
import { emptySidecar, type Comment, type SidecarDoc, type ViewMode } from './types';
import './app.css';

export default function App() {
  const [filePath, setFilePath] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');
  const [savedContent, setSavedContent] = useState<string>('');
  const [sidecar, setSidecar] = useState<SidecarDoc>(emptySidecar());
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [status, setStatus] = useState<string>('Open a markdown file to begin.');
  const [selection, setSelection] = useState<Selection | null>(null);
  const [pendingSelection, setPendingSelection] = useState<{ start: number; end: number; quote: string } | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState(false);
  const [reanchorTargetId, setReanchorTargetId] = useState<string | null>(null);
  const [recentFiles, setRecentFiles] = useState<string[]>(() => getRecentFiles());

  const me = useRef<string>('');
  if (!me.current) me.current = promptDisplayNameIfMissing();

  const dirty = content !== savedContent;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const savingRef = useRef(false);

  // Watch the open file for external changes (e.g., user edits in another app).
  useEffect(() => {
    if (!filePath) return;
    let cancelled = false;
    let unwatch: (() => void) | null = null;
    watchMarkdownFile(filePath, async () => {
      if (cancelled) return;
      if (savingRef.current) return; // ignore our own writes
      try {
        const fresh = await readMarkdown(filePath);
        if (cancelled) return;
        if (fresh === content) return;
        if (dirtyRef.current) {
          const ok = window.confirm(
            'This file changed on disk and you have unsaved changes.\n\n' +
              'OK = discard your changes and reload\nCancel = keep your in-memory version'
          );
          if (!ok) return;
        }
        setContent(fresh);
        setSavedContent(fresh);
        setStatus('Reloaded from disk.');
      } catch (err) {
        console.error('watch reload failed', err);
      }
    }).then((u) => {
      if (cancelled) {
        u();
      } else {
        unwatch = u;
      }
    }).catch((err) => console.error('watch failed', err));
    return () => {
      cancelled = true;
      if (unwatch) unwatch();
    };
  }, [filePath, content]);

  // Compute current anchor ranges (and mark orphans) any time content or sidecar changes.
  const { ranges, comments: locatedComments } = useMemo(() => {
    const r = new Map<string, { start: number; end: number }>();
    const out: Comment[] = sidecar.comments.map((c) => {
      const hit = locateAnchor(content, c.anchor);
      if (hit) {
        r.set(c.id, { start: hit.start, end: hit.end });
        return { ...c, orphaned: false };
      }
      return { ...c, orphaned: true };
    });
    return { ranges: r, comments: out };
  }, [content, sidecar]);

  // Persist orphaned flag changes back into the sidecar so the sidebar reflects reality.
  useEffect(() => {
    const changed = locatedComments.some((c, i) => c.orphaned !== sidecar.comments[i]?.orphaned);
    if (changed) {
      setSidecar((prev) => ({ ...prev, comments: locatedComments }));
    }
  }, [locatedComments, sidecar.comments]);

  const openPath = useCallback(async (path: string) => {
    try {
      const [md, side] = await Promise.all([readMarkdown(path), loadSidecar(path)]);
      setFilePath(path);
      setContent(md);
      setSavedContent(md);
      setSidecar(side);
      setRecentFiles(pushRecentFile(path));
      setStatus(`Loaded ${side.comments.length} comment(s).`);
    } catch (err) {
      console.error(err);
      setStatus(`Open failed: ${err}`);
    }
  }, []);

  const handleOpen = useCallback(async () => {
    const path = await pickMarkdownFile();
    if (!path) return;
    await openPath(path);
  }, [openPath]);

  const handleSave = useCallback(async () => {
    if (!filePath) return;
    savingRef.current = true;
    try {
      await writeMarkdown(filePath, content);
      // Sidecar comments may have updated orphaned flags from re-anchoring; persist those too.
      const updated: SidecarDoc = { ...sidecar, comments: locatedComments };
      await saveSidecar(filePath, updated);
      setSidecar(updated);
      setSavedContent(content);
      const orphanCount = locatedComments.filter((c) => c.orphaned).length;
      setStatus(`Saved.${orphanCount ? ` ${orphanCount} orphan(s).` : ''}`);
    } catch (err) {
      console.error(err);
      setStatus(`Save failed: ${err}`);
    } finally {
      // Give the watcher a moment to swallow our own write events.
      setTimeout(() => { savingRef.current = false; }, 500);
    }
  }, [filePath, content, sidecar, locatedComments]);

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        handleOpen();
      } else if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        // Trigger add-comment from current selection.
        const sel = window.getSelection();
        if (sel && !sel.isCollapsed) {
          setSelection(sel);
          // Defer to next tick so React picks up the selection state.
          setTimeout(() => {
            document.querySelector<HTMLButtonElement>('.selection-toolbar button')?.click();
          }, 0);
        }
      } else if (e.key === 'Escape') {
        if (pendingSelection) setPendingSelection(null);
        if (reanchorTargetId) {
          setReanchorTargetId(null);
          setStatus('Re-anchor cancelled.');
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleOpen, handleSave, pendingSelection, reanchorTargetId]);

  // Drag-and-drop a markdown file onto the window.
  useEffect(() => {
    let unlisten: (() => void) | null = null;
    getCurrentWebview()
      .onDragDropEvent((event) => {
        if (event.payload.type === 'drop') {
          const paths = event.payload.paths;
          const md = paths.find((p) =>
            /\.(md|markdown|mdx|txt)$/i.test(p)
          );
          if (md) openPath(md);
          else if (paths.length) setStatus('Only .md / .markdown / .mdx / .txt files supported.');
        }
      })
      .then((u) => { unlisten = u; })
      .catch((err) => console.error('drag-drop listener failed', err));
    return () => { if (unlisten) unlisten(); };
  }, [openPath]);

  const handleAddComment = useCallback(() => {
    if (!selection) return;
    const range = resolveSelectionToSource(selection, content);
    if (!range) {
      setStatus('Could not anchor selection to source. Try selecting different text.');
      return;
    }
    if (reanchorTargetId) {
      // Re-anchor flow
      const newAnchor = createAnchor(content, range.start, range.end);
      setSidecar((prev) => ({
        ...prev,
        comments: prev.comments.map((c) =>
          c.id === reanchorTargetId ? { ...c, anchor: newAnchor, orphaned: false } : c
        ),
      }));
      setReanchorTargetId(null);
      setStatus('Comment re-anchored.');
      window.getSelection()?.removeAllRanges();
      return;
    }
    setPendingSelection({ start: range.start, end: range.end, quote: range.rawText });
  }, [selection, content, reanchorTargetId]);

  const submitNewComment = useCallback((body: string) => {
    if (!pendingSelection) return;
    const newComment: Comment = {
      id: uuid(),
      anchor: createAnchor(content, pendingSelection.start, pendingSelection.end),
      author: me.current,
      body,
      createdAt: new Date().toISOString(),
      resolved: false,
      thread: [],
    };
    setSidecar((prev) => ({ ...prev, comments: [...prev.comments, newComment] }));
    setPendingSelection(null);
    setActiveId(newComment.id);
    window.getSelection()?.removeAllRanges();
    setStatus('Comment added (not saved to disk yet).');
  }, [pendingSelection, content]);

  const updateComment = useCallback((id: string, fn: (c: Comment) => Comment) => {
    setSidecar((prev) => ({
      ...prev,
      comments: prev.comments.map((c) => (c.id === id ? fn(c) : c)),
    }));
  }, []);

  const handleResolve = useCallback((id: string, resolved: boolean) => {
    updateComment(id, (c) => ({ ...c, resolved }));
  }, [updateComment]);

  const handleReply = useCallback((id: string, body: string) => {
    updateComment(id, (c) => ({
      ...c,
      thread: [...c.thread, { id: uuid(), author: me.current, body, createdAt: new Date().toISOString() }],
    }));
  }, [updateComment]);

  const handleDelete = useCallback((id: string) => {
    if (!confirm('Delete this comment and its replies?')) return;
    setSidecar((prev) => ({ ...prev, comments: prev.comments.filter((c) => c.id !== id) }));
  }, []);

  const handleReanchorRequest = useCallback((id: string) => {
    setReanchorTargetId(id);
    setStatus('Select the new text in the preview, then click "💬 Add comment" to re-anchor.');
  }, []);

  return (
    <div className="app">
      <Toolbar
        filePath={filePath}
        dirty={dirty}
        viewMode={viewMode}
        recentFiles={recentFiles}
        onOpen={handleOpen}
        onOpenRecent={openPath}
        onSave={handleSave}
        onViewModeChange={setViewMode}
      />
      <main className={`workspace mode-${viewMode}`}>
        {(viewMode === 'edit' || viewMode === 'split') && (
          <EditorPane value={content} onChange={setContent} />
        )}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <PreviewPane
            source={content}
            comments={locatedComments}
            activeCommentId={activeId}
            commentRanges={ranges}
            onSelectionChange={setSelection}
            onCommentClick={setActiveId}
          />
        )}
        <CommentSidebar
          comments={locatedComments}
          activeId={activeId}
          commentRanges={ranges}
          showResolved={showResolved}
          onToggleResolved={() => setShowResolved((v) => !v)}
          onSelect={setActiveId}
          onResolve={handleResolve}
          onReply={handleReply}
          onDelete={handleDelete}
          onReanchorRequest={handleReanchorRequest}
        />
      </main>
      <SelectionToolbar selection={selection} onAddComment={handleAddComment} />
      {pendingSelection && (
        <div className="composer-overlay">
          <CommentComposer
            quote={pendingSelection.quote}
            onSubmit={submitNewComment}
            onCancel={() => { setPendingSelection(null); window.getSelection()?.removeAllRanges(); }}
          />
        </div>
      )}
      <footer className="statusbar">
        <span>{status}</span>
        <span>
          {me.current ? `${me.current} · ` : ''}{filePath ? `${content.length} chars` : ''}
        </span>
      </footer>
    </div>
  );
}
