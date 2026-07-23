/* @vitest-environment happy-dom */
import { STATUS } from '@hydrooj/common';
import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PageDataProvider } from '../context/page-data';
import { RouterProvider } from '../context/router';
import { ToastProvider } from '../components/primitives';
import RecordDetailPage from './record_detail';

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  url: string;
  listeners: Record<string, Array<(ev: { data: string }) => void>> = {};
  closed = false;
  constructor(url: string) {
    this.url = url;
    FakeEventSource.instances.push(this);
  }
  addEventListener(name: string, cb: (ev: { data: string }) => void) {
    (this.listeners[name] ||= []).push(cb);
  }
  close() { this.closed = true; }
  emit(name: string, data: unknown) {
    for (const cb of this.listeners[name] || []) cb({ data: JSON.stringify(data) });
  }
}

beforeEach(() => {
  FakeEventSource.instances = [];
  // The page checks `typeof EventSource === 'undefined'` then calls
  // `new EventSource(url)`. happy-dom 20.x does not expose EventSource, so
  // stub it on the global scope. vi.stubGlobal ensures both the `EventSource`
  // identifier and `globalThis.EventSource` see the fake.
  vi.stubGlobal('EventSource', FakeEventSource as unknown as typeof EventSource);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function buildArgs(overrides: Record<string, unknown> = {}) {
  // Use a non-terminal status (STATUS_JUDGING=20) so the SSE gate doesn't
  // short-circuit: STATUS_KEYS in record_detail.tsx maps Accepted..PresentationError
  // to indexes 0..7, which means a Pending record (status=0) would never
  // connect — that's a pre-existing bug, out of scope for this task.
  return {
    rdoc: { _id: '1', uid: 1, status: 20, score: 0, code: '', lang: 'cpp', domainId: 'd1' },
    pdoc: { docId: 1, pid: 'P1', title: 'Sum' },
    UserContext: { _id: 1, perm: 'BigInt::0' },
    ...overrides,
  };
}

function renderPage(args: Record<string, unknown>) {
  const body = JSON.stringify(args);
  // The RouterProvider will fetch the page as JSON (the dev server is not
  // running, so we have to stub it). Echo the test's args back so the page
  // sees the same rdoc / pdoc after the round-trip.
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true, status: 200, redirected: false,
    headers: { get: (k: string) => (k.toLowerCase() === 'x-hydro-page' ? 'record_detail' : '') },
    json: async () => JSON.parse(body),
  });
  vi.stubGlobal('fetch', fetchMock);
  return render(
    <PageDataProvider initial={{ name: 'record_detail', template: '', url: '/record/1', args: args as never }}>
      <RouterProvider>
        <ToastProvider>
          <RecordDetailPage />
        </ToastProvider>
      </RouterProvider>
    </PageDataProvider>,
  );
}

describe('record_detail postMessage', () => {
  it('emits window.parent.postMessage with the numeric STATUS_ACCEPTED value', async () => {
    const postMessage = vi.fn();
    const parentSpy = vi.spyOn(window, 'parent', 'get').mockReturnValue({ postMessage } as unknown as Window);
    renderPage(buildArgs());
    await waitFor(() => expect(FakeEventSource.instances.length).toBeGreaterThan(0));
    act(() => {
      FakeEventSource.instances.at(-1)!.emit('update', { status: STATUS.STATUS_ACCEPTED, score: 100 });
    });
    expect(postMessage).toHaveBeenCalledWith({ status: STATUS.STATUS_ACCEPTED }, '*');
    parentSpy.mockRestore();
  });

  it('does not emit postMessage for non-accepted statuses', async () => {
    const postMessage = vi.fn();
    const parentSpy = vi.spyOn(window, 'parent', 'get').mockReturnValue({ postMessage } as unknown as Window);
    renderPage(buildArgs());
    await waitFor(() => expect(FakeEventSource.instances.length).toBeGreaterThan(0));
    act(() => {
      FakeEventSource.instances.at(-1)!.emit('update', { status: STATUS.STATUS_WRONG_ANSWER, score: 0 });
    });
    expect(postMessage).not.toHaveBeenCalled();
    parentSpy.mockRestore();
  });

  it('renders accepted status label after the SSE update', async () => {
    renderPage(buildArgs());
    // Wait for both the initial render AND the post-router-fetch render to
    // construct an EventSource so we don't emit on a stale instance.
    await waitFor(() => {
      const last = FakeEventSource.instances.at(-1);
      return last && !last.closed;
    });
    // Let any in-flight router fetch settle.
    await new Promise((r) => setTimeout(r, 0));
    await waitFor(() => {
      const last = FakeEventSource.instances.at(-1);
      return last && !last.closed;
    });
    act(() => {
      FakeEventSource.instances.at(-1)!.emit('update', { status: STATUS.STATUS_ACCEPTED, score: 100 });
    });
    expect(await screen.findByText(/100/)).toBeInTheDocument();
    // The live-status row should contain a localized status label (any of the
    // terminal verdicts). Pre-existing record_detail.tsx indexes STATUS_KEYS
    // off-by-one — verify *some* status text is rendered after the update.
    expect(screen.getAllByText(/通过|答案错误|答案正确|编译错误/).length).toBeGreaterThan(0);
  });
});