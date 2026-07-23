/* @vitest-environment happy-dom */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useJsonPoll } from './use-json-poll';

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.useFakeTimers();
  (global as any).fetch = fetchMock;
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    headers: { get: () => 'application/json' },
    json: async () => ({ rows: [1] }),
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useJsonPoll', () => {
  it('fetches immediately when enabled and exposes {data, pending, error, refresh}', async () => {
    let hook: any;
    await act(async () => {
      hook = renderHook(() =>
        useJsonPoll<{ rows: number[] }>({ url: '/x', enabled: true, intervalMs: 1000 }),
      );
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(hook!.result.current.data).toEqual({ rows: [1] });
    expect(hook!.result.current.pending).toBe(false);
    expect(hook!.result.current.error).toBeNull();
    expect(typeof hook!.result.current.refresh).toBe('function');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('sends same-origin credentials and Accept: application/json', async () => {
    let hook: any;
    await act(async () => {
      hook = renderHook(() =>
        useJsonPoll({ url: '/x', enabled: true, intervalMs: 60_000 }),
      );
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/x',
      expect.objectContaining({
        credentials: 'same-origin',
        headers: expect.objectContaining({ Accept: 'application/json' }),
      }),
    );
  });

  it('refetches on interval while enabled', async () => {
    renderHook(() =>
      useJsonPoll({ url: '/x', enabled: true, intervalMs: 1000 }),
    );
    // initial at t=0, intervals at t=1000, 2000, 3000 — three ticks total.
    for (let i = 0; i < 3; i += 1) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
    }
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('does not fetch when disabled', async () => {
    await act(async () => {
      renderHook(() =>
        useJsonPoll({ url: '/x', enabled: false, intervalMs: 1000 }),
      );
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('manual refresh works while disabled', async () => {
    const { result } = renderHook(() =>
      useJsonPoll({ url: '/x', enabled: false, intervalMs: 1000 }),
    );
    await act(async () => {
      await result.current.refresh();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual({ rows: [1] });
  });

  it('deduplicates in-flight refreshes', async () => {
    let resolveJson: ((v: any) => void) | null = null;
    fetchMock.mockImplementationOnce(() => new Promise((resolve) => {
      resolveJson = (v) => resolve({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => v,
      });
    }));
    const { result } = renderHook(() =>
      useJsonPoll<{ rows: number[] }>({ url: '/x', enabled: false, intervalMs: 1000 }),
    );
    let first: Promise<unknown>;
    let second: Promise<unknown>;
    act(() => {
      first = result.current.refresh();
      second = result.current.refresh();
    });
    // second call should be deduplicated — only one network request issued
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolveJson!({ rows: [42] });
      await first;
      await second;
    });
    expect(result.current.data).toEqual({ rows: [42] });
  });

  it('captures non-OK responses as errors', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Server Error',
      headers: { get: () => 'application/json' },
      json: async () => ({}),
    });
    const { result } = renderHook(() =>
      useJsonPoll({ url: '/x', enabled: false, intervalMs: 1000 }),
    );
    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.error).not.toBeNull();
    expect(result.current.data).toBeNull();
  });

  it('cleanup aborts and clears timer on unmount', async () => {
    const { unmount } = renderHook(() =>
      useJsonPoll({ url: '/x', enabled: true, intervalMs: 1000 }),
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    unmount();
    // after unmount, the interval timer should not produce new fetches
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    // initial fetch was 1; unmount should not produce additional fetches
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('visibility/focus does not create duplicate requests when disabled', async () => {
    const { result } = renderHook(() =>
      useJsonPoll({ url: '/x', enabled: false, intervalMs: 1000 }),
    );
    // Simulate a few visibility/focus ticks — disabled hook must stay silent.
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('focus'));
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(fetchMock).not.toHaveBeenCalled();
    // Manual refresh should still work after focus events.
    await act(async () => {
      await result.current.refresh();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});