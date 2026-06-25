import { useEffect, useState } from 'react';

interface Props {
  selection: Selection | null;
  onAddComment: () => void;
}

export function SelectionToolbar({ selection, onAddComment }: Props) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!selection || selection.isCollapsed) {
      setPos(null);
      return;
    }
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) {
      setPos(null);
      return;
    }
    setPos({ top: rect.top - 40, left: rect.left + rect.width / 2 });
  }, [selection]);

  if (!pos) return null;
  return (
    <div className="selection-toolbar" style={{ top: pos.top, left: pos.left }}>
      <button onMouseDown={(e) => { e.preventDefault(); onAddComment(); }}>
        💬 Add comment
      </button>
    </div>
  );
}
