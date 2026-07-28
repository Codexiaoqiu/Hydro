/* eslint-disable react-refresh/only-export-components */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { endpointOrigins, endpoints, isInjected, routeMapStore } from '../globals';
import { store } from '../registry/store';
import { useSetPageData } from './page-data';

interface InternalState {
  status: 'idle' | 'loading' | 'error';
  error: Error | null;
}

type RouterAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS' }
  | { type: 'FETCH_ERROR', error: Error }
  | { type: 'FETCH_ABORT' };

function routerReducer(state: InternalState, action: RouterAction): InternalState {
  switch (action.type) {
    case 'FETCH_START': return { status: 'loading', error: null };
    case 'FETCH_SUCCESS': return { status: 'idle', error: null };
    case 'FETCH_ERROR': return { status: 'error', error: action.error };
    case 'FETCH_ABORT': return state;
    default: return state;
  }
}

export interface RouterState {
  loading: boolean;
  error: Error | null;
}

interface FetchPageResult {
  ok: boolean;
  pageName: string;
}

interface RouterNavigateContextValue {
  navigate: (url: string) => Promise<boolean>;
}

const RouterStateContext = createContext<RouterState | null>(null);
const RouterNavigateContext = createContext<RouterNavigateContextValue | null>(null);

export const RouterProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [state, dispatch] = useReducer(routerReducer, { status: 'idle', error: null });
  const abortRef = useRef<AbortController | null>(null);
  const genRef = useRef(0);
  const setData = useSetPageData();

  const isSameOrigin = useCallback((url: string) => {
    try {
      return endpointOrigins.has(new URL(url, endpoints[0]).origin);
    } catch {
      return false;
    }
  }, []);

  const fetchPage = useCallback(
    async (url: string, init = false): Promise<FetchPageResult> => {
      abortRef.current?.abort();
      const gen = ++genRef.current;
      const controller = new AbortController();
      abortRef.current = controller;

      dispatch({ type: 'FETCH_START' });

      let lastError: Error | null = null;
      for (const ep of endpoints) {
        try {
          const signal = endpoints.length > 1
            ? AbortSignal.any([controller.signal, AbortSignal.timeout(10000)])
            : controller.signal;
          const reqUrl = new URL(url, ep).href;
          const res = await fetch(reqUrl, {
            signal,
            headers: {
              Accept: 'application/json',
              'x-hydro-inject': [
                'uicontext', 'usercontext', 'pagename',
                ...(init ? ['routemap'] : []),
              ].join(','),
            },
          });
          if (res.redirected) {
            window.location.href = res.url;
            return { ok: false, pageName: '' };
          }
          if (!res.ok) throw new Error(`Navigation failed: ${res.status} ${res.statusText}`);
          const body = await res.json();
          const pageName = res.headers.get('x-hydro-page') || '';
          const template = res.headers.get('x-hydro-template') || '';
          console.log('[Hydro] data from', reqUrl, 'received:', body, 'pageName:', pageName);

          if (gen !== genRef.current) return { ok: false, pageName: '' };

          if (init && body.routeMap && typeof body.routeMap === 'object') {
            routeMapStore.set(body.routeMap);
          }
          setData((prev) => ({
            ...prev,
            args: body,
            name: pageName,
            template,
            url,
          }));
          dispatch({ type: 'FETCH_SUCCESS' });
          return { ok: true, pageName };
        } catch (e) {
          if (e instanceof DOMException && e.name === 'AbortError') {
            dispatch({ type: 'FETCH_ABORT' });
            console.log('[Hydro] navigation to', url, 'aborted');
            return { ok: false, pageName: '' };
          }
          lastError = e instanceof Error ? e : new Error(String(e));
          console.warn('[Hydro] endpoint', ep, 'failed:', lastError.message);
          if (controller.signal.aborted) {
            // User-initiated abort propagated through AbortSignal.any
            dispatch({ type: 'FETCH_ABORT' });
            return { ok: false, pageName: '' };
          }
        }
      }

      console.error('[Hydro] all endpoints failed:', lastError);
      if (gen !== genRef.current) return { ok: false, pageName: '' };
      dispatch({ type: 'FETCH_ERROR', error: lastError! });
      window.location.href = url;
      return { ok: false, pageName: '' };
    },
    [setData],
  );

  useEffect(() => {
    const handler = (e: PopStateEvent) => {
      const url: string =
        (e.state as { url?: string } | null)?.url
        ?? window.location.pathname + window.location.search;
      fetchPage(url);
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, [fetchPage]);

  // If no server-side injection, fetch initial page data from the API
  useEffect(() => {
    if (!isInjected) {
      console.log('[Hydro] no initial data injection found, fetching page data for current URL');
      fetchPage(window.location.pathname + window.location.search, true);
    }
  }, [fetchPage]);

  const stateValue = useMemo(
    () => ({ loading: state.status === 'loading', error: state.error }),
    [state.status, state.error],
  );

  const navigate = useCallback(async (url: string): Promise<boolean> => {
    if (!isSameOrigin(url)) {
      window.location.href = url;
      return false;
    }
    const result = await fetchPage(url);
    if (!result.ok) return false;
    if (result.pageName && !store.getDefault(`page:${result.pageName}` as `page:${string}`)) {
      window.location.href = url;
      return false;
    }
    history.pushState({ url }, '', url);
    return true;
  }, [fetchPage, isSameOrigin]);

  const navigateValue = useMemo<RouterNavigateContextValue>(() => ({ navigate }), [navigate]);

  return (
    <RouterNavigateContext.Provider value={navigateValue}>
      <RouterStateContext.Provider value={stateValue}>
        {children}
      </RouterStateContext.Provider>
    </RouterNavigateContext.Provider>
  );
};

export function useRouterState(): RouterState {
  const ctx = useContext(RouterStateContext);
  if (!ctx) throw new Error('useRouterState must be used within RouterProvider');
  return ctx;
}

export function useNavigate(): (url: string) => Promise<boolean> {
  const ctx = useContext(RouterNavigateContext);
  if (!ctx) throw new Error('useNavigate must be used within RouterProvider');
  return ctx.navigate;
}
