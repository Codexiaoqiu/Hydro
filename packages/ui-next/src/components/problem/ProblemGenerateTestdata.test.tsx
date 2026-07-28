<<<<<<< Updated upstream
import { STATUS } from '@hydrooj/common';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { request } from '../../hooks/use-api';
=======
/* @vitest-environment happy-dom */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { STATUS } from '@hydrooj/common';
>>>>>>> Stashed changes
import { ProblemGenerateTestdata } from './ProblemGenerateTestdata';
import { ToastProvider } from '../primitives';

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

<<<<<<< Updated upstream
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

describe('ProblemGenerateTestdata', () => {
  it('posts generation to the problem files endpoint', async () => {
    const postSpy = vi.spyOn(request, 'post');
    renderComp();
    await startGeneration();
    expect(postSpy).toHaveBeenCalledWith('/p/P%201/files', expect.any(URLSearchParams));
    const body = postSpy.mock.calls[0][1] as URLSearchParams;
    expect(Object.fromEntries(body)).toEqual({ operation: 'generate_testdata', gen: 'gen', std: 'std' });
  });

  it.each([
    STATUS.STATUS_ACCEPTED,
    'STATUS_ACCEPTED',
  ])('accepts completion status %s from the record iframe', async (status) => {
    const { onGenerated } = renderComp();
    await startGeneration();
    act(() => window.dispatchEvent(new MessageEvent('message', { data: { status } })));
    await waitFor(() => expect(onGenerated).toHaveBeenCalledOnce());
    expect(screen.queryByTitle('generate-record')).not.toBeInTheDocument();
  });

  it('disables Generate when disabled', () => {
    renderComp({ disabled: true });
    expect(screen.getByRole('button', { name: /生成|Generate/i })).toBeDisabled();
=======
async function openModalAndStart() {
  fireEvent.click(screen.getByRole('button', { name: /生成|generate/i }));
  const genInput = await screen.findByLabelText(/生成器|generator/i);
  const stdInput = await screen.findByLabelText(/标准输出|standard/i);
  fireEvent.change(genInput, { target: { value: 'gen' } });
  fireEvent.change(stdInput, { target: { value: 'std' } });
  fireEvent.click(screen.getByRole('button', { name: /^开始|^Start|开始$|Start$/i }));
}

describe('ProblemGenerateTestdata', () => {
  it('opens modal with iframe after submit', async () => {
    render(
      <ToastProvider>
        <ProblemGenerateTestdata pid="P1" testdata={['gen', 'std']} onGenerated={() => {}} />
      </ToastProvider>,
    );
    await openModalAndStart();
    await waitFor(() => expect(screen.getByTitle('generate-record')).toBeInTheDocument());
>>>>>>> Stashed changes
  });

  // Brief §1 + I-C1: must POST to `/p/:pid/files`, not the bare problem page.
  it('posts generate_testdata to /p/:pid/files (problem files endpoint)', async () => {
    render(
      <ToastProvider>
        <ProblemGenerateTestdata pid="P1" testdata={['gen', 'std']} onGenerated={() => {}} />
      </ToastProvider>,
    );
    await openModalAndStart();
    await waitFor(() => expect(screen.getByTitle('generate-record')).toBeInTheDocument());
    const calledWith = fetchMock.mock.calls[0]?.[0] as string;
    expect(calledWith).toMatch(/\/p\/P1\/files(\?|$)/);
    expect(calledWith).not.toMatch(/\/p\/P1(\?|$)/);
  });

  // Brief §3: status uses numeric STATUS from @hydrooj/common; the legacy
  // string sentinel `'STATUS_ACCEPTED'` is no longer used.
  it('accepts the numeric STATUS.STATUS_ACCEPTED from the iframe postMessage', async () => {
    const onGenerated = vi.fn();
    render(
      <ToastProvider>
        <ProblemGenerateTestdata pid="P1" testdata={['gen', 'std']} onGenerated={onGenerated} />
      </ToastProvider>,
    );
    await openModalAndStart();
    await waitFor(() => expect(screen.getByTitle('generate-record')).toBeInTheDocument());

    await act(async () => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: window.location.origin,
          data: { type: 'hydro-record-status', status: STATUS.STATUS_ACCEPTED },
        }),
      );
    });

    await waitFor(() => expect(screen.queryByTitle('generate-record')).not.toBeInTheDocument());
    expect(onGenerated).toHaveBeenCalledTimes(1);
  });

  // Brief §3 + Brief §C3: any terminal status (1..7, 8/9/11/32/33) closes the
  // iframe and triggers onGenerated.
  it('closes the iframe and refreshes on STATUS_WRONG_ANSWER (terminal non-AC)', async () => {
    const onGenerated = vi.fn();
    render(
      <ToastProvider>
        <ProblemGenerateTestdata pid="P1" testdata={['gen', 'std']} onGenerated={onGenerated} />
      </ToastProvider>,
    );
    await openModalAndStart();
    await waitFor(() => expect(screen.getByTitle('generate-record')).toBeInTheDocument());

    await act(async () => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: window.location.origin,
          data: { type: 'hydro-record-status', status: STATUS.STATUS_WRONG_ANSWER },
        }),
      );
    });

    await waitFor(() => expect(screen.queryByTitle('generate-record')).not.toBeInTheDocument());
    expect(onGenerated).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['STATUS_SYSTEM_ERROR',    STATUS.STATUS_SYSTEM_ERROR],
    ['STATUS_CANCELED',        STATUS.STATUS_CANCELED],
    ['STATUS_HACKED',          STATUS.STATUS_HACKED],
    ['STATUS_HACK_SUCCESSFUL', STATUS.STATUS_HACK_SUCCESSFUL],
    ['STATUS_HACK_UNSUCCESSFUL', STATUS.STATUS_HACK_UNSUCCESSFUL],
  ])('closes the iframe on the terminal status %s (covers 8/9/11/32/33)', async (_label, status) => {
    const onGenerated = vi.fn();
    render(
      <ToastProvider>
        <ProblemGenerateTestdata pid="P1" testdata={['gen', 'std']} onGenerated={onGenerated} />
      </ToastProvider>,
    );
    await openModalAndStart();
    await waitFor(() => expect(screen.getByTitle('generate-record')).toBeInTheDocument());

    await act(async () => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: window.location.origin,
          data: { type: 'hydro-record-status', status },
        }),
      );
    });

    await waitFor(() => expect(screen.queryByTitle('generate-record')).not.toBeInTheDocument());
    expect(onGenerated).toHaveBeenCalledTimes(1);
  });

  // C2: WAITING / JUDGING / COMPILING / FETCHED are in-progress statuses and
  // MUST NOT close the iframe — the brief explicitly carves them out.
  it.each([
    ['STATUS_WAITING',   STATUS.STATUS_WAITING],
    ['STATUS_JUDGING',   STATUS.STATUS_JUDGING],
    ['STATUS_COMPILING', STATUS.STATUS_COMPILING],
    ['STATUS_FETCHED',   STATUS.STATUS_FETCHED],
  ])('ignores in-progress status %s (does not close iframe)', async (_label, status) => {
    const onGenerated = vi.fn();
    render(
      <ToastProvider>
        <ProblemGenerateTestdata pid="P1" testdata={['gen', 'std']} onGenerated={onGenerated} />
      </ToastProvider>,
    );
    await openModalAndStart();
    await waitFor(() => expect(screen.getByTitle('generate-record')).toBeInTheDocument());

    await act(async () => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: window.location.origin,
          data: { type: 'hydro-record-status', status },
        }),
      );
    });

    expect(screen.queryByTitle('generate-record')).toBeInTheDocument();
    expect(onGenerated).not.toHaveBeenCalled();
  });

  // Brief §2: parent only accepts messages whose origin matches the page.
  it('ignores postMessages with a foreign origin', async () => {
    const onGenerated = vi.fn();
    render(
      <ToastProvider>
        <ProblemGenerateTestdata pid="P1" testdata={['gen', 'std']} onGenerated={onGenerated} />
      </ToastProvider>,
    );
    await openModalAndStart();
    await waitFor(() => expect(screen.getByTitle('generate-record')).toBeInTheDocument());

    await act(async () => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: 'https://evil.example',
          data: { type: 'hydro-record-status', status: STATUS.STATUS_ACCEPTED },
        }),
      );
    });

    expect(screen.queryByTitle('generate-record')).toBeInTheDocument();
    expect(onGenerated).not.toHaveBeenCalled();
  });

  // Brief §2: type guard rejects messages that don't carry the new tag.
  it('ignores postMessages without the hydro-record-status type', async () => {
    const onGenerated = vi.fn();
    render(
      <ToastProvider>
        <ProblemGenerateTestdata pid="P1" testdata={['gen', 'std']} onGenerated={onGenerated} />
      </ToastProvider>,
    );
    await openModalAndStart();
    await waitFor(() => expect(screen.getByTitle('generate-record')).toBeInTheDocument());

    await act(async () => {
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: window.location.origin,
          data: { status: STATUS.STATUS_ACCEPTED }, // no envelope tag
        }),
      );
    });

    expect(screen.queryByTitle('generate-record')).toBeInTheDocument();
    expect(onGenerated).not.toHaveBeenCalled();
  });

  // Brief §5: HTTP non-2xx must surface an error toast and must NOT keep the
  // iframe rendered (no half-open "running" state).
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
    await openModalAndStart();

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
    await openModalAndStart();
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
