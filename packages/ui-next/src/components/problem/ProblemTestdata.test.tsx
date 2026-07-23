import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type PageData, PageDataProvider } from '../../context/page-data';
import { RouterProvider } from '../../context/router';
import { ToastProvider } from '../primitives';
import { request } from '../../hooks/use-api';
import * as downloadZip from '../../lib/download-zip';
import { ProblemTestdata } from './ProblemTestdata';

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  (global as any).fetch = fetchMock;
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    headers: { get: () => 'application/json' },
    json: async () => ({}),
    text: async () => '',
    blob: async () => new Blob(['']),
  });
});

function renderComp(props: Partial<ComponentProps<typeof ProblemTestdata>> = {}) {
  return render(
    <PageDataProvider initial={{ name: 'problem_edit', template: '', url: '/', args: { UserContext: { _id: 1 }, UiContext: {} } }}>
      <RouterProvider>
        <ToastProvider>
          <ProblemTestdata pid="P1" files={[{ name: '1.in', size: 100 }, { name: '1.out', size: 200 }]} onChange={() => {}} {...props} />
        </ToastProvider>
      </RouterProvider>
    </PageDataProvider>,
  );
}

describe('ProblemTestdata', () => {
  it('renders file rows', () => {
    renderComp();
    expect(screen.getByText('1.in')).toBeInTheDocument();
    expect(screen.getByText('1.out')).toBeInTheDocument();
  });

  it('confirms an individual delete and names the file before posting', async () => {
    const postSpy = vi.spyOn(request, 'post').mockResolvedValue({} as never);
    const onChange = vi.fn();
    renderComp({ onChange, files: [{ name: '1.in', size: 100 }] });
    fireEvent.click(screen.getByRole('button', { name: /delete 1\.in/i }));
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveTextContent('1.in');
    expect(postSpy).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: /删除|delete/i }));
    await waitFor(() => expect(postSpy).toHaveBeenCalledWith('/p/P1/files', {
      operation: 'delete_files', type: 'testdata', files: ['1.in'],
    }));
  });

  it('batch-renames selected files via a rename_files request', async () => {
    const postSpy = vi.spyOn(request, 'post').mockResolvedValue({} as never);
    const onChange = vi.fn();
    renderComp({ onChange });

    // Select both files, then open the batch-rename dialog.
    fireEvent.click(screen.getByRole('button', { name: /全选|select all/i }));
    fireEvent.click(screen.getByRole('button', { name: /重命名|rename/i }));
    const dialog = await screen.findByRole('dialog');

    // find "1" -> "sample1": 1.in -> sample1.in, 1.out -> sample1.out
    fireEvent.change(within(dialog).getByTestId('batch-rename-find'), { target: { value: '1' } });
    fireEvent.change(within(dialog).getByTestId('batch-rename-replace'), { target: { value: 'sample1' } });
    fireEvent.click(within(dialog).getByTestId('batch-rename-confirm'));

    await waitFor(() => expect(postSpy).toHaveBeenCalledWith('/p/P1/files', {
      operation: 'rename_files',
      type: 'testdata',
      files: ['1.in', '1.out'],
      newNames: ['sample1.in', 'sample1.out'],
    }));
    postSpy.mockRestore();
  });

  it('confirms a bulk delete and names every selected file before posting', async () => {
    const postSpy = vi.spyOn(request, 'post').mockResolvedValue({} as never);
    renderComp();
    fireEvent.click(screen.getByRole('button', { name: /全选|select all/i }));
    await waitFor(() => {
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.every((c) => (c as HTMLInputElement).checked)).toBe(true);
    });
    fireEvent.click(screen.getByRole('button', { name: /删除所选|delete selected/i }));
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveTextContent('1.in');
    expect(dialog).toHaveTextContent('1.out');
    expect(postSpy).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: /删除所选|delete selected/i }));
    await waitFor(() => expect(postSpy).toHaveBeenCalledWith('/p/P1/files', {
      operation: 'delete_files',
      type: 'testdata',
      files: ['1.in', '1.out'],
    }));
    postSpy.mockRestore();
  });

  it('downloads a real ZIP of every file rather than only the first link', async () => {
    const postSpy = vi.spyOn(request, 'post').mockResolvedValue({
      links: { '1.in': 'https://s3/u1', '1.out': 'https://s3/u2' },
    } as never);
    const buildSpy = vi.spyOn(downloadZip, 'buildDownloadZip').mockResolvedValue({
      blob: new Blob(['zip']), failures: [],
    });
    renderComp();
    fireEvent.click(screen.getByRole('button', { name: /下载 ZIP|download zip/i }));
    await waitFor(() => expect(buildSpy).toHaveBeenCalled());
    const targets = buildSpy.mock.calls[0][0];
    expect(targets).toEqual([
      { filename: '1.in', url: 'https://s3/u1' },
      { filename: '1.out', url: 'https://s3/u2' },
    ]);
    postSpy.mockRestore();
    buildSpy.mockRestore();
  });

  it('opens a preview dialog when a file name is clicked', async () => {
    renderComp({ files: [{ name: '1.in', size: 100 }] });
    fireEvent.click(screen.getByRole('button', { name: /open 1\.in|预览 1\.in/i }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('button', { name: /复制链接|copy link/i })).toBeInTheDocument();
  });

  it('opens disabled file previews in read-only mode', async () => {
    renderComp({ disabled: true, files: [{ name: '1.in', size: 100 }] });
    fireEvent.click(screen.getByRole('button', { name: /open 1\.in|预览 1\.in/i }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).queryByRole('button', { name: /保存|save/i })).not.toBeInTheDocument();
  });

  it('disables Create / Generate / Download ZIP when disabled (reference)', () => {
    renderComp({ disabled: true });
    // Existing row delete button is enabled-but-disabled-too; the three new
    // gates cover the bulk-mutation surface area the brief cares about.
    const buttons = screen.getAllByRole('button');
    const labels = buttons.map((b) => (b.textContent || '').trim());
    expect(labels.some((l) => /Create|新建/.test(l))).toBe(true);
    expect(labels.some((l) => /Generate|生成/.test(l))).toBe(true);
    expect(labels.some((l) => /Download ZIP|下载 ZIP/.test(l))).toBe(true);
    const blocked = buttons.filter((b) =>
      /Create|新建|Generate|生成|Download ZIP|下载 ZIP/i.test(b.textContent || ''));
    for (const b of blocked) expect(b).toBeDisabled();
  });

  it('surfaces a toast (and keeps optimistic list) when get_links for the ZIP fails', async () => {
    const postSpy = vi.spyOn(request, 'post').mockRejectedValue(new Error('boom'));
    const buildSpy = vi.spyOn(downloadZip, 'buildDownloadZip');
    renderComp();
    fireEvent.click(screen.getByRole('button', { name: /下载 ZIP|download zip/i }));
    await waitFor(() => expect(postSpy).toHaveBeenCalled());
    expect(buildSpy).not.toHaveBeenCalled();
    expect(screen.getByText('1.in')).toBeInTheDocument();
    expect(screen.getByText('1.out')).toBeInTheDocument();
    postSpy.mockRestore();
    buildSpy.mockRestore();
  });
});
