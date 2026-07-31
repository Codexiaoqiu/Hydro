/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { type PageData, PageDataProvider } from '../context/page-data';
import RankingPage from './ranking';

function makePageData(args: Record<string, unknown> = {}): PageData {
  return {
    name: 'ranking',
    template: 'ranking.html',
    url: '/ranking',
    args: {
      UserContext: {},
      UiContext: {},
      ranking: [],
      ...args,
    } as unknown as PageData['args'],
  };
}

function Providers({ args, children }: { args: Record<string, unknown>, children: ReactNode }) {
  return <PageDataProvider initial={makePageData(args)}>{children}</PageDataProvider>;
}

describe('ranking', () => {
  it('renders ranking list with ranks and scores', () => {
    render(
      <Providers args={{
        ranking: [
          { rank: 1, score: 1000, udoc: { _id: 1, uname: 'alice', avatar: '' } },
          { rank: 2, score: 900, udoc: { _id: 2, uname: 'bob', avatar: '' } },
        ],
      }}
      >
        <RankingPage />
      </Providers>,
    );
    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.getByText('bob')).toBeInTheDocument();
    expect(screen.getByText('1000')).toBeInTheDocument();
  });

  it('highlights top-3 entries', () => {
    const { container } = render(
      <Providers args={{
        ranking: [
          { rank: 1, score: 100, udoc: { _id: 1, uname: 'a', avatar: '' } },
          { rank: 2, score: 90, udoc: { _id: 2, uname: 'b', avatar: '' } },
          { rank: 3, score: 80, udoc: { _id: 3, uname: 'c', avatar: '' } },
          { rank: 4, score: 70, udoc: { _id: 4, uname: 'd', avatar: '' } },
        ],
      }}
      >
        <RankingPage />
      </Providers>,
    );
    const top3 = container.querySelectorAll('[data-top]');
    expect(top3.length).toBe(3);
  });

  it('renders empty state', () => {
    render(
      <Providers args={{ ranking: [] }}>
        <RankingPage />
      </Providers>,
    );
    expect(screen.getByText(/no ranking|empty/i)).toBeInTheDocument();
  });
});
