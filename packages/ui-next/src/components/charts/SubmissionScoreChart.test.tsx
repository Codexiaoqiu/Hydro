/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SubmissionScoreChart } from './SubmissionScoreChart';

describe('submissionScoreChart', () => {
  it('renders 10 buckets', () => {
    const { container } = render(<SubmissionScoreChart scores={[10, 20, 30, 100]} />);
    const bars = container.querySelectorAll('[data-trend-bar]');
    expect(bars.length).toBe(10);
  });

  it('does not crash when scores is empty', () => {
    render(<SubmissionScoreChart scores={[]} />);
    expect(screen.getByText(/暂无分数/)).toBeInTheDocument();
  });
});
