import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CodeEditor } from '../CodeEditor';

// Mock Monaco Editor
vi.mock('@monaco-editor/react', () => ({
  default: ({ value, onChange, language, theme, height, options }: any) => {
    return (
      <div data-testid="monaco-editor">
        <textarea
          data-testid="editor-textarea"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          data-language={language}
          data-theme={theme}
          data-height={height}
          data-options={JSON.stringify(options)}
        />
      </div>
    );
  }
}));

describe('CodeEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render monaco editor', () => {
    render(<CodeEditor value="" onChange={() => {}} />);

    expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
  });

  it('should display initial value', () => {
    const initialCode = 'print("Hello, World!")';

    render(<CodeEditor value={initialCode} onChange={() => {}} />);

    const textarea = screen.getByTestId('editor-textarea');
    expect(textarea).toHaveValue(initialCode);
  });

  it('should call onChange when code changes', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<CodeEditor value="" onChange={handleChange} />);

    const textarea = screen.getByTestId('editor-textarea');
    await user.type(textarea, 'x = 5');

    expect(handleChange).toHaveBeenCalled();
  });

  it('should use python language by default', () => {
    render(<CodeEditor value="" onChange={() => {}} />);

    const textarea = screen.getByTestId('editor-textarea');
    expect(textarea).toHaveAttribute('data-language', 'python');
  });

  it('should support custom language', () => {
    render(<CodeEditor value="" onChange={() => {}} language="javascript" />);

    const textarea = screen.getByTestId('editor-textarea');
    expect(textarea).toHaveAttribute('data-language', 'javascript');
  });

  it('should use dark theme by default', () => {
    render(<CodeEditor value="" onChange={() => {}} />);

    const textarea = screen.getByTestId('editor-textarea');
    expect(textarea).toHaveAttribute('data-theme', 'vs-dark');
  });

  it('should support custom theme', () => {
    render(<CodeEditor value="" onChange={() => {}} theme="light" />);

    const textarea = screen.getByTestId('editor-textarea');
    expect(textarea).toHaveAttribute('data-theme', 'light');
  });

  it('should have default height of 400px', () => {
    render(<CodeEditor value="" onChange={() => {}} />);

    const textarea = screen.getByTestId('editor-textarea');
    expect(textarea).toHaveAttribute('data-height', '400px');
  });

  it('should support custom height', () => {
    render(<CodeEditor value="" onChange={() => {}} height="600px" />);

    const textarea = screen.getByTestId('editor-textarea');
    expect(textarea).toHaveAttribute('data-height', '600px');
  });

  it('should configure editor options', () => {
    render(<CodeEditor value="" onChange={() => {}} />);

    const textarea = screen.getByTestId('editor-textarea');
    const options = JSON.parse(textarea.getAttribute('data-options') || '{}');

    expect(options).toMatchObject({
      minimap: { enabled: false },
      fontSize: 14,
      lineNumbers: 'on',
      scrollBeyondLastLine: false,
      automaticLayout: true
    });
  });

  it('should be read-only when specified', () => {
    render(<CodeEditor value="" onChange={() => {}} readOnly />);

    const textarea = screen.getByTestId('editor-textarea');
    const options = JSON.parse(textarea.getAttribute('data-options') || '{}');

    expect(options.readOnly).toBe(true);
  });

  it('should not be read-only by default', () => {
    render(<CodeEditor value="" onChange={() => {}} />);

    const textarea = screen.getByTestId('editor-textarea');
    const options = JSON.parse(textarea.getAttribute('data-options') || '{}');

    expect(options.readOnly).toBeFalsy();
  });

  it('should handle empty value', () => {
    render(<CodeEditor value="" onChange={() => {}} />);

    const textarea = screen.getByTestId('editor-textarea');
    expect(textarea).toHaveValue('');
  });

  it('should handle multiline code', () => {
    const code = 'def hello():\n    print("Hello")\n    return True';

    render(<CodeEditor value={code} onChange={() => {}} />);

    const textarea = screen.getByTestId('editor-textarea');
    expect(textarea).toHaveValue(code);
  });
});
