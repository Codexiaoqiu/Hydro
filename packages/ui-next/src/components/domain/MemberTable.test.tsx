/* @vitest-environment happy-dom */
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemberTable, type Member } from './MemberTable';

const baseMembers: Member[] = [
  { uid: 1, uname: 'alice', role: 'admin' },
  { uid: 2, uname: 'bob', role: 'default', joinedAt: 1700000000 },
];

// eslint-disable-next-line test/prefer-lowercase-title
describe('MemberTable', () => {
  it('renders empty placeholder when no members', () => {
    render(<MemberTable members={[]} type="user" />);
    expect(screen.getByText(/no users\./i)).toBeInTheDocument();
  });

  it('renders empty placeholder for groups', () => {
    render(<MemberTable members={[]} type="group" />);
    expect(screen.getByText(/no groups\./i)).toBeInTheDocument();
  });

  it('renders UID/Name/Role/Joined/Action columns for user type', () => {
    render(<MemberTable members={baseMembers} type="user" />);
    const table = screen.getByRole('table');
    const headers = within(table).getAllByRole('columnheader');
    expect(headers.map((h) => h.textContent)).toEqual(['UID', 'Name', 'Role', 'Joined', 'Action']);
  });

  it('omits Role/Joined columns for group type', () => {
    render(<MemberTable members={[{ uid: 1, uname: 'g1', role: 'default' }]} type="group" />);
    const table = screen.getByRole('table');
    const headers = within(table).getAllByRole('columnheader');
    expect(headers.map((h) => h.textContent)).toEqual(['UID', 'Name', 'Action']);
  });

  it('renders each member row with uid, uname, role and ISO join date when joinedAt is set', () => {
    render(<MemberTable members={baseMembers} type="user" />);
    // uid + uname cells
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('bob')).toBeInTheDocument();
    // role cell content
    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(screen.getByText('default')).toBeInTheDocument();
    // joinedAt 1700000000 -> 2023-11-14T22:13:20.000Z
    expect(screen.getByText('2023-11-14T22:13:20.000Z')).toBeInTheDocument();
  });

  it('renders an empty joined cell when joinedAt is missing', () => {
    render(<MemberTable members={[{ uid: 1, uname: 'alice', role: 'admin' }]} type="user" />);
    const row = screen.getByText('alice').closest('tr');
    expect(row).not.toBeNull();
    const cells = within(row as HTMLElement).getAllByRole('cell');
    // 5 cells: uid, name, role, joined, action
    expect(cells[3].textContent).toBe('');
  });

  it('renders an Edit button per row', () => {
    render(<MemberTable members={baseMembers} type="user" />);
    expect(screen.getAllByRole('button', { name: /edit/i })).toHaveLength(2);
  });
});
