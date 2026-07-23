/**
 * `lib/ws-url.ts` — convert a relative WebSocket path into an absolute URL.
 *
 * The native `WebSocket` constructor requires an absolute URL with a `ws://`
 * or `wss://` scheme — a relative path like `/record-conn?...` will throw
 * `SyntaxError: Failed to construct 'WebSocket'`. The server-side template
 * traditionally sets `UiContext.ws_prefix` (a path prefix such as `/`) and a
 * relative connection URL (`record-conn?...`), so the client must join them
 * with the current page's origin and protocol.
 *
 *   - The Hydro WebSocket server is attached to the same HTTP server
 *     (framework/framework/server.ts:137), so the host:port matches
 *     `window.location.host`.
 *   - `ws_prefix` is a path prefix on the same origin; it is occasionally a
 *     comma-separated list of candidates — the server picks one and we use
 *     whichever it injected (`UiContext.ws_prefix`).
 *   - The scheme tracks the page protocol: `https:` → `wss:`, otherwise `ws:`.
 *
 * The helper is intentionally callable during SSR (where `window` is undefined)
 * — it returns `null` in that case so callers can guard before opening the
 * socket. Production callers all wrap the result in a `typeof window !==
 * 'undefined'` check already.
 */

export interface BuildWebSocketUrlOptions {
  /**
   * Path prefix emitted by the server (`UiContext.ws_prefix`). Defaults to `/`
   * to match `UiContextBase.ws_prefix` in
   * `packages/hydrooj/src/service/layers/base.ts`. The trailing slash is
   * normalised so callers may pass either `/` or `/ws/`.
   */
  wsPrefix?: string;
  /** Override `window.location` — useful for tests. */
  location?: { protocol: string, host: string };
}

/**
 * Join a relative connection path with the current origin and an optional
 * `ws_prefix` to produce an absolute `ws://` / `wss://` URL that the native
 * `WebSocket` constructor will accept.
 *
 * Returns `null` when called server-side (no `window`) so React renders don't
 * blow up during SSR.
 *
 * @example
 *   toWebSocketUrl('record-conn?pretest=1&pid=42')
 *   // → 'ws://localhost:2333/record-conn?pretest=1&pid=42' on http://
 *   // → 'wss://judge.example.com/record-conn?pretest=1&pid=42' on https://
 */
export function toWebSocketUrl(
  path: string,
  { wsPrefix, location }: BuildWebSocketUrlOptions = {},
): string | null {
  if (typeof window === 'undefined' && !location) return null;
  const loc = location ?? (typeof window !== 'undefined' ? window.location : undefined);
  if (!loc) return null;
  // Leading-slash normalisation: turn `record-conn?...` into `/record-conn?…`
  // so the URL parser is unambiguous about host vs path.
  const normalisedPath = path.startsWith('/') ? path : `/${path}`;
  // ws_prefix defaults to `/` and may be `/`, `/ws/`, or anything else. We
  // join with a single slash so callers don't have to remember to trim.
  const prefix = (wsPrefix ?? '/').replace(/\/+$/, '');
  const scheme = loc.protocol === 'https:' ? 'wss:' : 'ws:';
  // `URL` performs all needed escaping for the query string and ensures
  // `record-conn?...` with `?` sequences stays intact.
  try {
    const u = new URL(`${scheme}//${loc.host}${prefix}${normalisedPath}`);
    // `URL` strips the query string when we construct from `host + path`. Re-
    // inject the query if the original path had one.
    const qIdx = normalisedPath.indexOf('?');
    if (qIdx >= 0) u.search = normalisedPath.slice(qIdx + 1);
    return u.toString();
  } catch {
    return null;
  }
}
