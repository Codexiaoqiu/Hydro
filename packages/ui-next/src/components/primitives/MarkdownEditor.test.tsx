/* @vitest-environment happy-dom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

vi.mock('@monaco-editor/react', () => ({
  Editor: (props: { value?: string; onChange?: (v: string | undefined) => void }) => (
    <textarea
      data-testid="monaco-stub"
      value={props.value ?? ''}
      onChange={(e) => props.onChange?.(e.currentTarget.value)}
    />
  ),
  loader: { config: vi.fn() },
}));

import { MarkdownEditor } from './MarkdownEditor';

describe('MarkdownEditor (textarea fallback path)', () => {
  test('renders textarea with initial value', async () => {
    render(<MarkdownEditor value="hello" onChange={() => {}} />);
    await waitFor(() => {
      expect(screen.getByTestId('monaco-stub')).toBeInTheDocument();
    });
    const stub = screen.getByTestId('monaco-stub');
    expect(stub.tagName).toBe('TEXTAREA');
    expect((stub as HTMLTextAreaElement).value).toBe('hello');
  });

  test('calls onChange when textarea changes', async () => {
    const onChange = vi.fn();
    render(<MarkdownEditor value="" onChange={onChange} />);
    await waitFor(() => {
      expect(screen.getByTestId('monaco-stub')).toBeInTheDocument();
    });
    const stub = screen.getByTestId('monaco-stub') as HTMLTextAreaElement;
    fireEvent.change(stub, { target: { value: 'world' } });
    expect(onChange).toHaveBeenCalledWith('world');
  });
});