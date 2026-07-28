/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../components/primitives/Toast';
import { type PageData, PageDataProvider } from '../context/page-data';
import { RouterProvider } from '../context/router';
import { routeMapStore } from '../globals';
import { ThemeProvider } from '../theme/ThemeProvider';
import ProblemStatistics from './problem_statistics';

// `lib/i18n.ts` currently has unresolved conflict markers in the working tree
// (pre-existing baseline acknowledged in CLAUDE.md), so mock it to avoid the
// oxc parser failing the whole transform.
vi.mock('../lib/i18n', () => ({
  useTranslate: () => (key: string) => key,
}));

function build(args: Partial<PageData['args']> = {}): PageData {
  return {
    name: 'problem_statistics',
    template: 'problem_statistics.html',
    args: {
      UserContext: { _id: 1, hasPerm: () => true },
      UiContext: {},
      ...args,
    } as any,
    url: '/p/1/stat',
  };
}
function Providers({ args, children }: any) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <PageDataProvider initial={build(args)}>
          <RouterProvider>{children}</RouterProvider>
        </PageDataProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

describe('problemStatistics', () => {
  beforeEach(() => {
    routeMapStore.set({ problem_statistics: '/p/:pid/stat', problem_detail: '/p/:pid', record_detail: '/r/:rid' });
  });
  afterEach(() => vi.restoreAllMocks());

  it('renders empty state when rsdocs is empty', () => {
    render(<Providers args={{
      rsdocs: [], page: 1, pcount: 1, rscount: 0, sort: 'time', direction: 1,
      pdoc: { docId: 1, owner: 1 }, udict: {}, types: ['time', 'memory', 'lang', 'length'], udoc: { _id: 1, uname: 'a' },
    }}>
      <ProblemStatistics />
    </Providers>);
    expect(screen.getByText(/暂无提交/)).toBeInTheDocument();
  });

  it('renders one row per rsdoc', () => {
    render(<Providers args={{
      rsdocs: [{ _id: 'r1', uid: 2, status: 0, lang: 'cpp', length: 100, time: 1, memory: 1024 }],
      page: 1, pcount: 1, rscount: 1, sort: 'time', direction: 1,
      pdoc: { docId: 1, owner: 1 }, udict: { 2: { _id: 2, uname: 'b' } },
      types: ['time', 'memory', 'lang', 'length'], udoc: { _id: 1, uname: 'a' },
    }}>
      <ProblemStatistics />
    </Providers>);
    expect(screen.getByText('b')).toBeInTheDocument();
  });

  it('renders the sort filter form', () => {
    render(<Providers args={{
      rsdocs: [], page: 1, pcount: 1, rscount: 0, sort: 'time', direction: 1,
      pdoc: { docId: 1, owner: 1 }, udict: {}, types: ['time', 'memory', 'lang', 'length'], udoc: { _id: 1, uname: 'a' },
    }}>
      <ProblemStatistics />
    </Providers>);
    expect(screen.getByRole('combobox', { name: /sort/ })).toBeInTheDocument();
  });

  it('renders the status chart', () => {
    render(<Providers args={{
      rsdocs: [{ _id: 'r1', uid: 2, status: 0, lang: 'cpp', length: 100, time: 1, memory: 1024 }],
      page: 1, pcount: 1, rscount: 1, sort: 'time', direction: 1,
      pdoc: { docId: 1, owner: 1 }, udict: { 2: { _id: 2, uname: 'b' } },
      types: ['time', 'memory', 'lang', 'length'], udoc: { _id: 1, uname: 'a' },
    }}>
      <ProblemStatistics />
    </Providers>);
    expect(screen.getByTestId('submission-status-chart')).toBeInTheDocument();
    expect(screen.getByTestId('submission-score-chart')).toBeInTheDocument();
  });
});
