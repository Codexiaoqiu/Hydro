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
  // Avoid actually reloading the page after save in tests.
  Object.defineProperty(window, 'location', {
    value: { ...window.location, reload: vi.fn() },
    writable: true,
  });
});

describe('ProblemConfigPage', () => {
  it('renders the three tabs', () => {
    renderWith({ pdoc: { docId: 1 }, testdata: ['1.in', '1.out'], config: 'type: default\n' });
    expect(screen.getByRole('tab', { name: /编辑器|editor/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /基础|basic/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /子任务|subtasks/i })).toBeInTheDocument();
  });

  it('saves config as FormData when Save clicked', async () => {
    renderWith({ pdoc: { docId: 1 }, testdata: ['1.in', '1.out'], config: 'type: default\n' });
    fireEvent.click(screen.getByRole('button', { name: /保存|save/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/p/1/files'),
      expect.objectContaining({ method: 'POST', body: expect.any(FormData) }),
    ));
  });

  it('migrates legacy cases+score to a single subtask on load', () => {
    const legacy = 'type: default\ncases:\n  - input: 1.in\n    output: 1.out\n  - input: 2.in\n    output: 2.out\nscore: 50\n';
    renderWith({ pdoc: { docId: 1 }, testdata: ['1.in', '1.out'], config: legacy });
    // Switch to the subtasks tab and confirm the subtask is rendered.
    fireEvent.click(screen.getByRole('tab', { name: /子任务|subtasks/i }));
    expect(screen.getByText(/Subtask 1|子任务 1/)).toBeInTheDocument();
  });

  // ---- I-3 parity (Save with confirm on invalid schema) ----
  it('Save button is enabled even when validation fails (I-3)', () => {
    renderWith({ pdoc: { docId: 1 }, testdata: ['1.in', '1.out'], config: 'type: default\nmulti_pass: 25\n' });
    const saveBtn = screen.getByRole('button', { name: /保存|save/i });
    expect(saveBtn).not.toBeDisabled();
  });

  it('Save with invalid schema opens a confirm dialog (I-3)', () => {
    renderWith({ pdoc: { docId: 1 }, testdata: ['1.in', '1.out'], config: 'type: default\nmulti_pass: 25\n' });
    fireEvent.click(screen.getByRole('button', { name: /保存|save/i }));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('Confirming the dialog proceeds to upload (I-3)', async () => {
    renderWith({ pdoc: { docId: 1 }, testdata: ['1.in', '1.out'], config: 'type: default\nmulti_pass: 25\n' });
    fireEvent.click(screen.getByRole('button', { name: /保存|save/i }));
    fireEvent.click(screen.getByRole('button', { name: /save anyway/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/p/1/files'),
      expect.objectContaining({ method: 'POST', body: expect.any(FormData) }),
    ));
  });
});
