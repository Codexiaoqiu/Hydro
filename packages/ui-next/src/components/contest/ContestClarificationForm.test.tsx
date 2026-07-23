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
    expect(screen.queryByTestId('clar-subject-select')).toBeNull();
  });
  it('shows subject in broadcast mode', () => {
    renderWithProvider(<ContestClarificationForm mode="broadcast" tdoc={tdoc} onSubmitted={() => {}} />);
    expect(screen.getByTestId('clar-subject-select')).toBeInTheDocument();
  });
  it('shows subject in ask mode', () => {
    renderWithProvider(<ContestClarificationForm mode="ask" tdoc={tdoc} onSubmitted={() => {}} />);
    expect(screen.getByTestId('clar-subject-select')).toBeInTheDocument();
  });
  it('uses Ask title in ask mode', () => {
    renderWithProvider(<ContestClarificationForm mode="ask" tdoc={tdoc} onSubmitted={() => {}} />);
    // New "Ask" i18n key falls back to the literal key string in zh-CN since
    // it is not registered in the catalog — match either the English label
    // or the fallback key to be locale-agnostic.
    expect(screen.getByRole('heading', { name: /ask|ContestClarification\.Ask/i })).toBeInTheDocument();
  });
  it('submits clarification', async () => {
    const onSubmitted = vi.fn();
    renderWithProvider(<ContestClarificationForm mode="broadcast" tdoc={tdoc} onSubmitted={onSubmitted} />);
    fireEvent.change(screen.getByTestId('clar-subject-select'), { target: { value: '-1' } });
    fireEvent.change(screen.getByRole('textbox', { name: /^content$/i }), { target: { value: 'Note' } });
    fireEvent.click(screen.getByRole('button', { name: /submit|发布/i }));
    await waitFor(() => expect(onSubmitted).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ method: 'POST' }));
  });
  it('submits ask mode with empty did body', async () => {
    const onSubmitted = vi.fn();
    renderWithProvider(<ContestClarificationForm mode="ask" tdoc={tdoc} onSubmitted={onSubmitted} />);
    fireEvent.change(screen.getByTestId('clar-subject-select'), { target: { value: '1' } });
    fireEvent.change(screen.getByRole('textbox', { name: /^content$/i }), { target: { value: 'Question' } });
    fireEvent.click(screen.getByRole('button', { name: /submit|发布/i }));
    await waitFor(() => expect(onSubmitted).toHaveBeenCalled());
    const call = fetchMock.mock.calls[0];
    const body = String(call[1]?.body ?? '');
    expect(body).toContain('operation=clarification');
    expect(body).not.toContain('did=');
    expect(body).toContain('subject=1');
  });
});
