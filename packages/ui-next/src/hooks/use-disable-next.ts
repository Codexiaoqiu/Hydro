/**
 * `useDisableNext` — single-page and global kill-switches for the ui-next
 * renderer. Mirrors the `?legacy=1` query in ui-default but uses
 * `?__disableNext=1` so it doesn't collide with hydrooj's `legacy` flag.
 *
 *   1. Single-page opt-out: any URL with `?__disableNext=1` immediately reloads
 *      into ui-default. The query is sticky for the session so reloads stay
 *      off ui-next until the user removes it.
 *   2. Global opt-out: `/admin/ui?next=on|off` writes to `SettingModel` on
 *      the backend; we read `UiContext.uiNext` (boolean) and force-disable.
 */
import { useEffect, useMemo, useState } from 'react';
import { useUiContext } from '../context/page-data';

const STORAGE_KEY = 'hydro.disableNext';
const QUERY_KEY = '__disableNext';

function readPersistedFlag(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get(QUERY_KEY) === '1') {
      try { window.sessionStorage.setItem(STORAGE_KEY, '1'); } catch { /* ignore */ }
      return true;
    }
    return window.sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export interface DisableNextState {
  disabled: boolean;
  reason: 'query' | 'global' | 'none';
  enable: () => void;
  disable: (via?: 'query' | 'global') => void;
}

export function useDisableNext(): DisableNextState {
  const ui = useUiContext();
  const [queryFlag, setQueryFlag] = useState<boolean>(() => readPersistedFlag());
  const [globalFlag, setGlobalFlag] = useState<boolean>(() =>
    !!(ui as unknown as { uiNext?: boolean })?.uiNext === false,
  );

  useEffect(() => {
    setGlobalFlag(!!(ui as unknown as { uiNext?: boolean })?.uiNext === false);
  }, [ui]);

  const state = useMemo<DisableNextState>(() => {
    const reason: DisableNextState['reason'] = queryFlag ? 'query' : globalFlag ? 'global' : 'none';
    return {
      disabled: reason !== 'none',
      reason,
      enable: () => {
        try { window.sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
        setQueryFlag(false);
        setGlobalFlag(false);
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.delete(QUERY_KEY);
          window.location.href = url.toString();
        }
      },
      disable: (via = 'query') => {
        if (via === 'query') {
          try { window.sessionStorage.setItem(STORAGE_KEY, '1'); } catch { /* ignore */ }
          setQueryFlag(true);
        } else {
          setGlobalFlag(true);
        }
        if (typeof window !== 'undefined') window.location.reload();
      },
    };
  }, [queryFlag, globalFlag]);

  return state;
}
