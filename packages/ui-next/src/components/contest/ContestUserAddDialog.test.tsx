import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../primitives/Toast';
import { ContestUserAddDialog } from './ContestUserAddDialog';

// Locale-aware matchers (test setup pins zh_CN).
const RX_ADD = /^add$|添加/;
const RX_CANCEL = /cancel|取消/;

const fetchMock = vi.fn();

function jsonResponse(body: unknown) {
  return {
    ok: true, status: 200,
    headers: { get: (k: string) => (k.toLowerCase() === 'content-type' ? 'application/json' : null) },
    json: async () => body,
  };
}
function errorResponse(status = 500, msg = 'Boom') {
  return {
    ok: false, status,
    headers: { get: (k: string) => (k.toLowerCase() === 'content-type' ? 'application/json' : null) },
    json: async () => ({ error: { message: msg } }),
  };
}

beforeEach(() => {
  fetchMock.mockReset();
  (global as any).fetch = fetchMock;
  fetchMock.mockResolvedValue(jsonResponse({}));
});

async function pickUser(query: string, name: string) {
  fireEvent.change(screen.getByRole('textbox'), { target: { value: query } });
  await waitFor(() => {
    const lb = screen.getByRole('listbox');
    expect(lb.textContent).toContain(name);
  });
  const lb = screen.getByRole('listbox');
  const buttons = within(lb).getAllByRole('button');
  const target = buttons.find((b) => b.textContent === name) as HTMLButtonElement;
  fireEvent.mouseDown(target);
}

function findAddUserPost(): [unknown, RequestInit] {
  const call = fetchMock.mock.calls.find((c) => {
    const init = c[1] as RequestInit;
    if (init?.method !== 'POST') return false;
    const fd = init.body;
    if (!(fd instanceof URLSearchParams)) return false;
    return fd.get('operation') === 'add_user';
  });
  expect(call, 'expected an add_user POST').toBeTruthy();
  return [call![0], call![1] as RequestInit];
}

describe('ContestUserAddDialog', () => {
  it('Add button is disabled when no user selected', () => {
    render(
      <ToastProvider>
        <ContestUserAddDialog open onClose={() => {}} onAdded={() => {}} />
      </ToastProvider>,
    );
    expect(screen.getByRole('button', { name: RX_ADD })).toBeDisabled();
  });

  it('after picking one user, Add posts operation=add_user with that uid', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([{ _id: 5, uname: 'alice' }]))
      .mockResolvedValueOnce(jsonResponse([{ _id: 5, uname: 'alice' }]));
    const onAdded = vi.fn();
    const onClose = vi.fn();
    render(
      <ToastProvider>
        <ContestUserAddDialog open onClose={onClose} onAdded={onAdded} />
      </ToastProvider>,
    );
    await pickUser('al', 'alice');
    const addBtn = screen.getByRole('button', { name: RX_ADD });
    await waitFor(() => expect(addBtn).not.toBeDisabled());
    fireEvent.click(addBtn);
    await waitFor(() => expect(onAdded).toHaveBeenCalled());
    const [, init] = findAddUserPost();
    const fd = init.body as URLSearchParams;
    expect(fd.get('operation')).toBe('add_user');
    expect(fd.get('uids')).toBe('5');
    expect(onClose).toHaveBeenCalled();
  });

  it('forwards unrank=on when AddAsUnranked is checked', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([{ _id: 8, uname: 'alice' }]))
      .mockResolvedValueOnce(jsonResponse([{ _id: 8, uname: 'alice' }]));
    const onAdded = vi.fn();
    render(
      <ToastProvider>
        <ContestUserAddDialog open onClose={() => {}} onAdded={onAdded} />
      </ToastProvider>,
    );
    await pickUser('al', 'alice');
    const addBtn = screen.getByRole('button', { name: RX_ADD });
    await waitFor(() => expect(addBtn).not.toBeDisabled());
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(addBtn);
    await waitFor(() => expect(onAdded).toHaveBeenCalled());
    const [, init] = findAddUserPost();
    const fd = init.body as URLSearchParams;
    expect(fd.get('unrank')).toBe('on');
  });

  it('does not call onAdded when the POST fails', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([{ _id: 2, uname: 'bob' }]))
      .mockResolvedValueOnce(jsonResponse([{ _id: 2, uname: 'bob' }]))
      .mockResolvedValueOnce(errorResponse());
    const onAdded = vi.fn();
    render(
      <ToastProvider>
        <ContestUserAddDialog open onClose={() => {}} onAdded={onAdded} />
      </ToastProvider>,
    );
    await pickUser('bo', 'bob');
    const addBtn = screen.getByRole('button', { name: RX_ADD });
    await waitFor(() => expect(addBtn).not.toBeDisabled());
    fireEvent.click(addBtn);
    await new Promise((r) => setTimeout(r, 100));
    expect(onAdded).not.toHaveBeenCalled();
  });

  it('Cancel button calls onClose without any POST', () => {
    const onClose = vi.fn();
    render(
      <ToastProvider>
        <ContestUserAddDialog open onClose={onClose} onAdded={() => {}} />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: RX_CANCEL }));
    expect(onClose).toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
