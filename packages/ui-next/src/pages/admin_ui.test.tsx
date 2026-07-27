/* @vitest-environment happy-dom */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type PageData, PageDataProvider } from '../context/page-data';
import { PRIV } from '../lib/perm-constants';
import AdminUiPage from './admin_ui';

function makePageData(args: Partial<{ UserContext: Record<string, unknown>; uiNext: boolean }> = {}): PageData {
  return {
    name: 'admin_ui',
    template: 'admin_ui.html',
    url: '/admin/ui',
    args: {
      UserContext: args.UserContext ?? { viewLang: 'zh_CN' },
      UiContext: {},
      uiNext: args.uiNext ?? false,
      ...args,
    } as unknown as PageData['args'],
  };
}

function Providers({ args, children }: { args: Partial<{ UserContext: Record<string, unknown>; uiNext: boolean }>, children: ReactNode }) {
  return (
    <PageDataProvider initial={makePageData(args)}>
      {children}
    </PageDataProvider>
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('admin_ui', () => {
  it('shows the switch as unchecked when uiNext is initially false', () => {
    render(<Providers args={{ uiNext: false, UserContext: { priv: PRIV.PRIV_EDIT_SYSTEM } }}><AdminUiPage /></Providers>);
    // The Switch primitive renders an `<input type="checkbox" role="switch">`.
    const toggle = screen.getByRole('switch') as HTMLInputElement;
    expect(toggle.checked).toBe(false);
  });

  it('shows the switch as checked when uiNext is initially true', () => {
    render(<Providers args={{ uiNext: true, UserContext: { priv: PRIV.PRIV_EDIT_SYSTEM } }}><AdminUiPage /></Providers>);
    const toggle = screen.getByRole('switch') as HTMLInputElement;
    expect(toggle.checked).toBe(true);
  });

  it('disables controls and shows read-only banner without PRIV_EDIT_SYSTEM', () => {
    render(<Providers args={{ uiNext: false, UserContext: { priv: 0 } }}><AdminUiPage /></Providers>);
    // The read-only banner uses a localized "Read-only"/"只读"/"权限" prefix.
    expect(screen.getAllByText(/Read-only|只读|权限|permission/i).length).toBeGreaterThan(0);
    const toggle = screen.getByRole('switch') as HTMLInputElement;
    expect(toggle.disabled).toBe(true);
    const submit = screen.getByRole('button', { name: /Save|保存/ }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
  });

  it('POSTs `next=on` to /admin/ui when toggled on, then shows success alert', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204, headers: { get: () => '' }, text: async () => '' });
    vi.stubGlobal('fetch', fetchMock);
    render(<Providers args={{ uiNext: false, UserContext: { priv: PRIV.PRIV_EDIT_SYSTEM } }}><AdminUiPage /></Providers>);

    fireEvent.click(screen.getByRole('switch'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Save|保存/ }));
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/admin/ui');
    expect((init as RequestInit).method).toBe('POST');
    expect(String((init as RequestInit).body)).toContain('next=on');
    expect(screen.getAllByText(/Saved|已保存|Saved/).length).toBeGreaterThan(0);
    vi.unstubAllGlobals();
  });

  it('surfaces a HydroClientError when the server rejects the save', async () => {
    // use-api.ts:parseError calls `res.clone().json()` — the mock needs both
    // a `clone()` that returns a Response-like and a `json()` that returns the
    // payload, otherwise parseError swallows the json parse error and falls
    // back to "403 Request failed".
    const errorJson = { error: { message: 'Forbidden' }, UserFacingError: true };
    const fetchMock = vi.fn().mockImplementation(async () => ({
      ok: false, status: 403,
      headers: { get: () => 'application/json' },
      clone() { return this; },
      json: async () => errorJson,
      text: async () => JSON.stringify(errorJson),
    }));
    vi.stubGlobal('fetch', fetchMock);
    render(<Providers args={{ uiNext: false, UserContext: { priv: PRIV.PRIV_EDIT_SYSTEM } }}><AdminUiPage /></Providers>);

    fireEvent.click(screen.getByRole('switch'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Save|保存/ }));
    });

    await waitFor(() => expect(screen.getByText(/Forbidden/)).toBeInTheDocument());
    vi.unstubAllGlobals();
  });

  it('renders without crashing even when args is completely empty', () => {
    render(<Providers args={{ UserContext: undefined }}><AdminUiPage /></Providers>);
    const toggle = screen.getByRole('switch') as HTMLInputElement;
    expect(toggle).toBeInTheDocument();
    expect(toggle.checked).toBe(false);
  });
});
