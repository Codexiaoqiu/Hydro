/* @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { PageDataProvider, type PageData } from '../context/page-data';
import { RouterProvider } from '../context/router';
import { routeMapStore } from '../globals';
import { ThemeProvider } from '../theme/ThemeProvider';
import Homepage from './homepage';
import '../sections';

const NOW = new Date('2026-07-08T12:00:00Z').getTime();

function buildPageData(args: PageData['args']): PageData {
  return {
    name: 'homepage',
    template: 'home.html',
    args: {
      UserContext: { viewLangName: '中文' },
      UiContext: { domainId: 'system', domainVersion: 1 },
      ...args,
    },
    url: '/',
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
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NOW));
  routeMapStore.set({
    homepage: '/',
    problem_main: '/p',
    contest_main: '/contest',
    discussion_main: '/discussion',
    contest_detail: '/contest/:tid',
    problem_detail: '/p/:pid',
    discussion_detail: '/discussion/:did',
    homework_detail: '/homework/:hid',
    homework_main: '/homework',
    training_detail: '/training/:tid',
    training_main: '/training',
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Homepage (integration)', () => {
  it('renders 2 columns of sections including an ErrorSection fallback', () => {
    const args = {
      contents: [
        {
          width: 9,
          sections: [
            ['hitokoto', null],
            ['contest', [
              [
                {
                  _id: '690101000000000000000001',
                  docId: '690101000000000000000001',
                  title: 'Round 1',
                  rule: 'acm',
                  beginAt: new Date(NOW - 3600_000).toISOString(),
                  endAt: new Date(NOW + 3600_000).toISOString(),
                  attend: 42, rated: true,
                },
              ],
              {},
            ]],
            ['starred_problems', [[{ _id: '69010100', docId: 1, pid: 'P1000', title: 'A+B' }]]],
          ],
        },
        {
          width: 3,
          sections: [
            ['homework', [[], {}]],
            ['discussion', [[], {}]],
            ['__unknown_section__', null],
          ],
        },
      ],
      udict: {},
      domain: { _id: 'system' },
    };
    render(<Providers args={args}><Homepage /></Providers>);
    // The global nav is now injected by `layout:default` (see components/layout.tsx)
    // and tested separately by GlobalNav.test.tsx. The page itself only renders
    // the content sections.
    expect(screen.getByText('Round 1')).toBeTruthy();
    expect(screen.getByText('P1000')).toBeTruthy();
    // ErrorSection placeholder for the unknown section name (appears in
    // header + body copy, so query for at least one match).
    expect(screen.getAllByText(/__unknown_section__/).length).toBeGreaterThan(0);
  });
});
