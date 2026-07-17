/**
 * `useJudgeStream` — single source of truth for live judge updates. Both
 * `record_detail` (single record) and `record_main` (list of records) use
 * the same backend SSE endpoint, so we centralise the EventSource lifecycle
 * and reconnect logic here.
 *
 * Wire protocol (one event per message):
 *
 *   event: update
 *   data: { rid: string, status?: number, score?: number, cases?: CaseUpdate[] }
 *
 * Reconnect policy: exponential backoff up to 30s. The hook is SSR-safe and
 * stops automatically on unmount.
 */
import { useEffect, useRef, useState } from 'react';

export interface JudgeUpdate {
  rid: string;
  status?: number;
  score?: number;
  cases?: Array<{ id: string, status?: number, time?: number, memory?: number }>;
  [k: string]: unknown;
}

export interface JudgeStreamState {
  /** Latest known update per record id. */
  updates: Record<string, JudgeUpdate>;
  /** Whether the EventSource is currently connected. */
  connected: boolean;
  /** Last error from the EventSource (if any). */
  error: Event | null;
  /** Manually trigger a reconnect. */
  reconnect: () => void;
}

interface Options {
  /** Filter to a single rid (overrides the URL hint). */
  rid?: string;
  /** Optional event URL override; defaults to `/record-conn` with rids. */
  url?: string;
  /** Disable the connection entirely (e.g. when the page already shows a final status). */
  paused?: boolean;
}

const MAX_BACKOFF_MS = 30_000;

export function useJudgeStream(rids: string[], opts: Options = {}): JudgeStreamState {
  const [updates, setUpdates] = useState<Record<string, JudgeUpdate>>({});
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<Event | null>(null);
  const retryRef = useRef(0);
  const esRef = useRef<EventSource | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearScheduledConnect = () => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const closeExistingSource = () => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
  };

  const buildUrl = () => {
    if (opts.url) return opts.url;
    const list = opts.rid ? [opts.rid] : rids;
    if (!list.length) return '';
    return `/record-conn?${list.map((id) => `rid=${encodeURIComponent(id)}`).join('&')}`;
  };

  const connect = () => {
    if (typeof EventSource === 'undefined') return;
    const url = buildUrl();
    if (!url) return;
    // Always cancel any pending reconnect timer and close any previous
    // EventSource before opening a new one — prevents a queued setTimeout
    // from firing after unmount/paused-toggle and creating an EventSource on
    // a stale component, and avoids two EventSources coexisting when
    // `reconnect()` is called during a backoff window.
    clearScheduledConnect();
    closeExistingSource();
    const es = new EventSource(url);
    esRef.current = es;
    es.addEventListener('open', () => {
      retryRef.current = 0;
      setConnected(true);
    });
    es.addEventListener('update', (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data) as JudgeUpdate;
        if (!data.rid) return;
        setUpdates((prev) => ({ ...prev, [data.rid]: { ...prev[data.rid], ...data } }));
      } catch { /* ignore */ }
    });
    es.addEventListener('error', (ev) => {
      setError(ev);
      setConnected(false);
      es.close();
      // Guard against the error event firing after a manual reconnect has
      // already replaced esRef.current with a new EventSource.
      if (esRef.current === es) {
        esRef.current = null;
      }
      const backoff = Math.min(MAX_BACKOFF_MS, 500 * 2 ** retryRef.current);
      retryRef.current += 1;
      clearScheduledConnect();
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        connect();
      }, backoff);
    });
  };

  useEffect(() => {
    if (opts.paused) return;
    connect();
    return () => {
      clearScheduledConnect();
      closeExistingSource();
      setConnected(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.url, opts.rid, opts.paused, rids.join(',')]);

  return {
    updates,
    connected,
    error,
    reconnect: () => {
      retryRef.current = 0;
      connect();
    },
  };
}
