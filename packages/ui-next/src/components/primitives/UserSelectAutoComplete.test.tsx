import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UserSelectAutoComplete } from './UserSelectAutoComplete';

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  (global as any).fetch = fetchMock;
});
afterEach(() => { vi.restoreAllMocks(); });

function jsonResponse(body: unknown) {
  return {
    ok: true, status: 200,
    headers: { get: (k: string) => (k.toLowerCase() === 'content-type' ? 'application/json' : null) },
    json: async () => body,
  };
}
function errorResponse(status: number, body: unknown = { error: { message: `HTTP ${status}` } }) {
  return {
    ok: false, status,
    headers: { get: (k: string) => (k.toLowerCase() === 'content-type' ? 'application/json' : null) },
    json: async () => body,
  };
}
const usersUrl = (domainId = 'system') => expect.stringContaining(`/d/${domainId}/api/users`);

describe('UserSelectAutoComplete', () => {
  it('renders chosen users as chips after UID hydration', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([{ _id: 1, uname: 'a' }, { _id: 2, uname: 'b' }]));
    render(<UserSelectAutoComplete value={[1, 2]} onChange={() => {}} />);
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(2));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/d\/[^/]+\/api\/users$/);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ args: { auto: [1, 2] }, projection: ['_id', 'uname'] });
  });

  it('suggests candidates via POST to /d/:domain/api/users with {args:{search}}', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([{ _id: 5, uname: 'alice' }, { _id: 6, uname: 'albert' }]));
    render(<UserSelectAutoComplete value={[]} onChange={() => {}} domainId="contest1" />);
    const input = screen.getByRole('textbox');
    await act(async () => { fireEvent.change(input, { target: { value: 'al' } }); });
    await waitFor(() => expect(screen.getByText('alice')).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith(
      usersUrl('contest1'),
      expect.objectContaining({ method: 'POST' }),
    );
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({ args: { search: 'al' }, projection: ['_id', 'uname'] });
  });

  it('calls onChange when picking a candidate', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([{ _id: 5, uname: 'alice' }]));
    const onChange = vi.fn();
    render(<UserSelectAutoComplete value={[]} onChange={onChange} />);
    const input = screen.getByRole('textbox');
    await act(async () => { fireEvent.change(input, { target: { value: 'a' } }); });
    await waitFor(() => screen.getByText('alice'));
    await act(async () => { fireEvent.mouseDown(screen.getByText('alice')); });
    expect(onChange).toHaveBeenCalledWith([5]);
  });

  it('dedupes when picking a user that already has a UID', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([{ _id: 5, uname: 'alice' }]));
    const onChange = vi.fn();
    render(<UserSelectAutoComplete value={[5]} onChange={onChange} />);
    const input = screen.getByRole('textbox');
    await act(async () => { fireEvent.change(input, { target: { value: 'a' } }); });
    await waitFor(() => screen.getByText('alice'));
    await act(async () => { fireEvent.mouseDown(screen.getByText('alice')); });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows empty state when search yields no results', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([]));
    render(<UserSelectAutoComplete value={[]} onChange={() => {}} />);
    const input = screen.getByRole('textbox');
    await act(async () => { fireEvent.change(input, { target: { value: 'nobody' } }); });
    await waitFor(() => expect(screen.getByText(/no matches/i)).toBeInTheDocument());
  });

  it('shows error when fetch fails', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(500));
    render(<UserSelectAutoComplete value={[]} onChange={() => {}} />);
    const input = screen.getByRole('textbox');
    await act(async () => { fireEvent.change(input, { target: { value: 'q' } }); });
    await waitFor(() => expect(screen.getByText(/failed|error/i)).toBeInTheDocument());
  });

  it('shows loading indicator while the search is in flight', async () => {
    let resolve!: (r: unknown) => void;
    fetchMock.mockReturnValueOnce(new Promise((r) => { resolve = r; }));
    render(<UserSelectAutoComplete value={[]} onChange={() => {}} />);
    const input = screen.getByRole('textbox');
    await act(async () => { fireEvent.change(input, { target: { value: 'q' } }); });
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    await act(async () => { resolve(jsonResponse([])); });
  });

  it('removes a chosen UID when the chip x is clicked', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([{ _id: 1, uname: 'a' }]));
    const onChange = vi.fn();
    render(<UserSelectAutoComplete value={[1]} onChange={onChange} />);
    await waitFor(() => screen.getByText('a'));
    fireEvent.click(screen.getByRole('button', { name: /remove a/i }));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('skips hydration fetch when value is empty', async () => {
    fetchMock.mockReset();
    render(<UserSelectAutoComplete value={[]} onChange={() => {}} />);
    await act(async () => {});
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
