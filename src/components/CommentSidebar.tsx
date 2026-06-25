import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Comment } from '../types';

interface Props {
  comments: Comment[];
  activeId: string | null;
  commentRanges: Map<string, { start: number; end: number }>;
  showResolved: boolean;
  onToggleResolved: () => void;
  onSelect: (id: string) => void;
  onResolve: (id: string, resolved: boolean) => void;
  onReply: (id: string, body: string) => void;
  onDelete: (id: string) => void;
  onReanchorRequest?: (id: string) => void;
}

export function CommentSidebar({
  comments,
  activeId,
  commentRanges,
  showResolved,
  onToggleResolved,
  onSelect,
  onResolve,
  onReply,
  onDelete,
  onReanchorRequest,
}: Props) {
  const active = comments.filter((c) => !c.orphaned && !c.resolved);
  const resolved = comments.filter((c) => !c.orphaned && c.resolved);
  const orphans = comments.filter((c) => !!c.orphaned);

  // Sort active by document position
  active.sort((a, b) => {
    const ra = commentRanges.get(a.id)?.start ?? Number.MAX_SAFE_INTEGER;
    const rb = commentRanges.get(b.id)?.start ?? Number.MAX_SAFE_INTEGER;
    return ra - rb;
  });

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span>Comments ({active.length})</span>
        <button onClick={onToggleResolved} title="Toggle resolved">
          {showResolved ? '🙈' : '👁'} {resolved.length}
        </button>
      </div>
      <div className="sidebar-list">
        {active.length === 0 && orphans.length === 0 && (
          <div className="empty">No comments yet. Select text in the preview to add one.</div>
        )}
        {active.map((c) => (
          <CommentCard
            key={c.id}
            comment={c}
            active={activeId === c.id}
            onSelect={() => onSelect(c.id)}
            onResolve={() => onResolve(c.id, true)}
            onReply={(body) => onReply(c.id, body)}
            onDelete={() => onDelete(c.id)}
          />
        ))}
        {showResolved && resolved.length > 0 && (
          <>
            <div className="section-header">Resolved</div>
            {resolved.map((c) => (
              <CommentCard
                key={c.id}
                comment={c}
                active={activeId === c.id}
                onSelect={() => onSelect(c.id)}
                onResolve={() => onResolve(c.id, false)}
                onReply={(body) => onReply(c.id, body)}
                onDelete={() => onDelete(c.id)}
                resolvedStyle
              />
            ))}
          </>
        )}
        {orphans.length > 0 && (
          <>
            <div className="section-header orphan-header">⚠ Orphaned ({orphans.length})</div>
            {orphans.map((c) => (
              <OrphanCard
                key={c.id}
                comment={c}
                onReanchorRequest={onReanchorRequest ? () => onReanchorRequest(c.id) : undefined}
                onDelete={() => onDelete(c.id)}
              />
            ))}
          </>
        )}
      </div>
    </aside>
  );
}

interface CardProps {
  comment: Comment;
  active: boolean;
  resolvedStyle?: boolean;
  onSelect: () => void;
  onResolve: () => void;
  onReply: (body: string) => void;
  onDelete: () => void;
}

function CommentCard({ comment, active, resolvedStyle, onSelect, onResolve, onReply, onDelete }: CardProps) {
  const [replying, setReplying] = useState(false);
  const [replyBody, setReplyBody] = useState('');

  return (
    <div
      className={
        'comment-card' + (active ? ' active' : '') + (resolvedStyle ? ' resolved' : '')
      }
      onClick={onSelect}
    >
      <div className="comment-quote">{truncate(comment.anchor.quote, 120)}</div>
      <CommentBody author={comment.author} body={comment.body} createdAt={comment.createdAt} />
      {comment.thread.map((r) => (
        <CommentBody key={r.id} author={r.author} body={r.body} createdAt={r.createdAt} indent />
      ))}
      <div className="comment-actions" onClick={(e) => e.stopPropagation()}>
        {!replying ? (
          <>
            <button onClick={() => setReplying(true)}>Reply</button>
            <button onClick={onResolve}>{comment.resolved ? 'Reopen' : 'Resolve'}</button>
            <button className="danger" onClick={onDelete}>Delete</button>
          </>
        ) : (
          <div className="reply-box">
            <textarea
              autoFocus
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder="Reply…"
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && replyBody.trim()) {
                  onReply(replyBody.trim());
                  setReplyBody('');
                  setReplying(false);
                } else if (e.key === 'Escape') {
                  setReplying(false);
                  setReplyBody('');
                }
              }}
            />
            <div className="reply-actions">
              <button onClick={() => { setReplying(false); setReplyBody(''); }}>Cancel</button>
              <button
                className="primary"
                disabled={!replyBody.trim()}
                onClick={() => {
                  onReply(replyBody.trim());
                  setReplyBody('');
                  setReplying(false);
                }}
              >
                Reply
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CommentBody({ author, body, createdAt, indent }: { author: string; body: string; createdAt: string; indent?: boolean }) {
  return (
    <div className={'comment-body' + (indent ? ' indent' : '')}>
      <div className="comment-meta">
        <strong>{author}</strong>
        <span className="time">{formatTime(createdAt)}</span>
      </div>
      <div className="comment-md">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
      </div>
    </div>
  );
}

function OrphanCard({ comment, onReanchorRequest, onDelete }: {
  comment: Comment;
  onReanchorRequest?: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="comment-card orphan">
      <div className="comment-quote orphan">{truncate(comment.anchor.quote, 120)}</div>
      <CommentBody author={comment.author} body={comment.body} createdAt={comment.createdAt} />
      <div className="comment-actions">
        {onReanchorRequest && (
          <button onClick={onReanchorRequest}>Re-anchor (select text, then click here)</button>
        )}
        <button className="danger" onClick={onDelete}>Delete</button>
      </div>
    </div>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + '…' : s;
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}
