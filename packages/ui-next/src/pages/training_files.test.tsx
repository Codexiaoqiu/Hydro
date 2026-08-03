/* @vitest-environment happy-dom */

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type PageData, PageDataProvider } from '../context/page-data';
import TrainingFiles from './training_files';

function buildPageData(args: PageData['args']): PageData {
  return {
    name: 'training_files',
    template: 'training_files.html',
    args: {
      UserContext: {},
      UiContext: {},
      ...args,
    } as PageData['args'],
    url: '/training/tid1/file',
  };
}

function Providers({ args, children }: { args: PageData['args'], children: ReactNode }) {
  return <PageDataProvider initial={buildPageData(args)}>{children}</PageDataProvider>;
}

function renderPage(args: PageData['args']) {
  return render(
    <Providers args={args}>
      <TrainingFiles />
    </Providers>,
  );
}

function jsonResponse(body: unknown = {}, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('training_files', () => {
  it('renders the empty state when no files are present', () => {
    renderPage({
      tdoc: { docId: 'tid1', title: 'Plan A', owner: 1 },
      files: [],
    });
    expect(screen.getByText('暂无文件。')).toBeInTheDocument();
  });

  it('renders filenames, sizes, and download links using urlForFile', () => {
    const urlForFile = vi.fn((name: string) => `/dl/${name}`);
    renderPage({
      tdoc: { docId: 'tid1', title: 'Plan A', owner: 1 },
      files: [
        { name: 'a.pdf', size: 1024 },
        { name: 'b.png', size: 1536 },
      ],
      urlForFile,
      // owner + PERM_EDIT_TRAINING_SELF so the action buttons render.
      UserContext: { _id: 1, perm: 'BigInt::562949953421312' },
    });

    expect(screen.getByRole('link', { name: 'a.pdf' })).toHaveAttribute('href', '/dl/a.pdf');
    expect(screen.getByRole('link', { name: '下载 a.pdf' })).toHaveAttribute('href', '/dl/a.pdf');
    expect(screen.getByText('1.0 KiB')).toBeInTheDocument();
    expect(screen.getByText('1.5 KiB')).toBeInTheDocument();
    expect(urlForFile).toHaveBeenCalledWith('a.pdf');
  });

  it('shows an "not found" notice when tdoc is missing', () => {
    renderPage({ files: [] });
    expect(screen.getByText('训练计划不存在。')).toBeInTheDocument();
  });

  it('hides the upload + delete controls for a non-owner non-editor viewer', () => {
    renderPage({
      tdoc: { docId: 'tid1', owner: 1, maintainer: [] },
      files: [{ name: 'a.pdf', size: 12 }],
      // _id=2, no edit perm — neither owner nor editor.
      UserContext: { _id: 2, perm: 'BigInt::0' },
    });
    expect(screen.queryByRole('button', { name: '上传文件' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /删除 a.pdf/ })).not.toBeInTheDocument();
  });

  it('uploads a file as multipart and adds it to the list on success', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse());
    vi.stubGlobal('fetch', fetchMock);
    const { container } = renderPage({
      tdoc: { docId: 'tid1', title: 'Plan A', owner: 1 },
      files: [],
      urlForFile: (n) => `/dl/${n}`,
      // owner (uid=1) with PERM_EDIT_TRAINING_SELF (1n<<49n = 562949953421312).
      UserContext: { _id: 1, perm: 'BigInt::562949953421312' },
    });
    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });
    const input = container.querySelector<HTMLInputElement>('input[type="file"]');
    expect(input).not.toBeNull();

    fireEvent.change(input!, { target: { files: [file] } });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/training/tid1/file');
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('same-origin');
    expect(init.body).toBeInstanceOf(FormData);
    const form = init.body as FormData;
    expect(form.get('operation')).toBe('upload_file');
    expect(form.get('filename')).toBe('hello.txt');
    expect(form.get('file')).toBe(file);
    expect(await screen.findByRole('link', { name: 'hello.txt' })).toBeInTheDocument();
  });

  it('deletes a file after confirmation', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse());
    vi.stubGlobal('fetch', fetchMock);
    const confirmMock = vi.fn(() => true);
    vi.stubGlobal('confirm', confirmMock);
    renderPage({
      tdoc: { docId: 'tid1', title: 'Plan A', owner: 1 },
      files: [{ name: 'a.pdf', size: 12 }],
      urlForFile: (n) => `/dl/${n}`,
      UserContext: { _id: 1, perm: 'BigInt::562949953421312' },
    });

    fireEvent.click(screen.getByRole('button', { name: /删除 a.pdf/ }));

    expect(confirmMock).toHaveBeenCalledWith('确认删除该文件?');
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/training/tid1/file');
    expect(init.credentials).toBe('same-origin');
    expect(JSON.parse(String(init.body))).toEqual({ operation: 'delete_files', files: ['a.pdf'] });
    await waitFor(() => expect(screen.queryByRole('link', { name: 'a.pdf' })).not.toBeInTheDocument());
  });

  it('surfaces a backend error and lets the user dismiss it', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      UserFacingError: true,
      error: { message: 'File already exists: {0}', params: ['duplicate.txt'] },
    }, 400));
    vi.stubGlobal('fetch', fetchMock);
    const { container } = renderPage({
      tdoc: { docId: 'tid1', title: 'Plan A', owner: 1 },
      files: [],
      UserContext: { _id: 1, perm: 'BigInt::562949953421312' },
    });
    const file = new File(['x'], 'duplicate.txt', { type: 'text/plain' });
    const input = container.querySelector<HTMLInputElement>('input[type="file"]');

    fireEvent.change(input!, { target: { files: [file] } });

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('File already exists: duplicate.txt');
    fireEvent.click(within(alert).getByRole('button', { name: '忽略错误' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
