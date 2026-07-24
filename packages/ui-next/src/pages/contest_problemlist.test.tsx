/* @vitest-environment happy-dom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ContestProblemListPage from './contest_problemlist';

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
  useBuildUrl: () => (_name: string, params?: Record<string, string>) => `/p/${params?.pid ?? 'x'}`,
}));

vi.mock('../components/primitives/Toast', () => ({
  useToast: () => ({ info: vi.fn(), success: vi.fn(), error: vi.fn() }),
}));

vi.mock('../components/link', () => ({
  Link: ({ children, to, params, searchParams, ...rest }: any) => (
    <a data-testid={`link-${to}`} href={`/${to}/${params?.pid ?? params?.tid ?? ''}`} {...rest}>
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
    name: 'contest_problemlist',
    template: 'contest_problemlist.html',
    url: '/contest/abc/problems',
    args: { UserContext: userCtx, UiContext: {}, ...rest },
  } as any;
}

describe('contest_problemlist page', () => {
  it('renders loading state when args is undefined', () => {
    render(<ContestProblemListPage />);
    expect(screen.getByText(/比赛信息加载中|Contest information is loading/i)).toBeInTheDocument();
  });

  it('renders empty state when contest has no problems', () => {
    const tdoc = {
      _id: '60a000000000000000000001',
      docId: '60a000000000000000000001',
      title: 'Empty Contest',
      rule: 'acm',
      beginAt: beginIso,
      endAt: endIso,
      duration: 5,
      owner: 1,
      pids: [],
    };
    render(
      <ContestProblemListPage
        _pageData={buildPageData({
          tdoc,
          tsdoc: { attend: 1, subscribe: 0, startAt: beginIso },
          pdict: {},
          psdict: {},
          udict: { 1: { _id: 1, uname: 'admin', perm: 'BigInt::0' } },
          tcdocs: [],
          showScore: false,
          canViewRecord: true,
        })}
      />,
    );
    expect(screen.getByText(/比赛暂未包含题目|Contest has no problems yet/i)).toBeInTheDocument();
  });

  it('renders table with problems, score, and status columns', () => {
    const tdoc = {
      _id: '60a000000000000000000001',
      docId: '60a000000000000000000001',
      title: 'Live Contest',
      rule: 'acm',
      beginAt: beginIso,
      endAt: endIso,
      duration: 5,
      owner: 1,
      pids: [101, 102],
    };
    const pdict = {
      101: { docId: 101, pid: 'A', title: 'Sum of Two' },
      102: { docId: 102, pid: 'B', title: 'Longest Substring' },
    };
    const psdict = {
      101: { rid: '60b001', score: 100, status: 1 },
      102: { rid: '60b002', score: 0, status: 4 },
    };
    render(
      <ContestProblemListPage
        _pageData={buildPageData({
          tdoc,
          tsdoc: { attend: 1, subscribe: 0, startAt: beginIso },
          pdict,
          psdict,
          udict: { 1: { _id: 1, uname: 'admin', perm: 'BigInt::0' } },
          tcdocs: [],
          showScore: true,
          canViewRecord: true,
        })}
      />,
    );
    expect(screen.getByText('Sum of Two')).toBeInTheDocument();
    expect(screen.getByText('Longest Substring')).toBeInTheDocument();
    expect(screen.getAllByText('A').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('B').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId('status-score-1').textContent).toBe('100');
  });

  it('renders attended banner for ongoing attended contest', () => {
    const tdoc = {
      _id: '60a000000000000000000001',
      docId: '60a000000000000000000001',
      title: 'Live',
      rule: 'acm',
      beginAt: beginIso,
      endAt: endIso,
      duration: 5,
      owner: 1,
      pids: [],
    };
    render(
      <ContestProblemListPage
        _pageData={buildPageData({
          tdoc,
          tsdoc: { attend: 1, subscribe: 0, startAt: beginIso },
          pdict: {},
          psdict: {},
          udict: {},
          tcdocs: [],
          showScore: false,
          canViewRecord: false,
        })}
      />,
    );
    expect(screen.getByText(/比赛已开始|Contest is live/i)).toBeInTheDocument();
  });

  it('renders clarification list', () => {
    const tdoc = {
      _id: '60a000000000000000000001',
      docId: '60a000000000000000000001',
      title: 'C',
      rule: 'acm',
      beginAt: beginIso,
      endAt: endIso,
      duration: 5,
      owner: 1,
      pids: [],
    };
    const tcdocs = [
      { _id: 'c1', subject: 101, content: 'What is the time limit?', owner: 99, reply: [{ content: '2 seconds' }] },
    ];
    render(
      <ContestProblemListPage
        _pageData={buildPageData({
          tdoc,
          tsdoc: { attend: 1, subscribe: 0, startAt: beginIso },
          pdict: {},
          psdict: {},
          udict: {},
          tcdocs,
          showScore: false,
          canViewRecord: true,
        })}
      />,
    );
    expect(screen.getByText(/What is the time limit/)).toBeInTheDocument();
    expect(screen.getByText(/2 seconds/)).toBeInTheDocument();
  });

  it('renders the accept / fail SVG icons in the status cell (P2-A.1)', () => {
    const tdoc = {
      _id: '60a000000000000000000001',
      docId: '60a000000000000000000001',
      title: 'Live',
      rule: 'acm',
      beginAt: beginIso,
      endAt: endIso,
      duration: 5,
      owner: 1,
      pids: [101, 102],
    };
    const pdict = {
      101: { docId: 101, pid: 'A', title: 'A' },
      102: { docId: 102, pid: 'B', title: 'B' },
    };
    const psdict = {
      101: { rid: '60b001', score: 100, status: 1 }, // STATUS_ACCEPTED
      102: { rid: '60b002', score: 0, status: 4 },   // STATUS_MEMORY_LIMIT_EXCEEDED → fail
    };
    render(
      <ContestProblemListPage
        _pageData={buildPageData({
          tdoc, tsdoc: { attend: 1, subscribe: 0, startAt: beginIso },
          pdict, psdict, udict: {}, tcdocs: [],
          showScore: true, canViewRecord: true,
        })}
      />,
    );
    expect(screen.getByTestId('icon-accept')).toBeInTheDocument();
    expect(screen.getByTestId('icon-fail')).toBeInTheDocument();
    expect(screen.getByTestId('status-accept-1')).toBeInTheDocument();
    expect(screen.getByTestId('status-fail-4')).toBeInTheDocument();
  });

  it('renders a progress ring for in-progress statuses (P2-A.1)', () => {
    const tdoc = {
      _id: '60a000000000000000000001',
      docId: '60a000000000000000000001',
      title: 'Live',
      rule: 'acm',
      beginAt: beginIso,
      endAt: endIso,
      duration: 5,
      owner: 1,
      pids: [101],
    };
    const psdict = { 101: { rid: '60b001', score: 0, status: 20 } }; // STATUS_JUDGING
    render(
      <ContestProblemListPage
        _pageData={buildPageData({
          tdoc, tsdoc: { attend: 1, subscribe: 0, startAt: beginIso },
          pdict: { 101: { docId: 101, pid: 'A', title: 'A' } },
          psdict, udict: {}, tcdocs: [],
          showScore: true, canViewRecord: true,
        })}
      />,
    );
    const progress = screen.getByTestId('status-progress-20');
    expect(progress.querySelector('svg')).toBeInTheDocument();
  });

  it('renders submissions list per problem when rdocs present (P2-A.2)', () => {
    const tdoc = {
      _id: '60a000000000000000000001',
      docId: '60a000000000000000000001',
      title: 'Live',
      rule: 'acm',
      beginAt: beginIso,
      endAt: endIso,
      duration: 5,
      owner: 1,
      pids: [101, 102],
    };
    const rdocs = [
      { _id: '60b01', pid: 101, status: 1, lang: 'cpp' },
      { _id: '60b02', pid: 102, status: 7, lang: 'py' },
    ];
    render(
      <ContestProblemListPage
        _pageData={buildPageData({
          tdoc, tsdoc: { attend: 1, subscribe: 0, startAt: beginIso },
          pdict: {
            101: { docId: 101, pid: 'A', title: 'A' },
            102: { docId: 102, pid: 'B', title: 'B' },
          },
          psdict: {}, udict: {}, tcdocs: [], rdocs,
          showScore: false, canViewRecord: true,
        })}
      />,
    );
    expect(screen.getByTestId('contest-submissions')).toBeInTheDocument();
    expect(screen.getByTestId('submissions-101')).toBeInTheDocument();
    expect(screen.getByTestId('submissions-102')).toBeInTheDocument();
  });

  it('renders the inline clarification ask form for attended users (P2-A.3)', () => {
    const tdoc = {
      _id: '60a000000000000000000001',
      docId: '60a000000000000000000001',
      title: 'Live',
      rule: 'acm',
      beginAt: beginIso,
      endAt: endIso,
      duration: 5,
      owner: 1,
      pids: [101],
    };
    render(
      <ContestProblemListPage
        _pageData={buildPageData({
          tdoc, tsdoc: { attend: 1, subscribe: 0, startAt: beginIso },
          pdict: { 101: { docId: 101, pid: 'A', title: 'A' } },
          psdict: {}, udict: {}, tcdocs: [],
          showScore: false, canViewRecord: true,
        })}
      />,
    );
    expect(screen.getByTestId('clar-inline-ask')).toBeInTheDocument();
  });


  it('renders private files when tdoc.privateFiles is present (P2-A.4)', () => {
    const tdoc = {
      _id: '60a000000000000000000001',
      docId: '60a000000000000000000001',
      title: 'Live',
      rule: 'acm',
      beginAt: beginIso,
      endAt: endIso,
      duration: 5,
      owner: 1,
      pids: [],
      privateFiles: [
        { name: 'rule.pdf', size: 4096 },
        { name: 'sample.txt', size: 512 },
      ],
    };
    render(
      <ContestProblemListPage
        _pageData={buildPageData({
          tdoc, tsdoc: { attend: 1, subscribe: 0, startAt: beginIso },
          pdict: {}, psdict: {}, udict: {}, tcdocs: [],
          showScore: false, canViewRecord: true,
        })}
      />,
    );
    const wrap = screen.getByTestId('contest-private-files');
    expect(wrap).toBeInTheDocument();
    expect(wrap.textContent).toContain('rule.pdf');
    expect(wrap.textContent).toContain('sample.txt');
  });

  it('exposes a back link to the contest detail page', () => {
    const tdoc = {
      _id: '60a000000000000000000001',
      docId: '60a000000000000000000001',
      title: 'C',
      rule: 'acm',
      beginAt: beginIso,
      endAt: endIso,
      duration: 5,
      owner: 1,
      pids: [],
    };
    render(
      <ContestProblemListPage
        _pageData={buildPageData({
          tdoc,
          tsdoc: { attend: 1, subscribe: 0, startAt: beginIso },
          pdict: {},
          psdict: {},
          udict: {},
          tcdocs: [],
          showScore: false,
          canViewRecord: true,
        })}
      />,
    );
    const back = screen.getByTestId('contest-back-link');
    expect(back).toBeInTheDocument();
    expect(back.getAttribute('href')).toBe('/contest_detail/60a000000000000000000001');
  });
});
