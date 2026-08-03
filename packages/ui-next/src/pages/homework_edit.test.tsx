/* @vitest-environment happy-dom */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../components/primitives/Toast';
import { type PageData, PageDataProvider } from '../context/page-data';
import { ThemeProvider } from '../theme/ThemeProvider';
import HomeworkEdit from './homework_edit';

function jsonResponse(body: unknown = {}, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function buildPageData(args: PageData['args']): PageData {
  return {
    name: 'homework_edit',
    template: 'homework_edit.html',
    args: { UserContext: {}, UiContext: {}, ...args } as PageData['args'],
    url: '/homework/hw1/edit',
  };
}

function Providers({ args, children }: { args: PageData['args'], children: ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <PageDataProvider initial={buildPageData(args)}>{children}</PageDataProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

function renderPage(args: PageData['args']) {
  vi.stubGlobal('fetch', vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
    if (init?.method === 'POST') return jsonResponse();
    return jsonResponse(args);
  }));
  return render(
    <Providers args={args}>
      <HomeworkEdit />
    </Providers>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('homework_edit', () => {
  it('renders the empty create form with a disabled submit button', () => {
    renderPage({ page_name: 'homework_create' });
    expect(screen.getByRole('heading', { name: '创建作业' })).toBeInTheDocument();
    expect(screen.getByLabelText('标题')).toHaveValue('');
    expect(screen.getByTestId('submit')).toBeDisabled();
  });

  it('populates split dates, text fields, and comma-list values', () => {
    renderPage({
      page_name: 'homework_edit',
      tdoc: {
        docId: 'hw1',
        title: 'Algebra',
        content: 'Solve all',
        rated: true,
        maintainer: [2, 3],
        assign: ['A', 'B'],
        langs: ['cc', 'py'],
      },
      dateBeginText: '2026-08-04',
      timeBeginText: '08:30',
      datePenaltyText: '2026-08-10',
      timePenaltyText: '23:00',
      extensionDays: 2,
      penaltyRules: '[]',
      pids: '1,2,3',
    });

    expect(screen.getByLabelText('标题')).toHaveValue('Algebra');
    expect(screen.getByLabelText('开始日期')).toHaveValue('2026-08-04');
    expect(screen.getByLabelText('开始时间')).toHaveValue('08:30');
    expect(screen.getByLabelText('截止日期')).toHaveValue('2026-08-10');
    expect(screen.getByLabelText('截止时间')).toHaveValue('23:00');
    expect(screen.getByLabelText('延期天数')).toHaveValue(2);
    expect(screen.getByLabelText('题目 ID（逗号分隔）')).toHaveValue('1,2,3');
    expect(screen.getByLabelText('维护者')).toHaveValue('2,3');
    expect(screen.getByLabelText('计入评级')).toBeChecked();
  });

  it('posts the exact edit payload while preserving pids and penalty rules', async () => {
    renderPage({
      page_name: 'homework_edit',
      tdoc: { docId: 'hw1', title: 'Old' },
      dateBeginText: '2026-08-04',
      timeBeginText: '08:30',
      datePenaltyText: '2026-08-10',
      timePenaltyText: '23:00',
    });
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse());
    vi.stubGlobal('fetch', fetchMock);

    fireEvent.change(screen.getByLabelText('标题'), { target: { value: 'Updated' } });
    fireEvent.change(screen.getByLabelText('惩罚规则'), { target: { value: '[[0,0.5]]' } });
    fireEvent.change(screen.getByLabelText('题目 ID（逗号分隔）'), { target: { value: '1, 2,3' } });
    fireEvent.click(screen.getByTestId('submit'));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/homework/hw1/edit');
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('same-origin');
    expect(JSON.parse(String(init.body))).toMatchObject({
      tid: 'hw1',
      title: 'Updated',
      beginAtDate: '2026-08-04',
      beginAtTime: '08:30',
      penaltySinceDate: '2026-08-10',
      penaltySinceTime: '23:00',
      penaltyRules: '[[0,0.5]]',
      pids: '1, 2,3',
      extensionDays: 1,
      rated: false,
      maintainer: '',
      assign: '',
      langs: '',
    });
  });
});
