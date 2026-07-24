/* @vitest-environment happy-dom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MarkdownEditor } from './MarkdownEditor';

let pasteHandler: ((event: unknown) => void) | undefined;
let submitCommand: (() => void) | undefined;
const trigger = vi.fn();

vi.mock('@monaco-editor/react', () => ({
  Editor: (props: {
    value?: string,
    onChange?: (v: string | undefined) => void,
    onMount?: (editor: unknown, monaco: unknown) => void,
  }) => {
    props.onMount?.({
      addAction: vi.fn(),
      addCommand: (_keybinding: number, handler: () => void) => {
        submitCommand = handler;
      },
      onDidPaste: (handler: (event: unknown) => void) => {
        pasteHandler = handler;
        return { dispose: vi.fn() };
      },
      trigger,
    }, { KeyMod: { CtrlCmd: 1 }, KeyCode: { Enter: 2 } });
    return (
      <textarea
        data-testid="editor-source"
        value={props.value ?? ''}
        onChange={(e) => props.onChange?.(e.currentTarget.value)}
      />
    );
  },
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

  it('uploads a pasted image and inserts markdown', async () => {
    const onUpload = vi.fn().mockResolvedValue(['/file/1/pasted.png']);
    render(<MarkdownEditor value="" onChange={() => {}} onUpload={onUpload} />);
    await waitFor(() => expect(pasteHandler).toBeTypeOf('function'));

    const image = new File(['image'], 'pasted.png', { type: 'image/png' });
    pasteHandler?.({ clipboardEvent: { clipboardData: { files: [image] } } });

    await waitFor(() => expect(onUpload).toHaveBeenCalledWith([image]));
    expect(trigger).toHaveBeenCalledWith('keyboard', 'type', { text: '![](/file/1/pasted.png)' });
  });

  it('uploads a pasted zip and inserts a file link', async () => {
    const onUpload = vi.fn().mockResolvedValue(['/file/1/archive.zip']);
    render(<MarkdownEditor value="" onChange={() => {}} onUpload={onUpload} />);
    await waitFor(() => expect(pasteHandler).toBeTypeOf('function'));

    const archive = new File(['zip'], 'archive.zip', { type: 'application/zip' });
    pasteHandler?.({ clipboardEvent: { clipboardData: { files: [archive] } } });

    await waitFor(() => expect(onUpload).toHaveBeenCalledWith([archive]));
    expect(trigger).toHaveBeenCalledWith('keyboard', 'type', { text: '[archive.zip](/file/1/archive.zip)' });
  });

  it('submits with Ctrl/Cmd+Enter', async () => {
    const onSubmit = vi.fn();
    render(<MarkdownEditor value="" onChange={() => {}} onSubmit={onSubmit} />);
    await waitFor(() => expect(submitCommand).toBeTypeOf('function'));

    submitCommand?.();

    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('uses the latest onSubmit callback after rerender', async () => {
    const firstSubmit = vi.fn();
    const latestSubmit = vi.fn();
    const { rerender } = render(<MarkdownEditor value="" onChange={() => {}} onSubmit={firstSubmit} />);
    await waitFor(() => expect(submitCommand).toBeTypeOf('function'));
    const mountedCommand = submitCommand;

    rerender(<MarkdownEditor value="changed" onChange={() => {}} onSubmit={latestSubmit} />);
    mountedCommand?.();

    expect(firstSubmit).not.toHaveBeenCalled();
    expect(latestSubmit).toHaveBeenCalledOnce();
  });

  it('does not throw on Ctrl/Cmd+Enter without onSubmit', async () => {
    render(<MarkdownEditor value="" onChange={() => {}} />);
    await waitFor(() => expect(submitCommand).toBeTypeOf('function'));

    expect(() => submitCommand?.()).not.toThrow();
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
