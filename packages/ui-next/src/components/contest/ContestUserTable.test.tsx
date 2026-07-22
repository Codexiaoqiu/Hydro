import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../primitives/Toast';
import { ContestUserTable } from './ContestUserTable';

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  (global as any).fetch = fetchMock;
  fetchMock.mockResolvedValue({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({}) });
});

const tdoc = { docId: 7, beginAt: '2026-01-01', endAt: '2026-12-31', duration: 0 } as any;
const rows = [{ uid: 1, startAt: '2026-06-01', endAt: '', unrank: false }];
const udict = { 1: { _id: 1, uname: 'alice' } };

describe('ContestUserTable', () => {
  it('renders rows', () => {
    render(
      <ToastProvider>
        <ContestUserTable rows={rows as any} udict={udict} tdoc={tdoc} onChange={() => {}} />
      </ToastProvider>,
    );
    expect(screen.getByText('alice')).toBeInTheDocument();
  });
  it('Rank button toggles unrank', async () => {
    const onChange = vi.fn();
    render(
      <ToastProvider>
        <ContestUserTable rows={rows as any} udict={udict} tdoc={tdoc} onChange={onChange} />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: /rank/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(onChange).toHaveBeenCalled();
  });
});
