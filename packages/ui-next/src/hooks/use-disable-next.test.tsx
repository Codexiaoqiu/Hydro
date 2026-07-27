/* @vitest-environment happy-dom */
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type PageData, PageDataProvider } from '../context/page-data';
import { useDisableNext } from './use-disable-next';

const STORAGE_KEY = 'hydro.disableNext';
const QUERY_KEY = '__disableNext';

function makePageData(uiNext?: boolean): PageData {
  const args: Record<string, unknown> = {
    UserContext: { viewLang: 'zh_CN' },
    UiContext: uiNext === undefined ? {} : { uiNext },
  };
  return {
    name: 'homepage',
    template: 'home.html',
    url: '/',
    args: args as PageData['args'],
  };
}

function withPageData(uiNext?: boolean) {
  return ({ children }: { children: ReactNode }) => (
    <PageDataProvider initial={makePageData(uiNext)}>{children}</PageDataProvider>
  );
}

/**
 * happy-dom only updates location.search/.href on a full navigation, not
 * `history.replaceState`. Set the search directly so the hook's URL parser
 * sees the kill-switch query.
 */
function setLocationSearch(search: string) {
  // Some happy-dom versions require we set both href and search to keep the
  // internal URL value consistent. Construct a full URL to avoid "Invalid URL".
  const url = new URL(window.location.href);
  url.search = search;
  window.location.href = url.toString();
}

describe('useDisableNext', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    setLocationSearch('');
    // Spy on reload without replacing the entire location object (which would
    // also wipe out happy-dom's URL href getter).
    Object.defineProperty(window.location, 'reload', {
      configurable: true, writable: true, value: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reports reason="none" when nothing is disabling the renderer', () => {
    const { result } = renderHook(() => useDisableNext(), { wrapper: withPageData(true) });
    expect(result.current.disabled).toBe(false);
    expect(result.current.reason).toBe('none');
  });

  it('reports reason="query" when ?__disableNext=1 is in the URL', () => {
    setLocationSearch(`?${QUERY_KEY}=1`);
    const { result } = renderHook(() => useDisableNext(), { wrapper: withPageData(true) });
    expect(result.current.disabled).toBe(true);
    expect(result.current.reason).toBe('query');
  });

  it('reports reason="global" when UiContext.uiNext is explicitly false', () => {
    const { result } = renderHook(() => useDisableNext(), { wrapper: withPageData(false) });
    expect(result.current.disabled).toBe(true);
    expect(result.current.reason).toBe('global');
  });

  it('reports reason="query" when sessionStorage was set on a prior visit', () => {
    window.sessionStorage.setItem(STORAGE_KEY, '1');
    const { result } = renderHook(() => useDisableNext(), { wrapper: withPageData(true) });
    expect(result.current.reason).toBe('query');
  });

  it('enable() is a no-op when reason="none" (no reload, no warn)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const beforeHref = window.location.href;
    const { result } = renderHook(() => useDisableNext(), { wrapper: withPageData(true) });
    act(() => { result.current.enable(); });
    expect(warn).not.toHaveBeenCalled();
    expect(window.location.reload).not.toHaveBeenCalled();
    expect(window.location.href).toBe(beforeHref);
    warn.mockRestore();
  });

  it('enable() does NOT reload when reason="global" (admin setting wins)', () => {
    // Documenting q.md R7 fix: clearing client-side state under a server
    // kill-switch would just bounce back into the disabled state, producing
    // a "reload but nothing changed" loop. We expect a warning and no reload.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = renderHook(() => useDisableNext(), { wrapper: withPageData(false) });
    act(() => { result.current.enable(); });
    expect(warn).toHaveBeenCalledOnce();
    expect(window.location.reload).not.toHaveBeenCalled();
    // State remains disabled: hook should still report global after the call.
    expect(result.current.reason).toBe('global');
    warn.mockRestore();
  });

  it('enable() reloads to a clean URL and clears sessionStorage when reason="query"', () => {
    // Pretend the user previously enabled the kill-switch.
    window.sessionStorage.setItem(STORAGE_KEY, '1');
    setLocationSearch(`?${QUERY_KEY}=1&keep=1`);

    const { result } = renderHook(() => useDisableNext(), { wrapper: withPageData(true) });
    expect(result.current.reason).toBe('query');

    act(() => { result.current.enable(); });

    // sessionStorage cleared, the kill-switch query removed, but other params
    // preserved — proves enable() does a surgical URL edit, not a full reload.
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(window.location.search).not.toContain(`${QUERY_KEY}=1`);
    expect(window.location.search).toContain('keep=1');
  });
});
