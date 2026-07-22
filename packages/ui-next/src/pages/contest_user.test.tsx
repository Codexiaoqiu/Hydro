import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../components/primitives/Toast';
import ContestUserPage from './contest_user';
import { usePageData } from '../context/page-data';

vi.mock('../context/page-data', () => ({
  usePageData: vi.fn(),
  PageDataProvider: ({ children }: any) => children,
  useUiContext: () => ({ domainId: 'system', domain: null }),
}));

vi.mock('../components/link', () => ({
  Link: ({ children, to, params, ...rest }: any) => (
    <a data-testid={`link-${to}`} href={`/${to}/${params?.tid ?? ''}`} {...rest}>
      {children}
    </a>
  ),
  useBuildUrl: () => (_name: string, _params?: Record<string, string>) => '#',
}));

vi.mock('../components/primitives/Toast', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../components/primitives/Toast')>();
  return {
    ...actual,
    useToast: () => ({ info: vi.fn(), success: vi.fn(), error: vi.fn() }),
  };
});

const mockPageData = usePageData as unknown as ReturnType<typeof vi.fn>;

describe('ContestUserPage', () => {
  it('renders Add button and empty state', () => {
    mockPageData.mockReturnValue({
      args: { tdoc: { docId: 7, beginAt: '2026-01-01', endAt: '2026-12-31' }, tsdocs: [], udict: {} },
    });
    render(
      <ToastProvider>
        <ContestUserPage />
      </ToastProvider>,
    );
    expect(screen.getByRole('button', { name: /add|添加/i })).toBeInTheDocument();
    expect(screen.getByText(/no attendees/i)).toBeInTheDocument();
  });

  it('exposes a back link to the contest detail page', () => {
    mockPageData.mockReturnValue({
      args: { tdoc: { docId: 7, beginAt: '2026-01-01', endAt: '2026-12-31' }, tsdocs: [], udict: {} },
    });
    render(
      <ToastProvider>
        <ContestUserPage />
      </ToastProvider>,
    );
    const back = screen.getByTestId('contest-back-link');
    expect(back).toBeInTheDocument();
    expect(back.getAttribute('href')).toBe('/contest_detail/7');
  });
});
