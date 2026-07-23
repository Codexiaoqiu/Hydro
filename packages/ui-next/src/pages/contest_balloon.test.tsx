/* @vitest-environment happy-dom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../components/primitives/Toast';
import ContestBalloonPage from './contest_balloon';
import { usePageData } from '../context/page-data';

vi.mock('../context/page-data', () => ({
  usePageData: vi.fn(),
  PageDataProvider: ({ children }: any) => children,
  useUiContext: () => ({ domainId: 'system', domain: null }),
}));

vi.mock('../components/link', () => ({
  Link: ({ children, to, params, ...rest }: any) => (
    <a data-testid={`link-${to}`} href={`/${to}/${params?.tid ?? ''}`} {...rest}>
      {children}
    </a>
  ),
  useBuildUrl: () => (_name: string, _params?: Record<string, string>) => '#',
}));

const isOngoingMock = vi.fn(() => true);
vi.mock('../lib/contest-status', () => ({
  isOngoing: (...args: any[]) => isOngoingMock(...args),
}));

const useBalloonPollMock = vi.fn();
vi.mock('../hooks/use-balloon-poll', () => ({
  useBalloonPoll: (...args: any[]) => useBalloonPollMock(...args),
}));

vi.mock('../components/primitives/Toast', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../components/primitives/Toast')>();
  return {
    ...actual,
    useToast: () => ({ info: vi.fn(), success: vi.fn(), error: vi.fn() }),
  };
});

const mockPageData = usePageData as unknown as ReturnType<typeof vi.fn>;

const baseArgs = {
  tdoc: {
    docId: '6500000000000000000000ab',
    _id: '6500000000000000000000ab',
    title: 'Test',
    rule: 'acm',
    beginAt: '2020-01-01T00:00:00.000Z',
    endAt: '2099-12-31T23:59:59.000Z',
    pids: [1, 2],
    balloon: {
      1: { color: '#fbbd23', name: 'Yellow' },
      2: { color: '#3b82f6', name: 'Blue' },
    },
  },
  bdocs: [
    { _id: 'B1', pid: 1, uid: 7, first: true },
    { _id: 'B2', pid: 2, uid: 8 },
    { _id: 'B3', pid: 1, uid: 9, sent: 1, sentAt: 1_700_000_000_000 },
  ],
  pdict: {
    1: { docId: 1, pid: 'A', title: 'A+B' },
    2: { docId: 2, pid: 'B', title: 'Hello' },
  },
  udict: {
    1: { _id: 1, uname: 'admin' },
    7: { _id: 7, uname: 'alice' },
    8: { _id: 8, uname: 'bob' },
    9: { _id: 9, uname: 'carol' },
  },
};

describe('ContestBalloonPage', () => {
  beforeEach(() => {
    isOngoingMock.mockReturnValue(true);
    useBalloonPollMock.mockReturnValue({
      data: null,
      pending: false,
      error: null,
      refresh: vi.fn(),
    });
    mockPageData.mockReturnValue({ args: baseArgs });
  });

  it('reads from real wire fields (bdocs / tdoc.pids / tdoc.balloon / pdict / udict)', () => {
    render(
      <ToastProvider>
        <ContestBalloonPage />
      </ToastProvider>,
    );
    // Title from pdict, not from a `rows[*].problem` shim.
    expect(screen.getAllByText('A+B').length).toBeGreaterThan(0);
    expect(screen.getByText('Hello')).toBeInTheDocument();
    // Submitter names come from udict (uid-keyed, numeric).
    expect(screen.getAllByText('alice').length).toBeGreaterThan(0);
    expect(screen.getByText('bob')).toBeInTheDocument();
  });

  it('exposes a back link to the contest detail page', () => {
    render(
      <ToastProvider>
        <ContestBalloonPage />
      </ToastProvider>,
    );
    const back = screen.getByTestId('contest-back-link');
    expect(back.getAttribute('href')).toBe('/contest_detail/6500000000000000000000ab');
  });

  it('passes enabled = isOngoing(tdoc, Date.now()) to useBalloonPoll', () => {
    mockPageData.mockReturnValue({ args: baseArgs });
    isOngoingMock.mockReturnValue(true);
    render(
      <ToastProvider>
        <ContestBalloonPage />
      </ToastProvider>,
    );
    const call = useBalloonPollMock.mock.calls.at(-1)?.[0];
    expect(call).toEqual(expect.objectContaining({ enabled: true }));

    isOngoingMock.mockReturnValue(false);
    render(
      <ToastProvider>
        <ContestBalloonPage />
      </ToastProvider>,
    );
    const lastCall = useBalloonPollMock.mock.calls.at(-1)?.[0];
    expect(lastCall).toEqual(expect.objectContaining({ enabled: false }));
  });

  it('a successful Set Color save fires onSaved -> refresh even when auto-polling is disabled', async () => {
    isOngoingMock.mockReturnValue(false);
    const refresh = vi.fn();
    useBalloonPollMock.mockReturnValue({
      data: null,
      pending: false,
      error: null,
      refresh,
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({}),
    });
    (global as any).fetch = fetchMock;
    render(
      <ToastProvider>
        <ContestBalloonPage />
      </ToastProvider>,
    );
    // Open the Set Color modal. Its rows are seeded from tdoc.balloon, so
    // every pid already has a valid color + name and Save passes validation.
    fireEvent.click(screen.getByRole('button', { name: /设置颜色|set color/i }));
    fireEvent.click(screen.getByRole('button', { name: /保存|save/i }));
    // A successful save must POST and then invoke the page's refresh() (wired
    // into the modal's onSaved) — even though the contest is no longer ongoing
    // and auto-polling is disabled.
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'POST' }),
    ));
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  });

  it('uses polled data (bdocs / pdict / udict) when present, falling back to args', () => {
    useBalloonPollMock.mockReturnValue({
      data: {
        bdocs: [{ _id: 'BX', pid: 2, uid: 8 }],
        pdict: {
          2: { docId: 2, pid: 'B', title: 'LiveTitle' },
        },
        udict: { 8: { _id: 8, uname: 'live-user' } },
      },
      pending: false,
      error: null,
      refresh: vi.fn(),
    });
    render(
      <ToastProvider>
        <ContestBalloonPage />
      </ToastProvider>,
    );
    expect(screen.getByText('LiveTitle')).toBeInTheDocument();
    expect(screen.getByText('live-user')).toBeInTheDocument();
    // args-provided submitter should NOT appear once the polled data wins.
    expect(screen.queryByText('alice')).not.toBeInTheDocument();
  });

  it('renders the Set Color modal that edits every pid', () => {
    render(
      <ToastProvider>
        <ContestBalloonPage />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: /设置颜色|set color/i }));
    // Open the Set Color modal — one hex input per pid.
    const inputs = screen.getAllByRole('textbox', { name: /hex/i });
    expect(inputs).toHaveLength(2);
  });
});