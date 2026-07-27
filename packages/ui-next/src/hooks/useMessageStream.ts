/**
 * `useMessageStream` — open a WebSocket to the server's live-message channel
 * and dispatch every incoming event to a caller-provided reducer.
 *
 * Wire protocol (mirrors `packages/hydrooj/src/handler/home.ts::notifyMessage`):
 *
 *   { operation: 'event', channels: ['message:<uid>'],
 *     payload: { udoc: { ... }, mdoc: { _id, from, to, content, flag } } }
 *
 * The hook is SSR-safe: it short-circuits when `window.WebSocket` is
 * undefined. Cleanup runs on unmount and on `enabled` flipping false.
 */
import { useEffect, useRef } from 'react';

export interface MessageMdoc {
  _id: string;
  from: number;
  to: number | number[];
  content: string;
  flag?: number;
}

export interface MessageUdoc {
  _id: number;
  uname?: string;
  avatarUrl?: string;
  [k: string]: unknown;
}

export interface MessageEventPayload {
  udoc: MessageUdoc;
  mdoc: MessageMdoc;
}

export interface UseMessageStreamOptions {
  /** Connection URL — typically `${UiContext.ws_prefix}websocket`. */
  url?: string;
  /** When false the hook doesn't open a socket. */
  enabled: boolean;
  /** Called for every valid `user/message` event. */
  onMessage: (payload: MessageEventPayload) => void;
  /** Called when the connection opens — emit subscription frames here. */
  onOpen?: (send: (data: string) => void) => void;
}

export function useMessageStream({
  url,
  enabled,
  onMessage,
  onOpen,
}: UseMessageStreamOptions) {
  const onMessageRef = useRef(onMessage);
  const onOpenRef = useRef(onOpen);

  // Keep the refs in sync without re-running the effect: the WebSocket is
  // bound to the ref values at `onopen`, so we just need the latest
  // callbacks to be available when the next event fires.
  useEffect(() => { onMessageRef.current = onMessage; });
  useEffect(() => { onOpenRef.current = onOpen; });

  useEffect(() => {
    if (!url || !enabled || typeof WebSocket === 'undefined') return undefined;

    const ws = new WebSocket(url);
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(String(event.data)) as {
          operation?: string;
          payload?: MessageEventPayload;
        };
        if (msg.operation !== 'event' || !msg.payload) return;
        onMessageRef.current(msg.payload);
      } catch {
        // Ignore malformed messages — protocol is forward-compatible.
      }
    };
    ws.onopen = () => {
      if (onOpenRef.current) {
        onOpenRef.current((data) => ws.send(data));
      }
    };

    return () => {
      ws.close();
    };
  }, [url, enabled]);
}
