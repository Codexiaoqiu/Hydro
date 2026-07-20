/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ContestTimer } from './ContestTimer';

vi.mock('../../lib/contest-timer', () => ({
  useContestTimer: () => ({
    status: 'running' as const,
    msLeft: 2 * 3600_000 + 30 * 60_000,
    progress: 0.5,
    display: '02:30:00',
  }),
  computeTimerState: () => ({ status: 'running', msLeft: 0, progress: 0, display: '' }),
}));

const beginAt = '2026-07-08T10:00:00Z';
const endAt = '2026-07-08T15:00:00Z';

describe('contestTimer', () => {
  it('renders countdown display', () => {
    render(<ContestTimer tdoc={{ beginAt, endAt, duration: 5 * 3600_000 } as any} tsdoc={null} />);
    expect(screen.getByText('02:30:00')).toBeInTheDocument();
  });

  it('renders progress bar with style transform scaleX', () => {
    render(<ContestTimer tdoc={{ beginAt, endAt, duration: 5 * 3600_000 } as any} tsdoc={null} />);
    const bar = document.querySelector('[data-testid="contest-progress"]') as HTMLElement;
    expect(bar).toBeTruthy();
    expect(bar.style.transform).toContain('scaleX(0.5)');
  });

  it('renders localized label for running status', () => {
    render(<ContestTimer tdoc={{ beginAt, endAt, duration: 5 * 3600_000 } as any} tsdoc={null} />);
    expect(screen.getByText(/Ends in|距离结束/i)).toBeInTheDocument();
  });
});
