import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProblemConfigTree } from './ProblemConfigTree';

const cfg = { type: 'default', subtasks: [{ score: 100, time_limit: 1000, memory_limit: 256, cases: [{ input: '1.in', output: '1.out' }] }] };

describe('ProblemConfigTree', () => {
  it('renders each subtask as a row', () => {
    render(<ProblemConfigTree config={cfg} testdata={['1.in', '1.out']} onChange={() => {}} onAutoDetect={() => {}} />);
    expect(screen.getByText(/Subtask 1/i)).toBeInTheDocument();
  });
  it('calls onAutoDetect when Auto Detect is clicked', () => {
    const onAutoDetect = vi.fn();
    render(<ProblemConfigTree config={cfg} testdata={['1-1.in', '1-1.out', '2-1.in', '2-1.out']} onChange={() => {}} onAutoDetect={onAutoDetect} />);
    fireEvent.click(screen.getByRole('button', { name: /auto detect/i }));
    expect(onAutoDetect).toHaveBeenCalled();
  });
});
