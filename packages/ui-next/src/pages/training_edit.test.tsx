/* @vitest-environment happy-dom */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../components/primitives/Toast';
import { type PageData, PageDataProvider } from '../context/page-data';
import { RouterProvider } from '../context/router';
import { routeMapStore } from '../globals';
import { ThemeProvider } from '../theme/ThemeProvider';
import TrainingEdit from './training_edit';

function buildPageData(args: PageData['args']): PageData {
  return {
    name: 'training_edit',
    template: 'training_edit.html',
    args: {
      UserContext: {},
      UiContext: {},
      ...args,
    } as PageData['args'],
    url: '/training/tid1/edit',
  };
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

function jsonResponse(body: unknown = {}, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function renderPage(args: PageData['args']) {
  // RouterProvider kicks off an initial GET on mount. Without an
  // intercept it would clobber the args the test set up. The shim
  // mirrors GETs back to the test's args so setData is effectively a
  // no-op for the keys the page reads, while forwarding POSTs as empty
  // successes. Tests that need to assert on a POST install their own
  // fetchMock after rendering.
  vi.stubGlobal('fetch', vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
    if (init?.method === 'POST') return jsonResponse();
    return jsonResponse(args);
  }));
  return render(
    <Providers args={args}>
      <TrainingEdit />
    </Providers>,
  );
}

describe('training_edit', () => {
  beforeEach(() => {
    routeMapStore.set({
      training_edit: '/training/:tid/edit',
      training_create: '/training/create',
      training_detail: '/training/:tid',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders the create form when page_name is "training_create"', () => {
    renderPage({ page_name: 'training_create' });
    expect(screen.getByRole('heading', { name: '创建训练计划' })).toBeInTheDocument();
    // Submit button label
    expect(screen.getByTestId('submit')).toHaveTextContent('创建');
  });

  it('renders the edit form pre-populated with the existing tdoc fields', () => {
    const dagJson = JSON.stringify([{ _id: 1, title: 'A', requireNids: [], pids: [1] }], null, 2);
    renderPage({
      page_name: 'training_edit',
      tdoc: {
        docId: 'tid1',
        title: 'My plan',
        content: 'short',
        description: 'long',
        pin: 3,
      },
      dag: dagJson,
    });

    expect(screen.getByRole('heading', { name: '编辑训练计划' })).toBeInTheDocument();
    const title = screen.getByLabelText('标题') as HTMLInputElement;
    expect(title.value).toBe('My plan');
    expect((screen.getByLabelText('置顶权重') as HTMLInputElement).value).toBe('3');
    expect((screen.getByLabelText('简介') as HTMLTextAreaElement).value).toBe('short');
    expect((screen.getByLabelText('描述') as HTMLTextAreaElement).value).toBe('long');
    expect((screen.getByLabelText('计划 (DAG JSON)') as HTMLTextAreaElement).value).toBe(dagJson);
  });

  it('posts the form to the create URL and round-trips the dag verbatim', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ tid: 'newtid' }));
    renderPage({ page_name: 'training_create' });
    // Re-install fetchMock AFTER render so the only call it sees is the
    // submit POST (the RouterProvider's initial GET goes to the shim).
    vi.stubGlobal('fetch', fetchMock);

    fireEvent.change(screen.getByLabelText('标题'), { target: { value: 'Brand new' } });
    fireEvent.change(screen.getByLabelText('简介'), { target: { value: 'an intro' } });
    const customDag = '[{"_id":1,"title":"X","requireNids":[],"pids":[42]}]';
    fireEvent.change(screen.getByLabelText('计划 (DAG JSON)'), { target: { value: customDag } });
    fireEvent.change(screen.getByLabelText('置顶权重'), { target: { value: '5' } });

    fireEvent.click(screen.getByTestId('submit'));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/training/create');
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('same-origin');
    const body = JSON.parse(String(init.body));
    expect(body.title).toBe('Brand new');
    expect(body.content).toBe('an intro');
    // The user-supplied dag is sent verbatim, including its single-line
    // formatting — we do not reformat on the client.
    expect(body.dag).toBe(customDag);
    expect(body.pin).toBe(5);
  });

  it('posts the form to /training/:tid/edit for an existing training', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ tid: 'tid1' }));
    const dagJson = JSON.stringify([{ _id: 1, title: 'A', requireNids: [], pids: [1] }], null, 2);
    renderPage({
      page_name: 'training_edit',
      tdoc: { docId: 'tid1', title: 'A' },
      dag: dagJson,
    });
    vi.stubGlobal('fetch', fetchMock);

    fireEvent.click(screen.getByTestId('submit'));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/training/tid1/edit');
    const body = JSON.parse(String(init.body));
    expect(body.tid).toBe('tid1');
    // dag must be round-tripped verbatim (it already is a pretty-printed string).
    expect(body.dag).toBe(dagJson);
  });

  it('disables the submit button when the title is empty', () => {
    renderPage({ page_name: 'training_create' });
    expect(screen.getByTestId('submit')).toBeDisabled();
  });

  it('surfaces a backend validation error', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      UserFacingError: true,
      error: { message: 'dag must have at least one node', params: [] },
    }, 400));
    renderPage({ page_name: 'training_create' });
    vi.stubGlobal('fetch', fetchMock);

    fireEvent.change(screen.getByLabelText('标题'), { target: { value: 'X' } });
    fireEvent.click(screen.getByTestId('submit'));

    const alert = await screen.findByTestId('edit-error');
    expect(alert).toHaveTextContent('dag must have at least one node');
  });

  it('shows a success notice on a clean save', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ tid: 'newtid' }));
    renderPage({ page_name: 'training_create' });
    vi.stubGlobal('fetch', fetchMock);

    fireEvent.change(screen.getByLabelText('标题'), { target: { value: 'X' } });
    fireEvent.click(screen.getByTestId('submit'));

    const success = await screen.findByTestId('edit-success');
    expect(success).toHaveTextContent('已创建');
  });
});
