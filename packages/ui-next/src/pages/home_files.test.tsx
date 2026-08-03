/* @vitest-environment happy-dom */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type PageData, PageDataProvider } from '../context/page-data';
import HomeFilesPage from './home_files';

function makePageData(args: Record<string, unknown> = {}): PageData {
  return {
    name: 'home_files',
    template: 'home_files.html',
    url: '/file',
    args: {
      UserContext: {},
      UiContext: {},
      files: [],
      urlForFile: (filename: string) => `/file/1/${encodeURIComponent(filename)}`,
      ...args,
    } as PageData['args'],
  };
}

function Providers({ args, children }: { args: Record<string, unknown>, children: ReactNode }) {
  return <PageDataProvider initial={makePageData(args)}>{children}</PageDataProvider>;
}

function renderPage(args: Record<string, unknown> = {}) {
  return render(
    <Providers args={args}>
      <HomeFilesPage />
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

describe('home_files', () => {
  it('renders the legacy empty-state message', () => {
    renderPage();
    expect(screen.getByText('There are no files currently.')).toBeInTheDocument();
  });

  it('renders human-readable sizes and filename and download links from urlForFile', () => {
    const urlForFile = vi.fn((filename: string) => `/download/${filename}`);
    renderPage({
      files: [
        { name: 'a.txt', size: 1024, lastModified: '2026-08-03T12:00:00.000Z', etag: 'a' },
        { name: 'b.png', size: 1536, lastModified: '2026-08-03T12:01:00.000Z', etag: 'b' },
      ],
      urlForFile,
    });

    expect(screen.getByRole('link', { name: 'a.txt' })).toHaveAttribute('href', '/download/a.txt');
    expect(screen.getByRole('link', { name: 'Download a.txt' })).toHaveAttribute('href', '/download/a.txt');
    expect(screen.getByText('1.0 KiB')).toBeInTheDocument();
    expect(screen.getByText('1.5 KiB')).toBeInTheDocument();
    expect(urlForFile).toHaveBeenCalledWith('a.txt');
    expect(urlForFile).toHaveBeenCalledWith('b.png');
  });

  it('uploads a file as multipart data and adds it to the list on success', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse());
    vi.stubGlobal('fetch', fetchMock);
    const { container } = renderPage();
    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });
    const input = container.querySelector<HTMLInputElement>('input[type="file"]');
    expect(input).not.toBeNull();

    fireEvent.change(input!, { target: { files: [file] } });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/file');
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('same-origin');
    expect(init.body).toBeInstanceOf(FormData);
    const form = init.body as FormData;
    expect(form.get('operation')).toBe('upload_file');
    expect(form.get('filename')).toBe('hello.txt');
    expect(form.get('file')).toBe(file);
    expect(await screen.findByRole('link', { name: 'hello.txt' })).toBeInTheDocument();
  });

  it('surfaces a backend duplicate or quota error and lets the user dismiss it', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      UserFacingError: true,
      error: { message: 'File already exists: {0}', params: ['duplicate.txt'] },
    }, 400));
    vi.stubGlobal('fetch', fetchMock);
    const { container } = renderPage();
    const file = new File(['duplicate'], 'duplicate.txt', { type: 'text/plain' });
    const input = container.querySelector<HTMLInputElement>('input[type="file"]');

    fireEvent.change(input!, { target: { files: [file] } });

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('File already exists: duplicate.txt');
    fireEvent.click(within(alert).getByRole('button', { name: 'Dismiss error' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('deletes one file only after the single-file confirmation', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse());
    vi.stubGlobal('fetch', fetchMock);
    const confirmMock = vi.fn(() => true);
    vi.stubGlobal('confirm', confirmMock);
    renderPage({ files: [{ name: 'a.txt', size: 12 }] });

    fireEvent.click(screen.getByRole('button', { name: 'Delete a.txt' }));

    expect(confirmMock).toHaveBeenCalledWith('Confirm to delete the file?');
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/file');
    expect(init.credentials).toBe('same-origin');
    expect(JSON.parse(String(init.body))).toEqual({ operation: 'delete_files', files: ['a.txt'] });
    await waitFor(() => expect(screen.queryByRole('link', { name: 'a.txt' })).not.toBeInTheDocument());
  });

  it('deletes all selected files after the multi-file confirmation', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse());
    vi.stubGlobal('fetch', fetchMock);
    const confirmMock = vi.fn(() => true);
    vi.stubGlobal('confirm', confirmMock);
    renderPage({
      files: [
        { name: 'a.txt', size: 12 },
        { name: 'b.txt', size: 34 },
      ],
    });

    fireEvent.click(screen.getByLabelText('Select a.txt'));
    fireEvent.click(screen.getByLabelText('Select b.txt'));
    fireEvent.click(screen.getByRole('button', { name: 'Remove Selected' }));

    expect(confirmMock).toHaveBeenCalledWith('Confirm to delete the selected files?');
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({
      operation: 'delete_files',
      files: ['a.txt', 'b.txt'],
    });
    await screen.findByText('There are no files currently.');
  });
});
