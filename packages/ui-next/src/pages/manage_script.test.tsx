/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { type PageData, PageDataProvider } from '../context/page-data';
import ManageScriptPage from './manage_script';

function renderPage(args: Record<string, unknown> = {}) {
  const initial: PageData = {
    name: 'manage_script', template: 'manage_script.html', url: '/manage/script',
    args: { UserContext: {}, UiContext: {}, ...args } as PageData['args'],
  };
  return render(
    <PageDataProvider initial={initial}>
      <ManageScriptPage />
    </PageDataProvider>,
  );
}

describe('manage_script', () => {
  it('shows the empty-state message when scripts is missing', () => {
    renderPage();
    expect(screen.getByText(/no scripts/i)).toBeInTheDocument();
  });

  it('shows the empty-state message when scripts is an empty object', () => {
    renderPage({ scripts: {} });
    expect(screen.getByText(/no scripts/i)).toBeInTheDocument();
  });

  it('renders one row per non-hidden script and pins the count', () => {
    const scripts = {
      rp: { description: 'Reputation recalculation' },
      checkUpdate: { description: 'Check for updates' },
      problemStat: { description: 'Recompute problem statistics' },
    };
    renderPage({ scripts });
    // 1 header row + 3 data rows
    expect(screen.getAllByRole('row')).toHaveLength(4);
  });

  it('shows the script id, description, and a Run button per row', () => {
    const scripts = {
      rp: { description: 'Reputation recalculation' },
    };
    renderPage({ scripts });
    expect(screen.getByText('rp')).toBeInTheDocument();
    expect(screen.getByText('Reputation recalculation')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /run/i })).toBeInTheDocument();
  });

  it('falls back to "None" when the script description is missing', () => {
    const scripts = {
      mystery: { description: undefined as unknown as string },
    };
    renderPage({ scripts });
    expect(screen.getByText('mystery')).toBeInTheDocument();
    expect(screen.getByText(/none/i)).toBeInTheDocument();
  });

  it('hides scripts flagged with hidden=true', () => {
    const scripts = {
      rp: { description: 'Reputation recalculation' },
      secret: { description: 'Hidden script', hidden: true },
    };
    renderPage({ scripts });
    expect(screen.getByText('rp')).toBeInTheDocument();
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
    expect(screen.queryByText('Hidden script')).not.toBeInTheDocument();
    // 1 header + 1 data row (secret filtered)
    expect(screen.getAllByRole('row')).toHaveLength(2);
    // 1 Run button only
    expect(screen.getAllByRole('button', { name: /run/i })).toHaveLength(1);
  });

  it('renders an em-dash placeholder when modified is not provided', () => {
    const scripts = {
      rp: { description: 'Reputation recalculation' },
    };
    renderPage({ scripts });
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders the modified timestamp in a <time> element with dateTime and relative text', () => {
    const scripts = {
      rp: { description: 'Reputation recalculation', modified: '2026-01-15T10:30:00.000Z' },
    };
    renderPage({ scripts });
    // Use a predicate to find TIME elements only — avoids matching the TD ancestor
    const timeEl = screen.getByText((content, element) => (
      element.tagName === 'TIME' && /[秒分钟小时天月年]前/.test(content)
    ));
    expect(timeEl).toHaveAttribute('dateTime', '2026-01-15T10:30:00.000Z');
    expect(screen.queryByText('—')).not.toBeInTheDocument();
  });

  it('renders the <time> element with a numeric epoch (seconds) normalized to ISO in dateTime', () => {
    // 1700000000 s → 1700000000000 ms → 2023-11-14T22:13:20.000Z
    // The <1e12 heuristic correctly identifies this as seconds and scales it.
    const scripts = {
      rp: { description: 'Reputation recalculation', modified: 1700000000 },
    };
    renderPage({ scripts });
    const timeEl = screen.getByText((content, element) => (
      element.tagName === 'TIME' && /[秒分钟小时天月年]前/.test(content)
    ));
    expect(timeEl).toHaveAttribute('dateTime', '2023-11-14T22:13:20.000Z');
  });

  it('renders column headers: ID, Description, Modified, Action', () => {
    const scripts = {
      rp: { description: 'Reputation recalculation' },
    };
    renderPage({ scripts });
    expect(screen.getByRole('columnheader', { name: /id/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /description/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /modified/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /action/i })).toBeInTheDocument();
  });
});
