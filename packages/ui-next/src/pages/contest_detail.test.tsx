/* @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@monaco-editor/react', () => ({
  Editor: () => null,
  loader: { config: vi.fn() },
}));

vi.mock('../hooks/use-api', () => ({
  request: { post: vi.fn() },
  HydroClientError: class extends Error {},
  useApi: () => ({ run: vi.fn(), loading: false, error: null, data: null, setError: vi.fn() }),
}));

vi.mock('../hooks/use-build-url', () => ({
  useBuildUrl: () => (_name: string, params?: Record<string, string>) =>
    `/contest/${params?.tid ?? 'abc'}`,
}));

vi.mock('../components/primitives/Toast', () => ({
  useToast: () => ({ info: vi.fn(), success: vi.fn(), error: vi.fn() }),
}));

vi.mock('../components/link', () => ({
  Link: ({ children, to, params, ...rest }: any) => (
    <a data-testid={`link-${to}`} href={`/${to}/${params?.tid ?? ''}`} {...rest}>
      {children}
    </a>
  ),
  useBuildUrl: () => (_name: string, _params?: Record<string, string>) => '#',
}));

vi.mock('../context/page-data', () => ({
  usePageData: () => null,
  PageDataProvider: ({ children }: any) => children,
  useUiContext: () => ({ domainId: 'system', domain: null }),
}));

// Force deterministic timer state.
vi.mock('../lib/contest-timer', () => ({
  useContestTimer: () => ({
    status: 'running' as const,
    msLeft: 3600_000,
    progress: 0.3,
    display: '01:00:00',
  }),
  computeTimerState: () => ({ status: 'running', msLeft: 0, progress: 0, display: '' }),
}));

const beginIso = new Date(Date.now() - 3600_000).toISOString();
const endIso = new Date(Date.now() + 3600_000).toISOString();

function buildPageData(args: any = {}) {
  const userCtx = args.UserContext ?? {
    _id: 99,
    perm: '',
    hasPerm: () => true,
    own: () => false,
  };
  const { UserContext: _u, ...rest } = args;
  return {
    name: 'contest_detail',
    template: 'contest_detail.html',
    url: '/contest/abc',
    args: { UserContext: userCtx, UiContext: {}, ...rest },
  } as any;
}

import ContestDetailPage from './contest_detail';

describe('contest_detail page', () => {
  it('renders loading state when args is undefined', () => {
    render(<ContestDetailPage />);
    expect(screen.getByText(/比赛信息加载中|Contest information is loading/i)).toBeInTheDocument();
  });

  it('renders full upcoming non-attended contest', () => {
    const tdoc = {
      _id: '60a000000000000000000001',
      docId: '60a000000000000000000001',
      title: 'Summer Cup',
      rule: 'acm',
      beginAt: beginIso,
      endAt: endIso,
      duration: 5,
      owner: 1,
      pids: [],
    };
    const udict = { 1: { _id: 1, uname: 'admin', perm: 'BigInt::0' } };
    render(
      <ContestDetailPage
        _pageData={buildPageData({ tdoc, tsdoc: null, udict, files: [], urlForFile: (n: string) => `/f/${n}` })}
      />,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Summer Cup' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /报名参赛|Attend Contest/i })).toBeInTheDocument();
  });

  it('renders ongoing attended contest with private files', () => {
    const tdoc = {
      _id: '60a000000000000000000001',
      docId: '60a000000000000000000001',
      title: 'Live Contest',
      rule: 'acm',
      beginAt: beginIso,
      endAt: endIso,
      duration: 5,
      owner: 1,
      pids: [],
    };
    const tsdoc = { attend: 1, subscribe: 0, startAt: beginIso };
    const files = [{ name: 'spec.pdf', size: 4096 }];
    render(
      <ContestDetailPage
        _pageData={buildPageData({
          tdoc,
          tsdoc,
          udict: { 1: { _id: 1, uname: 'admin', perm: 'BigInt::0' } },
          files,
          urlForFile: (n: string) => `/f/${n}`,
        })}
      />,
    );
    expect(screen.getByRole('button', { name: /提前结束|End Contest Early/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'spec.pdf' })).toBeInTheDocument();
  });

  it('hides End Early when contest is done', () => {
    const tdoc = {
      _id: '60a000000000000000000001',
      docId: '60a000000000000000000001',
      title: 'Past Contest',
      rule: 'acm',
      beginAt: new Date(Date.now() - 7_200_000).toISOString(),
      endAt: new Date(Date.now() - 3_600_000).toISOString(),
      duration: 1,
      owner: 1,
      pids: [],
    };
    const tsdoc = { attend: 1, subscribe: 0, startAt: new Date(Date.now() - 7_200_000).toISOString() };
    render(
      <ContestDetailPage
        _pageData={buildPageData({
          tdoc,
          tsdoc,
          udict: { 1: { _id: 1, uname: 'admin', perm: 'BigInt::0' } },
          files: [],
          urlForFile: (n: string) => `/f/${n}`,
        })}
      />,
    );
    expect(screen.queryByRole('button', { name: /提前结束|End Contest Early/i })).not.toBeInTheDocument();
  });

  it('hides End Early for homework rule', () => {
    const tdoc = {
      _id: '60a000000000000000000001',
      docId: '60a000000000000000000001',
      title: 'HW',
      rule: 'homework',
      beginAt: beginIso,
      endAt: endIso,
      duration: 5,
      owner: 1,
      pids: [],
    };
    const tsdoc = { attend: 1, subscribe: 0, startAt: beginIso };
    render(
      <ContestDetailPage
        _pageData={buildPageData({
          tdoc,
          tsdoc,
          udict: { 1: { _id: 1, uname: 'admin', perm: 'BigInt::0' } },
          files: [],
          urlForFile: (n: string) => `/f/${n}`,
        })}
      />,
    );
    expect(screen.queryByRole('button', { name: /提前结束|End Contest Early/i })).not.toBeInTheDocument();
  });
});
