import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../primitives/Toast';
import { ContestBalloonSetColor } from './ContestBalloonSetColor';

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  (global as any).fetch = fetchMock;
  fetchMock.mockResolvedValue({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({}) });
});

describe('ContestBalloonSetColor', () => {
  it('renders HexColorPicker when open', () => {
    render(
      <ToastProvider>
        <ContestBalloonSetColor open onClose={() => {}} onSaved={() => {}} />
      </ToastProvider>,
    );
    expect(screen.getByRole('textbox', { name: /hex/i })).toBeInTheDocument();
  });
  it('POSTs color yaml on save', async () => {
    const onSaved = vi.fn();
    render(
      <ToastProvider>
        <ContestBalloonSetColor open onClose={() => {}} onSaved={onSaved} />
      </ToastProvider>,
    );
    const hex = screen.getByRole('textbox', { name: /hex/i });
    fireEvent.change(hex, { target: { value: '#ff8800' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(window.location.pathname),
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
