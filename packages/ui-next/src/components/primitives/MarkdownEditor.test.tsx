/* @vitest-environment happy-dom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MarkdownEditor } from './MarkdownEditor';

vi.mock('@monaco-editor/react', () => ({
  Editor: (props: { value?: string, onChange?: (v: string | undefined) => void }) => (
    <textarea
      data-testid="editor-source"
      value={props.value ?? ''}
      onChange={(e) => props.onChange?.(e.currentTarget.value)}
    />
  ),
  loader: { config: vi.fn() },
}));

describe('markdownEditor (source pane)', () => {
  it('renders source textarea and preview pane', async () => {
    render(<MarkdownEditor value="hello" onChange={() => {}} />);
    await waitFor(() => {
      expect(screen.getByTestId('editor-source')).toBeInTheDocument();
    });
    expect(screen.getByTestId('editor-source').tagName).toBe('TEXTAREA');
    expect((screen.getByTestId('editor-source') as HTMLTextAreaElement).value).toBe('hello');
  });

  it('calls onChange when source textarea changes', async () => {
    const onChange = vi.fn();
    render(<MarkdownEditor value="" onChange={onChange} />);
    await waitFor(() => {
      expect(screen.getByTestId('editor-source')).toBeInTheDocument();
    });
    const stub = screen.getByTestId('editor-source') as HTMLTextAreaElement;
    fireEvent.change(stub, { target: { value: 'world' } });
    expect(onChange).toHaveBeenCalledWith('world');
  });
});

describe('markdownEditor (live preview)', () => {
  // Note: do NOT use vi.useFakeTimers() here. The Monaco lazy import uses
  // real microtasks; fake timers block them and `editor-source` never appears.

  it('renders heading into preview pane after debounce', async () => {
    render(<MarkdownEditor value="# Heading" onChange={() => {}} />);
    await waitFor(() => {
      expect(screen.getByTestId('editor-source')).toBeInTheDocument();
    });
    // Wait > 150ms debounce + render to complete.
    await new Promise((r) => setTimeout(r, 250));
    const preview = screen.getByTestId('markdown-preview');
    expect(preview.querySelector('h1')?.textContent).toBe('Heading');
  });

  it('renders empty-state placeholder for empty source', async () => {
    render(<MarkdownEditor value="" onChange={() => {}} />);
    await waitFor(() => {
      expect(screen.getByTestId('editor-source')).toBeInTheDocument();
    });
    expect(screen.getByTestId('markdown-preview-placeholder')).toBeTruthy();
  });

  it('updates preview when value prop changes externally (language switch)', async () => {
    const { rerender } = render(<MarkdownEditor value="# English" onChange={() => {}} />);
    await waitFor(() => {
      expect(screen.getByTestId('editor-source')).toBeInTheDocument();
    });
    await new Promise((r) => setTimeout(r, 250));
    expect(screen.getByTestId('markdown-preview').querySelector('h1')?.textContent).toBe('English');

    rerender(<MarkdownEditor value="# 中文标题" onChange={() => {}} />);
    await new Promise((r) => setTimeout(r, 250));
    expect(screen.getByTestId('markdown-preview').querySelector('h1')?.textContent).toBe('中文标题');
  });
});
