import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../components/primitives/Toast';
import ContestUserPage from './contest_user';
import { usePageData } from '../context/page-data';

// Locked reload: the page must NEVER call window.location.reload().
const reloadSpy = vi.fn();
Object.defineProperty(window, 'location', {
  value: { ...window.location, reload: reloadSpy, pathname: '/d/system/contest_user/7' },
  writable: true,
  configurable: true,
});

// Mock useJsonPoll so the page-level fetch is observable and tests stay
// offline.
const refreshMock = vi.fn();
const dataRef: { value: any } = { value: null };
vi.mock('../hooks/use-json-poll', () => ({
  useJsonPoll: () => ({ data: dataRef.value, pending: false, error: null, refresh: refreshMock }),
}));

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
  return { ...actual, useToast: () => ({ info: vi.fn(), success: vi.fn(), error: vi.fn() }) };
});

const mockPageData = usePageData as unknown as ReturnType<typeof vi.fn>;

// Locale-aware matchers (test setup pins zh_CN).
const RX_ADD = /^add$|^添加$/;
const RX_DELETE_LABEL = /^ContestUser\.Delete$/;

function setup(args: any) {
  mockPageData.mockReturnValue({ args });
  return render(
    <ToastProvider>
      <ContestUserPage />
    </ToastProvider>,
  );
}

const baseArgs = (over: any = {}) => ({
  tdoc: {
    docId: 7,
    beginAt: '2026-01-01T00:00:00Z',
    endAt: '2026-12-31T00:00:00Z',
    duration: 0,
  },
  tsdocs: [],
  udict: {},
  UserContext: { domainId: 'system' },
  ...over,
});

describe('ContestUserPage', () => {
  it('shows loading state when tdoc is missing', () => {
    setup({ ...baseArgs(), tdoc: undefined });
    expect(screen.getByText(/loading|加载/i)).toBeInTheDocument();
  });

  it('renders Add button and empty table on initial load', () => {
    setup(baseArgs());
    expect(screen.getByRole('button', { name: RX_ADD })).toBeInTheDocument();
    expect(screen.getByText(/no attendees|暂无参赛者/i)).toBeInTheDocument();
  });

  it('exposes the contest back link', () => {
    setup(baseArgs());
    expect(screen.getByTestId('contest-back-link')).toBeInTheDocument();
    expect(screen.getByTestId('contest-back-link').getAttribute('href'))
      .toBe('/contest_detail/7');
  });

  it('opens and closes the Add dialog', () => {
    setup(baseArgs());
    fireEvent.click(screen.getByRole('button', { name: RX_ADD }));
    expect(screen.getByText(/add attendees|添加参赛者/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /cancel|取消/ }));
  });

  it('forwards UserContext.domainId into the AddDialog (passed to autocomplete)', async () => {
    setup(baseArgs({ UserContext: { domainId: 'contestX' } }));
    fireEvent.click(screen.getByRole('button', { name: RX_ADD }));
    expect(screen.getByText(/add attendees|添加参赛者/i)).toBeInTheDocument();
  });

  it('mutation success triggers refresh() and NOT window.location.reload', async () => {
    // Pre-seed fetch mock so the row's optimistic POST actually succeeds.
    (global as any).fetch = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      headers: { get: (k: string) => (k.toLowerCase() === 'content-type' ? 'application/json' : null) },
      json: async () => ({}),
    });
    refreshMock.mockClear();
    setup(baseArgs({
      tsdocs: [{ uid: 1, unrank: false }],
      udict: { 1: { _id: 1, uname: 'alice' } },
    }));
    await waitFor(() => expect(screen.getByText('alice')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: RX_DELETE_LABEL }));
    await waitFor(() => expect(refreshMock).toHaveBeenCalled(), { timeout: 1500 });
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it('mutation failure rolls back the optimistic row (no refresh, no reload)', async () => {
    let rejectRequest: (error: Error) => void = () => {};
    (global as any).fetch = vi.fn().mockImplementationOnce(() => new Promise((_, reject) => {
      rejectRequest = reject;
    }));
    refreshMock.mockClear();
    setup(baseArgs({
      tsdocs: [{ uid: 2, unrank: false }],
      udict: { 2: { _id: 2, uname: 'bob' } },
    }));
    await waitFor(() => expect(screen.getByText('bob')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: RX_DELETE_LABEL }));
    expect(screen.queryByText('bob')).not.toBeInTheDocument();

    rejectRequest(new Error('Boom'));
    await waitFor(() => expect(screen.getByText('bob')).toBeInTheDocument());
    expect(refreshMock).not.toHaveBeenCalled();
    expect(reloadSpy).not.toHaveBeenCalled();
  });
});
