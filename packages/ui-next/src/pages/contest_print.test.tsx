/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { usePageData } from '../context/page-data';
import ContestPrintPage from './contest_print';

const requestPost = vi.fn().mockResolvedValue({ tasks: [], udict: {} });

vi.mock('../hooks/use-api', () => ({
  request: {
    post: (...args: unknown[]) => requestPost(...args),
    postFile: vi.fn().mockResolvedValue({}),
  },
  HydroClientError: class extends Error {},
  useApi: () => ({ run: vi.fn(), loading: false, error: null, data: null, setError: vi.fn() }),
}));

vi.mock('../components/primitives/Toast', () => ({
  ToastProvider: ({ children }: any) => children,
  useToast: () => ({ info: vi.fn(), success: vi.fn(), error: vi.fn() }),
}));

vi.mock('../context/page-data', () => ({
  usePageData: vi.fn(),
  PageDataProvider: ({ children }: any) => children,
  useUiContext: () => ({ domainId: 'system', domain: null }),
}));

vi.mock('../components/link', () => ({
  Link: ({ children, to, params, ...rest }: any) => (
    <a data-testid={`link-${to}`} href={`/${to}/${params?.tid ?? ''}`} {...rest}>{children}</a>
  ),
  useBuildUrl: () => (_name: string, _params?: Record<string, string>) => '#',
}));

describe('ContestPrintPage', () => {
  it('renders the ContestBackLink targeting contest_detail with the resolved tid', () => {
    vi.mocked(usePageData).mockReturnValue({
      args: { tdoc: { docId: '60a000000000000000000007', title: 'Printable Contest', allowPrint: true }, isAdmin: false },
    });
    render(<ContestPrintPage />);
    const back = screen.getByTestId('contest-back-link');
    expect(back).toBeInTheDocument();
    expect(back.getAttribute('href')).toBe('/contest_detail/60a000000000000000000007');
  });

  it('renders the Print New File trigger and empty state from PageData args', async () => {
    vi.mocked(usePageData).mockReturnValue({
      args: { tdoc: { docId: '60a000000000000000000008', title: 'Empty Contest', allowPrint: true }, isAdmin: false },
    });
    render(<ContestPrintPage />);
    expect(await screen.findByRole('button', { name: '打印新文件' })).toBeInTheDocument();
    expect(await screen.findByText('暂无打印任务。')).toBeInTheDocument();
  });

  it('shows admin controls (Enable Print Kiosk) when isAdmin=true', () => {
    vi.mocked(usePageData).mockReturnValue({
      args: { tdoc: { docId: '60a000000000000000000009', title: 'Admin Contest', allowPrint: true }, isAdmin: true },
    });
    render(<ContestPrintPage />);
    expect(screen.getByRole('button', { name: '启用打印服务' })).toBeInTheDocument();
  });

  it('does not show admin controls when isAdmin=false', () => {
    vi.mocked(usePageData).mockReturnValue({
      args: { tdoc: { docId: '60a00000000000000000000a', title: 'Plain Contest', allowPrint: true }, isAdmin: false },
    });
    render(<ContestPrintPage />);
    expect(screen.queryByRole('button', { name: '启用打印服务' })).not.toBeInTheDocument();
  });

  it('renders the loading text when tdoc is missing', () => {
    vi.mocked(usePageData).mockReturnValue({ args: {} });
    render(<ContestPrintPage />);
    // Common.Loading -> "加载中…"
    expect(screen.getByText(/加载中|Loading/i)).toBeInTheDocument();
  });
});
