/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { type PageData, PageDataProvider } from '../context/page-data';
import HomeDomainPage from './home_domain';

function makePageData(args: Record<string, unknown> = {}): PageData {
  return {
    name: 'home_domain',
    template: 'home_domain.html',
    url: '/home/domain',
    args: {
      UserContext: {},
      UiContext: {},
      domains: [],
      hasCreatePriv: false,
      hasJoinPriv: false,
      ...args,
    } as unknown as PageData['args'],
  };
}

function Providers({ args, children }: { args: Record<string, unknown>, children: ReactNode }) {
  return <PageDataProvider initial={makePageData(args)}>{children}</PageDataProvider>;
}

describe('home_domain', () => {
  it('renders domain table with role column', () => {
    render(
      <Providers args={{
        domains: [
          { _id: 'd1', name: 'My Domain', role: 'owner' },
          { _id: 'd2', name: 'Other', role: 'guest' },
        ],
        hasCreatePriv: true,
        hasJoinPriv: true,
      }}
      >
        <HomeDomainPage />
      </Providers>,
    );
    expect(screen.getByText('My Domain')).toBeInTheDocument();
    expect(screen.getByText('owner')).toBeInTheDocument();
  });

  it('hides create and join buttons without PRIV_CREATE_DOMAIN / PRIV_USER_PROFILE', () => {
    render(
      <Providers args={{
        domains: [],
        hasCreatePriv: false,
        hasJoinPriv: false,
      }}
      >
        <HomeDomainPage />
      </Providers>,
    );
    expect(screen.queryByRole('button', { name: /create/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /join/i })).toBeNull();
  });

  it('renders empty state', () => {
    render(
      <Providers args={{
        domains: [],
        hasCreatePriv: false,
        hasJoinPriv: false,
      }}
      >
        <HomeDomainPage />
      </Providers>,
    );
    expect(screen.getByText(/no domain|empty/i)).toBeInTheDocument();
  });
});
