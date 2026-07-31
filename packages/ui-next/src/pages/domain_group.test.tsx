/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { type PageData, PageDataProvider } from '../context/page-data';
import DomainGroupPage from './domain_group';

function renderPage(args: Record<string, unknown>) {
  const initial: PageData = {
    name: 'domain_group', template: 'domain_group.html', url: '/domain/group',
    args: { UserContext: {}, UiContext: {}, ...args } as PageData['args'],
  };
  return render(
    <PageDataProvider initial={initial}>
      <DomainGroupPage />
    </PageDataProvider>,
  );
}

describe('domain_group', () => {
  it('renders the section title with the domain name', () => {
    renderPage({
      domain: { _id: 'd1', name: 'my-domain', displayName: 'My Domain' },
      groups: [],
    });
    expect(screen.getByRole('heading', { level: 1, name: /my-domain: groups/i })).toBeInTheDocument();
  });

  it('renders Import / Export / Create Group action buttons', () => {
    renderPage({
      domain: { _id: 'd1', name: 'd', displayName: 'D' },
      groups: [],
    });
    expect(screen.getByRole('button', { name: /import groups/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export groups/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create group/i })).toBeInTheDocument();
  });

  it('renders Remove Selected Group and Save All Changes footer buttons', () => {
    renderPage({
      domain: { _id: 'd1', name: 'd', displayName: 'D' },
      groups: [],
    });
    expect(screen.getByRole('button', { name: /remove selected group/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save all changes/i })).toBeInTheDocument();
  });

  it('renders one row per group using MemberTable', () => {
    renderPage({
      domain: { _id: 'd1', name: 'd', displayName: 'D' },
      groups: [
        { _id: 'g1', name: 'group-a', uids: [1, 2, 3] },
        { _id: 'g2', name: 'group-b', uids: [4] },
      ],
    });
    // Group names render in the Name column
    expect(screen.getByText('group-a')).toBeInTheDocument();
    expect(screen.getByText('group-b')).toBeInTheDocument();
    // 2 Edit buttons, one per row
    expect(screen.getAllByRole('button', { name: /edit/i })).toHaveLength(2);
  });

  it('renders empty placeholder when no groups are present', () => {
    renderPage({
      domain: { _id: 'd1', name: 'd', displayName: 'D' },
      groups: [],
    });
    expect(screen.getByText(/no groups\./i)).toBeInTheDocument();
  });
});
