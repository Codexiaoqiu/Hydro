/* @vitest-environment happy-dom */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../components/primitives/Toast';
import { type PageData, PageDataProvider } from '../context/page-data';
import * as routerMod from '../context/router';
import { routeMapStore } from '../globals';
import { PERM } from '../lib/perm-constants';
import { ThemeProvider } from '../theme/ThemeProvider';
import HomeworkDetail from './homework_detail';

function jsonResponse(body: unknown = {}, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function buildPageData(args: PageData['args']): PageData {
  return {
    name: 'homework_detail',
    template: 'homework_detail.html',
    args: { UserContext: {}, UiContext: {}, ...args } as PageData['args'],
    url: '/homework/hw1',
  };
}

function Providers({ args, children }: { args: PageData['args'], children: ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <PageDataProvider initial={buildPageData(args)}>{children}</PageDataProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

function renderPage(args: PageData['args']) {
  vi.stubGlobal('fetch', vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
    if (init?.method === 'POST') return jsonResponse();
    return jsonResponse(args);
  }));
  return render(
    <Providers args={args}>
      <HomeworkDetail />
    </Providers>,
  );
}

describe('homework_detail', () => {
  let originalRouteMap: Record<string, string>;

  beforeEach(() => {
    originalRouteMap = { ...routeMapStore._routeMap };
    vi.spyOn(routerMod, 'useNavigate').mockImplementation(
      () => vi.fn() as unknown as (url: string) => Promise<boolean>,
    );
    routeMapStore.set({
      homework_detail: '/homework/:tid',
      homework_edit: '/homework/:tid/edit',
      homework_files: '/homework/:tid/file',
      problem_detail: '/p/:pid',
      discussion_detail: '/discuss/:did',
    });
  });

  afterEach(() => {
    routeMapStore._routeMap = originalRouteMap;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders the empty state when the homework is missing', () => {
    renderPage({});
    expect(screen.getByText('作业不存在。')).toBeInTheDocument();
  });

  it('renders content, visible problems, and discussions', () => {
    renderPage({
      tdoc: {
        docId: 'hw1',
        title: 'Algebra',
        content: '<p>Read <a href="./hw1/file/public/notes.pdf">notes</a></p>',
        pids: [1],
      },
      pdict: { 1: { docId: 1, pid: 'P1', title: 'Sum' } },
      ddocs: [{ _id: 'd1', docId: 'd1', title: 'Question', owner: 7 }],
      udict: { 7: { _id: 7, uname: 'alice' } },
      dcount: 1,
      page: 1,
      dpcount: 1,
    });

    expect(screen.getByRole('heading', { name: 'Algebra' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'notes' })).toHaveAttribute(
      'href',
      './hw1/file/public/notes.pdf',
    );
    expect(screen.getByRole('link', { name: 'P1 Sum' })).toHaveAttribute('href', '/p/1');
    expect(screen.getByRole('link', { name: 'Question' })).toHaveAttribute('href', '/discuss/d1');
    expect(screen.getByText(/alice/)).toBeInTheDocument();
  });

  it('hides the Edit link for a non-owner viewer without PERM_EDIT_HOMEWORK', () => {
    renderPage({
      tdoc: { docId: 'hw1', title: 'Algebra', owner: 1, pids: [] },
      UserContext: { _id: 2, perm: 'BigInt::0', priv: 0 },
    });

    expect(screen.queryByRole('link', { name: '编辑' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '文件' })).not.toBeInTheDocument();
  });

  it('hides the Attend button for a logged-in user without PERM_ATTEND_HOMEWORK', () => {
    renderPage({
      tdoc: { docId: 'hw1', title: 'Algebra', owner: 1, pids: [] },
      UserContext: { _id: 2, perm: 'BigInt::0', priv: 0 },
    });

    expect(screen.queryByTestId('attend')).not.toBeInTheDocument();
  });

  it('shows Edit links for an owner with only PERM_EDIT_HOMEWORK_SELF', () => {
    renderPage({
      tdoc: { docId: 'hw1', title: 'Algebra', owner: 7, pids: [] },
      UserContext: { _id: 7, perm: `BigInt::${PERM.PERM_EDIT_HOMEWORK_SELF}`, priv: 0 },
    });

    expect(screen.getByRole('link', { name: '编辑' })).toHaveAttribute('href', '/homework/hw1/edit');
    expect(screen.getByRole('link', { name: '文件' })).toHaveAttribute('href', '/homework/hw1/file');
  });

  it('posts the attend operation for an eligible user', async () => {
    renderPage({
      tdoc: { docId: 'hw1', title: 'Algebra', pids: [] },
      UserContext: { _id: 7, perm: `BigInt::${PERM.PERM_ATTEND_HOMEWORK}`, priv: 0 },
    });
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse());
    vi.stubGlobal('fetch', fetchMock);

    fireEvent.click(screen.getByTestId('attend'));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/homework/hw1');
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('same-origin');
    expect(JSON.parse(String(init.body))).toEqual({ operation: 'attend' });
  });
});
