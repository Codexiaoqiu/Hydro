/* @vitest-environment happy-dom */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBalloonPoll } from './use-balloon-poll';

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.useFakeTimers();
  (global as any).fetch = fetchMock;
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    headers: { get: () => 'application/json' },
    json: async () => ({ bdocs: [{ _id: 'B1' }] }),
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useBalloonPoll', () => {
  it('exposes {data, pending, error, refresh}', async () => {
    const { result } = renderHook(() =>
      useBalloonPoll({ url: '/x', enabled: true, intervalMs: 1000 }),
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.data).toEqual({ bdocs: [{ _id: 'B1' }] });
    expect(result.current.pending).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.refresh).toBe('function');
  });

  it('auto-polls on interval only while enabled', async () => {
    renderHook(() =>
      useBalloonPoll({ url: '/x', enabled: true, intervalMs: 1000 }),
    );
    // initial at t=0, intervals at t=1000, 2000 — two ticks total.
    for (let i = 0; i < 2; i += 1) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
    }
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('does not auto-poll when disabled', async () => {
    renderHook(() =>
      useBalloonPoll({ url: '/x', enabled: false, intervalMs: 1000 }),
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('manual refresh works even when auto-polling is disabled', async () => {
    const { result } = renderHook(() =>
      useBalloonPoll({ url: '/x', enabled: false, intervalMs: 1000 }),
    );
    await act(async () => {
      await result.current.refresh();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual({ bdocs: [{ _id: 'B1' }] });
  });

  it('sends same-origin credentials and Accept: application/json', async () => {
    renderHook(() =>
      useBalloonPoll({ url: '/x', enabled: true, intervalMs: 60_000 }),
    );
    await act(async () => {
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

  it('cleanup aborts and stops the timer on unmount', async () => {
    const { unmount } = renderHook(() =>
      useBalloonPoll({ url: '/x', enabled: true, intervalMs: 1000 }),
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('visibility/focus events do not create extra requests when disabled', async () => {
    const { result } = renderHook(() =>
      useBalloonPoll({ url: '/x', enabled: false, intervalMs: 1000 }),
    );
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('focus'));
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(fetchMock).not.toHaveBeenCalled();
    await act(async () => {
      await result.current.refresh();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual({ bdocs: [{ _id: 'B1' }] });
  });
});