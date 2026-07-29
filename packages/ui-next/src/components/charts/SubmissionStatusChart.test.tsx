/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SubmissionStatusChart } from './SubmissionStatusChart';

const counts = {
  0: 100, // AC
  1: 10, // WA
  2: 5, // TLE
  3: 2, // MLE
  4: 1, // RE
  5: 0, // SE
  6: 3, // CE
  7: 0, // PE
};

describe('submissionStatusChart', () => {
  it('renders one entry per status that has a count', () => {
    render(<SubmissionStatusChart counts={counts as any} />);
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('does not crash when counts is empty', () => {
    render(<SubmissionStatusChart counts={{} as any} />);
    expect(screen.getByText(/暂无提交/)).toBeInTheDocument();
  });
});
