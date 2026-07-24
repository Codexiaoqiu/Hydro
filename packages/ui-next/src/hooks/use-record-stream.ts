import { useEffect, useRef } from 'react';

export interface RecordStreamRow {
  _id: string;
  status: number;
  lang: string;
  time: number;
}

export interface UseRecordStreamOptions<T extends RecordStreamRow> {
  url?: string;
  enabled: boolean;
  onRecord: (record: T) => void;
}

export function useRecordStream<T extends RecordStreamRow>({
  url,
  enabled,
  onRecord,
}: UseRecordStreamOptions<T>) {
  const wsRef = useRef<WebSocket | null>(null);
  const onRecordRef = useRef(onRecord);
  onRecordRef.current = onRecord;

  useEffect(() => {
    if (!url || !enabled || typeof WebSocket === 'undefined') return undefined;

    const ws = new WebSocket(url);
    wsRef.current = ws;
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(String(event.data)) as {
          rdoc?: T;
          type?: string;
          payload?: T;
        };
        const record = message.rdoc
          ?? (message.type === 'record' ? message.payload : undefined);
        if (record?._id) onRecordRef.current(record);
      } catch {
        // Ignore malformed messages.
      }
    };

    return () => {
      ws.close();
      if (wsRef.current === ws) wsRef.current = null;
    };
  }, [url, enabled]);
}
