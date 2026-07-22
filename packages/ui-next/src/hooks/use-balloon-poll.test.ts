import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBalloonPoll } from './use-balloon-poll';

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  vi.useFakeTimers();
  (global as any).fetch = fetchMock;
  fetchMock.mockResolvedValue({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({ rows: [1] }) });
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('useBalloonPoll', () => {
  it('fetches immediately when enabled', async () => {
    let hook: ReturnType<typeof renderHook<typeof useBalloonPoll>>;
    await act(async () => {
      hook = renderHook(() => useBalloonPoll({ url: '/x', enabled: true, intervalMs: 1000 }));
      // flush the initial refresh and the setInterval setup
      vi.advanceTimersByTime(0);
    });
    expect(hook!.result.current.data).toEqual({ rows: [1] });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('refetches on interval', async () => {
    renderHook(() => useBalloonPoll({ url: '/x', enabled: true, intervalMs: 1000 }));
    // Advance in chunks so each fetch can resolve between interval callbacks
    for (let i = 0; i < 4; i++) {
      await act(async () => { vi.advanceTimersByTime(1000); });
    }
    expect(fetchMock).toHaveBeenCalledTimes(4); // initial + 3 intervals
  });
  it('does not fetch when disabled', () => {
    renderHook(() => useBalloonPoll({ url: '/x', enabled: false, intervalMs: 1000 }));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
