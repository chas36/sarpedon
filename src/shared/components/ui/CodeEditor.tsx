import Editor from '@monaco-editor/react';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  theme?: string;
  height?: string;
  readOnly?: boolean;
}

export function CodeEditor({
  value,
  onChange,
  language = 'python',
  theme = 'vs-dark',
  height = '400px',
  readOnly = false
}: CodeEditorProps) {
  const handleChange = (value: string | undefined) => {
    onChange(value || '');
  };

  return (
    <div className="border border-learning-muted/10 rounded-lg overflow-hidden">
      <Editor
        height={height}
        language={language}
        theme={theme}
        value={value}
        onChange={handleChange}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          readOnly,
          tabSize: 4,
          wordWrap: 'on',
          padding: { top: 16, bottom: 16 }
        }}
      />
    </div>
  );
}
