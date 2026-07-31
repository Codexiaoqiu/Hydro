/* @vitest-environment happy-dom */
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { type PageData, PageDataProvider } from '../context/page-data';
import ManageUserPrivPage from './manage_user_priv';

function renderPage(args: Record<string, unknown> = {}) {
  const initial: PageData = {
    name: 'manage_user_priv', template: 'manage_user_priv.html', url: '/manage/userpriv',
    args: { UserContext: {}, UiContext: {}, ...args } as PageData['args'],
  };
  return render(
    <PageDataProvider initial={initial}>
      <ManageUserPrivPage />
    </PageDataProvider>,
  );
}

const samplePriv = {
  PRIV_EDIT_SYSTEM: 1,
  PRIV_SET_PERM: 2,
  PRIV_USER_PROFILE: 4,
  PRIV_REGISTER_USER: 8,
};

const sampleUsers = [
  { _id: 1, uname: 'alice', priv: 1 + 4 },
  { _id: 2, uname: 'bob', priv: 2 },
  { _id: 3, uname: 'carol', priv: 0 },
];

describe('manage_user_priv', () => {
  it('renders the section title with the User Privilege heading', () => {
    renderPage({ udocs: sampleUsers, Priv: samplePriv, defaultPriv: 0 });
    expect(screen.getByRole('heading', { level: 1, name: /user privilege/i })).toBeInTheDocument();
  });

  it('renders the Select User button', () => {
    renderPage({ udocs: sampleUsers, Priv: samplePriv, defaultPriv: 0 });
    expect(screen.getByRole('button', { name: /select user/i })).toBeInTheDocument();
  });

  it('renders the user table with one row per user via MemberTable', () => {
    renderPage({ udocs: sampleUsers, Priv: samplePriv, defaultPriv: 0 });
    // MemberTable renders a single data-table of rows: 1 header + 3 user rows
    const table = screen.getByRole('table');
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(1 + sampleUsers.length);
  });

  it('shows the user uid, uname, and priv (as role) in each row', () => {
    renderPage({ udocs: sampleUsers, Priv: samplePriv, defaultPriv: 0 });
    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.getByText('bob')).toBeInTheDocument();
    expect(screen.getByText('carol')).toBeInTheDocument();
    // Scope to the data-table so we don't collide with matrix cells.
    const table = screen.getByRole('table');
    // uid cells (column 0)
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(sampleUsers.length);
    expect(rows[0].cells[0]).toHaveTextContent('1');
    expect(rows[1].cells[0]).toHaveTextContent('2');
    expect(rows[2].cells[0]).toHaveTextContent('3');
    // priv values rendered as role strings (column 2)
    expect(rows[0].cells[2]).toHaveTextContent('5');
    expect(rows[1].cells[2]).toHaveTextContent('2');
    expect(rows[2].cells[2]).toHaveTextContent('0');
  });

  it('renders one Edit button per user row', () => {
    renderPage({ udocs: sampleUsers, Priv: samplePriv, defaultPriv: 0 });
    expect(screen.getAllByRole('button', { name: /edit/i })).toHaveLength(sampleUsers.length);
  });

  it('falls back to the uid as uname when uname is missing', () => {
    renderPage({
      udocs: [{ _id: 42, priv: 1 }],
      Priv: samplePriv,
      defaultPriv: 0,
    });
    const table = screen.getByRole('table');
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(2);
    // The uname cell falls back to the uid as a string; both uid and uname
    // cells render the same "42" so verify by cell positions.
    expect(rows[1].cells[0]).toHaveTextContent('42');
    expect(rows[1].cells[1]).toHaveTextContent('42');
  });

  it('renders the MemberTable empty state when no users are provided', () => {
    renderPage({ udocs: [], Priv: samplePriv, defaultPriv: 0 });
    expect(screen.getByText(/no users\./i)).toBeInTheDocument();
  });

  it('renders the MemberTable empty state when udocs is missing', () => {
    renderPage({ Priv: samplePriv, defaultPriv: 0 });
    expect(screen.getByText(/no users\./i)).toBeInTheDocument();
  });

  it('renders the permission matrix with one row per Priv key', () => {
    renderPage({ udocs: sampleUsers, Priv: samplePriv, defaultPriv: 0 });
    const grid = screen.getByRole('grid');
    const rows = within(grid).getAllByRole('row');
    // 1 header row + 1 row per Priv key
    expect(rows).toHaveLength(1 + Object.keys(samplePriv).length);
  });

  it('renders the permission matrix with stable column headers', () => {
    renderPage({ udocs: sampleUsers, Priv: samplePriv, defaultPriv: 0 });
    const grid = screen.getByRole('grid');
    const headers = within(grid).getAllByRole('columnheader');
    expect(headers.map((h) => h.textContent)).toEqual([
      'Permission',
      'default',
    ]);
  });

  it('checks matrix cells based on the defaultPriv bitmask', () => {
    // defaultPriv = 1 (PRIV_EDIT_SYSTEM) is set; bit 2 (PRIV_SET_PERM) is not.
    renderPage({
      udocs: sampleUsers,
      Priv: samplePriv,
      defaultPriv: 1,
    });
    // Priv keys are iterated in insertion order, so the first row is PRIV_EDIT_SYSTEM.
    expect(screen.getByTestId('cell-role-default-perm-0')).toBeChecked();
    expect(screen.getByTestId('cell-role-default-perm-1')).not.toBeChecked();
  });

  it('renders the RoleSelector empty state when Priv is empty', () => {
    renderPage({ udocs: sampleUsers, Priv: {}, defaultPriv: 0 });
    expect(screen.getByText(/no role data\./i)).toBeInTheDocument();
  });

  it('renders the RoleSelector empty state when Priv is missing', () => {
    renderPage({ udocs: sampleUsers, defaultPriv: 0 });
    expect(screen.getByText(/no role data\./i)).toBeInTheDocument();
  });

  it('falls back to defaultPriv = 0 when missing (matrix updated accordingly)', () => {
    renderPage({ udocs: sampleUsers, Priv: samplePriv });
    // With defaultPriv missing, all bits should be unchecked.
    expect(screen.getByTestId('cell-role-default-perm-0')).not.toBeChecked();
  });
});
