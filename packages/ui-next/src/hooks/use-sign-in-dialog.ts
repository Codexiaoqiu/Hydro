/**
 * `useSignInDialog()` — global singleton controlling the `<SignInDialog>`
 * modal. Mounted once at the app root via `SignInDialogProvider`; every
 * consumer calls `useSignInDialog()` and gets `{ open, show, hide }`.
 *
 * The legacy `window.showSignInDialog()` is preserved via `showSignInDialog()`
 * (in `components/auth/SignInDialog.tsx`) for backwards compatibility with
 * any inline `onclick="..."` handlers or third-party plugins.
 */
import { createContext, createElement, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export interface SignInDialogApi {
  open: boolean;
  show: () => void;
  hide: () => void;
  toggle: () => void;
}

interface ProviderApi extends SignInDialogApi {
  setOpen: (next: boolean) => void;
}

const SignInDialogContextObj = createContext<ProviderApi | null>(null);

/** Imperative singleton store — used by the legacy `showSignInDialog()` shim. */
const externalListeners = new Set<(open: boolean) => void>();
let externalState = false;
export const SignInDialogContext = {
  show() {
    externalState = true;
    externalListeners.forEach((l) => l(true));
  },
  hide() {
    externalState = false;
    externalListeners.forEach((l) => l(false));
  },
};

export function SignInDialogProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(externalState);

  useEffect(() => {
    externalListeners.add(setOpen);
    return () => {
      externalListeners.delete(setOpen);
    };
  }, []);

  const show = useCallback(() => {
    externalState = true;
    externalListeners.forEach((l) => l(true));
  }, []);
  const hide = useCallback(() => {
    externalState = false;
    externalListeners.forEach((l) => l(false));
  }, []);
  const toggle = useCallback(() => {
    const next = !externalState;
    externalState = next;
    externalListeners.forEach((l) => l(next));
  }, []);

  const value = useMemo<ProviderApi>(() => ({ open, show, hide, toggle, setOpen }), [open, show, hide, toggle]);
  // Use createElement to sidestep the oxc/Vite parser's strict JSX handling of
  // `<Foo.Bar …>` member expressions (was breaking under `<Ctx …>` shorthand too).
  return createElement(SignInDialogContextObj.Provider, { value }, children);
}

/**
 * Reactive read of the dialog state. Use this inside components to react to
 * `show()`/`hide()` calls.
 */
export function useSignInDialog(): SignInDialogApi {
  const ctx = useContext(SignInDialogContextObj);
  if (!ctx) throw new Error('useSignInDialog must be used within SignInDialogProvider');
  return { open: ctx.open, show: ctx.show, hide: ctx.hide, toggle: ctx.toggle };
}

/**
 * Internal hook used by the `<SignInDialog>` component itself. Falls back to
 * a noop controller when no provider is mounted, so the component is safe to
 * render in tests / Storybook in isolation.
 */
export function useSignInDialogState(): SignInDialogApi {
  const ctx = useContext(SignInDialogContextObj);
  if (!ctx) {
    return {
      open: false,
      show: () => {},
      hide: () => {},
      toggle: () => {},
    };
  }
  return { open: ctx.open, show: ctx.show, hide: ctx.hide, toggle: ctx.toggle };
}
