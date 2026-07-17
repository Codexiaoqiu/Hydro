/* @vitest-environment happy-dom */

import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type PageData, PageDataProvider } from '../context/page-data';
import * as routerMod from '../context/router';
import { routeMapStore } from '../globals';
import { PERM } from '../lib/perm-constants';
import { ThemeProvider } from '../theme/ThemeProvider';
import ContestMain from './contest_main';

function makeTdoc(overrides: Partial<{
  docId: string;
  title: string;
  rule: string;
  beginAt: string;
  endAt: string;
  rated: boolean;
  attend: number;
  duration: number;
}> = {}) {
  return {
    _id: overrides.docId ?? 'a1b2c3',
    docId: overrides.docId ?? 'a1b2c3',
    title: overrides.title ?? 'Spring Cup',
    rule: overrides.rule ?? 'acm',
    beginAt: overrides.beginAt ?? '2026-08-12T10:00:00.000Z',
    endAt: overrides.endAt ?? '2026-08-12T15:00:00.000Z',
    rated: overrides.rated,
    attend: overrides.attend,
    duration: overrides.duration,
  };
}

function renderPage(args: Record<string, unknown>, UserContext: Record<string, unknown> = {}) {
  const pageData: PageData = {
    name: 'contest_main',
    template: 'contest_main.html',
    url: '/contest',
    args: {
      UserContext,
      UiContext: { domainId: 'system', domainVersion: 1 },
      ...args,
    },
  };
  return render(
    <ThemeProvider>
      <PageDataProvider initial={pageData}>
        <ContestMain />
      </PageDataProvider>
    </ThemeProvider>,
  );
}

describe('contestMain', () => {
  let originalRouteMap: Record<string, string>;
  let navigateSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-17T12:00:00.000Z'));
    originalRouteMap = { ...routeMapStore._routeMap };
    routeMapStore.set({
      contest_main: '/contest',
      contest_detail: '/contest/:tid',
      contest_create: '/contest/create',
    });
    navigateSpy = vi.fn();
    vi.spyOn(routerMod, 'useNavigate').mockImplementation(
      () => navigateSpy as unknown as (url: string) => Promise<void>,
    );
  });

  afterEach(() => {
    routeMapStore._routeMap = originalRouteMap;
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('shows empty state when no contests are available', () => {
    renderPage({ tdocs: [], tsdict: {}, tpcount: 0, page: 1, qs: '', rule: '', group: '', q: '', groups: [] });
    expect(screen.getByText(/暂无比赛|No contests/i)).toBeInTheDocument();
  });

  it('renders a contest row with its rule chip', () => {
    const tdoc = makeTdoc({ rule: 'acm', title: 'XCPC Demo' });
    renderPage({ tdocs: [tdoc], tsdict: {}, tpcount: 1, page: 1, qs: '', rule: '', group: '', q: '', groups: [] });
    expect(screen.getByText('XCPC Demo')).toBeInTheDocument();
    expect(screen.getAllByText('XCPC').length).toBeGreaterThan(0);
  });

  it('shows a live hero for an ongoing contest', () => {
    const tdoc = makeTdoc({
      rule: 'oi',
      title: 'OI Live',
      beginAt: '2026-07-17T10:00:00.000Z',
      endAt: '2026-07-17T14:00:00.000Z',
      duration: 4,
    });
    renderPage({ tdocs: [tdoc], tsdict: {}, tpcount: 1, page: 1, qs: '', rule: '', group: '', q: '', groups: [] });
    expect(screen.getAllByText('OI Live').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Live/i).length).toBeGreaterThan(0);
  });

  it('shows a ready hero for a contest starting within seven days', () => {
    const tdoc = makeTdoc({
      rule: 'ioi',
      title: 'IOI Upcoming',
      beginAt: '2026-07-19T10:00:00.000Z',
      endAt: '2026-07-19T15:00:00.000Z',
      duration: 5,
    });
    renderPage({ tdocs: [tdoc], tsdict: {}, tpcount: 1, page: 1, qs: '', rule: '', group: '', q: '', groups: [] });
    expect(screen.getAllByText('IOI Upcoming').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/即将开始|Ready/i).length).toBeGreaterThan(0);
  });

  it('shows the attended chip when the status dictionary marks attendance', () => {
    const tdoc = makeTdoc({ docId: 'att1', title: 'Enrolled' });
    renderPage({
      tdocs: [tdoc],
      tsdict: { att1: { attend: 1 } },
      tpcount: 1,
      page: 1,
      qs: '',
      rule: '',
      group: '',
      q: '',
      groups: [],
    });
    expect(screen.getByText('已报名')).toBeInTheDocument();
  });

  it('shows the Rated chip for rated contests', () => {
    const tdoc = makeTdoc({ rated: true, title: 'Rated Round' });
    renderPage({ tdocs: [tdoc], tsdict: {}, tpcount: 1, page: 1, qs: '', rule: '', group: '', q: '', groups: [] });
    expect(screen.getByText('Rated')).toBeInTheDocument();
  });

  it('shows the create CTA only with the create permission', () => {
    const permCreate = `BigInt::${PERM.PERM_VIEW_CONTEST | PERM.PERM_CREATE_CONTEST}`;
    const permViewOnly = `BigInt::${PERM.PERM_VIEW_CONTEST}`;
    const args = { tdocs: [], tsdict: {}, tpcount: 0, page: 1, qs: '', rule: '', group: '', q: '', groups: [] };

    const firstRender = renderPage(args, { perm: permCreate });
    expect(screen.getByRole('button', { name: '+ 新建比赛' })).toBeInTheDocument();
    firstRender.unmount();

    renderPage(args, { perm: permViewOnly });
    expect(screen.queryByRole('button', { name: '+ 新建比赛' })).not.toBeInTheDocument();
  });

  it('refreshes live status as time passes', () => {
    const tdoc = makeTdoc({
      title: 'Ending Soon',
      beginAt: '2026-07-17T10:00:00.000Z',
      endAt: '2026-07-17T14:00:00.000Z',
    });
    renderPage({ tdocs: [tdoc], tsdict: {}, tpcount: 1, page: 1, qs: '', rule: '', group: '', q: '', groups: [] });
    expect(screen.getAllByText(/Live/i).length).toBeGreaterThan(0);

    act(() => {
      vi.setSystemTime(new Date('2026-07-17T15:00:00.000Z'));
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.queryByText('Live 进行中')).not.toBeInTheDocument();
    expect(screen.getByText('已结束')).toBeInTheDocument();
  });

  it('renders pagination when the total exceeds one page', () => {
    const tdocs = Array.from({ length: 5 }, (_, index) => makeTdoc({ docId: `td${index}`, title: `Contest ${index}` }));
    renderPage({ tdocs, tsdict: {}, tpcount: 100, page: 2, qs: '', rule: '', group: '', q: '', groups: [] });
    expect(screen.getByRole('navigation', { name: '比赛分页' })).toBeInTheDocument();
  });

  it('does not emit console errors during render', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderPage({
      tdocs: [makeTdoc({ title: 'Quiet' })],
      tsdict: {},
      tpcount: 1,
      page: 1,
      qs: '',
      rule: '',
      group: '',
      q: '',
      groups: [],
    });
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
