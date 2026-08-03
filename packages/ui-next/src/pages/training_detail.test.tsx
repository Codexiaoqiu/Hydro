/* @vitest-environment happy-dom */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../components/primitives/Toast';
import { type PageData, PageDataProvider } from '../context/page-data';
import { RouterProvider } from '../context/router';
import { routeMapStore } from '../globals';
import { ThemeProvider } from '../theme/ThemeProvider';
import TrainingDetail from './training_detail';

function buildPageData(args: PageData['args']): PageData {
  return {
    name: 'training_detail',
    template: 'training_detail.html',
    args: {
      UserContext: {},
      UiContext: {},
      ...args,
    } as PageData['args'],
    url: '/training/tid1',
  };
}

function jsonResponse(body: unknown = {}, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// RouterProvider kicks off an initial GET on mount. Without an intercept
// it would either hit the real network (fails) or return a 200 with an
// empty body, which clobbers the args the test set up. The shim mirrors
// GETs back to the test's args so setData is effectively a no-op for the
// keys the page reads, while forwarding POSTs as empty successes. Tests
// that need to assert on POSTs install their own fetchMock after
// rendering; that mock takes priority because vi.stubGlobal replaces
// the global fetch entirely.
function makeInitialFetchShim(args: PageData['args']) {
  return vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
    if (init?.method === 'POST') return jsonResponse();
    return jsonResponse(args);
  });
}

function Providers({ args, children }: { args: PageData['args'], children: ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <PageDataProvider initial={buildPageData(args)}>
          <RouterProvider>{children}</RouterProvider>
        </PageDataProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

function renderPage(args: PageData['args']) {
  vi.stubGlobal('fetch', makeInitialFetchShim(args));
  return render(
    <Providers args={args}>
      <TrainingDetail />
    </Providers>,
  );
}

describe('training_detail', () => {
  let originalRouteMap: Record<string, string>;

  beforeEach(() => {
    originalRouteMap = { ...routeMapStore._routeMap };
    routeMapStore.set({
      training_detail: '/training/:tid',
      training_edit: '/training/:tid/edit',
      training_files: '/training/:tid/file',
      training_main: '/training',
      problem_detail: '/p/:pid',
    });
  });

  afterEach(() => {
    routeMapStore._routeMap = originalRouteMap;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders an empty / not-found message when tdoc is missing', () => {
    renderPage({});
    expect(screen.getByText('训练计划不存在。')).toBeInTheDocument();
  });

  it('renders the title, sections, and problem rows', () => {
    renderPage({
      tdoc: {
        docId: 'tid1',
        title: 'A+B 入门',
        dag: [
          { _id: 1, title: '基础', pids: [1, 2], requireNids: [] },
          { _id: 2, title: '进阶', pids: [3], requireNids: [1] },
        ],
        owner: 1,
        attend: 7,
      },
      tsdoc: { docId: 'tid1', enroll: 1, done: false, donePids: ['1'] },
      ndict: {
        '1': { _id: 1, title: '基础', pids: [1, 2] },
        '2': { _id: 2, title: '进阶', pids: [3], requireNids: [1] },
      },
      nsdict: {
        '1': { progress: 50, isDone: false, isProgress: true, isOpen: false, isInvalid: false },
        '2': { progress: 0, isDone: false, isProgress: false, isOpen: false, isInvalid: true },
      },
      pdict: {
        '1': { docId: 1, pid: 'P1001', title: 'A+B', nSubmit: 100, nAccept: 80 },
        '2': { docId: 2, pid: 'P1002', title: 'Hello', nSubmit: 50, nAccept: 30 },
        '3': { docId: 3, pid: 'P1003', title: 'Sort', nSubmit: 20, nAccept: 10 },
      },
      psdict: {},
      udoc: { _id: 1, uname: 'admin' },
      UserContext: { _id: 1, priv: 1 },
    });

    expect(screen.getByRole('heading', { name: 'A+B 入门' })).toBeInTheDocument();
    expect(screen.getByText('章节 1. 基础')).toBeInTheDocument();
    expect(screen.getByText('章节 2. 进阶')).toBeInTheDocument();
    // Three problem rows
    const pids = ['1', '2', '3'].map((pid) =>
      document.querySelector(`[data-pid="${pid}"]`),
    );
    expect(pids.every(Boolean)).toBe(true);
  });

  it('marks a node invalid (locked) when its requireNids are not done', () => {
    renderPage({
      tdoc: {
        docId: 'tid1',
        title: 'Plan',
        dag: [
          { _id: 1, title: 'Basic', pids: [1], requireNids: [] },
          { _id: 2, title: 'Advanced', pids: [2], requireNids: [1] },
        ],
        owner: 1,
      },
      tsdoc: { docId: 'tid1', enroll: 1, done: false, donePids: [] },
      ndict: {
        '1': { _id: 1, title: 'Basic', pids: [1] },
        '2': { _id: 2, title: 'Advanced', pids: [2], requireNids: [1] },
      },
      nsdict: {
        '1': { progress: 0, isDone: false, isProgress: false, isOpen: true, isInvalid: false },
        '2': { progress: 0, isDone: false, isProgress: false, isOpen: false, isInvalid: true },
      },
      pdict: {
        '1': { docId: 1, title: 'A', nSubmit: 0, nAccept: 0 },
        '2': { docId: 2, title: 'B', nSubmit: 0, nAccept: 0 },
      },
      psdict: {},
      UserContext: { _id: 1 },
    });

    // The advanced node is invalid until basic is done.
    const advanced = document.querySelector('[data-node-id="2"]') as HTMLElement;
    expect(advanced.dataset.nodeState).toBe('invalid');
    expect(advanced.className).toMatch(/nodeLocked/);
    expect(advanced.textContent).toContain('本章节当前无法挑战');
  });

  it('shows the missing-problem warning when missing.length > 0', () => {
    renderPage({
      tdoc: {
        docId: 'tid1',
        title: 'Plan',
        dag: [{ _id: 1, title: 'A', pids: [1, 99] }],
        owner: 1,
      },
      tsdoc: { docId: 'tid1', enroll: 1, done: false, donePids: [] },
      ndict: { '1': { _id: 1, title: 'A', pids: [1, 99] } },
      nsdict: { '1': { progress: 0, isDone: false, isProgress: false, isOpen: true, isInvalid: false } },
      pdict: { '1': { docId: 1, title: 'A', nSubmit: 0, nAccept: 0 } },
      psdict: {},
      missing: [99],
      UserContext: { _id: 1 },
    });
    expect(screen.getByTestId('missing-warning').textContent).toContain('99');
  });

  it('renders the enroll button for an unenrolled logged-in user', () => {
    renderPage({
      tdoc: {
        docId: 'tid1',
        title: 'Plan',
        dag: [{ _id: 1, title: 'A', pids: [1] }],
        owner: 5, // different owner
      },
      tsdoc: { docId: 'tid1', enroll: 0, done: false, donePids: [] },
      ndict: { '1': { _id: 1, title: 'A', pids: [1] } },
      nsdict: { '1': { progress: 0, isDone: false, isProgress: false, isOpen: true, isInvalid: false } },
      pdict: { '1': { docId: 1, title: 'A', nSubmit: 0, nAccept: 0 } },
      psdict: {},
      UserContext: { _id: 7 },
    });
    expect(screen.getByTestId('enroll-button')).toBeInTheDocument();
  });

  it('posts enroll=1 and reloads the page on enroll click', async () => {
    // Stub window.location.href to capture the reload target without
    // actually navigating (which jsdom would refuse).
    const setHrefSpy = vi.fn();
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      get: () => new Proxy(originalLocation, {
        get(target, prop) {
          if (prop === 'href') return target.href;
          return (target as never)[prop as never];
        },
        set(target, prop, value) {
          if (prop === 'href') {
            setHrefSpy(value);
            return true;
          }
          (target as never)[prop as never] = value;
          return true;
        },
      }),
    });
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse());
    try {
      renderPage({
        tdoc: {
          docId: 'tid1',
          title: 'Plan',
          dag: [{ _id: 1, title: 'A', pids: [1] }],
          owner: 5,
        },
        tsdoc: { docId: 'tid1', enroll: 0, done: false, donePids: [] },
        ndict: { '1': { _id: 1, title: 'A', pids: [1] } },
        nsdict: { '1': { progress: 0, isDone: false, isProgress: false, isOpen: true, isInvalid: false } },
        pdict: { '1': { docId: 1, title: 'A', nSubmit: 0, nAccept: 0 } },
        psdict: {},
        UserContext: { _id: 7 },
      });
      // Re-install fetchMock AFTER render so the POST assertion sees only
      // the enroll call (not the RouterProvider's initial GET).
      vi.stubGlobal('fetch', fetchMock);
      fireEvent.click(screen.getByTestId('enroll-button'));
      await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('/training/tid1');
      expect(init.method).toBe('POST');
      expect(init.credentials).toBe('same-origin');
      expect(JSON.parse(String(init.body))).toEqual({ operation: 'enroll' });
      // After success the page reloads via window.location.href.
      await waitFor(() => expect(setHrefSpy).toHaveBeenCalledWith('/training/tid1'));
    } finally {
      Object.defineProperty(window, 'location', { value: originalLocation, configurable: true, writable: true });
    }
  });

  it('surfaces a backend error when the enroll POST fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      UserFacingError: true,
      error: { message: 'You must log in to enroll', params: [] },
    }, 403));
    renderPage({
      tdoc: {
        docId: 'tid1',
        title: 'Plan',
        dag: [{ _id: 1, title: 'A', pids: [1] }],
        owner: 5,
      },
      tsdoc: { docId: 'tid1', enroll: 0, done: false, donePids: [] },
      ndict: { '1': { _id: 1, title: 'A', pids: [1] } },
      nsdict: { '1': { progress: 0, isDone: false, isProgress: false, isOpen: true, isInvalid: false } },
      pdict: { '1': { docId: 1, title: 'A', nSubmit: 0, nAccept: 0 } },
      psdict: {},
      UserContext: { _id: 7 },
    });
    // Re-install the error mock after render so the enroll POST is the
    // only call fetchMock observes.
    vi.stubGlobal('fetch', fetchMock);
    fireEvent.click(screen.getByTestId('enroll-button'));
    const alert = await screen.findByTestId('enroll-error');
    expect(alert).toHaveTextContent('You must log in to enroll');
  });

  it('hides the enroll button for an anonymous user', () => {
    renderPage({
      tdoc: {
        docId: 'tid1',
        title: 'Plan',
        dag: [{ _id: 1, title: 'A', pids: [1] }],
        owner: 5,
      },
      tsdoc: { docId: 'tid1', enroll: 0, done: false, donePids: [] },
      ndict: { '1': { _id: 1, title: 'A', pids: [1] } },
      nsdict: { '1': { progress: 0, isDone: false, isProgress: false, isOpen: true, isInvalid: false } },
      pdict: { '1': { docId: 1, title: 'A', nSubmit: 0, nAccept: 0 } },
      psdict: {},
      UserContext: {},
    });
    expect(screen.queryByTestId('enroll-button')).not.toBeInTheDocument();
  });
});
