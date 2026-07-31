/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { type PageData, PageDataProvider } from '../context/page-data';
import DomainBasePage from './domain_base';

function renderPage(args: Record<string, unknown>) {
  const initial: PageData = {
    name: 'domain_base', template: 'domain_base.html', url: '/domain',
    args: { UserContext: {}, UiContext: {}, ...args } as PageData['args'],
  };
  return render(<PageDataProvider initial={initial}><DomainBasePage /></PageDataProvider>);
}

describe('domain_base', () => {
  it('renders domain banner with name and displayName', () => {
    renderPage({ domain: { _id: 'd1', name: 'my-domain', displayName: 'My Domain', owner: 1 }, userPerm: 'owner' });
    expect(screen.getByText('My Domain')).toBeInTheDocument();
    expect(screen.getByText('my-domain')).toBeInTheDocument();
  });

  it('renders sidebar nav with 5 links', () => {
    renderPage({ domain: { _id: 'd1', name: 'd', displayName: 'D', owner: 1 }, userPerm: 'owner' });
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /user/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /group/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /role/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /permission/i })).toBeInTheDocument();
  });
});
