/* @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { computeTimerState, useContestTimer, type TimerOptions } from './contest-timer';

const BEGIN = 1_700_000_000_000; // 2023-11-14T22:13:20Z
const END = BEGIN + 5 * 3600_000; // +5h
const DURATION = 5 * 3600_000;

function opts(over: Partial<TimerOptions> = {}): TimerOptions {
  return { beginAt: BEGIN, duration: DURATION, ...over };
}

describe('computeTimerState', () => {
  describe('status boundaries', () => {
    it('pre when now < beginAt', () => {
      const state = computeTimerState(BEGIN - 60_000, opts());
      expect(state.status).toBe('pre');
      expect(state.progress).toBe(0);
      expect(state.msLeft).toBe(60_000);
    });

    it('running when now is exactly at beginAt', () => {
      const state = computeTimerState(BEGIN, opts());
      expect(state.status).toBe('running');
      expect(state.progress).toBe(0);
    });

    it('running in the middle', () => {
      const mid = BEGIN + DURATION / 2;
      const state = computeTimerState(mid, opts());
      expect(state.status).toBe('running');
      expect(state.progress).toBeCloseTo(0.5, 5);
      expect(state.msLeft).toBe(DURATION / 2);
    });

    it('ended when now === end', () => {
      const state = computeTimerState(END, opts());
      expect(state.status).toBe('ended');
      expect(state.progress).toBe(1);
      expect(state.msLeft).toBe(0);
    });

    it('ended when now > end', () => {
      const state = computeTimerState(END + 60_000, opts());
      expect(state.status).toBe('ended');
      expect(state.progress).toBe(1);
      expect(state.msLeft).toBe(0);
    });
  });

  describe('end derivation', () => {
    it('uses tsdocEndAt when provided', () => {
      const tsdocEndAt = BEGIN + 3600_000;
      const state = computeTimerState(BEGIN + 1800_000, opts({ tsdocEndAt, duration: DURATION }));
      // end = tsdocEndAt; mid => progress = 1800/3600 = 0.5
      expect(state.progress).toBeCloseTo(0.5, 5);
    });

    it('uses duration when tsdocEndAt missing', () => {
      const state = computeTimerState(BEGIN + DURATION / 4, opts({ duration: DURATION, tsdocEndAt: undefined }));
      expect(state.status).toBe('running');
      expect(state.progress).toBeCloseTo(0.25, 5);
    });

    it('treats as ended when both tsdocEndAt and duration missing', () => {
      const state = computeTimerState(BEGIN + 1000, { beginAt: BEGIN });
      expect(state.status).toBe('ended');
      expect(state.progress).toBe(1);
    });
  });

  describe('start override', () => {
    it('uses tsdoc.startAt as effective start when provided', () => {
      const tsdocStartAt = BEGIN + 1800_000; // 30 min late
      const state = computeTimerState(BEGIN + 3600_000, opts({ tsdocStartAt }));
      // start = tsdocStartAt; now = begin + 1h = start + 30min; end = BEGIN + 5h
      // progress = (now - start) / (end - start) = 1800_000 / (5*3600_000 - 1800_000) ≈ 0.111
      expect(state.status).toBe('running');
      expect(state.progress).toBeCloseTo(1800_000 / (5 * 3600_000 - 1800_000), 5);
    });
  });

  describe('display formatting', () => {
    it('mm:ss format when msLeft < 1h', () => {
      const state = computeTimerState(BEGIN + DURATION - 30 * 60_000, opts());
      expect(state.display).toBe('30:00');
    });

    it('mm:ss format with seconds', () => {
      const state = computeTimerState(BEGIN + DURATION - 65_000, opts());
      expect(state.display).toBe('01:05');
    });

    it('dd:hh:mm format when msLeft >= 1h', () => {
      const state = computeTimerState(BEGIN + 1000, opts());
      // msLeft ≈ 5*3600_000 - 1000 = ~04:59:59
      expect(state.display).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });
  });
});

describe('useContestTimer hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns initial state on first render', () => {
    vi.setSystemTime(BEGIN - 1000);
    const { result } = renderHook(() =>
      useContestTimer({ beginAt: BEGIN, duration: DURATION }),
    );
    expect(result.current.status).toBe('pre');
    expect(result.current.msLeft).toBe(1000);
  });

  it('updates state after tick', () => {
    vi.setSystemTime(BEGIN);
    const { result } = renderHook(() =>
      useContestTimer({ beginAt: BEGIN, duration: DURATION }),
    );
    expect(result.current.status).toBe('running');
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.msLeft).toBe(DURATION - 1000);
  });

  it('dispatches hydro:contest-tick when status transitions', () => {
    vi.setSystemTime(BEGIN - 100);
    const listener = vi.fn();
    window.addEventListener('hydro:contest-tick', listener);

    renderHook(() => useContestTimer({ beginAt: BEGIN, duration: DURATION }));

    expect(listener).not.toHaveBeenCalled();

    act(() => {
      vi.setSystemTime(BEGIN + 100);
      vi.advanceTimersByTime(1100);
    });

    expect(listener).toHaveBeenCalled();
    window.removeEventListener('hydro:contest-tick', listener);
  });

  it('clears interval on unmount', () => {
    vi.setSystemTime(BEGIN);
    const { unmount } = renderHook(() =>
      useContestTimer({ beginAt: BEGIN, duration: DURATION }),
    );
    const clearSpy = vi.spyOn(globalThis, 'clearInterval');
    unmount();
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });
});
