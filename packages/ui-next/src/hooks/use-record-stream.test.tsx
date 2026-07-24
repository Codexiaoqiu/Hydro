import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRecordStream } from './use-record-stream';

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  onmessage: ((event: MessageEvent) => void) | null = null;
  close = vi.fn();

  constructor(public url: string) {
    MockWebSocket.instances.push(this);
  }

  emit(data: unknown) {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(data) }));
  }
}

beforeEach(() => {
  MockWebSocket.instances = [];
  vi.stubGlobal('WebSocket', MockWebSocket);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useRecordStream', () => {
  it('delivers rdoc messages from the record connection', () => {
    const onRecord = vi.fn();
    renderHook(() => useRecordStream({ url: 'ws://records', enabled: true, onRecord }));

    act(() => {
      MockWebSocket.instances[0].emit({
        rdoc: { _id: 'r1', status: 1, lang: 'cpp', time: 1 },
      });
    });

    expect(onRecord).toHaveBeenCalledWith({ _id: 'r1', status: 1, lang: 'cpp', time: 1 });
  });

  it('does not connect when viewing records is gated', () => {
    renderHook(() => useRecordStream({ url: 'ws://records', enabled: false, onRecord: vi.fn() }));
    expect(MockWebSocket.instances).toHaveLength(0);
  });

  it('closes the connection on unmount', () => {
    const { unmount } = renderHook(() => useRecordStream({
      url: 'ws://records',
      enabled: true,
      onRecord: vi.fn(),
    }));
    unmount();
    expect(MockWebSocket.instances[0].close).toHaveBeenCalledOnce();
  });
});
