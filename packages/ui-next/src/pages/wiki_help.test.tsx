/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { type PageData, PageDataProvider } from '../context/page-data';
import WikiHelpPage from './wiki_help';

function makePageData(args: Record<string, unknown> = {}): PageData {
  return {
    name: 'wiki_help',
    template: 'wiki_help.html',
    url: '/wiki/help',
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

describe('wiki_help', () => {
  it('renders left TOC and right sections', () => {
    render(
      <Providers args={{
        sections: [
          { id: 'intro', title: 'Intro', content: 'Welcome' },
          { id: 'usage', title: 'Usage', content: 'How to use' },
        ],
      }}
      >
        <WikiHelpPage />
      </Providers>,
    );
    expect(screen.getAllByText('Intro').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Usage').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /intro/i })).toHaveAttribute('href', '#intro');
    expect(screen.getByRole('link', { name: /usage/i })).toHaveAttribute('href', '#usage');
  });

  it('renders sections with anchor ids', () => {
    render(
      <Providers args={{
        sections: [{ id: 'a', title: 'A', content: 'a content' }],
      }}
      >
        <WikiHelpPage />
      </Providers>,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'A' })).toHaveAttribute('id', 'a');
  });

  it('renders empty state', () => {
    render(
      <Providers args={{ sections: [] }}>
        <WikiHelpPage />
      </Providers>,
    );
    expect(screen.getByText(/no content|empty/i)).toBeInTheDocument();
  });
});
