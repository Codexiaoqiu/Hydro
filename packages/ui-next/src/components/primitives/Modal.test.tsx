import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from './Modal';

describe('Modal', () => {
  it('renders nothing when closed', () => {
    render(<Modal open={false} onClose={() => {}} title="x">body</Modal>);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('renders dialog and title when open', () => {
    render(<Modal open onClose={() => {}} title="Hello">body</Modal>);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('body')).toBeInTheDocument();
  });
  it('calls onClose on Escape', () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="x">body</Modal>);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
  it('calls onClose on backdrop click', () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="x">body</Modal>);
    fireEvent.click(screen.getByTestId('modal-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('localizes the close button via the closeLabel prop', () => {
    render(<Modal open onClose={() => {}} title="x" closeLabel="关闭">body</Modal>);
    expect(screen.getByRole('button', { name: '关闭' })).toBeInTheDocument();
  });

  it('defaults the close button label to "Close"', () => {
    render(<Modal open onClose={() => {}} title="x">body</Modal>);
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });
});
