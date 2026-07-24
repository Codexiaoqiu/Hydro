/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ContestSubmissionList } from './ContestSubmissionList';

vi.mock('../link', () => ({
  Link: ({ children, to, params, ...rest }: any) => (
    <a data-testid={`link-${to}-${params?.rid ?? ''}`} href={`/${to}/${params?.rid ?? ''}`} {...rest}>
      {children}
    </a>
  ),
}));

const rdocs = [
  { _id: '60b01', pid: 101, status: 1, lang: 'cpp', time: 100 },
  { _id: '60b02', pid: 101, status: 4, lang: 'cpp', time: 200 },
  { _id: '60b03', pid: 102, status: 7, lang: 'py', time: 50 },
  { _id: '60b04', pid: 102, status: 1, lang: 'py', time: 60 },
];

describe('ContestSubmissionList', () => {
  it('renders empty state when no records', () => {
    render(<ContestSubmissionList rdocs={[]} />);
    expect(screen.getByText(/暂无提交|No submissions/i)).toBeInTheDocument();
  });

  it('groups records by problem and exposes a collapsible group per pid', () => {
    render(<ContestSubmissionList rdocs={rdocs} pidLabels={{ 101: 'A', 102: 'B' }} />);
    expect(screen.getByTestId('submissions-101')).toBeInTheDocument();
    expect(screen.getByTestId('submissions-102')).toBeInTheDocument();
  });

  it('renders one row per record linking to record_detail', () => {
    render(<ContestSubmissionList rdocs={rdocs} pidLabels={{ 101: 'A', 102: 'B' }} />);
    expect(screen.getByTestId('link-record_detail-60b01')).toBeInTheDocument();
    expect(screen.getByTestId('link-record_detail-60b04')).toBeInTheDocument();
  });

  it('uses STATUS_SHORT_TEXTS for status text', () => {
    render(<ContestSubmissionList rdocs={rdocs} pidLabels={{ 101: 'A', 102: 'B' }} />);
    expect(screen.getAllByText('AC').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('MLE')).toBeInTheDocument();
    expect(screen.getByText('CE')).toBeInTheDocument();
  });

  it('limits records per problem when limitPerProblem is set', () => {
    const many = Array.from({ length: 5 }, (_, i) => ({ _id: `60b0${i}`, pid: 101, status: 2, lang: 'cpp' }));
    render(<ContestSubmissionList rdocs={many} pidLabels={{ 101: 'A' }} limitPerProblem={2} />);
    expect(screen.getAllByText('WA').length).toBe(2);
    expect(screen.getByText(/\+ 3 more/)).toBeInTheDocument();
  });
});
