/* @vitest-environment happy-dom */
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RoleSelector } from './RoleSelector';

const roles = [
  { _id: 'default', perm: 1n << 0n },
  { _id: 'guest', perm: 1n << 0n },
  { _id: 'root', perm: (1n << 0n) | (1n << 1n) | (1n << 4n) },
];

const permissions = [
  { key: 1n << 0n, desc: 'View this domain' },
  { key: 1n << 1n, desc: 'Edit domain settings' },
  { key: 1n << 4n, desc: 'Create problems' },
];

// eslint-disable-next-line test/prefer-lowercase-title
describe('RoleSelector', () => {
  it('renders the empty-state copy when no roles are provided', () => {
    render(<RoleSelector roles={[]} permissions={permissions} />);
    expect(screen.getByText(/no role data\./i)).toBeInTheDocument();
  });

  it('renders the empty-state copy when no permissions are provided', () => {
    render(<RoleSelector roles={roles} permissions={[]} />);
    expect(screen.getByText(/no role data\./i)).toBeInTheDocument();
  });

  it('renders one column header per role plus a leading Permission header', () => {
    render(<RoleSelector roles={roles} permissions={permissions} />);
    const grid = screen.getByRole('grid');
    const headers = within(grid).getAllByRole('columnheader');
    expect(headers.map((h) => h.textContent)).toEqual([
      'Permission',
      'default',
      'guest',
      'root',
    ]);
  });

  it('renders a row per permission with stable testids and correct checked state', () => {
    render(<RoleSelector roles={roles} permissions={permissions} />);
    // root has bits 0, 1, and 4 set.
    expect(screen.getByTestId('cell-role-root-perm-0')).toBeChecked();
    expect(screen.getByTestId('cell-role-root-perm-1')).toBeChecked();
    expect(screen.getByTestId('cell-role-root-perm-2')).toBeChecked();
    // default only has bit 0 set.
    expect(screen.getByTestId('cell-role-default-perm-0')).toBeChecked();
    expect(screen.getByTestId('cell-role-default-perm-1')).not.toBeChecked();
    expect(screen.getByTestId('cell-role-default-perm-2')).not.toBeChecked();
    // guest only has bit 0 set.
    expect(screen.getByTestId('cell-role-guest-perm-0')).toBeChecked();
    expect(screen.getByTestId('cell-role-guest-perm-1')).not.toBeChecked();
    expect(screen.getByTestId('cell-role-guest-perm-2')).not.toBeChecked();
  });

  it('renders every checkbox as disabled to mirror the read-only display contract', () => {
    render(<RoleSelector roles={roles} permissions={permissions} />);
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBe(roles.length * permissions.length);
    for (const cb of checkboxes) {
      expect(cb).toBeDisabled();
    }
  });
});
