/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../components/primitives';
import { type PageData, PageDataProvider } from '../context/page-data';
import { RouterProvider } from '../context/router';
import ProblemFilesPage from './problem_files';

vi.mock('../hooks/use-api', () => ({
  request: {
    post: vi.fn().mockResolvedValue({}),
    postFile: vi.fn().mockResolvedValue({}),
  },
  HydroClientError: class HydroClientError extends Error {},
}));

function buildPageData(args: PageData['args']): PageData {
  return { name: 'problem_files', template: '', url: '/', args };
}

describe('problem_files page', () => {
  it('renders upload widget for a freshly created problem (no files yet)', () => {
    render(
      <PageDataProvider initial={buildPageData({
        pdoc: { docId: 1, pid: 'P1000', title: 'Sum' },
        UserContext: { _id: 1 },
      })}>
        <RouterProvider>
          <ToastProvider>
            <ProblemFilesPage />
          </ToastProvider>
        </RouterProvider>
      </PageDataProvider>,
    );
    expect(screen.getByText(/尚未上传|None uploaded/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /上传|Upload/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /返回编辑|Back to edit/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /完成|Done/i })).toBeInTheDocument();
  });

  it('renders existing files list', () => {
    render(
      <PageDataProvider initial={buildPageData({
        pdoc: {
          docId: 1,
          pid: 'P1000',
          title: 'Sum',
          additional_file: [
            { name: 'sample.in', size: 1024 },
            { name: 'sample.out', size: 2048 },
          ],
        },
        UserContext: { _id: 1 },
      })}>
        <RouterProvider>
          <ToastProvider>
            <ProblemFilesPage />
          </ToastProvider>
        </RouterProvider>
      </PageDataProvider>,
    );
    expect(screen.getByText('sample.in')).toBeInTheDocument();
    expect(screen.getByText('sample.out')).toBeInTheDocument();
  });

  it('shows error when pdoc is missing', () => {
    render(
      <PageDataProvider initial={buildPageData({ UserContext: { _id: 1 } })}>
        <RouterProvider>
          <ToastProvider>
            <ProblemFilesPage />
          </ToastProvider>
        </RouterProvider>
      </PageDataProvider>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('disables upload for cross-domain references', () => {
    render(
      <PageDataProvider initial={buildPageData({
        pdoc: {
          docId: 1,
          pid: 'P1000',
          title: 'Ref',
          reference: { domainId: 'other', pid: 'P1' },
        },
        UserContext: { _id: 1 },
      })}>
        <RouterProvider>
          <ToastProvider>
            <ProblemFilesPage />
          </ToastProvider>
        </RouterProvider>
      </PageDataProvider>,
    );
    const uploadBtn = screen.getByRole('button', { name: /上传|Upload/i });
    expect(uploadBtn).toBeDisabled();
  });
});
