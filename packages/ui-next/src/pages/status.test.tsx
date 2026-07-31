/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { type PageData, PageDataProvider } from '../context/page-data';
import StatusPage from './status';

function makePageData(args: Record<string, unknown> = {}): PageData {
  return {
    name: 'status',
    template: 'status.html',
    url: '/status',
    args: {
      UserContext: {},
      UiContext: {},
      journals: [],
      ...args,
    } as unknown as PageData['args'],
  };
}

function Providers({ args, children }: { args: Record<string, unknown>, children: ReactNode }) {
  return <PageDataProvider initial={makePageData(args)}>{children}</PageDataProvider>;
}

describe('status', () => {
  it('renders journal entries', () => {
    render(
      <Providers args={{
        journals: [
          { time: 1700000000, level: 'info', message: 'Started' },
          { time: 1700000100, level: 'warn', message: 'Slow query' },
        ],
      }}
      >
        <StatusPage />
      </Providers>,
    );
    expect(screen.getByText('Started')).toBeInTheDocument();
    expect(screen.getByText('Slow query')).toBeInTheDocument();
  });

  it('colors error-level entries differently', () => {
    const { container } = render(
      <Providers args={{
        journals: [{ time: 1, level: 'error', message: 'Oops' }],
      }}
      >
        <StatusPage />
      </Providers>,
    );
    expect(container.querySelector('[data-level="error"]')).toBeInTheDocument();
  });

  it('renders empty state', () => {
    render(
      <Providers args={{ journals: [] }}>
        <StatusPage />
      </Providers>,
    );
    expect(screen.getByText(/no journal|empty/i)).toBeInTheDocument();
  });
});
