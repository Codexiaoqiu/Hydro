/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type PageData, PageDataProvider } from '../context/page-data';
import { RouterProvider } from '../context/router';
import { routeMapStore } from '../globals';
import { ThemeProvider } from '../theme/ThemeProvider';
import { ContestSection } from './ContestSection';

const NOW = new Date('2026-07-08T12:00:00Z').getTime();

function makeTdoc(over: Record<string, unknown> = {}) {
  return {
    _id: '690101000000000000000001',
    docId: '690101000000000000000001',
    title: 'Round 1',
    rule: 'acm',
    beginAt: new Date(NOW - 3600_000).toISOString(),
    endAt: new Date(NOW + 3600_000).toISOString(),
    attend: 42,
    rated: true,
    ...over,
  };
}

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

function Providers({ args, children }: { args: PageData['args'], children: ReactNode }) {
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
  const original = { ...routeMapStore._routeMap };
  routeMapStore.set({ ...original, contest_main: '/contest', contest_detail: '/contest/:tid' });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('contestSection', () => {
  it('renders a row per contest', () => {
    render(
      <Providers args={{}}>
        <ContestSection
          name="contest"
          payload={[[makeTdoc()], {}]}
          udict={{}}
          domain={{ _id: 'system' }}
        />
      </Providers>,
    );
    expect(screen.getByText('Round 1')).toBeTruthy();
    expect(screen.getByText('42 人')).toBeTruthy();
    expect(screen.getByText('XCPC')).toBeTruthy();
    expect(screen.getByText('Rated')).toBeTruthy();
    expect(screen.getByText('进行中')).toBeTruthy();
  });
  it('marks an upcoming contest as 未开始', () => {
    render(
      <Providers args={{}}>
        <ContestSection
          name="contest"
          payload={[
            [
              makeTdoc({
                beginAt: new Date(NOW + 3600_000).toISOString(),
                endAt: new Date(NOW + 7200_000).toISOString(),
              }),
            ],
            {},
          ]}
          udict={{}}
          domain={{ _id: 'system' }}
        />
      </Providers>,
    );
    expect(screen.getByText('未开始')).toBeTruthy();
  });
  it('renders null when payload is empty', () => {
    const { container } = render(
      <Providers args={{}}>
        <ContestSection name="contest" payload={[[], {}]} udict={{}} domain={{ _id: 'system' }} />
      </Providers>,
    );
    expect(container.firstChild).toBeNull();
  });
  it('renders a "更多" link to contest_main', () => {
    render(
      <Providers args={{}}>
        <ContestSection
          name="contest"
          payload={[[makeTdoc()], {}]}
          udict={{}}
          domain={{ _id: 'system' }}
        />
      </Providers>,
    );
    const more = screen.getByText('更多 →');
    expect(more.closest('a')?.getAttribute('href') ?? '').toContain('/contest');
  });
});
