import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../primitives/Toast';
import { canResumeContestUser } from '../../lib/contest-user';
import { ContestUserTable } from './ContestUserTable';

// Locales: en (Rank/UnRank/Resume/Delete) and zh_CN (计入排名/取消排名/补时/删除).
const RX_RANK = /rank|计入排名/i;
const RX_UNRANK = /unrank|取消排名/i;
const RX_RESUME = /resume|补时/i;
const RX_DELETE = /delete|删除/i;

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

const HOUR = 3_600_000;
const contestEndMs = Date.UTC(2026, 11, 31);
const toIso = (ms: number) => new Date(ms).toISOString();

const baseTdoc = () => ({
  docId: 7, beginAt: toIso(0), endAt: toIso(contestEndMs), duration: 0,
});

describe('ContestUserTable', () => {
  it('renders rows with attendee name from udict', () => {
    render(
      <ToastProvider>
        <ContestUserTable
          rows={[{ uid: 1, unrank: false }]}
          udict={{ 1: { _id: 1, uname: 'alice' } }}
          tdoc={baseTdoc()}
          nowMs={contestEndMs - HOUR}
          onChange={() => {}}
        />
      </ToastProvider>,
    );
    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('shows empty state when no rows', () => {
    render(
      <ToastProvider>
        <ContestUserTable rows={[]} udict={{}} tdoc={baseTdoc()} nowMs={contestEndMs - HOUR} onChange={() => {}} />
      </ToastProvider>,
    );
    expect(screen.getByText(/no attendees|暂无参赛者/i)).toBeInTheDocument();
  });

  it('exposes Rank + UnRank actions per row with labels describing the action', () => {
    render(
      <ToastProvider>
        <ContestUserTable
          rows={[
            { uid: 1, unrank: false },
            { uid: 2, unrank: true },
          ]}
          udict={{ 1: { _id: 1, uname: 'a' }, 2: { _id: 2, uname: 'b' } }}
          tdoc={baseTdoc()}
          nowMs={contestEndMs - HOUR}
          onChange={() => {}}
        />
      </ToastProvider>,
    );
    expect(screen.getByRole('button', { name: RX_UNRANK })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: RX_RANK })).toBeInTheDocument();
  });

  it('Delete button fires operation=delete with row uid', async () => {
    const onChange = vi.fn();
    render(
      <ToastProvider>
        <ContestUserTable
          rows={[{ uid: 1, unrank: false }]}
          udict={{ 1: { _id: 1, uname: 'a' } }}
          tdoc={baseTdoc()}
          nowMs={contestEndMs - HOUR}
          onChange={onChange}
        />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: RX_DELETE }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const init = fetchMock.mock.calls[0][1] as any;
    expect(init.method).toBe('POST');
    const body = (init.body as URLSearchParams);
    expect(body.get('operation')).toBe('delete');
    expect(body.get('uid')).toBe('1');
    expect(onChange).toHaveBeenCalled();
  });

  it('Rank action sends operation=rank with the current uid', async () => {
    render(
      <ToastProvider>
        <ContestUserTable
          rows={[{ uid: 99, unrank: true }]}
          udict={{ 99: { _id: 99, uname: 'z' } }}
          tdoc={baseTdoc()}
          nowMs={contestEndMs - HOUR}
          onChange={() => {}}
        />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: RX_RANK }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const init = fetchMock.mock.calls[0][1] as any;
    expect(init.method).toBe('POST');
    const body = (init.body as URLSearchParams);
    expect(body.get('operation')).toBe('rank');
    expect(body.get('uid')).toBe('99');
  });

  it('UnRank action sends operation=unrank (mirrors action label)', async () => {
    render(
      <ToastProvider>
        <ContestUserTable
          rows={[{ uid: 11, unrank: false }]}
          udict={{ 11: { _id: 11, uname: 'y' } }}
          tdoc={baseTdoc()}
          nowMs={contestEndMs - HOUR}
          onChange={() => {}}
        />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: RX_UNRANK }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const init = fetchMock.mock.calls[0][1] as any;
    expect(init.method).toBe('POST');
    const body = (init.body as URLSearchParams);
    expect(body.get('operation')).toBe('unrank');
  });

  it('shows Resume action when canResumeContestUser returns true', () => {
    render(
      <ToastProvider>
        <ContestUserTable
          rows={[{ uid: 5, startAt: toIso(0), endAt: toIso(contestEndMs - 2 * HOUR), unrank: false }]}
          udict={{ 5: { _id: 5, uname: 'q' } }}
          tdoc={baseTdoc()}
          nowMs={contestEndMs - 3 * HOUR}
          onChange={() => {}}
        />
      </ToastProvider>,
    );
    expect(screen.getByRole('button', { name: RX_RESUME })).toBeInTheDocument();
  });

  it('hides Resume action when canResumeContestUser returns false (contest ended)', () => {
    render(
      <ToastProvider>
        <ContestUserTable
          rows={[{ uid: 5, endAt: toIso(contestEndMs - HOUR) }]}
          udict={{ 5: { _id: 5, uname: 'q' } }}
          tdoc={baseTdoc()}
          nowMs={contestEndMs + HOUR}
          onChange={() => {}}
        />
      </ToastProvider>,
    );
    expect(screen.queryByRole('button', { name: RX_RESUME })).toBeNull();
  });

  it('boundary duration exhausted: no Resume', () => {
    const startAt = contestEndMs - 6 * HOUR;
    const row = { uid: 5, startAt: toIso(startAt), endAt: toIso(contestEndMs - 1), unrank: false };
    expect(canResumeContestUser(
      { endAt: toIso(contestEndMs), duration: 5 },
      { startAt: toIso(startAt), endAt: toIso(contestEndMs - 1) },
      contestEndMs - 1,
    )).toBe(false);
    render(
      <ToastProvider>
        <ContestUserTable
          rows={[row]}
          udict={{ 5: { _id: 5, uname: 'q' } }}
          tdoc={{ ...baseTdoc(), duration: 5 }}
          nowMs={contestEndMs - 1}
          onChange={() => {}}
        />
      </ToastProvider>,
    );
    expect(screen.queryByRole('button', { name: RX_RESUME })).toBeNull();
  });

  it('Resume action sends operation=resume and triggers onChange', async () => {
    const onChange = vi.fn();
    render(
      <ToastProvider>
        <ContestUserTable
          rows={[{ uid: 5, startAt: toIso(0), endAt: toIso(contestEndMs - 2 * HOUR), unrank: false }]}
          udict={{ 5: { _id: 5, uname: 'q' } }}
          tdoc={baseTdoc()}
          nowMs={contestEndMs - 3 * HOUR}
          onChange={onChange}
        />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: RX_RESUME }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const init = fetchMock.mock.calls[0][1] as any;
    expect(init.method).toBe('POST');
    const body = (init.body as URLSearchParams);
    expect(body.get('operation')).toBe('resume');
    expect(body.get('uid')).toBe('5');
    expect(onChange).toHaveBeenCalled();
  });

  it('failure preserves previous row state (no implicit reload)', async () => {
    let rejectRequest: (error: Error) => void = () => {};
    fetchMock.mockImplementationOnce(() => new Promise((_, reject) => {
      rejectRequest = reject;
    }));
    render(
      <ToastProvider>
        <ContestUserTable rows={[{ uid: 1, unrank: false }]} udict={{ 1: { _id: 1, uname: 'a' } }} tdoc={baseTdoc()} nowMs={contestEndMs - HOUR} onChange={() => {}} />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: RX_DELETE }));
    expect(screen.queryByText('a')).not.toBeInTheDocument();

    rejectRequest(new Error('Network down'));
    await waitFor(() => expect(screen.getByText('a')).toBeInTheDocument());
  });
});
