/* @vitest-environment happy-dom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@monaco-editor/react', () => ({
  Editor: (props: {
    value?: string;
    onChange?: (v: string | undefined) => void;
    onMount?: (editor: unknown, monaco: unknown) => void;
  }) => {
    props.onMount?.(
      {
        addAction: vi.fn(),
        addCommand: vi.fn(),
        onDidPaste: vi.fn(),
        trigger: vi.fn(),
      },
      { KeyMod: { CtrlCmd: 1 }, KeyCode: { Enter: 2 } },
    );
    return (
      <textarea
        aria-label="content"
        data-testid="editor-source"
        value={props.value ?? ''}
        onChange={(e) => props.onChange?.(e.currentTarget.value)}
      />
    );
  },
  loader: { config: vi.fn() },
}));

import { DiscussionForm } from './DiscussionForm';

describe('DiscussionForm', () => {
  it('renders initial title and content', async () => {
    render(
      <DiscussionForm
        initial={{ title: 'hello', content: '# hi' }}
        showHighlightPin={false}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByDisplayValue('hello')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: /content/i })).toBeInTheDocument();
    });
  });

  it('hides highlight/pin when showHighlightPin=false', () => {
    render(
      <DiscussionForm
        initial={{ title: '', content: '' }}
        showHighlightPin={false}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.queryByLabelText(/高亮/)).toBeNull();
    expect(screen.queryByLabelText(/置顶/)).toBeNull();
  });

  it('calls onSubmit with title/content/highlight/pin when published', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <DiscussionForm
        initial={{ title: 't', content: 'c' }}
        showHighlightPin={false}
        onSubmit={onSubmit}
        submitText="发布"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /发布/ }));
    expect(onSubmit).toHaveBeenCalledWith({ title: 't', content: 'c', highlight: false, pin: false });
  });

  it('respects initial highlight and pin (edit mode)', () => {
    render(
      <DiscussionForm
        initial={{ title: 'x', content: 'y', highlight: true, pin: true }}
        showHighlightPin={true}
        onSubmit={vi.fn()}
      />,
    );
    const highlightBox = screen.getByLabelText(/高亮/) as HTMLInputElement;
    expect(highlightBox.checked).toBe(true);
    const pinBox = screen.getByLabelText(/置顶/) as HTMLInputElement;
    expect(pinBox.checked).toBe(true);
  });
});