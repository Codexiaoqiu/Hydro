/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { type PageData, PageDataProvider } from '../context/page-data';
import AboutPage from './about';

function makePageData(args: Record<string, unknown> = {}): PageData {
  return {
    name: 'about',
    template: 'about.html',
    url: '/wiki/about',
    args: {
      UserContext: {},
      UiContext: {},
      sections: [],
      ...args,
    } as unknown as PageData['args'],
  };
}

function Providers({ args, children }: { args: Record<string, unknown>, children: ReactNode }) {
  return <PageDataProvider initial={makePageData(args)}>{children}</PageDataProvider>;
}

describe('about', () => {
  it('renders wiki sections with anchor ids', () => {
    render(
      <Providers args={{
        sections: [
          { id: 'intro', title: '介绍', content: '本站是...' },
          { id: 'usage', title: '使用', content: '注册...' },
        ],
      }}
      >
        <AboutPage />
      </Providers>,
    );
    expect(screen.getByText('介绍')).toBeInTheDocument();
    expect(screen.getByText('使用')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: '介绍' })).toHaveAttribute('id', 'intro');
  });

  it('renders empty state when no sections', () => {
    render(
      <Providers args={{ sections: [] }}>
        <AboutPage />
      </Providers>,
    );
    expect(screen.queryByRole('heading')).toBeNull();
  });
});
