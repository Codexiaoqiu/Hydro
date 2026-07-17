/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { type PageData, PageDataProvider } from '../context/page-data';
import { RouterProvider } from '../context/router';
import { routeMapStore } from '../globals';
import { ThemeProvider } from '../theme/ThemeProvider';
import { RecentProblemsSection } from './RecentProblemsSection';

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
        <RouterProvider>{children}</RouterProvider></PageDataProvider>
    </ThemeProvider>
  );
}

beforeEach(() => {
  const original = { ...routeMapStore._routeMap };
  routeMapStore.set({ ...original, problem_detail: '/p/:pid' });
});

describe('recentProblemsSection', () => {
  it('renders pid and title for each problem', () => {
    render(
      <Providers args={{}}>
        <RecentProblemsSection
          name="recent_problems"
          payload={[
            [{ _id: '69010100aabbccddee000001', docId: 1, pid: 'P1000', title: 'A+B Problem' }],
            {},
          ]}
          udict={{}}
          domain={{ _id: 'system' }}
        />
      </Providers>,
    );
    expect(screen.getByText('P1000')).toBeTruthy();
    expect(screen.getByText('A+B Problem')).toBeTruthy();
  });
  it('renders nothing when payload is empty', () => {
    const { container } = render(
      <Providers args={{}}>
        <RecentProblemsSection
          name="recent_problems"
          payload={[[], {}]}
          udict={{}}
          domain={{ _id: 'system' }}
        />
      </Providers>,
    );
    expect(container.firstChild).toBeNull();
  });
});
