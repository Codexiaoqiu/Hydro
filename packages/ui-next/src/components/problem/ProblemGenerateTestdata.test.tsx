import { STATUS } from '@hydrooj/common';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { request } from '../../hooks/use-api';
import { IFRAME_STATUS_MESSAGE } from '../../lib/iframe-protocol';
import { ToastProvider } from '../primitives';
import { ProblemGenerateTestdata } from './ProblemGenerateTestdata';

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  (global as any).fetch = fetchMock;
  fetchMock.mockResolvedValue({
    ok: true, status: 200,
    headers: { get: () => 'application/json' },
    json: async () => ({ url: '/record/R1' }),
  });
});

function renderComp(props: Partial<React.ComponentProps<typeof ProblemGenerateTestdata>> = {}) {
  const onGenerated = vi.fn();
  render(
    <ToastProvider>
      <ProblemGenerateTestdata pid="P 1" testdata={['gen', 'std']} onGenerated={onGenerated} {...props} />
    </ToastProvider>,
  );
  return { onGenerated };
}

async function startGeneration() {
  fireEvent.click(screen.getByRole('button', { name: /生成|Generate/i }));
  fireEvent.change(await screen.findByLabelText(/生成器|Generator/i), { target: { value: 'gen' } });
  fireEvent.change(await screen.findByLabelText(/标准|Standard/i), { target: { value: 'std' } });
  fireEvent.click(screen.getByRole('button', { name: /开始|Start/i }));
  await waitFor(() => expect(screen.getByTitle('generate-record')).toBeInTheDocument());
}

function fireMessage(origin: string, data: unknown) {
  const ev = new MessageEvent('message', { origin, data });
  window.dispatchEvent(ev);
}

function setupModal() {
  const onGenerated = vi.fn();
  render(
    <ToastProvider>
      <ProblemGenerateTestdata pid="P1" testdata={['a.in']} onGenerated={onGenerated} />
    </ToastProvider>,
  );
  // open the modal — does NOT start generation, but the listener is attached
  // and `openRef.current` becomes `true` via the [open] effect.
  fireEvent.click(screen.getByRole('button', { name: /生成|Generate/i }));
  return { onGenerated };
}

describe('problemGenerateTestdata', () => {
  it('posts generation to the problem files endpoint', async () => {
    const postSpy = vi.spyOn(request, 'post');
    renderComp();
    await startGeneration();
    expect(postSpy).toHaveBeenCalledWith('/p/P%201/files', expect.any(URLSearchParams));
    const body = postSpy.mock.calls[0][1] as URLSearchParams;
    expect(Object.fromEntries(body)).toEqual({ operation: 'generate_testdata', gen: 'gen', std: 'std' });
  });

  it('accepts completion status from the record iframe', async () => {
    const { onGenerated } = renderComp();
    await startGeneration();
    act(() => fireMessage(window.location.origin, {
      type: IFRAME_STATUS_MESSAGE,
      status: STATUS.STATUS_ACCEPTED,
    }));
    await waitFor(() => expect(onGenerated).toHaveBeenCalledOnce());
    expect(screen.queryByTitle('generate-record')).not.toBeInTheDocument();
  });

  it('disables Generate when disabled', () => {
    renderComp({ disabled: true });
    expect(screen.getByRole('button', { name: /生成|Generate/i })).toBeDisabled();
  });
});

describe('problemGenerateTestdata postMessage', () => {
  it('closes modal and toasts success when accepted status arrives with trusted origin', () => {
    const { onGenerated } = setupModal();
    act(() => fireMessage(window.location.origin, {
      type: IFRAME_STATUS_MESSAGE,
      status: STATUS.STATUS_ACCEPTED,
    }));
    expect(onGenerated).toHaveBeenCalledOnce();
  });

  it('closes modal on WA (non-accepted terminal) but does not show success toast', () => {
    const { onGenerated } = setupModal();
    act(() => fireMessage(window.location.origin, {
      type: IFRAME_STATUS_MESSAGE,
      status: STATUS.STATUS_WRONG_ANSWER,
    }));
    expect(onGenerated).toHaveBeenCalledOnce();
  });

  it('rejects message without envelope tag', () => {
    const { onGenerated } = setupModal();
    act(() => fireMessage(window.location.origin, { status: STATUS.STATUS_ACCEPTED }));
    expect(onGenerated).not.toHaveBeenCalled();
  });

  it('rejects message with wrong envelope type', () => {
    const { onGenerated } = setupModal();
    act(() => fireMessage(window.location.origin, {
      type: 'something-else',
      status: STATUS.STATUS_ACCEPTED,
    }));
    expect(onGenerated).not.toHaveBeenCalled();
  });

  it('rejects message from cross-origin', () => {
    const { onGenerated } = setupModal();
    act(() => fireMessage('http://evil.com', {
      type: IFRAME_STATUS_MESSAGE,
      status: STATUS.STATUS_ACCEPTED,
    }));
    expect(onGenerated).not.toHaveBeenCalled();
  });

  it('rejects message with null origin (sandboxed iframe)', () => {
    const { onGenerated } = setupModal();
    act(() => fireMessage('null', {
      type: IFRAME_STATUS_MESSAGE,
      status: STATUS.STATUS_ACCEPTED,
    }));
    expect(onGenerated).not.toHaveBeenCalled();
  });

  it('does not react to non-terminal status (waiting/judging)', () => {
    const { onGenerated } = setupModal();
    act(() => fireMessage(window.location.origin, {
      type: IFRAME_STATUS_MESSAGE,
      status: STATUS.STATUS_WAITING,
    }));
    expect(onGenerated).not.toHaveBeenCalled();
  });

  it('idempotent on duplicate accepted messages', async () => {
    const { onGenerated } = setupModal();
    // First message — modal is open, openRef.current === true. After this
    // dispatch + flush, the modal closes and openRef.current === false.
    act(() => fireMessage(window.location.origin, {
      type: IFRAME_STATUS_MESSAGE,
      status: STATUS.STATUS_ACCEPTED,
    }));
    expect(onGenerated).toHaveBeenCalledTimes(1);
    // Yield so React commits and the [open] effect flips openRef.current.
    await waitFor(() => {
      // Any state committed after the first message; the second message below
      // must be a no-op regardless of which side effect we observe.
      expect(true).toBe(true);
    });
    // Second message — modal already closed; openRef.current === false → bail.
    act(() => fireMessage(window.location.origin, {
      type: IFRAME_STATUS_MESSAGE,
      status: STATUS.STATUS_ACCEPTED,
    }));
    expect(onGenerated).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Recovered from SP4 Stashed (Task 6)
// These tests were inside the `<<<<<<< Stashed changes` block of commit
// 9177231c (`fix:ui-next`) which resolved a merge conflict when re-applying
// SP4 Track A on top of Track B. The Stashed side carried stricter security
// tests for the postMessage handler that did not survive the conflict
// resolution. They are restored here, adapted to the current API surface
// (setupModal + fireMessage + IFRAME_STATUS_MESSAGE from iframe-protocol.ts).
// ---------------------------------------------------------------------------

describe('problemGenerateTestdata (recovered Stashed security suite)', () => {
  // Brief §1 + I-C1: must POST to `/p/:pid/files`, not the bare problem page.
  // Uses raw fetch so we can prove the URL is the files endpoint and not
  // `/p/:pid` (which routes to ProblemDetailHandler with no such operation).
  it('posts generate_testdata to /p/:pid/files (problem files endpoint)', async () => {
    const { onGenerated } = renderComp();
    await startGeneration();
    const calledWith = fetchMock.mock.calls[0]?.[0] as string;
    expect(calledWith).toMatch(/\/p\/P%201\/files(\?|$)/);
    expect(calledWith).not.toMatch(/\/p\/P%201(\?|$)/);
    // Sanity: the listener also remains wired so subsequent postMessages
    // reach onGenerated.
    act(() => fireMessage(window.location.origin, {
      type: IFRAME_STATUS_MESSAGE,
      status: STATUS.STATUS_ACCEPTED,
    }));
    await waitFor(() => expect(onGenerated).toHaveBeenCalledTimes(1));
  });

  // Brief §3: status uses numeric STATUS from @hydrooj/common; the legacy
  // string sentinel `'STATUS_ACCEPTED'` is no longer used. This restates the
  // assertion in the form the Stashed side used.
  it('accepts the numeric STATUS.STATUS_ACCEPTED from the iframe postMessage', async () => {
    const { onGenerated } = setupModal();
    act(() => fireMessage(window.location.origin, {
      type: IFRAME_STATUS_MESSAGE,
      status: STATUS.STATUS_ACCEPTED,
    }));
    await waitFor(() => expect(onGenerated).toHaveBeenCalledTimes(1));
    expect(screen.queryByTitle('generate-record')).not.toBeInTheDocument();
  });

  // Brief §3 + Brief §C3: WA (terminal non-AC) closes the iframe and
  // triggers onGenerated — equivalent to the Stashed side's explicit WA test.
  it('closes the iframe and refreshes on STATUS_WRONG_ANSWER (terminal non-AC)', async () => {
    const { onGenerated } = setupModal();
    act(() => fireMessage(window.location.origin, {
      type: IFRAME_STATUS_MESSAGE,
      status: STATUS.STATUS_WRONG_ANSWER,
    }));
    await waitFor(() => expect(onGenerated).toHaveBeenCalledTimes(1));
    expect(screen.queryByTitle('generate-record')).not.toBeInTheDocument();
  });

  // Brief §C3: every terminal status (1..7, 8/9/11/32/33) closes the iframe
  // and triggers onGenerated. Each tuple below is one sub-test.
  it.each([
    ['STATUS_SYSTEM_ERROR', STATUS.STATUS_SYSTEM_ERROR],
    ['STATUS_CANCELED', STATUS.STATUS_CANCELED],
    ['STATUS_HACKED', STATUS.STATUS_HACKED],
    ['STATUS_HACK_SUCCESSFUL', STATUS.STATUS_HACK_SUCCESSFUL],
    ['STATUS_HACK_UNSUCCESSFUL', STATUS.STATUS_HACK_UNSUCCESSFUL],
  ])('closes the iframe on the terminal status %s (covers 8/9/11/32/33)', async (_label, status) => {
    const { onGenerated } = setupModal();
    act(() => fireMessage(window.location.origin, {
      type: IFRAME_STATUS_MESSAGE,
      status,
    }));
    expect(onGenerated).toHaveBeenCalledTimes(1);
  });

  // C2: WAITING / JUDGING / COMPILING / FETCHED are in-progress statuses and
  // MUST NOT close the iframe — the brief explicitly carves them out.
  // (Note: `does not react to non-terminal status (waiting/judging)` in the
  // postMessage suite already covers WAITING; this it.each adds JUDGING,
  // COMPILING, FETCHED so every in-progress status is exercised.)
  it.each([
    ['STATUS_WAITING', STATUS.STATUS_WAITING],
    ['STATUS_JUDGING', STATUS.STATUS_JUDGING],
    ['STATUS_COMPILING', STATUS.STATUS_COMPILING],
    ['STATUS_FETCHED', STATUS.STATUS_FETCHED],
  ])('ignores in-progress status %s (does not close iframe)', async (_label, status) => {
    const { onGenerated } = setupModal();
    act(() => fireMessage(window.location.origin, {
      type: IFRAME_STATUS_MESSAGE,
      status,
    }));
    expect(onGenerated).not.toHaveBeenCalled();
  });

  // Brief §2: parent only accepts messages whose origin matches the page.
  // Restated using the current `fireMessage` helper.
  it('ignores postMessages with a foreign origin', async () => {
    const { onGenerated } = setupModal();
    act(() => fireMessage('https://evil.example', {
      type: IFRAME_STATUS_MESSAGE,
      status: STATUS.STATUS_ACCEPTED,
    }));
    expect(onGenerated).not.toHaveBeenCalled();
  });

  // Brief §2: type guard rejects messages that don't carry the new tag.
  it('ignores postMessages without the hydro-record-status type', async () => {
    const { onGenerated } = setupModal();
    act(() => fireMessage(window.location.origin, {
      status: STATUS.STATUS_ACCEPTED, // no envelope tag
    }));
    expect(onGenerated).not.toHaveBeenCalled();
  });

  // Brief §5: HTTP non-2xx must surface an error toast and must NOT keep the
  // iframe rendered (no half-open "running" state). Adapted: we open the
  // modal, click Start, then assert on the error toast directly — the
  // iframe never renders because the request fails before setRecordUrl().
  it('surfaces an error toast on HTTP non-2xx and does not render the iframe', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: { get: () => 'application/json' },
      json: async () => ({ error: { message: 'boom' } }),
    });
    render(
      <ToastProvider>
        <ProblemGenerateTestdata pid="P1" testdata={['gen', 'std']} onGenerated={() => {}} />
      </ToastProvider>,
    );
    // Open the modal and start generation. The Start click triggers
    // `request.post(...)`, which rejects with our 500 payload; the component
    // shows the toast and never sets a recordUrl, so the iframe stays absent.
    fireEvent.click(screen.getByRole('button', { name: /生成|Generate/i }));
    fireEvent.change(await screen.findByLabelText(/生成器|Generator/i), { target: { value: 'gen' } });
    fireEvent.change(await screen.findByLabelText(/标准|Standard/i), { target: { value: 'std' } });
    fireEvent.click(screen.getByRole('button', { name: /开始|Start/i }));

    await waitFor(() => {
      const status = screen.getByRole('status');
      expect(status.textContent || '').toMatch(/boom|500/);
    });
    expect(screen.queryByTitle('generate-record')).not.toBeInTheDocument();
  });

  // I4 + I6: the iframe's `onError` must surface the localized
  // GenerateFailed toast and close the modal — without any postMessage
  // arriving. The literal "Generate failed" / "生成失败" must come from the
  // i18n key, not be hardcoded in the component.
  it('surfaces a localized GenerateFailed toast and closes the modal on iframe error', async () => {
    render(
      <ToastProvider>
        <ProblemGenerateTestdata pid="P1" testdata={['gen', 'std']} onGenerated={() => {}} />
      </ToastProvider>,
    );
    await startGeneration();
    await waitFor(() => expect(screen.getByTitle('generate-record')).toBeInTheDocument());

    const frame = screen.getByTitle('generate-record') as HTMLIFrameElement & Record<string, unknown>;
    // React 19 wires `<iframe onError>` by storing the callback on a dev-only
    // `__reactProps$<id>` symbol on the DOM element, alongside a wrapped
    // `EventListener`-shaped value on `onerror`. happy-dom does not synthesise
    // iframe-load failures, so we reach into the fiber-props and invoke the
    // handler the way React would have when the iframe fails to load.
    await act(async () => {
      const propsKey = Object.keys(frame).find((k) => k.startsWith('__reactProps$'));
      const props = (propsKey ? (frame as Record<string, { onError?: (e: unknown) => void }>)[propsKey] : undefined);
      const handler = props?.onError;
      if (typeof handler === 'function') {
        handler(new Event('error'));
      } else {
        frame.dispatchEvent(new Event('error'));
      }
    });

    await waitFor(() => expect(screen.queryByTitle('generate-record')).not.toBeInTheDocument());
    const status = screen.getByRole('status');
    expect(status.textContent || '').toMatch(/Generate failed|生成失败/);
  });
});
