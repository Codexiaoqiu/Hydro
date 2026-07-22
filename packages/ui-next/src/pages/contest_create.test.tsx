/* @vitest-environment happy-dom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../components/primitives';
import { type PageData, PageDataProvider } from '../context/page-data';
import { RouterProvider } from '../context/router';
import { request } from '../hooks/use-api';
import ContestCreatePage from './contest_create';

vi.mock('../hooks/use-api', () => ({
  request: {
    post: vi.fn().mockResolvedValue({ tid: 'abc123' }),
    get: vi.fn().mockResolvedValue({ pdocs: [] }),
  },
  HydroClientError: class HydroClientError extends Error {
    code?: number;
    constructor(init: { code?: number, message?: string } | string) {
      super(typeof init === 'string' ? init : init.message);
      if (typeof init !== 'string') this.code = init.code;
    }
  },
}));

vi.mock('../components/link', () => ({
  Link: ({ children, to, params, ...rest }: any) => (
    <a {...rest} data-testid={`link-${to}`} href={`/${to}/${params?.tid ?? ''}`}>
      {children}
    </a>
  ),
  useBuildUrl: () => (_name: string, _params?: Record<string, string>) => '#',
}));

function buildPageData(args: PageData['args']): PageData {
  return { name: 'contest_create', template: '', url: '/contest/create', args };
}

function renderPage(args: PageData['args'] = { UserContext: { _id: 1 } }) {
  return render(
    <PageDataProvider initial={buildPageData(args)}>
      <RouterProvider>
        <ToastProvider>
          <ContestCreatePage />
        </ToastProvider>
      </RouterProvider>
    </PageDataProvider>,
  );
}

describe('contest_create page', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the create form with a title field', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /创建比赛|Create contest/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /标题|Title/i })).toBeInTheDocument();
  });

  it('submits with operation=update so the postUpdate handler dispatches', async () => {
    renderPage();
    fireEvent.change(screen.getByRole('textbox', { name: /标题|Title/i }), {
      target: { value: 'My Contest' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^创建$|^Create$/i }));

    await waitFor(() => expect(request.post).toHaveBeenCalledTimes(1));
    const [url, body] = vi.mocked(request.post).mock.calls[0];
    expect(url).toBe('/contest/create');
    const fd = body as URLSearchParams;
    expect(fd.get('operation')).toBe('update');
    expect(fd.get('title')).toBe('My Contest');
    expect(fd.get('rule')).toBe('acm');
  });

  it('does not submit when the title is empty', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /^创建$|^Create$/i }));
    await waitFor(() => {
      expect(screen.getByText(/标题|Title/i)).toBeInTheDocument();
    });
    expect(request.post).not.toHaveBeenCalled();
  });

  it('toggles rule-specific fields when the rule changes', () => {
    renderPage();
    // Default rule is acm -> Lock field visible, KeepScoreboardHidden hidden.
    expect(screen.getByText(/封榜 \(分钟\)|Lock \(minutes\)/i)).toBeInTheDocument();
    expect(screen.queryByText(/赛后继续保持封榜|Keep scoreboard hidden/i)).not.toBeInTheDocument();

    // The form now has two comboboxes (rule select + language picker); target
    // the rule <select> explicitly so the rule change actually fires.
    const ruleSelect = document.querySelector('select[name="rule"]') as HTMLSelectElement | null;
    expect(ruleSelect).not.toBeNull();
    fireEvent.change(ruleSelect!, { target: { value: 'oi' } });
    // oi -> KeepScoreboardHidden visible, Lock hidden.
    expect(screen.getByText(/赛后继续保持封榜|Keep scoreboard hidden/i)).toBeInTheDocument();
    expect(screen.queryByText(/封榜 \(分钟\)|Lock \(minutes\)/i)).not.toBeInTheDocument();
  });

  it('exposes a back link to the contest main page', () => {
    renderPage();
    const back = screen.getByTestId('link-contest_main');
    expect(back).toBeInTheDocument();
    expect(back.getAttribute('href')).toBe('/contest_main/');
  });
});
