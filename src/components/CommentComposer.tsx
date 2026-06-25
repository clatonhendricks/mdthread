import { useState } from 'react';

interface Props {
  quote: string;
  onSubmit: (body: string) => void;
  onCancel: () => void;
}

export function CommentComposer({ quote, onSubmit, onCancel }: Props) {
  const [body, setBody] = useState('');
  return (
    <div className="composer">
      <div className="composer-quote">
        <span className="quote-bar" />
        <span className="quote-text">{quote.length > 200 ? quote.slice(0, 200) + '…' : quote}</span>
      </div>
      <textarea
        autoFocus
        placeholder="Write a comment… (markdown supported)"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            if (body.trim()) onSubmit(body.trim());
          } else if (e.key === 'Escape') {
            onCancel();
          }
        }}
      />
      <div className="composer-actions">
        <button onClick={onCancel}>Cancel</button>
        <button
          className="primary"
          disabled={!body.trim()}
          onClick={() => onSubmit(body.trim())}
        >
          Comment (Ctrl+Enter)
        </button>
      </div>
    </div>
  );
}
