/* @vitest-environment happy-dom */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../components/primitives';
import { type PageData, PageDataProvider } from '../context/page-data';
import { RouterProvider } from '../context/router';
import ProblemFilesPage from './problem_files';

vi.mock('../hooks/use-api', () => ({
  request: {
    get: vi.fn().mockResolvedValue({ testdata: [], additional_file: [] }),
    post: vi.fn().mockResolvedValue({}),
    postFile: vi.fn().mockResolvedValue({}),
  },
  HydroClientError: class HydroClientError extends Error {},
}));

async function getRequest() {
  return (await import('../hooks/use-api')).request as unknown as {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    postFile: ReturnType<typeof vi.fn>;
  };
}

function buildPageData(args: PageData['args']): PageData {
  return { name: 'problem_files', template: '', url: '/p/P1000/files', args };
}

function renderPage(args: PageData['args']) {
  return render(
    <PageDataProvider initial={buildPageData(args)}>
      <RouterProvider>
        <ToastProvider>
          <ProblemFilesPage />
        </ToastProvider>
      </RouterProvider>
    </PageDataProvider>,
  );
}

describe('problem_files page', () => {
  beforeEach(async () => {
    const request = await getRequest();
    request.get.mockClear();
    request.post.mockClear();
    request.postFile.mockClear();
    request.get.mockResolvedValue({ testdata: [], additional_file: [] });
  });

  it('renders upload widget for a freshly created problem (no files yet)', () => {
    renderPage({ pdoc: { docId: 1, pid: 'P1000', title: 'Sum' }, UserContext: { _id: 1, perm: 'BigInt::32' } });
    expect(screen.getByText(/尚未上传|None uploaded/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /上传|Upload/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /返回编辑|Back to edit/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /完成|Done/i })).toBeInTheDocument();
  });

  it('reads additional files from top-level args (not pdoc)', () => {
    renderPage({
      pdoc: { docId: 1, pid: 'P1000', title: 'Sum' },
      additional_file: [
        { name: 'sample.in', size: 1024 },
        { name: 'sample.out', size: 2048 },
      ],
      UserContext: { _id: 1, perm: 'BigInt::32' },
    });
    expect(screen.getByText('sample.in')).toBeInTheDocument();
    expect(screen.getByText('sample.out')).toBeInTheDocument();
  });

  it('reads testdata from top-level args (not pdoc)', () => {
    renderPage({
      pdoc: { docId: 1, pid: 'P1000', title: 'Sum' },
      testdata: [{ name: '1.in', size: 10 }, { name: '1.out', size: 20 }],
      UserContext: { _id: 1, perm: 'BigInt::32' },
    });
    expect(screen.getByText('1.in')).toBeInTheDocument();
    expect(screen.getByText('1.out')).toBeInTheDocument();
  });

  it('shows error when pdoc is missing', () => {
    renderPage({ UserContext: { _id: 1, perm: 'BigInt::32' } });
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('disables Create / Generate / Download ZIP / upload for cross-domain references', () => {
    renderPage({
      pdoc: { docId: 1, pid: 'P1000', title: 'Ref' },
      testdata: [{ name: '1.in', size: 10 }], // so Download ZIP renders
      reference: { domainId: 'other', pid: 'P1' },
      UserContext: { _id: 1, perm: 'BigInt::32' },
    });
    const buttons = screen.getAllByRole('button');
    const labels = buttons.map((b) => (b.textContent || '').trim());
    expect(labels.some((l) => /\+ Create|\+ 新建/.test(l))).toBe(true);
    expect(labels.some((l) => /Generate|生成/.test(l))).toBe(true);
    expect(labels.some((l) => /Download ZIP|下载 ZIP/.test(l))).toBe(true);
    const blocked = buttons.filter((b) =>
      /\+ Create|\+ 新建|Generate|生成|Download ZIP|下载 ZIP|Upload|上传/.test(b.textContent || ''));
    expect(blocked.length).toBeGreaterThan(0);
    for (const b of blocked) expect(b).toBeDisabled();
  });

  it('disables edit controls without problem edit permission', () => {
    renderPage({
      pdoc: { docId: 1, pid: 'P1000', title: 'Read only' },
      testdata: [{ name: '1.in', size: 10 }],
      additional_file: [{ name: 'readme.txt', size: 10 }],
      UserContext: { _id: 2, perm: 'BigInt::0' },
    });
    expect(screen.getByRole('button', { name: /generate|生成/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /delete 1\.in/i })).toBeDisabled();
    // Additional-files per-row delete uses a × glyph — query by role +
    // accessible name (label is the Delete i18n key, localized).
    const additionalDeletes = screen.getAllByRole('button', { name: /删除|delete/i });
    expect(additionalDeletes.length).toBeGreaterThan(0);
    for (const b of additionalDeletes) expect(b).toBeDisabled();
  });

  it('re-fetches page JSON after a testdata mutation instead of reloading', async () => {
    const request = await getRequest();
    renderPage({
      pdoc: { docId: 1, pid: 'P1000', title: 'Sum' },
      testdata: [{ name: '1.in', size: 10 }],
      UserContext: { _id: 1, perm: 'BigInt::32' },
    });
    fireEvent.click(screen.getByRole('button', { name: /delete 1\.in/i }));
    // Task 10: a delete confirmation modal now gates the POST. Confirm it.
    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /删除|delete/i }));
    await waitFor(() => expect(request.post).toHaveBeenCalled());
    await waitFor(() => expect(request.get).toHaveBeenCalledWith('/p/P1000/files'));
  });

  // I1: stale JSON response must NOT clobber a fresher mutation result.
  it('ignores an in-flight recalibrate response once a newer mutation supersedes it', async () => {
    const request = await getRequest();
    // Resolve the FIRST call slowly (stale) and the SECOND call fast (newer).
    let resolveFirst!: (v: unknown) => void;
    const first = new Promise((r) => { resolveFirst = r; });
    request.get.mockImplementationOnce(() => first as never);
    request.get.mockResolvedValue({ testdata: [], additional_file: [] });

    renderPage({
      pdoc: { docId: 1, pid: 'P1000', title: 'Sum' },
      testdata: [
        { name: '1.in', size: 10 },
        { name: '1.out', size: 20 },
      ],
      UserContext: { _id: 1, perm: 'BigInt::32' },
    });
    // First mutation -> recalibrate #1 (in-flight, slow). Task 10 added a
    // delete confirmation dialog; click through it.
    fireEvent.click(screen.getByRole('button', { name: /delete 1\.in/i }));
    let dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /删除|delete/i }));
    await waitFor(() => expect(request.post).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('1.in')).not.toBeInTheDocument();

    // Second mutation -> recalibrate #2 (fast, supersedes #1).
    fireEvent.click(screen.getByRole('button', { name: /delete 1\.out/i }));
    dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /删除|delete/i }));
    await waitFor(() => expect(request.post).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(request.get).toHaveBeenCalledTimes(2));
    expect(screen.queryByText('1.out')).not.toBeInTheDocument();

    // Now resolve the STALE first response — it must NOT clobber #2's empty state.
    resolveFirst({ testdata: [{ name: '1.in', size: 999 }, { name: '1.out', size: 999 }], additional_file: [] });
    await new Promise((r) => setTimeout(r, 0));

    expect(screen.queryByText('1.in')).not.toBeInTheDocument();
    expect(screen.queryByText('1.out')).not.toBeInTheDocument();
  });

  // I2: a failed recalibrate must surface a toast AND keep optimistic state.
  it('shows an error toast on recalibrate failure and keeps the optimistic list', async () => {
    const request = await getRequest();
    request.get.mockRejectedValueOnce(new Error('network down'));
    renderPage({
      pdoc: { docId: 1, pid: 'P1000', title: 'Sum' },
      testdata: [{ name: '1.in', size: 10 }],
      UserContext: { _id: 1, perm: 'BigInt::32' },
    });
    fireEvent.click(screen.getByRole('button', { name: /delete 1\.in/i }));
    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /删除|delete/i }));
    await waitFor(() => expect(request.get).toHaveBeenCalled());
    // Optimistic list must still reflect the deletion.
    expect(screen.queryByText('1.in')).not.toBeInTheDocument();
    // Toast container (role=status) must include the failure message — the
    // user can retry by triggering another mutation.
    await waitFor(() => {
      const status = screen.getByRole('status');
      expect(status.textContent || '').toMatch(/network down/);
    });
  });
});
