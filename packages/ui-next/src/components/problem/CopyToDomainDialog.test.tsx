import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CopyToDomainDialog } from './CopyToDomainDialog';
import { ToastProvider } from '../primitives/Toast';

// Locale is pinned to zh_CN by src/test/setup.ts. Action label uses the
// existing 'Problem.Copy' key (复制 / Copy).
const RX_COPY = /^复制$|^copy$/i;
const RX_CANCEL = /^取消$|cancel/i;

const fetchMock = vi.fn();

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (k: string) => (k.toLowerCase() === 'content-type' ? 'application/json' : null) },
    json: async () => body,
  };
}

beforeEach(() => {
  fetchMock.mockReset();
  (global as { fetch?: unknown }).fetch = fetchMock;
});

describe('CopyToDomainDialog (P2-B.2)', () => {
  it('does not render anything when open is false', () => {
    render(
      <ToastProvider>
        <CopyToDomainDialog open={false} onClose={() => {}} onCopied={() => {}} pids={[1000]} />
      </ToastProvider>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders a dialog with a target input and Copy / Cancel buttons when open', () => {
    render(
      <ToastProvider>
        <CopyToDomainDialog open onClose={() => {}} onCopied={() => {}} pids={[1000]} />
      </ToastProvider>,
    );
    expect(screen.getByRole('dialog')).toBeTruthy();
    // One textbox for the target domain.
    expect(screen.getAllByRole('textbox').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: RX_COPY })).toBeTruthy();
    expect(screen.getByRole('button', { name: RX_CANCEL })).toBeTruthy();
  });

  it('Copy button is disabled until a target is entered', () => {
    render(
      <ToastProvider>
        <CopyToDomainDialog open onClose={() => {}} onCopied={() => {}} pids={[1000]} />
      </ToastProvider>,
    );
    expect(screen.getByRole('button', { name: RX_COPY })).toBeDisabled();
  });

  it('POSTs operation=copy with the pids and the entered target on confirm', async () => {
    const onCopied = vi.fn();
    const onClose = vi.fn();
    // The first fetch call is the copy POST. The toast itself does not
    // trigger any network, so this single response covers everything.
    fetchMock.mockResolvedValue(jsonResponse({}));

    render(
      <ToastProvider>
        <CopyToDomainDialog open onClose={onClose} onCopied={onCopied} pids={[1000]} />
      </ToastProvider>,
    );

    const target = screen.getByRole('textbox');
    fireEvent.change(target, { target: { value: 'system' } });

    const copyBtn = screen.getByRole('button', { name: RX_COPY });
    await waitFor(() => expect(copyBtn).not.toBeDisabled());

    fireEvent.click(copyBtn);

    await waitFor(() => expect(onCopied).toHaveBeenCalledTimes(1));
    const call = fetchMock.mock.calls[0];
    expect(call[0]).toBe('/p');
    const init = call[1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(init.body).toBeInstanceOf(URLSearchParams);
    const fd = init.body as URLSearchParams;
    expect(fd.get('operation')).toBe('copy');
    expect(fd.get('pids')).toBe('1000');
    expect(fd.get('target')).toBe('system');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('cancel closes the dialog and skips the POST', () => {
    const onClose = vi.fn();
    render(
      <ToastProvider>
        <CopyToDomainDialog open onClose={onClose} onCopied={() => {}} pids={[1000]} />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: RX_CANCEL }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
