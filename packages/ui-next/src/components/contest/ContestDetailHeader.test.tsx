/* @vitest-environment happy-dom */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ContestDetailHeader } from './ContestDetailHeader';

describe('ContestDetailHeader', () => {
  it('renders title in h1', () => {
    render(<ContestDetailHeader title="Hello Contest" rule="acm" status="upcoming" attended={false} durationText="5.0" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Hello Contest' })).toBeInTheDocument();
  });

  it('renders rule via ruleText (acm -> XCPC)', () => {
    render(<ContestDetailHeader title="T" rule="acm" status="upcoming" attended={false} durationText="5.0" />);
    expect(screen.getByText('XCPC')).toBeInTheDocument();
  });

  it('does not render Attended chip when attended=false', () => {
    render(<ContestDetailHeader title="T" rule="acm" status="upcoming" attended={false} durationText="5.0" />);
    expect(screen.queryByText(/已报名|Attended/i)).not.toBeInTheDocument();
  });

  it('renders durationText', () => {
    render(<ContestDetailHeader title="T" rule="acm" status="ongoing" attended={false} durationText="5.0" />);
    expect(screen.getByText('5.0')).toBeInTheDocument();
  });

  it('renders upcoming / ongoing / done status chip', () => {
    const { rerender } = render(<ContestDetailHeader title="T" rule="acm" status="upcoming" attended={false} durationText="5.0" />);
    expect(screen.getByText(/未开始|Upcoming/i)).toBeInTheDocument();
    rerender(<ContestDetailHeader title="T" rule="acm" status="ongoing" attended={false} durationText="5.0" />);
    expect(screen.getByText(/进行中|Ongoing/i)).toBeInTheDocument();
    rerender(<ContestDetailHeader title="T" rule="acm" status="done" attended={false} durationText="5.0" />);
    expect(screen.getByText(/已结束|Ended/i)).toBeInTheDocument();
  });
});
