import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';

interface Props {
  value: string;
  onChange: (next: string) => void;
}

export function EditorPane({ value, onChange }: Props) {
  return (
    <div className="pane editor-pane">
      <CodeMirror
        value={value}
        height="100%"
        theme={oneDark}
        extensions={[markdown(), EditorView.lineWrapping]}
        onChange={onChange}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLine: true,
          foldGutter: true,
          autocompletion: false,
        }}
      />
    </div>
  );
}
