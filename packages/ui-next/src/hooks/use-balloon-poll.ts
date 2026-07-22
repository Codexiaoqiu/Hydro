import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseBalloonPollArgs<T> {
  url: string;
  enabled: boolean;
  intervalMs?: number;
}

export function useBalloonPoll<T = unknown>({ url, enabled, intervalMs = 60_000 }: UseBalloonPollArgs<T>) {
  const [data, setData] = useState<T | null>(null);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (!enabled || inFlight.current) return;
    inFlight.current = true;
    try {
      const r = await fetch(url, { credentials: 'same-origin' });
      if (r.ok) setData(await r.json() as T);
    } catch { /* swallow */ }
    finally { inFlight.current = false; }
  }, [url, enabled]);

  useEffect(() => {
    if (!enabled) return;
    refresh();
    const t = window.setInterval(refresh, intervalMs);
    return () => window.clearInterval(t);
  }, [refresh, intervalMs, enabled]);

  return { data, refresh };
}
