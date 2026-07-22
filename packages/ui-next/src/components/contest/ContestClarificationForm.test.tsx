/* @vitest-environment happy-dom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../primitives/Toast';
import { ContestClarificationForm } from './ContestClarificationForm';

vi.mock('@monaco-editor/react', () => ({
  Editor: (props: { value?: string, onChange?: (v: string | undefined) => void }) => (
    <textarea
      data-testid="editor-source"
      aria-label="content"
      value={props.value ?? ''}
      onChange={(e) => props.onChange?.(e.currentTarget.value)}
    />
  ),
  loader: { config: vi.fn() },
}));

const renderWithProvider = (ui: React.ReactElement) =>
  render(<ToastProvider>{ui}</ToastProvider>);

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  (global as any).fetch = fetchMock;
  fetchMock.mockResolvedValue({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({}) });
});

const tdoc = { docId: 7, pids: [1, 2] } as any;

describe('ContestClarificationForm', () => {
  it('hides subject in reply mode', () => {
    renderWithProvider(<ContestClarificationForm mode="reply" tdoc={tdoc} onSubmitted={() => {}} />);
    expect(screen.queryByLabelText(/subject/i)).toBeNull();
  });
  it('shows subject in broadcast mode', () => {
    renderWithProvider(<ContestClarificationForm mode="broadcast" tdoc={tdoc} onSubmitted={() => {}} />);
    expect(screen.getByLabelText(/subject/i)).toBeInTheDocument();
  });
  it('submits clarification', async () => {
    const onSubmitted = vi.fn();
    renderWithProvider(<ContestClarificationForm mode="broadcast" tdoc={tdoc} onSubmitted={onSubmitted} />);
    fireEvent.change(screen.getByLabelText(/subject/i), { target: { value: '-1' } });
    fireEvent.change(screen.getByRole('textbox', { name: /^content$/i }), { target: { value: 'Note' } });
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    await waitFor(() => expect(onSubmitted).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ method: 'POST' }));
  });
});
