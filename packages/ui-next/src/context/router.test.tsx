/* @vitest-environment happy-dom */

import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type PageData, PageDataProvider } from '../context/page-data';
import { store } from '../registry/store';
import { RouterProvider, useNavigate } from './router';

// Skip RouterProvider's first-paint useEffect so the test drives exactly one
// fetch (the navigate() call) and the mocked response isn't consumed by the
// initial mount.
vi.mock('../globals', () => ({
  isInjected: true,
  endpoints: ['http://localhost:3000'],
  endpointOrigins: new Set(['http://localhost:3000']),
  routeMapStore: {
    set: vi.fn(),
    getSnapshot: () => ({}),
    subscribe: () => () => {},
    _routeMap: {},
    _listeners: new Set(),
  },
  hydroDomains: [],
  pluginsUrl: undefined,
  initialPage: { name: '', template: '', args: {} as PageData['args'], url: '/' },
}));

describe('navigate() SPA fallback', () => {
  const originalFetch = global.fetch;
  let hrefSetter: ReturnType<typeof vi.fn>;

  function buildPageData(): PageData {
    return {
      name: '',
      template: '',
      args: { UserContext: {}, UiContext: {} },
      url: '/',
    };
  }

  function withProviders() {
    return ({ children }: { children: ReactNode }) => (
      <PageDataProvider initial={buildPageData()}>
        <RouterProvider>{children}</RouterProvider>
      </PageDataProvider>
    );
  }

  beforeEach(() => {
    hrefSetter = vi.fn();
    // Override the location.href setter so we can observe the fallback
    // assignment without actually navigating. Keep the getter returning a
    // valid same-origin URL so history.pushState() doesn't throw a
    // SecurityError in happy-dom (the state URL must match the document URL).
    const initialHref = 'http://localhost:3000/';
    Object.defineProperty(window.location, 'href', {
      configurable: true,
      get: () => initialHref,
      set: hrefSetter,
    });
    // Stub history.pushState to avoid happy-dom's same-origin check; we only
    // care that navigate() returns the right boolean.
    if (!vi.isMockFunction(window.history.pushState)) {
      window.history.pushState = vi.fn();
    } else {
      (window.history.pushState as ReturnType<typeof vi.fn>).mockClear();
    }
    global.fetch = vi.fn();
  });

  afterEach(() => {
    // Restore the default writable href so happy-dom can keep using it.
    Object.defineProperty(window.location, 'href', {
      configurable: true,
      writable: true,
      value: 'http://localhost:3000/',
    });
    global.fetch = originalFetch;
  });

  it('falls back to full page load when target page is not registered', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      redirected: false,
      status: 200,
      statusText: 'OK',
      headers: {
        get(name: string) {
          return name.toLowerCase() === 'x-hydro-page' ? 'ranking' : null;
        },
      },
      json: async () => ({}),
    });
    expect(store.getDefault('page:ranking')).toBeUndefined();

    const { result } = renderHook(() => useNavigate(), { wrapper: withProviders() });
    let ok: boolean | undefined;
    await act(async () => { ok = await result.current('/ranking'); });

    expect(ok).toBe(false);
    expect(hrefSetter).toHaveBeenCalledWith('/ranking');
  });

  it('does NOT fall back when target page is registered', async () => {
    store.setDefault('page:__test', { Page: () => null, layout: 'default' } as never);
    try {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        redirected: false,
        status: 200,
        statusText: 'OK',
        headers: { get: () => '__test' },
        json: async () => ({}),
      });
      const { result } = renderHook(() => useNavigate(), { wrapper: withProviders() });
      let ok: boolean | undefined;
      await act(async () => { ok = await result.current('/__test'); });
      expect(ok).toBe(true);
      expect(hrefSetter).not.toHaveBeenCalled();
    } finally {
      // store has no public delete(); reset to undefined so getDefault()
      // returns undefined again for subsequent tests.
      store.setDefault('page:__test', undefined as never);
    }
  });
});
