/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../components/primitives/Toast';
import { type PageData, PageDataProvider } from '../context/page-data';
import { RouterProvider } from '../context/router';
import { routeMapStore } from '../globals';
import { ThemeProvider } from '../theme/ThemeProvider';
import ProblemSolution from './problem_solution';

// `lib/i18n.ts` currently has unresolved conflict markers in the working tree
// (pre-existing baseline acknowledged in CLAUDE.md), so mock it to avoid the
// oxc parser failing the whole transform.
vi.mock('../lib/i18n', () => ({
  useTranslate: () => (key: string) => key,
}));

function buildPageData(args: Partial<PageData['args']> = {}): PageData {
  return {
    name: 'problem_solution',
    template: 'problem_solution.html',
    args: {
      UserContext: { _id: 1, hasPerm: () => true, own: () => true },
      UiContext: {},
      ...args,
    } as any,
    url: '/p/1/solution',
  };
}

function Providers({ args, children }: any) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <PageDataProvider initial={buildPageData(args)}>
          <RouterProvider>{children}</RouterProvider>
        </PageDataProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

describe('problemSolution', () => {
  beforeEach(() => {
    routeMapStore.set({ problem_solution: '/p/:pid/solution', problem_detail: '/p/:pid' });
  });
  afterEach(() => vi.restoreAllMocks());

  it('renders empty state when psdocs is empty', () => {
    render(<Providers args={{ psdocs: [], pcount: 0, pscount: 0, page: 1, udict: {}, pssdict: {}, pdoc: { docId: 1, owner: 1 } }}>
      <ProblemSolution />
    </Providers>);
    expect(screen.getByText(/暂无题解/)).toBeInTheDocument();
  });

  it('renders one CommentTree per psdoc', () => {
    render(<Providers args={{
      psdocs: [
        { docId: 'a', owner: 1, content: 'first', reply: [] },
        { docId: 'b', owner: 2, content: 'second', reply: [] },
      ],
      pcount: 1, pscount: 2, page: 1, udict: { 1: { _id: 1, uname: 'alice' }, 2: { _id: 2, uname: 'bob' } },
      pssdict: {}, pdoc: { docId: 1, owner: 1 },
    }}>
      <ProblemSolution />
    </Providers>);
    expect(screen.getByText('first')).toBeInTheDocument();
    expect(screen.getByText('second')).toBeInTheDocument();
  });

  it('renders Paginator when pcount > 1', () => {
    render(<Providers args={{
      psdocs: [{ docId: 'a', owner: 1, content: 'x', reply: [] }],
      pcount: 3, pscount: 30, page: 1, udict: { 1: { _id: 1, uname: 'a' } },
      pssdict: {}, pdoc: { docId: 1, owner: 1 },
    }}>
      <ProblemSolution />
    </Providers>);
    expect(screen.getByRole('navigation', { name: /分页/ })).toBeInTheDocument();
  });
});
