/* @vitest-environment happy-dom */
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../components/primitives/Toast';
import ContestBalloonPage from './contest_balloon';
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

vi.mock('../lib/contest-status', () => ({
  isOngoing: () => true,
}));

vi.mock('../hooks/use-balloon-poll', () => ({
  useBalloonPoll: () => ({
    data: {
      rows: [{ _id: 'B1', problem: 1, status: 'pending', submitBy: 'alice' }],
      pdict: { 1: { docId: 1, title: 'A' } },
      udict: { alice: { _id: 1, uname: 'alice' } },
    },
    refresh: vi.fn(),
  }),
}));

vi.mock('../components/primitives/Toast', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../components/primitives/Toast')>();
  return {
    ...actual,
    useToast: () => ({ info: vi.fn(), success: vi.fn(), error: vi.fn() }),
  };
});

const mockPageData = usePageData as unknown as ReturnType<typeof vi.fn>;

describe('ContestBalloonPage', () => {
  beforeEach(() => {
    mockPageData.mockReturnValue({
      args: {
        tdoc: { docId: 7, title: 'Test', beginAt: '2020-01-01T00:00:00Z', endAt: '2099-12-31T23:59:59Z' },
      },
    });
  });

  it('renders table after polling', async () => {
    render(
      <ToastProvider>
        <ContestBalloonPage />
      </ToastProvider>,
    );
    await waitFor(() => expect(screen.getByText('A')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /set color|设置颜色/i })).toBeInTheDocument();
  });

  it('exposes a back link to the contest detail page', async () => {
    render(
      <ToastProvider>
        <ContestBalloonPage />
      </ToastProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('contest-back-link')).toBeInTheDocument());
    const back = screen.getByTestId('contest-back-link');
    expect(back.getAttribute('href')).toBe('/contest_detail/7');
  });
});
