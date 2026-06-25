import { useState } from 'react';
import type { ViewMode } from '../types';

interface Props {
  filePath: string | null;
  dirty: boolean;
  viewMode: ViewMode;
  recentFiles: string[];
  onOpen: () => void;
  onOpenRecent: (path: string) => void;
  onSave: () => void;
  onViewModeChange: (m: ViewMode) => void;
}

export function Toolbar({
  filePath, dirty, viewMode, recentFiles,
  onOpen, onOpenRecent, onSave, onViewModeChange,
}: Props) {
  const [recentOpen, setRecentOpen] = useState(false);
  const title = filePath ? filePath.match(/[^\\/]+$/)?.[0] ?? filePath : 'No file open';

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <button onClick={onOpen}>Open…</button>
        <div className="recent-wrap">
          <button
            disabled={recentFiles.length === 0}
            onClick={() => setRecentOpen((v) => !v)}
            title="Recent files"
          >
            ▾
          </button>
          {recentOpen && recentFiles.length > 0 && (
            <div className="recent-menu" onMouseLeave={() => setRecentOpen(false)}>
              {recentFiles.map((p) => (
                <button
                  key={p}
                  className="recent-item"
                  title={p}
                  onClick={() => { setRecentOpen(false); onOpenRecent(p); }}
                >
                  <span className="recent-name">{p.match(/[^\\/]+$/)?.[0] ?? p}</span>
                  <span className="recent-path">{p}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button onClick={onSave} disabled={!filePath || !dirty}>
          Save {dirty ? '•' : ''}
        </button>
      </div>
      <div className="toolbar-title" title={filePath ?? ''}>
        {title}{dirty ? ' •' : ''}
      </div>
      <div className="toolbar-right">
        <div className="view-toggle" role="tablist">
          {(['edit', 'split', 'preview'] as const).map((m) => (
            <button
              key={m}
              className={viewMode === m ? 'active' : ''}
              onClick={() => onViewModeChange(m)}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
