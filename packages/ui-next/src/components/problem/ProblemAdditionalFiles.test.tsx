import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type PageData, PageDataProvider } from '../../context/page-data';
import { RouterProvider } from '../../context/router';
import { ToastProvider } from '../primitives';
import { ProblemAdditionalFiles } from './ProblemAdditionalFiles';

const fetchMock = vi.fn();

function buildPageData(args: PageData['args']): PageData {
  return { name: 'problem_edit', template: '', url: '/', args };
}

function renderComp(props: Partial<ComponentProps<typeof ProblemAdditionalFiles>> = {}) {
  (global as any).fetch = fetchMock;
  fetchMock.mockResolvedValue({
    ok: true, status: 200, headers: { get: () => 'application/json' },
    json: async () => ({}), text: async () => '', blob: async () => new Blob(['']),
  });
  return render(
    <PageDataProvider initial={buildPageData({ UserContext: { _id: 1 }, UiContext: {} })}>
      <RouterProvider>
        <ToastProvider>
          <ProblemAdditionalFiles
            pid="p1"
            files={[{ name: 'a.txt', size: 100 }]}
            onChange={() => {}}
            {...props}
          />
        </ToastProvider>
      </RouterProvider>
    </PageDataProvider>,
  );
}

describe('problemAdditionalFiles', () => {
  afterEach(() => { vi.restoreAllMocks(); fetchMock.mockReset(); });

  it('renders existing file list', () => {
    renderComp();
    expect(screen.getByText('a.txt')).toBeInTheDocument();
  });

  it('delete button opens ConfirmDialog', () => {
    renderComp();
    fireEvent.click(screen.getByRole('button', { name: /删除|delete/i }));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('confirming delete calls request and refreshes', async () => {
    const onChange = vi.fn();
    const { request } = await import('../../hooks/use-api');
    const postSpy = vi.spyOn(request, 'post').mockResolvedValue({} as never);
    renderComp({ onChange });
    fireEvent.click(screen.getByRole('button', { name: /删除|delete/i }));
    const dialog = screen.getByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /删除|delete/i }));
    await waitFor(() => expect(postSpy).toHaveBeenCalled());
    expect(onChange).toHaveBeenCalled();
  });

  it('opens a preview dialog when a file name is clicked', async () => {
    renderComp();
    fireEvent.click(screen.getByRole('button', { name: /open a\.txt|预览 a\.txt/i }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('button', { name: /复制链接|copy link/i })).toBeInTheDocument();
  });

  it('batch-renames selected files via a rename_files request (additional_file)', async () => {
    const { request } = await import('../../hooks/use-api');
    const postSpy = vi.spyOn(request, 'post').mockResolvedValue({} as never);
    renderComp();
    fireEvent.click(screen.getByRole('button', { name: /全选|select all/i }));
    fireEvent.click(screen.getByRole('button', { name: /重命名|rename/i }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByTestId('batch-rename-find'), { target: { value: 'a' } });
    fireEvent.change(within(dialog).getByTestId('batch-rename-replace'), { target: { value: 'z' } });
    fireEvent.click(within(dialog).getByTestId('batch-rename-confirm'));
    await waitFor(() => expect(postSpy).toHaveBeenCalledWith('/p/p1/files', {
      operation: 'rename_files',
      type: 'additional_file',
      files: ['a.txt'],
      newNames: ['z.txt'],
    }));
  });

  it('disables upload + Select all + Rename when disabled (reference)', () => {
    renderComp({ disabled: true });
    const buttons = screen.getAllByRole('button');
    const labels = buttons.map((b) => (b.textContent || '').trim());
    expect(labels.some((l) => /上传|Upload/.test(l))).toBe(true);
    expect(labels.some((l) => /全选|Select all/.test(l))).toBe(true);
    expect(labels.some((l) => /重命名|Rename/.test(l))).toBe(true);
    const blocked = buttons.filter((b) =>
      /上传|Upload|全选|Select all|重命名|Rename/.test(b.textContent || ''));
    for (const b of blocked) expect(b).toBeDisabled();
  });
});
