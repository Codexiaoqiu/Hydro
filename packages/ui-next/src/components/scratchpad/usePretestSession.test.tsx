import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePretestSession } from './usePretestSession';

class MockWS {
  static instances: MockWS[] = [];
  url: string;
  readyState = 0;
  onopen: ((ev: Event) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onclose: ((ev: CloseEvent) => void) | null = null;
  sent: string[] = [];
  constructor(url: string) {
    this.url = url;
    MockWS.instances.push(this);
  }
  send(data: string) {
    this.sent.push(data);
  }
  close() {
    this.readyState = 3;
    this.onclose?.(new CloseEvent('close'));
  }
  fakeOpen() {
    this.readyState = 1;
    this.onopen?.(new Event('open'));
  }
  fakeMessage(data: unknown) {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(data) }));
  }
}

beforeEach(() => {
  MockWS.instances = [];
  (globalThis as unknown as { WebSocket: typeof MockWS }).WebSocket = MockWS as unknown as typeof WebSocket;
});
afterEach(() => {
  vi.useRealTimers();
});

describe('usePretestSession', () => {
  it('opens WebSocket and dispatches status open', () => {
    const dispatch = vi.fn();
    renderHook(() => usePretestSession({ url: 'ws://x', enabled: true, rid: 'r1', dispatch }));
    expect(MockWS.instances).toHaveLength(1);
    expect(MockWS.instances[0].url).toBe('ws://x');
    act(() => MockWS.instances[0].fakeOpen());
    expect(dispatch).toHaveBeenCalledWith({ type: 'WS_STATUS', payload: 'open' });
  });

  it('dispatches PUSH_PRETEST_LINE for pretest message', () => {
    const dispatch = vi.fn();
    renderHook(() => usePretestSession({ url: 'ws://x', enabled: true, rid: 'r1', dispatch }));
    act(() => MockWS.instances[0].fakeOpen());
    act(() => MockWS.instances[0].fakeMessage({ type: 'pretest', payload: { data: 'hello' } }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'PUSH_PRETEST_LINE', payload: 'hello' });
  });

  it('dispatches END_PRETEST on done', () => {
    const dispatch = vi.fn();
    renderHook(() => usePretestSession({ url: 'ws://x', enabled: true, rid: 'r1', dispatch }));
    act(() => MockWS.instances[0].fakeOpen());
    act(() => MockWS.instances[0].fakeMessage({ type: 'done' }));
    expect(dispatch).toHaveBeenCalledWith({ type: 'END_PRETEST' });
  });

  it('skips connection when disabled', () => {
    const dispatch = vi.fn();
    renderHook(() => usePretestSession({ url: 'ws://x', enabled: false, rid: 'r1', dispatch }));
    expect(MockWS.instances).toHaveLength(0);
  });
});
