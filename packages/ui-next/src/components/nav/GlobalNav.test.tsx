/* @vitest-environment happy-dom */
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { PageDataProvider, type PageData } from '../../context/page-data';
import { RouterProvider } from '../../context/router';
import { routeMapStore } from '../../globals';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { GlobalNav } from './GlobalNav';

function buildPageData(args: PageData['args']): PageData {
  return {
    name: 'problem_detail',
    template: 'problem_detail.html',
    args: args as PageData['args'],
    url: '/p/NOI2024B',
  };
}

function Providers({ args, children }: { args: PageData['args']; children: ReactNode }) {
  return (
    <ThemeProvider>
      <PageDataProvider initial={buildPageData(args)}>
        <RouterProvider>{children}</RouterProvider>
      </PageDataProvider>
    </ThemeProvider>
  );
}

beforeEach(() => {
  routeMapStore.set({
    homepage: '/',
    problem_main: '/p',
    contest_main: '/contest',
    discussion_main: '/discussion',
    problem_detail: '/p/:pid',
    record_main: '/record',
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('GlobalNav', () => {
  it('renders the 4 standard links in the requested order', () => {
    render(
      <Providers args={{ UserContext: { _id: 0 } }}>
        <GlobalNav />
      </Providers>,
    );
    const nav = screen.getByRole('navigation');
    const links = within(nav).getAllByRole('link');
    expect(links.map((l) => l.textContent)).toEqual([
      '首页',
      '题库',
      '比赛',
      '讨论',
    ]);
  });

  it('marks the current route as active (problem_main)', () => {
    render(
      <Providers args={{ UserContext: { _id: 0 } }}>
        <GlobalNav currentRoute="problem_main" />
      </Providers>,
    );
    const nav = screen.getByRole('navigation');
    const activeLinks = within(nav).getAllByRole('link').filter((a) => a.className.includes('active'));
    expect(activeLinks).toHaveLength(1);
    expect(activeLinks[0].textContent).toBe('题库');
  });

  it('falls back to the page name from PageData when currentRoute is omitted', () => {
    render(
      <Providers args={{ UserContext: { _id: 0 } }}>
        <GlobalNav />
      </Providers>,
    );
    const nav = screen.getByRole('navigation');
    const active = within(nav).getAllByRole('link').filter((a) => a.className.includes('active'));
    expect(active).toHaveLength(0);
  });

  it('hides login/register buttons when the user is logged in', () => {
    render(
      <Providers args={{ UserContext: { _id: 42, uname: '小邱' } }}>
        <GlobalNav />
      </Providers>,
    );
    expect(screen.queryByRole('button', { name: '登录' })).toBeNull();
    expect(screen.queryByRole('button', { name: '注册' })).toBeNull();
  });

  it('shows login/register buttons when the user is not logged in', () => {
    render(
      <Providers args={{ UserContext: { _id: 0 } }}>
        <GlobalNav />
      </Providers>,
    );
    expect(screen.getByRole('button', { name: '登录' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '注册' })).toBeTruthy();
  });

  it('renders the theme toggle', () => {
    render(
      <Providers args={{ UserContext: { _id: 0 } }}>
        <GlobalNav />
      </Providers>,
    );
    expect(screen.getByRole('button', { name: /toggle theme/i })).toBeTruthy();
  });

  it('renders the language pill with the user-provided label', () => {
    render(
      <Providers args={{ UserContext: { _id: 0, viewLangName: 'English' } }}>
        <GlobalNav />
      </Providers>,
    );
    expect(screen.getByText(/English/)).toBeTruthy();
  });

  it('appends extraLinks after the 4 standard links', () => {
    render(
      <Providers args={{ UserContext: { _id: 0 } }}>
        <GlobalNav extraLinks={<a href="/record">提交记录</a>} />
      </Providers>,
    );
    const nav = screen.getByRole('navigation');
    const links = within(nav).getAllByRole('link');
    expect(links.at(-1)?.textContent).toBe('提交记录');
    expect(links.slice(0, 4).map((l) => l.textContent)).toEqual([
      '首页', '题库', '比赛', '讨论',
    ]);
  });
});
