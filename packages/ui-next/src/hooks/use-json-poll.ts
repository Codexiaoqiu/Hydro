import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * `useJsonPoll` — fetches JSON from `url` on an interval while `enabled`,
 * exposes a stable `refresh()` for callers that need to refetch on demand
 * (button clicks, post-mutation reconciliation). In-flight calls are
 * deduplicated so two `refresh()` calls issued back-to-back collapse to
 * one network round-trip.
 *
 * Wire conventions:
 *   - `credentials: 'same-origin'` (mirrors the rest of the UI: cookies
 *     ride along for the same origin).
 *   - `Accept: application/json` (the backend speaks both JSON and HTML,
 *     so we have to ask for the JSON shape explicitly).
 *   - `AbortController` per request — cleanup aborts and clears the
 *     interval timer. Manual refresh works even while `enabled === false`.
 *
 * Visibility/focus events are intentionally NOT wired: doing so would
 * duplicate the timer-driven request that already fires on `enabled`,
 * and the brief explicitly forbids that.
 */
export interface UseJsonPollArgs {
  url: string;
  enabled: boolean;
  intervalMs?: number;
}

export interface UseJsonPollResult<T> {
  data: T | null;
  pending: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useJsonPoll<T = unknown>({
  url,
  enabled,
  intervalMs = 60_000,
}: UseJsonPollArgs): UseJsonPollResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    if (inFlightRef.current) {
      return inFlightRef.current;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setPending(true);
    setError(null);
    const task = (async () => {
      try {
        const res = await fetch(url, {
          credentials: 'same-origin',
          headers: { Accept: 'application/json' },
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error(`${res.status} ${res.statusText || 'Request failed'}`);
        }
        const next = (await res.json()) as T;
        if (!controller.signal.aborted) setData(next);
      } catch (e) {
        if ((e as { name?: string })?.name === 'AbortError') return;
        if (!controller.signal.aborted) setError(e as Error);
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        if (inFlightRef.current === task) inFlightRef.current = null;
        setPending(false);
      }
    })();
    inFlightRef.current = task;
    await task;
  }, [url]);

  useEffect(() => {
    if (!enabled) return undefined;
    refresh();
    const timer = window.setInterval(() => {
      refresh();
    }, intervalMs);
    return () => {
      window.clearInterval(timer);
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, [enabled, intervalMs, refresh]);

  return { data, pending, error, refresh };
}