/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { type PageData, PageDataProvider } from '../context/page-data';
import ManageDashboardPage from './manage_dashboard';

function renderPage(args: Record<string, unknown> = {}) {
  const initial: PageData = {
    name: 'manage_dashboard', template: 'manage_dashboard.html', url: '/manage/dashboard',
    args: { UserContext: {}, UiContext: {}, ...args } as PageData['args'],
  };
  return render(
    <PageDataProvider initial={initial}>
      <ManageDashboardPage />
    </PageDataProvider>,
  );
}

describe('manage_dashboard', () => {
  it('renders 4 stat cards (Users, Domains, Problems, Submissions)', () => {
    renderPage({
      domain: { _id: 'system', name: 'system' },
      stats: { users: 12, domains: 3, problems: 50, submissions: 200 },
    });
    const cards = screen.getAllByRole('group');
    expect(cards).toHaveLength(4);
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('Domains')).toBeInTheDocument();
    expect(screen.getByText('Problems')).toBeInTheDocument();
    expect(screen.getByText('Submissions')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('200')).toBeInTheDocument();
  });

  it('renders an empty-state for stats when args.stats is missing', () => {
    renderPage({ domain: { _id: 'system', name: 'system' } });
    expect(screen.getAllByText(/no stats|no data|not available/i).length).toBeGreaterThanOrEqual(1);
  });

  it('renders the Information section with domain name', () => {
    renderPage({ domain: { _id: 'system', name: 'main-domain' } });
    expect(screen.getByText('main-domain')).toBeInTheDocument();
  });

  it('renders domain avatar when provided', () => {
    renderPage({
      domain: { _id: 'system', name: 'main-domain', avatar: 'avatar.png' },
    });
    const img = screen.getByRole('img', { name: /avatar/i });
    expect(img).toHaveAttribute('src', 'avatar.png');
  });

  it('renders a Restart button', () => {
    renderPage({ domain: { _id: 'system', name: 'system' } });
    expect(screen.getByRole('button', { name: /restart/i })).toBeInTheDocument();
  });

  it('renders recent activities when provided', () => {
    const activities = [
      { id: 'a1', type: 'user', content: 'Alice signed up', time: 1700000000 },
      { id: 'a2', type: 'problem', content: 'New problem created', time: 1700000100 },
    ];
    renderPage({
      domain: { _id: 'system', name: 'system' },
      activities,
    });
    expect(screen.getByText('Alice signed up')).toBeInTheDocument();
    expect(screen.getByText('New problem created')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('renders a <time> element with dateTime attribute and relative text for older activity (5 days ago)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-03T12:00:00Z'));
    const FIVE_DAYS_MS = 5 * 86_400_000;
    const fiveDaysAgoIso = new Date(Date.now() - FIVE_DAYS_MS).toISOString(); // 2026-07-29T12:00:00.000Z
    const activities = [
      { id: 'a1', type: 'user', content: 'Alice signed up', time: fiveDaysAgoIso },
    ];
    renderPage({ domain: { _id: 'system', name: 'system' }, activities });
    const timeEl = screen.getByText((content, element) => (
      element.tagName === 'TIME' && content === '5天前'
    ));
    expect(timeEl).toHaveAttribute('dateTime', fiveDaysAgoIso);
    vi.useRealTimers();
  });

  it('renders a <time> element with dateTime attribute for a very recent activity (< 60s)', () => {
    const NOW = Date.now();
    const recentIso = new Date(NOW - 5_000).toISOString(); // 5 seconds ago → "几秒前"
    const activities = [
      { id: 'a1', type: 'user', content: 'Recent action', time: recentIso },
    ];
    renderPage({ domain: { _id: 'system', name: 'system' }, activities });
    const timeEl = screen.getByText((content, element) => (
      element.tagName === 'TIME' && content === '几秒前'
    ));
    expect(timeEl).toHaveAttribute('dateTime', recentIso);
  });

  it('renders empty state for activities when missing or empty', () => {
    renderPage({ domain: { _id: 'system', name: 'system' } });
    expect(screen.getByText(/no recent activity/i)).toBeInTheDocument();
  });

  it('renders messages when provided', () => {
    const messages = [
      { id: 'm1', content: 'Welcome to Hydro', level: 'info' as const },
    ];
    renderPage({
      domain: { _id: 'system', name: 'system' },
      messages,
    });
    expect(screen.getByText('Welcome to Hydro')).toBeInTheDocument();
  });

  it('renders empty state for messages when missing or empty', () => {
    renderPage({ domain: { _id: 'system', name: 'system' } });
    expect(screen.getByText(/no messages/i)).toBeInTheDocument();
  });
});
