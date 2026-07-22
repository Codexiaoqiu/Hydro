import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../primitives/Toast';
import { ContestBalloonTable } from './ContestBalloonTable';

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  (global as any).fetch = fetchMock;
  fetchMock.mockResolvedValue({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({}) });
});

const rows = [{ _id: 'B1', problem: 1, status: 'pending', submitBy: 'alice', first: true }];
const pdict = { 1: { docId: 1, title: 'A+B' } };
const udict = { alice: { _id: 7, uname: 'alice' } };

describe('ContestBalloonTable', () => {
  it('renders rows with swatches', () => {
    render(
      <ToastProvider>
        <ContestBalloonTable rows={rows as any} pdict={pdict as any} udict={udict as any} onSend={() => {}} />
      </ToastProvider>,
    );
    expect(screen.getByText('A+B')).toBeInTheDocument();
    expect(screen.getByText('alice')).toBeInTheDocument();
  });
  it('Send triggers POST', async () => {
    const onSend = vi.fn();
    render(
      <ToastProvider>
        <ContestBalloonTable rows={rows as any} pdict={pdict as any} udict={udict as any} onSend={onSend} />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(window.location.pathname),
      expect.objectContaining({ method: 'POST' }),
    ));
    expect(onSend).toHaveBeenCalledWith('B1');
  });
});
