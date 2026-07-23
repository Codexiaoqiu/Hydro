import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SubtaskSettings } from './SubtaskSettings';

const subtask = { type: 'sum' as const, score: 100, cases: [] };

describe('SubtaskSettings', () => {
  it('does not render when open is false', () => {
    render(
      <SubtaskSettings open={false} subtask={subtask} index={0} onApply={() => {}} onCancel={() => {}} />,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the modal title with subtask index', () => {
    render(
      <SubtaskSettings open subtask={subtask} index={0} onApply={() => {}} onCancel={() => {}} />,
    );
    expect(screen.getByText(/Subtask 1/)).toBeInTheDocument();
  });

  it('calls onApply with patch on Apply click', () => {
    const onApply = vi.fn();
    render(
      <SubtaskSettings open subtask={subtask} index={0} onApply={onApply} onCancel={() => {}} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /apply/i }));
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({
      score: expect.any(Number),
      type: expect.any(String),
    }));
  });

  it('calls onCancel when Cancel is clicked', () => {
    const onCancel = vi.fn();
    render(
      <SubtaskSettings open subtask={subtask} index={0} onApply={() => {}} onCancel={onCancel} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalled();
  });
});