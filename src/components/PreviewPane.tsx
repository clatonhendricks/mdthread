import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { rehypeSourcePos } from '../services/sourceMap';
import type { Comment } from '../types';
import 'highlight.js/styles/github-dark.css';

interface Props {
  source: string;
  comments: Comment[];
  activeCommentId: string | null;
  commentRanges: Map<string, { start: number; end: number }>;
  onSelectionChange: (sel: Selection | null) => void;
  onCommentClick: (id: string) => void;
}

export function PreviewPane({
  source,
  comments,
  activeCommentId,
  commentRanges,
  onSelectionChange,
  onCommentClick,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        onSelectionChange(null);
        return;
      }
      const node = sel.anchorNode;
      if (node && ref.current && ref.current.contains(node)) {
        onSelectionChange(sel);
      } else {
        onSelectionChange(null);
      }
    };
    document.addEventListener('selectionchange', handler);
    return () => document.removeEventListener('selectionchange', handler);
  }, [onSelectionChange]);

  // After render, paint comment highlights as overlay spans.
  useEffect(() => {
    if (!ref.current) return;
    paintHighlights(ref.current, comments, commentRanges, activeCommentId, source, onCommentClick);
  }, [source, comments, commentRanges, activeCommentId, onCommentClick]);

  return (
    <div className="pane preview-pane" ref={ref}>
      <div className="markdown-body">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeSourcePos, rehypeHighlight]}
        >
          {source}
        </ReactMarkdown>
      </div>
    </div>
  );
}

/**
 * Wraps the visible text corresponding to each comment's anchor range in a
 * <span class="comment-mark"> so we can style and click it. Operates by
 * walking text nodes inside the nearest source-mapped ancestor.
 */
function paintHighlights(
  root: HTMLElement,
  comments: Comment[],
  ranges: Map<string, { start: number; end: number }>,
  activeId: string | null,
  source: string,
  onClick: (id: string) => void
) {
  // First unwrap any existing marks so re-render is idempotent.
  root.querySelectorAll('span.comment-mark').forEach((el) => {
    const parent = el.parentNode;
    if (!parent) return;
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    parent.removeChild(el);
    parent.normalize();
  });

  for (const comment of comments) {
    if (comment.resolved) continue;
    const r = ranges.get(comment.id);
    if (!r) continue;
    const sourceText = source.slice(r.start, r.end);
    const visible = stripMdFormatting(sourceText).trim();
    if (!visible) continue;
    highlightFirstTextOccurrence(root, visible, comment.id, activeId === comment.id, onClick);
  }
}

function stripMdFormatting(s: string): string {
  return s
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#+\s+/gm, '')
    .replace(/^>\s?/gm, '');
}

function highlightFirstTextOccurrence(
  root: HTMLElement,
  needle: string,
  commentId: string,
  active: boolean,
  onClick: (id: string) => void
) {
  if (!needle) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode() as Text | null;
  // We may need to span text across sibling text nodes; for simplicity we only
  // highlight when the needle fits inside a single text node. This covers the
  // vast majority of inline selections in v1.
  while (node) {
    const text = node.nodeValue ?? '';
    const idx = text.indexOf(needle);
    if (idx !== -1) {
      const before = text.slice(0, idx);
      const middle = text.slice(idx, idx + needle.length);
      const after = text.slice(idx + needle.length);
      const span = document.createElement('span');
      span.className = 'comment-mark' + (active ? ' active' : '');
      span.dataset.commentId = commentId;
      span.textContent = middle;
      span.addEventListener('click', (e) => {
        e.stopPropagation();
        onClick(commentId);
      });
      const parent = node.parentNode!;
      parent.insertBefore(document.createTextNode(before), node);
      parent.insertBefore(span, node);
      parent.insertBefore(document.createTextNode(after), node);
      parent.removeChild(node);
      return;
    }
    node = walker.nextNode() as Text | null;
  }
}
