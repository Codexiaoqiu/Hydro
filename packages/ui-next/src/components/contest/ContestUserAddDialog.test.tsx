import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../primitives/Toast';
import { ContestUserAddDialog } from './ContestUserAddDialog';

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  (global as any).fetch = fetchMock;
  fetchMock.mockResolvedValue({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({}) });
});

describe('ContestUserAddDialog', () => {
  it('Add button is disabled when no user selected', () => {
    render(
      <ToastProvider>
        <ContestUserAddDialog open onClose={() => {}} onAdded={() => {}} />
      </ToastProvider>,
    );
    expect(screen.getByRole('button', { name: /add/i })).toBeDisabled();
  });
  it('submits when user picked', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => [{ _id: 5, uname: 'alice' }] })
      .mockResolvedValueOnce({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => [] });
    const onAdded = vi.fn();
    render(
      <ToastProvider>
        <ContestUserAddDialog open onClose={() => {}} onAdded={onAdded} />
      </ToastProvider>,
    );
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'al' } });
    await waitFor(() => screen.getByText('alice'));
    fireEvent.mouseDown(screen.getByText('alice'));
    fireEvent.click(screen.getByRole('button', { name: /add/i }));
    await waitFor(() => expect(onAdded).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(window.location.pathname),
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
