/**
 * `usePostLoginRedirect` — derives the target URL to land on after a
 * successful login/register flow, matching the convention used by
 * ui-default (see `templates/user_login.html` + `handler/user.ts`):
 *
 *   1. `?redirect=…` query param wins.
 *   2. Otherwise, the `Referer` header (resolved to a path/query) — but only
 *      when it points at a non-auth page so we don't bounce back to /login.
 *   3. Otherwise, fall back to `/` (the homepage).
 *
 * The hook is SSR-safe: when `window` is not defined it returns `/`.
 */
import { useCallback, useMemo } from 'react';

const HOME_PATH = '/';

/**
 * True only when `value` is the auth page itself or one of its
 * sub-routes (`/login`, `/login/email`, `/login?...`, `/login#...`).
 *
 * We need this guard to avoid the redirect-after-login loop: the user
 * clicks login, the server sends them back to /login, which kicks off
 * login again, ad infinitum. Stricter than `value.startsWith(prefix)`
 * so unrelated paths that merely *begin* with the same prefix
 * (e.g. `/loginRequired`, `/login-redirect-test`) are still allowed.
 */
function isAuthPagePath(value: string, prefix: string): boolean {
  return value === prefix
    || value.startsWith(`${prefix}?`)
    || value.startsWith(`${prefix}/`)
    || value.startsWith(`${prefix}#`);
}

function isSafeRelativePath(value: string): boolean {
  if (!value) return false;
  if (value.startsWith('//')) return false;
  if (!value.startsWith('/')) return false;
  if (isAuthPagePath(value, '/login')) return false;
  if (isAuthPagePath(value, '/register')) return false;
  if (isAuthPagePath(value, '/lostpass')) return false;
  if (isAuthPagePath(value, '/logout')) return false;
  return true;
}

function readQueryRedirect(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('redirect');
    if (!raw) return null;
    const decoded = decodeURIComponent(raw);
    return isSafeRelativePath(decoded) ? decoded : null;
  } catch {
    return null;
  }
}

function readRefererFallback(): string | null {
  if (typeof document === 'undefined') return null;
  const ref = document.referrer;
  if (!ref) return null;
  try {
    const url = new URL(ref);
    if (url.origin !== window.location.origin) return null;
    return isSafeRelativePath(url.pathname + url.search) ? url.pathname + url.search : null;
  } catch {
    return null;
  }
}

export function computePostLoginRedirect(): string {
  return readQueryRedirect() ?? readRefererFallback() ?? HOME_PATH;
}

export interface PostLoginRedirectApi {
  /** Final redirect target, computed once at hook construction time. */
  target: string;
  /** Re-runs the computation (useful after async work that may have changed the URL). */
  recompute: () => string;
  /** Navigate to the computed target using `window.location.href`. */
  go: () => void;
}

export function usePostLoginRedirect(): PostLoginRedirectApi {
  const initial = useMemo(() => computePostLoginRedirect(), []);
  const recompute = useCallback(() => computePostLoginRedirect(), []);
  const go = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.location.href = computePostLoginRedirect();
  }, []);
  return { target: initial, recompute, go };
}