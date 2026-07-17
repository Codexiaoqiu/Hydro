/* @vitest-environment happy-dom */

import { STATUS } from '@hydrooj/common';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type PageData, PageDataProvider } from '../context/page-data';
import * as routerMod from '../context/router';
import { RouterProvider } from '../context/router';
import { routeMapStore } from '../globals';
import { ThemeProvider } from '../theme/ThemeProvider';
import ProblemMain from './problem_main';

// useBuildUrl depends on routeMapStore + UiContext. We seed the route map and
// rely on the real hook so the test asserts the same URL contract the page uses.
function buildPageData(args: PageData['args']): PageData {
  return {
    name: 'problem_main',
    template: 'problem_main.html',
    args: {
      UserContext: { viewLangName: '中文' },
      UiContext: { domainId: 'system', domainVersion: 1 },
      ...args,
    },
    url: '/p',
  };
}

function Providers({ args, children }: { args: PageData['args'], children: ReactNode }) {
  return (
    <ThemeProvider>
      <PageDataProvider initial={buildPageData(args)}>
        <RouterProvider>{children}</RouterProvider>
      </PageDataProvider>
    </ThemeProvider>
  );
}

function renderProblem(args: PageData['args']) {
  return render(
    <Providers args={args}>
      <ProblemMain />
    </Providers>,
  );
}

describe('problemMain', () => {
  let originalRouteMap: Record<string, string>;
  let navigateSpy: ReturnType<typeof vi.fn>;
  let restoreConsoleError: () => void;
  let restoreConsoleWarn: () => void;

  beforeEach(() => {
    originalRouteMap = { ...routeMapStore._routeMap };
    routeMapStore.set({
      problem_main: '/p',
      problem_detail: '/p/:pid',
      problem_random: '/problem/random',
    });

    // submitSearch / sortChange call useNavigate() to drive SPA navigation.
    // Spy on the hook so tests can assert the URL that was navigated to
    // without spinning up the real RouterProvider fetch pipeline.
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

  it('renders the header and empty state when pdocs is empty', () => {
    renderProblem({ pdocs: [], psdict: {}, page: 1, pcount: 0, ppcount: 0 });
    expect(screen.getByRole('heading', { name: '题目列表' })).toBeInTheDocument();
    expect(screen.getByText(/当前筛选下没有题目/)).toBeInTheDocument();
    expect(screen.getByText('暂无题目')).toBeInTheDocument();
  });

  it('renders one row per pdoc with id, title, AC/Tried, and rate', () => {
    renderProblem({
      pdocs: [
        { docId: 1000, domainId: 'system', title: 'A + B', tag: ['基础'], nSubmit: 200, nAccept: 100, difficulty: 1 },
        { docId: 1001, domainId: 'system', title: 'Sort', tag: [], nSubmit: 10, nAccept: 4, difficulty: 2 },
      ],
      psdict: {},
      page: 1,
      pcount: 2,
      ppcount: 1,
    });

    const rows = screen.getAllByRole('link', { name: /A \+ B|Sort/ });
    expect(rows).toHaveLength(2);

    // First problem: AC=100, Submit=200 → rate 50%
    const first = rows[0].closest('div')?.parentElement;
    expect(first).toHaveTextContent('100');
    expect(first).toHaveTextContent('/ 200');
    expect(first).toHaveTextContent('50%');

    // Second problem: AC=4, Submit=10 → rate 40%
    const second = rows[1].closest('div')?.parentElement;
    expect(second).toHaveTextContent('40%');
  });

  it('renders status pill in pass style for AC records', () => {
    renderProblem({
      pdocs: [
        { docId: 1, domainId: 'system', title: 'P', tag: [], nSubmit: 1, nAccept: 1 },
      ],
      psdict: { 1: { rid: 'r1', status: STATUS.STATUS_ACCEPTED } },
      page: 1,
      pcount: 1,
      ppcount: 1,
    });
    const pill = screen.getByText('AC');
    expect(pill).toBeInTheDocument();
    // happy-dom doesn't compute styles, but the class set is observable.
    expect(pill.className).toMatch(/statusPass/);
  });

  it('renders status pill in fail style for non-AC attempts', () => {
    renderProblem({
      pdocs: [
        { docId: 1, domainId: 'system', title: 'P', tag: [], nSubmit: 1, nAccept: 0 },
      ],
      psdict: { 1: { rid: 'r1', status: STATUS.STATUS_WRONG_ANSWER } },
      page: 1,
      pcount: 1,
      ppcount: 1,
    });
    const pill = screen.getByText('WA');
    expect(pill.className).toMatch(/statusFail/);
  });

  it('falls back to difficulty pill when no submission record exists', () => {
    renderProblem({
      pdocs: [
        { docId: 1, domainId: 'system', title: 'P', tag: [], nSubmit: 0, nAccept: 0, difficulty: 3 },
      ],
      psdict: {},
      page: 1,
      pcount: 1,
      ppcount: 1,
    });
    const pill = screen.getByText('★★★');
    expect(pill).toBeInTheDocument();
    expect(pill.className).toMatch(/diff(?!None)/);
  });

  it('flags hidden problems', () => {
    renderProblem({
      pdocs: [
        { docId: 1, domainId: 'system', title: 'Secret', tag: [], nSubmit: 0, nAccept: 0, hidden: true },
      ],
      psdict: {},
      page: 1,
      pcount: 1,
      ppcount: 1,
    });
    expect(screen.getByText(/Hidden/)).toBeInTheDocument();
  });

  it('encodes multi-word tags with quotes when building the search link', () => {
    renderProblem({
      pdocs: [
        { docId: 1, domainId: 'system', title: 'P', tag: ['图论', 'two words'], nSubmit: 0, nAccept: 0 },
      ],
      psdict: {},
      page: 1,
      pcount: 1,
      ppcount: 1,
    });
    const quoted = screen.getByRole('link', { name: 'two words' });
    expect(quoted.getAttribute('href')).toContain('q=category%3A%22two+words%22');
    const unquoted = screen.getByRole('link', { name: '图论' });
    expect(unquoted.getAttribute('href')).toContain('q=category%3A%E5%9B%BE%E8%AE%BA');
  });

  it('renders the stat line as "N 道题目" for exact matches', () => {
    renderProblem({
      pdocs: [], psdict: {},
      page: 1, pcount: 42, ppcount: 1,
      pcountRelation: 'eq',
    });
    expect(screen.getByText('42 道题目')).toBeInTheDocument();
  });

  it('renders the stat line as "N+ 道题目" for fuzzy matches', () => {
    renderProblem({
      pdocs: [], psdict: {},
      page: 1, pcount: 42, ppcount: 1,
      pcountRelation: 'gte',
    });
    expect(screen.getByText('42+ 道题目')).toBeInTheDocument();
  });

  it('does not render pager when there is only one page', () => {
    renderProblem({
      pdocs: [{ docId: 1, domainId: 'system', title: 'P', tag: [], nSubmit: 0, nAccept: 0 }],
      psdict: {},
      page: 1,
      pcount: 1,
      ppcount: 1,
    });
    expect(screen.queryByRole('navigation', { name: 'pagination' })).not.toBeInTheDocument();
  });

  it('renders pager items and marks the current page as active', () => {
    renderProblem({
      pdocs: [{ docId: 1, domainId: 'system', title: 'P', tag: [], nSubmit: 0, nAccept: 0 }],
      psdict: {},
      page: 3,
      pcount: 0,
      ppcount: 8,
    });
    const nav = screen.getByRole('navigation', { name: 'pagination' });
    // Expect pages 1, 2, 3, 4, 8 with a gap (8 pages > 7 → windowed)
    const items = within(nav).getAllByRole('link');
    const labels = items.map((a) => a.textContent);
    expect(labels).toEqual(['1', '2', '3', '4', '8']);
    const active = within(nav).getByText('3');
    expect(active.className).toMatch(/pagerActive/);
  });

  it('renders sidebar categories from UiContext.problemCategories', () => {
    renderProblem({
      pdocs: [],
      psdict: {},
      page: 1,
      pcount: 0,
      ppcount: 0,
      UiContext: {
        domainId: 'system',
        domainVersion: 1,
        problemCategories: { 基础: ['语法', 'IO'] },
      },
    });
    const catLink = screen.getByRole('link', { name: '基础' });
    expect(catLink.getAttribute('href')).toContain('q=category%3A%E5%9F%BA%E7%A1%80');
    expect(screen.getByRole('link', { name: '语法' })).toBeInTheDocument();
  });

  it('omits the categories sidebar card when no categories are configured', () => {
    renderProblem({
      pdocs: [],
      psdict: {},
      page: 1,
      pcount: 0,
      ppcount: 0,
      UiContext: { domainId: 'system', domainVersion: 1, problemCategories: {} },
    });
    // sideTitle '分类' must not appear when categories are empty.
    expect(screen.queryByText('分类')).not.toBeInTheDocument();
  });

  it('renders a 随机一题 link that preserves the current search', () => {
    renderProblem({
      pdocs: [],
      psdict: {},
      page: 1,
      pcount: 0,
      ppcount: 0,
      qs: 'category:图论',
    });
    const lucky = screen.getByRole('link', { name: /随机一题/ });
    expect(lucky.getAttribute('href')).toBe('/problem/random?q=category%3A%E5%9B%BE%E8%AE%BA');
  });

  it('submits the search form and navigates with the q param', () => {
    renderProblem({
      pdocs: [],
      psdict: {},
      page: 1,
      pcount: 0,
      ppcount: 0,
      qs: '',
    });
    const input = screen.getByLabelText('搜索题目') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'graph' } });
    fireEvent.submit(input.closest('form')!);
    expect(navigateSpy).toHaveBeenCalledWith('/p?q=graph');
  });

  it('switches sort and keeps the existing q parameter', () => {
    renderProblem({
      pdocs: [],
      psdict: {},
      page: 1,
      pcount: 0,
      ppcount: 0,
      qs: 'graph',
    });
    // Open the custom Select trigger, then choose the "最新优先" option.
    fireEvent.click(screen.getByRole('button', { name: '排序方式' }));
    fireEvent.click(screen.getByRole('option', { name: '最新优先' }));
    expect(navigateSpy).toHaveBeenCalledWith('/p?q=graph&sort=recent');
  });

  it('computes difficulty from nSubmit/nAccept when p.difficulty is missing', () => {
    // Real injected pdocs carry no `difficulty` field (see q.md); the page
    // must run the same algorithm client-side. (200, 200) clamps to 1,
    // which the difficultyLabel helper renders as "★".
    renderProblem({
      pdocs: [
        { docId: 1, domainId: 'system', title: 'A + B', tag: [], nSubmit: 200, nAccept: 200 },
      ],
      psdict: {},
      page: 1,
      pcount: 1,
      ppcount: 1,
    });
    const pill = screen.getByText('★');
    expect(pill).toBeInTheDocument();
    expect(pill.className).toMatch(/diff(?!None)/);
  });

  describe('tagRow collapse', () => {
    const manyTags = ['t1', 't2', 't3', 't4', 't5', 't6', 't7'];
    const fewTags = ['t1', 't2', 't3'];

    it('collapses to 5 tags with a Show all (+N) button when more than 5', () => {
      renderProblem({
        pdocs: [{ docId: 1, domainId: 'system', title: 'P', tag: manyTags, nSubmit: 0, nAccept: 0 }],
        psdict: {},
        page: 1,
        pcount: 1,
        ppcount: 1,
      });
      const tags = manyTags.slice(0, 5);
      tags.forEach((name) => {
        expect(screen.getByRole('link', { name })).toBeInTheDocument();
      });
      expect(screen.queryByRole('link', { name: 't6' })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 't7' })).not.toBeInTheDocument();
      const toggle = screen.getByRole('button', { name: /Show all/i });
      expect(toggle).toBeInTheDocument();
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      expect(toggle.textContent).toMatch(/\+2/);
    });

    it('expands all tags after click on Show all', () => {
      renderProblem({
        pdocs: [{ docId: 1, domainId: 'system', title: 'P', tag: manyTags, nSubmit: 0, nAccept: 0 }],
        psdict: {},
        page: 1,
        pcount: 1,
        ppcount: 1,
      });
      const toggle = screen.getByRole('button', { name: /Show all/i });
      fireEvent.click(toggle);
      manyTags.forEach((name) => {
        expect(screen.getByRole('link', { name })).toBeInTheDocument();
      });
      const hide = screen.getByRole('button', { name: /Show less|收起/i });
      expect(hide).toHaveAttribute('aria-expanded', 'true');
    });

    it('does not show a toggle when there are <= 5 tags', () => {
      renderProblem({
        pdocs: [{ docId: 1, domainId: 'system', title: 'P', tag: fewTags, nSubmit: 0, nAccept: 0 }],
        psdict: {},
        page: 1,
        pcount: 1,
        ppcount: 1,
      });
      fewTags.forEach((name) => {
        expect(screen.getByRole('link', { name })).toBeInTheDocument();
      });
      expect(screen.queryByRole('button', { name: /Show all|Show less|展开|收起/i })).not.toBeInTheDocument();
    });
  });
});
