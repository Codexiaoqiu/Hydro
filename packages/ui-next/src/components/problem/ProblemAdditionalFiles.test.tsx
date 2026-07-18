import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type PageData, PageDataProvider } from '../../context/page-data';
import { RouterProvider } from '../../context/router';
import { ToastProvider } from '../primitives';
import { ProblemAdditionalFiles } from './ProblemAdditionalFiles';

function buildPageData(args: PageData['args']): PageData {
  return { name: 'problem_edit', template: '', url: '/', args };
}

function renderComp(props: Partial<ComponentProps<typeof ProblemAdditionalFiles>> = {}) {
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
  afterEach(() => { vi.restoreAllMocks(); });

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
});
