/* @vitest-environment happy-dom */

import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../components/primitives/Toast';
import { type PageData, PageDataProvider } from '../context/page-data';
import * as routerMod from '../context/router';
import { routeMapStore } from '../globals';
import { ThemeProvider } from '../theme/ThemeProvider';
import HomeworkMain from './homework_main';

function buildPageData(args: PageData['args']): PageData {
  return {
    name: 'homework_main',
    template: 'homework_main.html',
    args: { UserContext: {}, UiContext: {}, ...args } as PageData['args'],
    url: '/homework',
  };
}

function Providers({ args, children }: { args: PageData['args'], children: ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <PageDataProvider initial={buildPageData(args)}>{children}</PageDataProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

function renderPage(args: PageData['args']) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(args), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })));
  return render(
    <Providers args={args}>
      <HomeworkMain />
    </Providers>,
  );
}

describe('homework_main', () => {
  let originalRouteMap: Record<string, string>;
  let navigateSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    originalRouteMap = { ...routeMapStore._routeMap };
    routeMapStore.set({
      homework_main: '/homework',
      homework_detail: '/homework/:tid',
      homework_create: '/homework/create',
    });
    navigateSpy = vi.fn();
    vi.spyOn(routerMod, 'useNavigate').mockImplementation(
      () => navigateSpy as unknown as (url: string) => Promise<void>,
    );
  });

  afterEach(() => {
    routeMapStore._routeMap = originalRouteMap;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders the empty state when no homework exists', () => {
    renderPage({ tdocs: [], page: 1, tpcount: 0 });
    expect(screen.getByTestId('homework-empty')).toHaveTextContent('暂无作业。');
  });

  it('renders homework titles, participation, and assignment groups', () => {
    renderPage({
      tdocs: [
        { docId: 'hw1', title: 'Algebra', content: 'Week one', attend: 12, assign: ['A', 'B'] },
        { docId: 'hw2', title: 'Geometry', attend: 3 },
      ],
      page: 1,
      tpcount: 2,
    });

    expect(screen.getByRole('link', { name: 'Algebra' })).toHaveAttribute('href', '/homework/hw1');
    expect(screen.getByText('Week one')).toBeInTheDocument();
    expect(screen.getByText('分组：A、B')).toBeInTheDocument();
    expect(screen.getByText('公开作业')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('navigates with search and group filters and preserves them in pagination', () => {
    renderPage({
      tdocs: [{ docId: 'hw1', title: 'Algebra' }],
      groups: ['A', 'B'],
      page: 2,
      tpcount: 4,
      q: '',
    });

    fireEvent.change(screen.getByLabelText('搜索作业'), { target: { value: 'graph' } });
    fireEvent.change(screen.getByLabelText('作业分组'), { target: { value: 'B' } });
    fireEvent.submit(screen.getByLabelText('搜索作业').closest('form')!);
    expect(navigateSpy).toHaveBeenCalledWith('/homework?q=graph&group=B');

    const nav = screen.getByRole('navigation', { name: '作业分页' });
    expect(within(nav).getByRole('link', { name: '3' })).toHaveAttribute(
      'href',
      '/homework?page=3&q=graph&group=B',
    );
  });

  it('hides the create button for a user without PERM_CREATE_HOMEWORK', () => {
    renderPage({
      tdocs: [{ docId: 'hw1', title: 'Algebra' }],
      page: 1,
      tpcount: 1,
      UserContext: { _id: 2, perm: 'BigInt::0', priv: 0 },
    });

    expect(screen.queryByText('创建作业')).not.toBeInTheDocument();
  });
});
