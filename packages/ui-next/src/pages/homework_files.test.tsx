/* @vitest-environment happy-dom */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type PageData, PageDataProvider } from '../context/page-data';
import HomeworkFiles from './homework_files';

function jsonResponse(body: unknown = {}, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function buildPageData(args: PageData['args']): PageData {
  return {
    name: 'homework_files',
    template: 'homework_files.html',
    args: { UserContext: {}, UiContext: {}, ...args } as PageData['args'],
    url: '/homework/hw1/file',
  };
}

function Providers({ args, children }: { args: PageData['args'], children: ReactNode }) {
  return <PageDataProvider initial={buildPageData(args)}>{children}</PageDataProvider>;
}

function renderPage(args: PageData['args']) {
  return render(
    <Providers args={args}>
      <HomeworkFiles />
    </Providers>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('homework_files', () => {
  it('renders the empty state when no files exist', () => {
    renderPage({ tdoc: { docId: 'hw1', title: 'Algebra', owner: 1 }, files: [] });
    expect(screen.getByText('暂无文件。')).toBeInTheDocument();
  });

  it('renders sizes and public-segment download links', () => {
    renderPage({
      tdoc: { docId: 'hw1', title: 'Algebra', owner: 1 },
      files: [
        { name: 'notes.pdf', size: 1024 },
        { name: 'data.zip', size: 1536 },
      ],
    });

    expect(screen.getByRole('link', { name: 'notes.pdf' })).toHaveAttribute(
      'href',
      '/homework/hw1/file/public/notes.pdf',
    );
    expect(screen.getAllByRole('link', { name: '下载' })[0]).toHaveAttribute(
      'href',
      '/homework/hw1/file/public/notes.pdf',
    );
    expect(screen.getByText('1.0 KiB')).toBeInTheDocument();
    expect(screen.getByText('1.5 KiB')).toBeInTheDocument();
  });

  it('deletes all selected files after inline confirmation', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse());
    vi.stubGlobal('fetch', fetchMock);
    renderPage({
      tdoc: { docId: 'hw1', title: 'Algebra', owner: 1 },
      files: [
        { name: 'a.txt', size: 12 },
        { name: 'b.txt', size: 34 },
      ],
      UserContext: { _id: 1, perm: 'BigInt::1125899906842624' },
    });

    fireEvent.click(screen.getByLabelText('选择 a.txt'));
    fireEvent.click(screen.getByLabelText('选择 b.txt'));
    fireEvent.click(screen.getByRole('button', { name: '删除所选文件' }));
    fireEvent.click(screen.getByRole('button', { name: '确认删除' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/homework/hw1/file');
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('same-origin');
    expect(JSON.parse(String(init.body))).toEqual({
      operation: 'delete_files',
      files: ['a.txt', 'b.txt'],
    });
    await screen.findByText('暂无文件。');
  });
});
