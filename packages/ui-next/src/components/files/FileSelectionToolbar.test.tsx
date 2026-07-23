import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FileSelectionToolbar } from './FileSelectionToolbar';

const NAMES = ['a.txt', 'b.txt', 'c.txt'];

describe('fileSelectionToolbar', () => {
  it('renders the available and selected counts', () => {
    render(<FileSelectionToolbar available={NAMES} />);
    expect(screen.getByTestId('file-selection-toolbar-count').textContent).toMatch(/0\s*\/\s*3/);
  });

  it('increments the selected count when Select All is clicked', () => {
    render(<FileSelectionToolbar available={NAMES} />);
    fireEvent.click(screen.getByRole('button', { name: /select all|全选/i }));
    expect(screen.getByTestId('file-selection-toolbar-count').textContent).toMatch(/3\s*\/\s*3/);
  });

  it('inverts the current selection when Invert is clicked', () => {
    render(<FileSelectionToolbar available={NAMES} />);
    fireEvent.click(screen.getByRole('button', { name: /select all|全选/i }));
    fireEvent.click(screen.getByRole('button', { name: /invert|反选/i }));
    expect(screen.getByTestId('file-selection-toolbar-count').textContent).toMatch(/0\s*\/\s*3/);
    fireEvent.click(screen.getByRole('button', { name: /invert|反选/i }));
    expect(screen.getByTestId('file-selection-toolbar-count').textContent).toMatch(/3\s*\/\s*3/);
  });

  it('emits an empty selection through Clear', () => {
    render(<FileSelectionToolbar available={NAMES} />);
    fireEvent.click(screen.getByRole('button', { name: /select all|全选/i }));
    fireEvent.click(screen.getByRole('button', { name: /clear|清空/i }));
    expect(screen.getByTestId('file-selection-toolbar-count').textContent).toMatch(/0\s*\/\s*3/);
  });

  it('disables Select All / Invert / Clear when nothing is available', () => {
    render(<FileSelectionToolbar available={[]} />);
    expect(screen.getByRole('button', { name: /select all|全选/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /invert|反选/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /clear|清空/i })).toBeDisabled();
  });

  it('invokes the primary action with the current selected names', () => {
    const onAction = vi.fn();
    render(
      <FileSelectionToolbar
        available={NAMES}
        primaryAction={{ label: '重命名', onSelect: onAction }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /select all|全选/i }));
    fireEvent.click(screen.getByRole('button', { name: '重命名' }));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect([...onAction.mock.calls[0][0]].sort()).toEqual([...NAMES].sort());
  });

  it('disables the primary action while selection is empty', () => {
    const onAction = vi.fn();
    render(
      <FileSelectionToolbar
        available={NAMES}
        primaryAction={{ label: 'Rename', onSelect: onAction }}
      />,
    );
    expect(screen.getByRole('button', { name: 'Rename' })).toBeDisabled();
  });

  it('drops stale names when the available list shrinks', () => {
    const { rerender } = render(<FileSelectionToolbar available={NAMES} />);
    fireEvent.click(screen.getByRole('button', { name: /select all|全选/i }));
    rerender(<FileSelectionToolbar available={['a.txt']} />);
    expect(screen.getByTestId('file-selection-toolbar-count').textContent).toMatch(/1\s*\/\s*1/);
  });
});
