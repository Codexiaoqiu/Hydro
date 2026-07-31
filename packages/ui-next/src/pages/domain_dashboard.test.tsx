/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { type PageData, PageDataProvider } from '../context/page-data';
import DomainDashboardPage from './domain_dashboard';

function renderPage(args: Record<string, unknown>) {
  const initial: PageData = {
    name: 'domain_dashboard', template: 'domain_dashboard.html', url: '/domain/dashboard',
    args: { UserContext: {}, UiContext: {}, ...args } as PageData['args'],
  };
  return render(
    <PageDataProvider initial={initial}>
      <DomainDashboardPage />
    </PageDataProvider>,
  );
}

describe('domain_dashboard', () => {
  it('renders 4 stats cards', () => {
    renderPage({
      domain: { _id: 'd1', name: 'd', displayName: 'D', owner: 1 },
      stats: { userCount: 10, groupCount: 3, problemCount: 50, contestCount: 5 },
      recentActivities: [],
    });
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders recent activities list', () => {
    renderPage({
      domain: { _id: 'd1', name: 'd', displayName: 'D', owner: 1 },
      stats: { userCount: 0, groupCount: 0, problemCount: 0, contestCount: 0 },
      recentActivities: [
        { time: 1700000000, message: 'User alice joined' },
      ],
    });
    expect(screen.getByText('User alice joined')).toBeInTheDocument();
  });

  it('renders empty activities state', () => {
    renderPage({
      domain: { _id: 'd1', name: 'd', displayName: 'D', owner: 1 },
      stats: { userCount: 0, groupCount: 0, problemCount: 0, contestCount: 0 },
      recentActivities: [],
    });
    expect(screen.getByText(/no activity|empty/i)).toBeInTheDocument();
  });
});
