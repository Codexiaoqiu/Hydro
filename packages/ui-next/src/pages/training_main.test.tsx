/* @vitest-environment happy-dom */

import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../components/primitives/Toast';
import { type PageData, PageDataProvider } from '../context/page-data';
import * as routerMod from '../context/router';
import { RouterProvider } from '../context/router';
import { routeMapStore } from '../globals';
import { ThemeProvider } from '../theme/ThemeProvider';
import TrainingMain from './training_main';

function buildPageData(args: PageData['args']): PageData {
  return {
    name: 'training_main',
    template: 'training_main.html',
    args: {
      UserContext: {},
      UiContext: {},
      ...args,
    } as PageData['args'],
    url: '/training',
  };
}

function Providers({ args, children }: { args: PageData['args'], children: ReactNode }) {
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

function renderPage(args: PageData['args']) {
  // Mirror the router's initial GET back to the test's args so the
  // RouterProvider's mount effect does not clobber PageData.
  vi.stubGlobal('fetch', vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
    if (init?.method === 'POST') return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
    return new Response(JSON.stringify(args), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }));
  return render(
    <Providers args={args}>
      <TrainingMain />
    </Providers>,
  );
}

describe('training_main', () => {
  let originalRouteMap: Record<string, string>;
  let navigateSpy: ReturnType<typeof vi.fn>;
  let restoreConsoleError: () => void;
  let restoreConsoleWarn: () => void;

  beforeEach(() => {
    originalRouteMap = { ...routeMapStore._routeMap };
    routeMapStore.set({
      training_main: '/training',
      training_detail: '/training/:tid',
      training_create: '/training/create',
    });

    navigateSpy = vi.fn();
    vi.spyOn(routerMod, 'useNavigate').mockImplementation(
      () => navigateSpy as unknown as (url: string) => Promise<void>,
    );

    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    restoreConsoleError = () => err.mockRestore();
    restoreConsoleWarn = () => warn.mockRestore();
  });

  afterEach(() => {
    routeMapStore._routeMap = originalRouteMap;
    restoreConsoleError();
    restoreConsoleWarn();
    vi.restoreAllMocks();
  });

  it('renders the empty state when no training plans exist', () => {
    renderPage({ tdocs: [], page: 1, tpcount: 0 });
    expect(screen.getByTestId('training-empty')).toHaveTextContent('暂无训练计划');
  });

  it('renders one row per tdoc with title, sections, problems, and progress', () => {
    renderPage({
      tdocs: [
        {
          docId: 'tid1',
          title: 'A+B 入门',
          content: 'Hello',
          dag: [
            { _id: 1, pids: [1, 2] },
            { _id: 2, pids: [3], requireNids: [1] } as never,
          ],
          attend: 12,
        },
        {
          docId: 'tid2',
          title: '进阶图论',
          dag: [{ _id: 1, pids: [10, 11, 12] }],
          attend: 5,
        },
      ],
      tsdict: {
        tid1: { docId: 'tid1', enroll: 1, done: false, donePids: ['1'] },
      },
      tdict: {},
      page: 1,
      tpcount: 2,
    });

    const links = screen.getAllByRole('link');
    const titles = links.map((a) => a.textContent).filter((t) => t && (t.includes('A+B') || t.includes('进阶图论')));
    expect(titles.length).toBeGreaterThanOrEqual(2);

    // tid1: 2 sections, 3 problems (1+2 deduped is 3, but combined set is {1,2,3}=3).
    // tid2: 1 section, 3 problems.
    expect(screen.getByText('2 章节，3 题目')).toBeInTheDocument();
    expect(screen.getByText('1 章节，3 题目')).toBeInTheDocument();

    // tid1 user has 1/3 done, so progress should be 33%.
    expect(screen.getByText(/进行中 33%/)).toBeInTheDocument();

    // tid2 has no tsdict entry; logged-out user sees neither enrolled nor unenrolled label.
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('shows "已完成 100%" when tsdoc.done is true', () => {
    renderPage({
      tdocs: [{ docId: 'tid1', title: 'Done plan', dag: [{ _id: 1, pids: [1] }] }],
      tsdict: {
        tid1: { docId: 'tid1', enroll: 1, done: true, donePids: ['1'] },
      },
      tdict: {},
      page: 1,
      tpcount: 1,
    });
    expect(screen.getByText(/已完成 100%/)).toBeInTheDocument();
  });

  it('renders pagination when tpcount > 1', () => {
    renderPage({
      tdocs: [{ docId: 'tid1', title: 'P1', dag: [{ _id: 1, pids: [1] }] }],
      page: 2,
      tpcount: 5,
    });
    const nav = screen.getByRole('navigation', { name: /训练分页/ });
    const items = within(nav).getAllByRole('link');
    const labels = items.map((a) => a.textContent);
    expect(labels).toContain('1');
    expect(labels).toContain('2');
    expect(labels).toContain('5');
  });

  it('does not render pagination when tpcount is 0 or 1', () => {
    const { rerender } = render(
      <Providers args={{ tdocs: [], page: 1, tpcount: 0 }}>
        <TrainingMain />
      </Providers>,
    );
    expect(screen.queryByRole('navigation', { name: /训练分页/ })).not.toBeInTheDocument();
    rerender(
      <Providers args={{ tdocs: [{ docId: 'a', title: 'A', dag: [] }], page: 1, tpcount: 1 }}>
        <TrainingMain />
      </Providers>,
    );
    expect(screen.queryByRole('navigation', { name: /训练分页/ })).not.toBeInTheDocument();
  });

  it('submits the search form and navigates with the q parameter', () => {
    renderPage({ tdocs: [], page: 1, tpcount: 0, q: '' });
    const input = screen.getByLabelText('搜索训练计划') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'graph' } });
    fireEvent.submit(input.closest('form')!);
    expect(navigateSpy).toHaveBeenCalledWith('/training?q=graph');
  });

  it('hides the create sidebar when the user lacks PERM_CREATE_TRAINING', () => {
    renderPage({
      tdocs: [],
      page: 1,
      tpcount: 0,
      UserContext: { _id: 1, perm: 'BigInt::0' },
    });
    expect(screen.queryByRole('link', { name: /新建训练计划/ })).not.toBeInTheDocument();
  });

  it('shows the create sidebar when the user has PERM_CREATE_TRAINING', () => {
    // PERM_CREATE_TRAINING is 1n<<47n (packages/common/permission.ts:81).
    renderPage({
      tdocs: [],
      page: 1,
      tpcount: 0,
      UserContext: { _id: 1, perm: 'BigInt::140737488355328' }, // 1<<47
    });
    expect(screen.getByRole('link', { name: /新建训练计划/ })).toBeInTheDocument();
  });
});
