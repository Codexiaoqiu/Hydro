/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { type PageData, PageDataProvider } from '../context/page-data';
import DomainUserPage from './domain_user';

function renderPage(args: Record<string, unknown>) {
  const initial: PageData = {
    name: 'domain_user', template: 'domain_user.html', url: '/domain/user',
    args: { UserContext: {}, UiContext: {}, ...args } as PageData['args'],
  };
  return render(
    <PageDataProvider initial={initial}>
      <DomainUserPage />
    </PageDataProvider>,
  );
}

describe('domain_user', () => {
  it('renders the section title with the domain name', () => {
    renderPage({
      domain: { _id: 'd1', name: 'my-domain', displayName: 'My Domain' },
      rudocs: {},
      roles: [],
    });
    expect(screen.getByRole('heading', { level: 1, name: /my-domain: users/i })).toBeInTheDocument();
  });

  it('renders the Add User button', () => {
    renderPage({
      domain: { _id: 'd1', name: 'd', displayName: 'D' },
      rudocs: {},
      roles: [],
    });
    expect(screen.getByRole('button', { name: /add user/i })).toBeInTheDocument();
  });

  it('flattens rudocs grouped by role and renders one row per member', () => {
    renderPage({
      domain: { _id: 'd1', name: 'd', displayName: 'D' },
      rudocs: {
        admin: [{ uid: 1, uname: 'alice', role: 'admin', join: 1700000000 }],
        default: [
          { uid: 2, uname: 'bob', role: 'default', join: 1700001000 },
          { uid: 3, uname: 'carol', role: 'default' },
        ],
      },
      roles: [
        { _id: 'admin' },
        { _id: 'default' },
      ],
    });
    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.getByText('bob')).toBeInTheDocument();
    expect(screen.getByText('carol')).toBeInTheDocument();
    // 3 Edit buttons, one per row
    expect(screen.getAllByRole('button', { name: /edit/i })).toHaveLength(3);
  });

  it('renders Remove Selected and Set Roles action buttons', () => {
    renderPage({
      domain: { _id: 'd1', name: 'd', displayName: 'D' },
      rudocs: {},
      roles: [],
    });
    expect(screen.getByRole('button', { name: /remove selected user/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /set roles for selected user/i })).toBeInTheDocument();
  });

  it('renders empty placeholder when no members are present', () => {
    renderPage({
      domain: { _id: 'd1', name: 'd', displayName: 'D' },
      rudocs: {},
      roles: [],
    });
    expect(screen.getByText(/no users\./i)).toBeInTheDocument();
  });
});
