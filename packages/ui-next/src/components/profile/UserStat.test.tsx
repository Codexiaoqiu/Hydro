/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { UserStat } from './UserStat';

describe('userStat', () => {
  it('renders three labels with values', () => {
    render(<UserStat submitted={100} accepted={50} liked={12} />);
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText(/提交/)).toBeInTheDocument();
    expect(screen.getByText(/通过/)).toBeInTheDocument();
    expect(screen.getByText(/题解获赞/)).toBeInTheDocument();
  });

  it('defaults missing values to 0', () => {
    render(<UserStat />);
    expect(screen.getAllByText('0').length).toBe(3);
  });
});
