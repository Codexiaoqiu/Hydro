/* @vitest-environment happy-dom */
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { type PageData, PageDataProvider } from '../context/page-data';
import DomainRolePage from './domain_role';

function renderPage(args: Record<string, unknown>) {
  const initial: PageData = {
    name: 'domain_role', template: 'domain_role.html', url: '/domain/role',
    args: { UserContext: {}, UiContext: {}, ...args } as PageData['args'],
  };
  return render(
    <PageDataProvider initial={initial}>
      <DomainRolePage />
    </PageDataProvider>,
  );
}

const baseRoles = [
  { _id: 'default', perm: 1n << 0n, count: 5 },
  { _id: 'guest', perm: 1n << 0n, count: 0 },
  { _id: 'root', perm: (1n << 0n) | (1n << 1n) | (1n << 4n), count: 1 },
  { _id: 'editor', perm: (1n << 0n) | (1n << 4n), count: 3 },
];

describe('domain_role', () => {
  it('renders the section title with the domain name', () => {
    renderPage({ domain: { _id: 'd1', name: 'my-domain', displayName: 'My Domain' }, roles: baseRoles });
    expect(screen.getByRole('heading', { level: 1, name: /my-domain: roles/i })).toBeInTheDocument();
  });

  it('renders the Create Role primary button', () => {
    renderPage({ domain: { _id: 'd1', name: 'd', displayName: 'D' }, roles: baseRoles });
    expect(screen.getByRole('button', { name: /create role/i })).toBeInTheDocument();
  });

  it('renders one role row per role with built-in flag and user count', () => {
    renderPage({ domain: { _id: 'd1', name: 'd', displayName: 'D' }, roles: baseRoles });
    // Built-in rows show "Built-in: <id>"; user-defined rows show "User-defined role: <id>"
    expect(screen.getByText(/^Built-in: default$/)).toBeInTheDocument();
    expect(screen.getByText(/^Built-in: guest$/)).toBeInTheDocument();
    expect(screen.getByText(/^Built-in: root$/)).toBeInTheDocument();
    expect(screen.getByText(/^User-defined role: editor$/)).toBeInTheDocument();
    // Counts render as plain integers; '--' is the fallback for missing counts
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('falls back to "--" when a role has no count', () => {
    renderPage({
      domain: { _id: 'd1', name: 'd', displayName: 'D' },
      roles: [{ _id: 'editor', perm: 1n }],
    });
    expect(screen.getByText('--')).toBeInTheDocument();
  });

  it('renders the Delete Selected Roles footer button', () => {
    renderPage({ domain: { _id: 'd1', name: 'd', displayName: 'D' }, roles: baseRoles });
    expect(screen.getByRole('button', { name: /delete selected roles/i })).toBeInTheDocument();
  });

  it('attaches data-role only to non-built-in role rows', () => {
    renderPage({ domain: { _id: 'd1', name: 'd', displayName: 'D' }, roles: baseRoles });
    // Built-in rows do NOT get data-role (handler skips them on delete)
    const editorRow = screen.getByText(/^User-defined role: editor$/).closest('tr');
    expect(editorRow).not.toBeNull();
    expect(editorRow).toHaveAttribute('data-role', 'editor');
    // Built-in rows lack data-role
    const defaultRow = screen.getByText(/^Built-in: default$/).closest('tr');
    expect(defaultRow).not.toBeNull();
    expect(defaultRow).not.toHaveAttribute('data-role');
  });

  it('renders the permission matrix with one column per role and a header row', () => {
    renderPage({ domain: { _id: 'd1', name: 'd', displayName: 'D' }, roles: baseRoles });
    // RoleSelector renders role="grid" with one column header per role (plus the
    // leading "Permission" header)
    const grid = screen.getByRole('grid');
    const headers = within(grid).getAllByRole('columnheader');
    expect(headers.map((h) => h.textContent)).toEqual([
      'Permission',
      'default',
      'guest',
      'root',
      'editor',
    ]);
  });

  it('checks matrix cells based on the role perm bitmask', () => {
    renderPage({ domain: { _id: 'd1', name: 'd', displayName: 'D' }, roles: baseRoles });
    // root has bit 1 (Edit domain settings) set; default has only bit 0 (View).
    // defaultPermissions() emits 'View this domain' first (idx 0) and
    // 'Edit domain settings' second (idx 1), so the test ids are stable.
    const rootEdit = screen.getByTestId('cell-role-root-perm-1');
    const defaultEdit = screen.getByTestId('cell-role-default-perm-1');
    expect(rootEdit).toBeChecked();
    expect(defaultEdit).not.toBeChecked();
  });
});
