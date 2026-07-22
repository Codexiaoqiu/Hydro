/* @vitest-environment happy-dom */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../components/primitives';
import { type PageData, PageDataProvider } from '../context/page-data';
import { RouterProvider } from '../context/router';
import ProblemConfigPage from './problem_config';

function buildPageData(args: PageData['args']): PageData {
  return { name: 'problem_config', template: '', url: '/p/config', args };
}

function renderWith(args: PageData['args']) {
  return render(
    <PageDataProvider initial={buildPageData(args)}>
      <RouterProvider>
        <ToastProvider>
          <ProblemConfigPage />
        </ToastProvider>
      </RouterProvider>
    </PageDataProvider>,
  );
}

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  (global as any).fetch = fetchMock;
  fetchMock.mockResolvedValue({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({}) });
});

describe('ProblemConfigPage', () => {
  it('renders the three tabs', () => {
    renderWith({ pdoc: { docId: 1 }, testdata: ['1.in', '1.out'], config: 'type: default\n' });
    // Tabs render in the current locale (zh_CN in happy-dom)
    expect(screen.getByRole('tab', { name: /编辑器|editor/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /基础|basic/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /子任务|subtasks/i })).toBeInTheDocument();
  });
  it('saves config as FormData when Save clicked', async () => {
    renderWith({ pdoc: { docId: 1 }, testdata: ['1.in', '1.out'], config: 'type: default\n' });
    // Button text in zh_CN is 保存; in en it is Save
    fireEvent.click(screen.getByRole('button', { name: /保存|save/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/p/1/files'),
      expect.objectContaining({ method: 'POST', body: expect.any(FormData) }),
    ));
  });
});
