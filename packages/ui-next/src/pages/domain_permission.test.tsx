/* @vitest-environment happy-dom */
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { type PageData, PageDataProvider } from '../context/page-data';
import DomainPermissionPage from './domain_permission';

function renderPage(args: Record<string, unknown>) {
  const initial: PageData = {
    name: 'domain_permission', template: 'domain_permission.html', url: '/domain/permission',
    args: { UserContext: {}, UiContext: {}, ...args } as PageData['args'],
  };
  return render(
    <PageDataProvider initial={initial}>
      <DomainPermissionPage />
    </PageDataProvider>,
  );
}

const baseRoles = [
  { _id: 'default', perm: 1n << 0n },
  { _id: 'guest', perm: 1n << 0n },
  { _id: 'root', perm: (1n << 0n) | (1n << 1n) | (1n << 4n), count: 1 },
  { _id: 'editor', perm: (1n << 0n) | (1n << 4n) },
];

const permsByFamily = {
  Domain: [
    { key: 1n << 0n, desc: 'View this domain' },
    { key: 1n << 1n, desc: 'Edit domain settings' },
  ],
  Problem: [
    { key: 1n << 4n, desc: 'Create problems' },
    { key: 1n << 9n, desc: 'Submit problem' },
    { key: 1n << 11n, desc: "View other's records" },
  ],
  Solution: [
    { key: 1n << 15n, desc: 'View problem solutions' },
  ],
};

describe('domain_permission', () => {
  it('renders the section title with the domain name', () => {
    renderPage({ domain: { _id: 'd1', name: 'my-domain' }, roles: baseRoles, PERMS_BY_FAMILY: permsByFamily });
    expect(screen.getByRole('heading', { level: 1, name: /my-domain: permissions/i })).toBeInTheDocument();
  });

  it('renders Update Permission primary and Cancel secondary buttons', () => {
    renderPage({ domain: { _id: 'd1', name: 'd' }, roles: baseRoles, PERMS_BY_FAMILY: permsByFamily });
    expect(screen.getByRole('button', { name: /update permission/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^cancel$/i })).toBeInTheDocument();
  });

  it('renders one column header per role plus a Permissions header', () => {
    renderPage({ domain: { _id: 'd1', name: 'd' }, roles: baseRoles, PERMS_BY_FAMILY: permsByFamily });
    // The matrix uses role="grid"; find the one inside the body and inspect its column headers.
    const grid = screen.getByRole('grid');
    const headers = within(grid).getAllByRole('columnheader');
    expect(headers.map((h) => h.textContent)).toEqual([
      'Permissions',
      'default',
      'guest',
      'root',
      'editor',
    ]);
  });

  it('renders a row per permission with stable cell testids', () => {
    renderPage({ domain: { _id: 'd1', name: 'd' }, roles: baseRoles, PERMS_BY_FAMILY: permsByFamily });
    // Total permissions across families: 2 + 3 + 1 = 6
    // Index each permission in flatten order: Domain[0,1], Problem[0,1,2], Solution[0]
    expect(screen.getByTestId('cell-role-root-perm-1')).toBeInTheDocument(); // root has Edit domain settings (idx 1)
    expect(screen.getByTestId('cell-role-editor-perm-2')).toBeInTheDocument(); // editor has Create problems (idx 2)
  });

  it('checks matrix cells based on role perm bitmask', () => {
    renderPage({ domain: { _id: 'd1', name: 'd' }, roles: baseRoles, PERMS_BY_FAMILY: permsByFamily });
    // root has bits 0,1,4 set; default has only bit 0.
    // Per flatten order (Domain[0]=View, Domain[1]=Edit, Problem[0]=Create, ...)
    expect(screen.getByTestId('cell-role-root-perm-0')).toBeChecked();
    expect(screen.getByTestId('cell-role-root-perm-1')).toBeChecked();
    expect(screen.getByTestId('cell-role-root-perm-2')).toBeChecked();
    expect(screen.getByTestId('cell-role-default-perm-1')).not.toBeChecked();
    expect(screen.getByTestId('cell-role-default-perm-2')).not.toBeChecked();
  });

  it('renders a family group header for each PERMS_BY_FAMILY entry', () => {
    renderPage({ domain: { _id: 'd1', name: 'd' }, roles: baseRoles, PERMS_BY_FAMILY: permsByFamily });
    expect(screen.getByText('Domain')).toBeInTheDocument();
    expect(screen.getByText('Problem')).toBeInTheDocument();
    expect(screen.getByText('Solution')).toBeInTheDocument();
  });

  it('renders with no roles without crashing (empty grid)', () => {
    renderPage({ domain: { _id: 'd1', name: 'd' }, roles: [], PERMS_BY_FAMILY: permsByFamily });
    // Falls back to the RoleSelector empty-state copy.
    expect(screen.getByText(/no role data/i)).toBeInTheDocument();
  });
});
