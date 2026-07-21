import { useEffect, useRef } from 'react';
import type { Dispatch } from 'react';
import type { ScratchpadAction, WSMessage } from './types';

export interface UsePretestSessionArgs {
  url: string;
  enabled: boolean;
  rid: string | null;
  dispatch: Dispatch<ScratchpadAction>;
}

const BACKOFF_MS = [3000, 6000, 12000];

export function usePretestSession({ url, enabled, rid, dispatch }: UsePretestSessionArgs) {
  const wsRef = useRef<WebSocket | null>(null);
  const retriesRef = useRef(0);
  const reconnectTimerRef = useRef<number | null>(null);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    if (!enabledRef.current || !rid) return;

    let cancelled = false;

    function connect() {
      if (cancelled) return;
      dispatch({ type: 'WS_STATUS', payload: 'connecting' });
      const ws = new WebSocket(url);
      wsRef.current = ws;
      ws.onopen = () => {
        retriesRef.current = 0;
        dispatch({ type: 'WS_STATUS', payload: 'open' });
      };
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(String(ev.data)) as WSMessage;
          switch (msg.type) {
            case 'pretest':
              dispatch({ type: 'PUSH_PRETEST_LINE', payload: String((msg.payload as { data?: unknown })?.data ?? '') });
              break;
            case 'compile-info':
            case 'compiler-error':
              dispatch({ type: 'PRETEST_ERROR', payload: String((msg.payload as { text?: unknown })?.text ?? msg.type) });
              break;
            case 'done':
            case 'record':
              dispatch({ type: 'END_PRETEST' });
              break;
            default:
              break;
          }
        } catch {
          /* ignore malformed */
        }
      };
      ws.onclose = () => {
        dispatch({ type: 'WS_STATUS', payload: 'closed' });
        if (cancelled) return;
        if (retriesRef.current >= BACKOFF_MS.length) {
          dispatch({ type: 'WS_STATUS', payload: 'error' });
          return;
        }
        const delay = BACKOFF_MS[retriesRef.current++];
        reconnectTimerRef.current = window.setTimeout(connect, delay);
      };
      ws.onerror = () => {
        dispatch({ type: 'WS_STATUS', payload: 'error' });
      };
    }

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [url, rid, dispatch]);
}
