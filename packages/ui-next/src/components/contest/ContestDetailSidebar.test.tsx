/* @vitest-environment happy-dom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ContestDetailSidebar } from './ContestDetailSidebar';

const requestPost = vi.fn();
const reloadSpy = vi.fn();
const toastFn = { info: vi.fn(), success: vi.fn(), error: vi.fn() };

vi.mock('../../hooks/use-build-url', () => ({
  useBuildUrl: () => (_name: string, params?: Record<string, string>) => {
    const tid = params?.tid ?? 'unknown';
    return `/contest/${tid}`;
  },
}));

vi.mock('../primitives/Toast', () => ({
  useToast: () => toastFn,
}));

vi.mock('../link', () => ({
  Link: ({ children, to, params, ...rest }: any) => (
    <a data-testid={`link-${to}`} href={`/${to}/${params?.tid ?? ''}`} {...rest}>
      {children}
    </a>
  ),
  useBuildUrl: () => (_name: string, _params?: Record<string, string>) => '#',
}));

vi.mock('../../hooks/use-api', () => ({
  request: { post: (...args: unknown[]) => requestPost(...args) },
  HydroClientError: class extends Error {
    code: number;
    constructor(init: { code?: number, message?: string }) {
      super(init.message ?? 'error');
      this.code = init.code ?? 0;
    }
  },
  useApi: () => ({
    run: requestPost,
    loading: false,
    error: null,
    data: null,
    setError: vi.fn(),
  }),
}));

const NOW = Date.now();
const begin = new Date(NOW - 3600_000).toISOString();
const end = new Date(NOW + 3600_000).toISOString();

function tdoc(over: Record<string, unknown> = {}): any {
  return {
    _id: '60a000000000000000000001',
    docId: '60a000000000000000000001',
    title: 'Test',
    rule: 'acm',
    beginAt: begin,
    endAt: end,
    owner: 1,
    pids: [],
    allowPrint: false,
    ...over,
  };
}

function tsdoc(over: Record<string, unknown> = {}): any {
  return { attend: 0, subscribe: 0, ...over };
}

function udict(): any {
  return { 1: { _id: 1, uname: 'owner', perm: 'BigInt::0' } };
}

function userWith(perms: string[] = []) {
  return {
    _id: 2,
    hasPerm: (p: string) => perms.includes(p),
    own: () => false,
  };
}

beforeEach(() => {
  requestPost.mockReset();
  reloadSpy.mockReset();
  toastFn.info.mockReset();
  toastFn.success.mockReset();
  toastFn.error.mockReset();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { reload: reloadSpy, href: 'http://localhost/contest/abc' },
  });
  // happy-dom does not implement window.prompt; define it as a writable
  // stub so vi.spyOn can attach to a real function.
  Object.defineProperty(window, 'prompt', {
    configurable: true,
    writable: true,
    value: undefined,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('contestDetailSidebar', () => {
  it('shows Attend button when canAttend and triggers POST on click', async () => {
    requestPost.mockResolvedValueOnce({});
    render(
      <ContestDetailSidebar tdoc={tdoc()} tsdoc={null} udict={udict()} urlForFile={(n) => `/f/${n}`} currentUserPerms={userWith(['PERM_ATTEND_CONTEST'])} />,
    );
    const btn = await screen.findByRole('button', { name: /报名参赛|Attend Contest/i });
    fireEvent.click(btn);
    await waitFor(() => expect(requestPost).toHaveBeenCalled());
    expect(reloadSpy).toHaveBeenCalled();
  });

  it('prompts for invitation code when tdoc._code exists', async () => {
    requestPost.mockResolvedValueOnce({});
    const promptMock = vi.fn().mockReturnValue('secret');
    (window as any).prompt = promptMock;
    render(
      <ContestDetailSidebar tdoc={tdoc({ _code: 'secret' })} tsdoc={null} udict={udict()} urlForFile={(n) => `/f/${n}`} currentUserPerms={userWith(['PERM_ATTEND_CONTEST'])} />,
    );
    const btn = await screen.findByRole('button', { name: /报名参赛|Attend Contest/i });
    fireEvent.click(btn);
    await waitFor(() => expect(promptMock).toHaveBeenCalled());
    await waitFor(() => expect(requestPost).toHaveBeenCalled());
    const args = requestPost.mock.calls[0];
    expect((args[1] as URLSearchParams).get('code')).toBe('secret');
  });

  it('renders Error alert when Attend POST rejects', async () => {
    requestPost.mockRejectedValueOnce(new Error('Invitation code invalid'));
    render(
      <ContestDetailSidebar tdoc={tdoc()} tsdoc={null} udict={udict()} urlForFile={(n) => `/f/${n}`} currentUserPerms={userWith(['PERM_ATTEND_CONTEST'])} />,
    );
    const btn = await screen.findByRole('button', { name: /报名参赛|Attend Contest/i });
    fireEvent.click(btn);
    expect(await screen.findByText(/Invitation code invalid/i)).toBeInTheDocument();
  });

  it('does not render End Early button for homework rule', () => {
    render(
      <ContestDetailSidebar
        tdoc={tdoc({ rule: 'homework' })}
        tsdoc={tsdoc({ attend: 1 })}
        udict={udict()}
        urlForFile={(n) => `/f/${n}`}
      />,
    );
    expect(screen.queryByRole('button', { name: /提前结束|End Contest Early/i })).not.toBeInTheDocument();
  });

  it('renders End Early button for ongoing attended non-homework contest', () => {
    render(
      <ContestDetailSidebar
        tdoc={tdoc()}
        tsdoc={tsdoc({ attend: 1 })}
        udict={udict()}
        urlForFile={(n) => `/f/${n}`}
      />,
    );
    expect(screen.getByRole('button', { name: /提前结束|End Contest Early/i })).toBeInTheDocument();
  });

  it('renders Scoreboard link when canShowScoreboard', () => {
    render(
      <ContestDetailSidebar tdoc={tdoc()} tsdoc={null} udict={udict()} urlForFile={(n) => `/f/${n}`} />,
    );
    expect(screen.getByRole('link', { name: /排行榜|Scoreboard/i })).toBeInTheDocument();
  });

  it('renders All submissions link when canShowAllRecord (done + perm)', () => {
    const doneEnd = new Date(NOW - 60_000).toISOString();
    render(
      <ContestDetailSidebar
        tdoc={tdoc({ endAt: doneEnd })}
        tsdoc={null}
        udict={udict()}
        urlForFile={(n) => `/f/${n}`}
        currentUserPerms={userWith(['PERM_READ_RECORD_CODE'])}
      />,
    );
    expect(screen.getByRole('link', { name: /所有提交|All submissions/i })).toBeInTheDocument();
  });
});
