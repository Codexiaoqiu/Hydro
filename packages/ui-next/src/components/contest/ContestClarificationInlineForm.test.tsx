import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../primitives/Toast';
import { ContestClarificationInlineForm } from './ContestClarificationInlineForm';

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  (global as any).fetch = fetchMock;
  fetchMock.mockResolvedValue({
    ok: true, status: 200,
    headers: { get: (k: string) => (k.toLowerCase() === 'content-type' ? 'application/json' : null) },
    json: async () => ({}),
  });
});

function renderWithProvider(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

const tdoc = { docId: 7, pids: [1, 2] } as any;

describe('ContestClarificationInlineForm', () => {
  // Reply mode tests removed: ContestClarificationInlineForm no longer
  // supports a `reply` mode (mirror ui-default — only the ask form lives
  // on /contest/:tid/problems). Reply/broadcast forms live on
  // /contest/:tid/clarification via ContestClarificationForm.

  it('shows subject selector for ask (no reply)', () => {
    renderWithProvider(<ContestClarificationInlineForm tdoc={tdoc} onSubmitted={() => {}} />);
    expect(screen.getByTestId('clar-inline-subject')).toBeInTheDocument();
  });

  it('submits ask with subject + content (matches ui-default problemlist form)', async () => {
    const onSubmitted = vi.fn();
    renderWithProvider(<ContestClarificationInlineForm tdoc={tdoc} onSubmitted={onSubmitted} />);
    fireEvent.change(screen.getByTestId('clar-inline-subject'), { target: { value: '1' } });
    // The MarkdownEditor's lazy Monaco editor renders a Suspense fallback
    // <textarea> in happy-dom tests. The aria-label sits on the wrapper
    // div, so query the bare textbox role.
    const textareas = screen.getAllByRole('textbox');
    const contentTextarea = textareas.find((el) => el.tagName === 'TEXTAREA') ?? textareas[textareas.length - 1];
    fireEvent.change(contentTextarea, { target: { value: 'Q1' } });
    fireEvent.click(screen.getByTestId('clar-inline-submit'));
    await waitFor(() => expect(onSubmitted).toHaveBeenCalled());
    const body = String(fetchMock.mock.calls[0][1].body ?? '');
    // ui-default `templates/contest_problemlist.html:180-208` body shape:
    expect(body).toContain('operation=clarification');
    expect(body).toContain('subject=1');
    expect(body).toContain('content=Q1');
    // No did, no owner — backend derives owner from session.
    expect(body).not.toContain('did=');
    expect(body).not.toContain('owner=');
  });

  it('blocks submit when content is empty', async () => {
    renderWithProvider(<ContestClarificationInlineForm tdoc={tdoc} onSubmitted={() => {}} />);
    fireEvent.click(screen.getByTestId('clar-inline-submit'));
    await waitFor(() => expect(fetchMock).not.toHaveBeenCalled());
  });
});