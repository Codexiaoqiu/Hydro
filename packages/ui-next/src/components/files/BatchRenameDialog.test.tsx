import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BatchRenameDialog } from './BatchRenameDialog';

const baseProps = {
  open: true,
  selected: ['a.txt', 'b.txt'],
  existing: ['a.txt', 'b.txt', 'c.txt'],
  onClose: vi.fn(),
  onConfirm: vi.fn().mockResolvedValue(undefined),
};

describe('batchRenameDialog', () => {
  it('renders nothing when closed', () => {
    render(<BatchRenameDialog {...baseProps} open={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders a preview row for every selected name and shows the new name (no opts → unchanged)', () => {
    render(<BatchRenameDialog {...baseProps} />);
    expect(screen.getByTestId('batch-rename-row-a.txt')).toBeInTheDocument();
    expect(screen.getByTestId('batch-rename-row-b.txt')).toBeInTheDocument();
    expect(screen.getByTestId('batch-rename-new-a.txt').textContent).toBe('a.txt');
    expect(screen.getByTestId('batch-rename-new-b.txt').textContent).toBe('b.txt');
  });

  it('updates the preview live as the user types into Prefix', () => {
    render(<BatchRenameDialog {...baseProps} />);
    fireEvent.change(screen.getByTestId('batch-rename-prefix'), { target: { value: 'pre_' } });
    expect(screen.getByTestId('batch-rename-new-a.txt').textContent).toBe('pre_a.txt');
    expect(screen.getByTestId('batch-rename-new-b.txt').textContent).toBe('pre_b.txt');
    // Editing again updates without a refresh click.
    fireEvent.change(screen.getByTestId('batch-rename-prefix'), { target: { value: 'live_' } });
    expect(screen.getByTestId('batch-rename-new-a.txt').textContent).toBe('live_a.txt');
  });

  it('disables Confirm when no selected names are provided', () => {
    render(<BatchRenameDialog {...baseProps} selected={[]} />);
    expect(screen.getByTestId('batch-rename-confirm')).toBeDisabled();
  });

  it('disables Confirm and surfaces duplicates live when two names would clash', () => {
    render(<BatchRenameDialog {...baseProps} selected={['a.txt', 'b.txt']} />);
    // Strip the first character so both names collapse to '.txt'.
    fireEvent.change(screen.getByTestId('batch-rename-find'), { target: { value: '^[ab]' } });
    fireEvent.change(screen.getByTestId('batch-rename-replace'), { target: { value: '' } });
    expect(screen.getByTestId('batch-rename-confirm')).toBeDisabled();
    expect(screen.getByTestId('batch-rename-duplicates')).toHaveTextContent(/\.txt/);
  });

  it('disables Confirm and surfaces collisions live with files outside the selection', () => {
    render(<BatchRenameDialog {...baseProps} selected={['a.txt']} />);
    // Find/replace 'a.txt' -> 'c.txt' collides with the existing c.txt.
    fireEvent.change(screen.getByTestId('batch-rename-find'), { target: { value: 'a.txt' } });
    fireEvent.change(screen.getByTestId('batch-rename-replace'), { target: { value: 'c.txt' } });
    expect(screen.getByTestId('batch-rename-confirm')).toBeDisabled();
    expect(screen.getByTestId('batch-rename-collisions')).toHaveTextContent(/c\.txt/);
  });

  it('disables Confirm live when the find pattern is an invalid RegExp', () => {
    render(<BatchRenameDialog {...baseProps} />);
    fireEvent.change(screen.getByTestId('batch-rename-find'), { target: { value: '[' } });
    expect(screen.getByTestId('batch-rename-confirm')).toBeDisabled();
    expect(screen.getByTestId('batch-rename-error')).toBeInTheDocument();
    // Single alert: the inline error in the Find input is suppressed so screen
    // readers do not announce the regex error twice.
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getByTestId('batch-rename-find')).toHaveAttribute('aria-invalid', 'true');
  });

  it('enables Confirm after typing a clean prefix and forwards the changes', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(
      <BatchRenameDialog
        {...baseProps}
        selected={['a.txt', 'b.txt']}
        existing={['a.txt', 'b.txt']}
        onConfirm={onConfirm}
        onClose={onClose}
      />,
    );
    fireEvent.change(screen.getByTestId('batch-rename-prefix'), { target: { value: 'new_' } });
    expect(screen.getByTestId('batch-rename-confirm')).not.toBeDisabled();
    fireEvent.click(screen.getByTestId('batch-rename-confirm'));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    const changes = onConfirm.mock.calls[0][0] as Array<{ oldName: string; newName: string }>;
    expect(changes).toEqual([
      { oldName: 'a.txt', newName: 'new_a.txt' },
      { oldName: 'b.txt', newName: 'new_b.txt' },
    ]);
    // I7: success must close the dialog.
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows the onConfirm error and keeps the dialog open when onConfirm rejects', async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error('network down'));
    const onClose = vi.fn();
    render(
      <BatchRenameDialog
        {...baseProps}
        selected={['a.txt', 'b.txt']}
        existing={['a.txt', 'b.txt']}
        onConfirm={onConfirm}
        onClose={onClose}
      />,
    );
    fireEvent.change(screen.getByTestId('batch-rename-prefix'), { target: { value: 'new_' } });
    fireEvent.click(screen.getByTestId('batch-rename-confirm'));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    expect(await screen.findByTestId('batch-rename-submit-error')).toHaveTextContent('network down');
    expect(onClose).not.toHaveBeenCalled();
    // Dialog still mounted -> user can retry after fixing the issue.
    expect(screen.getByTestId('batch-rename-confirm')).not.toBeDisabled();
  });

  it('does not seed the form when selected identity is unchanged mid-edit', () => {
    const selectedRef = ['a.txt', 'b.txt'];
    const { rerender } = render(<BatchRenameDialog {...baseProps} selected={selectedRef} />);
    fireEvent.change(screen.getByTestId('batch-rename-prefix'), { target: { value: 'draft_' } });
    // Same selected identity (new array, same contents) must NOT clobber the user's draft.
    rerender(<BatchRenameDialog {...baseProps} selected={['a.txt', 'b.txt']} />);
    expect((screen.getByTestId('batch-rename-prefix') as HTMLInputElement).value).toBe('draft_');
    // But a fresh open (open false -> true) DOES reset.
    rerender(<BatchRenameDialog {...baseProps} open={false} />);
    rerender(<BatchRenameDialog {...baseProps} open />);
    expect((screen.getByTestId('batch-rename-prefix') as HTMLInputElement).value).toBe('');
  });

  it('focuses the Prefix input when the dialog opens', () => {
    render(<BatchRenameDialog {...baseProps} />);
    expect(screen.getByTestId('batch-rename-prefix')).toHaveFocus();
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(<BatchRenameDialog {...baseProps} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('batch-rename-cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(<BatchRenameDialog {...baseProps} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
