import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MonacoEditor } from './MonacoEditor';

vi.mock('@monaco-editor/react', () => ({
  default: (props: any) => (
    <div data-testid="monaco-react" data-language={props.language}>{props.value}</div>
  ),
}));

describe('monacoEditor', () => {
  it('forwards value, onChange, aria-label, name to the textarea', async () => {
    let captured = '';
    const user = userEvent.setup();
    render(
      <MonacoEditor
        value="hello"
        onChange={(v) => {
          captured = v;
        }}
        aria-label="Source code editor"
        name="code"
      />,
    );
    const ta = screen.getByRole('textbox', { name: 'Source code editor' });
    expect(ta).toHaveAttribute('name', 'code');
    expect(ta).toHaveAttribute('aria-label', 'Source code editor');
    expect((ta as HTMLTextAreaElement).value).toBe('hello');

    await user.clear(ta);
    await user.type(ta, 'x');
    expect(captured).toBe('x');
  });

  it('sets spellCheck false', () => {
    render(<MonacoEditor value="" onChange={() => {}} aria-label="E" />);
    expect(screen.getByLabelText('E')).toHaveAttribute('spellCheck', 'false');
  });

  it('disables soft wrap via the wrap="off" attribute and data-language hook', () => {
    render(
      <MonacoEditor
        value="print(1)"
        onChange={() => {}}
        aria-label="E"
        language="python"
      />,
    );
    const ta = screen.getByLabelText('E') as HTMLTextAreaElement;
    expect(ta.getAttribute('wrap')).toBe('off');
    expect(ta.getAttribute('data-language')).toBe('python');
    expect(ta.getAttribute('data-monaco-fallback')).toBe('true');
  });

  it('renders without crashing when onChange is omitted', () => {
    render(<MonacoEditor value="seed" aria-label="readonly" readOnly />);
    const ta = screen.getByLabelText('readonly');
    expect(ta).toBeInTheDocument();
    expect(ta).toHaveAttribute('readonly');
  });

  it('renders the monaco binding when useMonaco is true', () => {
    render(<MonacoEditor value="code" onChange={() => {}} aria-label="ed" useMonaco language="cpp" />);
    expect(screen.getByTestId('monaco-react')).toHaveAttribute('data-language', 'cpp');
  });

  it('falls back to textarea when useMonaco is false', () => {
    render(<MonacoEditor value="code" onChange={() => {}} aria-label="ed" />);
    expect(screen.getByLabelText('ed').tagName).toBe('TEXTAREA');
  });

  it('keeps the data-* fallback hooks in textarea mode', () => {
    render(<MonacoEditor value="code" onChange={() => {}} aria-label="ed" language="python" />);
    const ta = screen.getByLabelText('ed');
    expect(ta).toHaveAttribute('data-monaco-fallback', 'true');
    expect(ta).toHaveAttribute('data-language', 'python');
  });
});
