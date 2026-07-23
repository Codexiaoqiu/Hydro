/* @vitest-environment happy-dom */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../primitives/Toast';
import { ContestBalloonTable } from './ContestBalloonTable';

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  (global as any).fetch = fetchMock;
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    headers: { get: () => 'application/json' },
    json: async () => ({}),
  });
});

const bdocs = [
  { _id: 'B1', pid: 1, uid: 7, first: true },
  { _id: 'B2', pid: 2, uid: 8 },
  { _id: 'B3', pid: 1, uid: 9, sent: 1, sentAt: 1_700_000_000_000 },
];
const pids = [1, 2];
const pdict: any = {
  1: { docId: 1, title: 'A+B' },
  2: { docId: 2, title: 'Hello' },
};
const udict: any = {
  7: { _id: 7, uname: 'alice' },
  8: { _id: 8, uname: 'bob' },
  9: { _id: 9, uname: 'carol' },
  1: { _id: 1, uname: 'admin' },
};
const balloon: any = {
  1: { color: '#fbbd23', name: 'Yellow' },
  2: { color: '#3b82f6', name: 'Blue' },
};

describe('ContestBalloonTable', () => {
  it('renders one row per bdoc with alphabetic problem id derived from pids', () => {
    render(
      <ToastProvider>
        <ContestBalloonTable bdocs={bdocs as any} pids={pids} pdict={pdict} udict={udict} balloon={balloon} onSend={async () => {}} />
      </ToastProvider>,
    );
    // First problem (pid=1) renders as "A", second (pid=2) as "B".
    expect(screen.getAllByText('A').length).toBeGreaterThan(0);
    expect(screen.getByText('B')).toBeInTheDocument();
    // Titles come from pdict, not duplicated as the alphabetic id.
    expect(screen.getAllByText('A+B').length).toBeGreaterThan(0);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('renders submitter name from udict', () => {
    render(
      <ToastProvider>
        <ContestBalloonTable bdocs={bdocs as any} pids={pids} pdict={pdict} udict={udict} balloon={balloon} onSend={async () => {}} />
      </ToastProvider>,
    );
    expect(screen.getAllByText('alice').length).toBeGreaterThan(0);
    expect(screen.getByText('bob')).toBeInTheDocument();
    expect(screen.getByText('carol')).toBeInTheDocument();
  });

  it('shows balloon color swatch and name from tdoc.balloon', () => {
    const { container } = render(
      <ToastProvider>
        <ContestBalloonTable bdocs={bdocs as any} pids={pids} pdict={pdict} udict={udict} balloon={balloon} onSend={async () => {}} />
      </ToastProvider>,
    );
    // The color swatch is rendered with the configured color in inline style.
    const yellowSwatch = container.querySelector('[style*="#fbbd23" i]');
    expect(yellowSwatch).not.toBeNull();
    expect(screen.getAllByText('Yellow').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Blue').length).toBeGreaterThan(0);
  });

  it('shows First marker for first-blood balloons and Sent marker for sent ones', () => {
    const { container } = render(
      <ToastProvider>
        <ContestBalloonTable bdocs={bdocs as any} pids={pids} pdict={pdict} udict={udict} balloon={balloon} onSend={async () => {}} />
      </ToastProvider>,
    );
    expect(screen.getAllByText(/首杀|First/).length).toBeGreaterThan(0);
    // bdocs[2] (B3) is the only sent balloon. Assert the sender name (admin)
    // appears in THAT row's Sent cell, not just anywhere in the table.
    const sentRow = container.querySelector('tr[data-status="done"]');
    expect(sentRow).not.toBeNull();
    // Scope to the Sent column cell (the 6th td) so the assertion pins the
    // sender to the correct cell rather than a loose table-wide text match.
    const sentCell = (sentRow as HTMLElement).querySelectorAll('td')[5];
    expect(sentCell).toBeTruthy();
    expect(within(sentCell as HTMLElement).getByText(/admin/)).toBeInTheDocument();
  });

  it('Send button triggers a POST with operation=done and balloon id', async () => {
    const onSend = vi.fn();
    render(
      <ToastProvider>
        <ContestBalloonTable bdocs={bdocs as any} pids={pids} pdict={pdict} udict={udict} balloon={balloon} onSend={onSend} />
      </ToastProvider>,
    );
    // Use the first pending row's Send button.
    const sendButtons = screen.getAllByRole('button', { name: /发送|Send/i });
    fireEvent.click(sendButtons[0]);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(window.location.pathname),
      expect.objectContaining({ method: 'POST' }),
    ));
    // request.post sends urlencoded body — the request URL/body must include balloon=B1
    const [calledUrl, calledInit] = fetchMock.mock.calls[0];
    expect(calledUrl).toEqual(expect.stringContaining(window.location.pathname));
    expect(calledInit.body).toEqual(expect.stringContaining('balloon=B1'));
    expect(calledInit.body).toEqual(expect.stringContaining('operation=done'));
  });

  it('Send button is disabled while a request is in flight and never double-posts', async () => {
    let resolvePost: ((v: any) => void) | null = null;
    fetchMock.mockImplementationOnce(() => new Promise((resolve) => {
      resolvePost = resolve;
    }));
    const onSend = vi.fn();
    render(
      <ToastProvider>
        <ContestBalloonTable bdocs={bdocs as any} pids={pids} pdict={pdict} udict={udict} balloon={balloon} onSend={onSend} />
      </ToastProvider>,
    );
    const sendButtons = screen.getAllByRole('button', { name: /发送|Send/i });
    fireEvent.click(sendButtons[0]);
    // While the POST is pending, that row's Send button must be disabled.
    await waitFor(() => expect(sendButtons[0]).toBeDisabled());
    // A second click must not enqueue another request.
    fireEvent.click(sendButtons[0]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // Resolve the in-flight POST so React flushes state.
    await waitFor(() => {
      resolvePost!({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({}),
      });
    });
    // After completion, onSend callback must run exactly once.
    await waitFor(() => expect(onSend).toHaveBeenCalledTimes(1));
  });
});