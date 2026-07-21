import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UserSelectAutoComplete } from './UserSelectAutoComplete';

const fetchMock = vi.fn();
beforeEach(() => { fetchMock.mockReset(); (global as any).fetch = fetchMock; });
afterEach(() => { vi.restoreAllMocks(); });

describe('UserSelectAutoComplete', () => {
  it('renders chosen users as chips', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => [{ _id: 1, uname: 'a' }, { _id: 2, uname: 'b' }],
    });
    render(<UserSelectAutoComplete value={[1, 2]} onChange={() => {}} />);
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(2));
  });
  it('fetches suggestions when typing', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => [{ _id: 5, uname: 'alice' }, { _id: 6, uname: 'albert' }],
    });
    render(<UserSelectAutoComplete value={[]} onChange={() => {}} />);
    const input = screen.getByRole('textbox');
    await act(async () => { fireEvent.change(input, { target: { value: 'al' } }); });
    await waitFor(() => expect(screen.getByText('alice')).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/user/search?q=al'), expect.any(Object));
  });
  it('calls onChange when picking a suggestion', async () => {
    fetchMock.mockImplementation(() => new Promise((r) => { setTimeout(() => r({
      ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => [{ _id: 5, uname: 'alice' }],
    }), 0); }));
    const onChange = vi.fn();
    render(<UserSelectAutoComplete value={[]} onChange={onChange} />);
    const input = screen.getByRole('textbox');
    await act(async () => { fireEvent.change(input, { target: { value: 'a' } }); });
    await waitFor(() => screen.getByText('alice'));
    await act(async () => { fireEvent.mouseDown(screen.getByText('alice')); });
    expect(onChange).toHaveBeenCalledWith([5]);
  });
});
