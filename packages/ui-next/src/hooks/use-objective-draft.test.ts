/* @vitest-environment happy-dom */
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// In-memory mock for idb-keyval so tests don't need real IndexedDB.
const stores = new Map<string, Map<string, string>>();
vi.mock('idb-keyval', () => ({
  get: (k: string) => Promise.resolve(stores.get('hydro')?.get(k)),
  set: (k: string, v: string) => {
    if (!stores.has('hydro')) stores.set('hydro', new Map());
    stores.get('hydro')!.set(k, v);
    return Promise.resolve();
  },
  del: (k: string) => {
    stores.get('hydro')?.delete(k);
    return Promise.resolve();
  },
}));

import { useObjectiveDraft } from './use-objective-draft';

const STORAGE_KEY = '1/42/_';

describe('useObjectiveDraft', () => {
  beforeEach(() => {
    stores.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('persists the latest value to IndexedDB after the debounce window', async () => {
    vi.useFakeTimers();
    const { rerender } = renderHook(
      ({ answers }: { answers: Record<string, string | string[]> }) =>
        useObjectiveDraft({ uid: 1, docId: 42, tid: undefined, answers }),
      { initialProps: { answers: { q1: 'A' } } },
    );

    rerender({ answers: { q1: 'B' } });
    rerender({ answers: { q1: 'C' } });

    // Advance past the 1s debounce and flush pending microtasks.
    await vi.advanceTimersByTimeAsync(1100);

    expect(stores.get('hydro')?.get(STORAGE_KEY)).toBeDefined();
    const stored = JSON.parse(stores.get('hydro')!.get(STORAGE_KEY)!);
    expect(stored).toEqual({ q1: 'C' });
  });

  it('seeds the initial answers from any previously persisted draft', async () => {
    stores.set('hydro', new Map([[STORAGE_KEY, JSON.stringify({ q1: 'B' })]]));
    const onLoaded = vi.fn();
    renderHook(() =>
      useObjectiveDraft({
        uid: 1,
        docId: 42,
        tid: undefined,
        answers: { q1: '' },
        onLoaded,
      }),
    );

    await waitFor(() => expect(onLoaded).toHaveBeenCalledWith({ q1: 'B' }));
  });

  it('exposes a clear() function that wipes the persisted draft', async () => {
    stores.set('hydro', new Map([[STORAGE_KEY, JSON.stringify({ q1: 'X' })]]));
    const { result } = renderHook(() =>
      useObjectiveDraft({
        uid: 1,
        docId: 42,
        tid: undefined,
        answers: { q1: 'Y' },
      }),
    );
    await result.current.clear();
    expect(stores.get('hydro')?.has(STORAGE_KEY)).toBe(false);
  });

  it('builds the storage key with the contest tid when provided', async () => {
    vi.useFakeTimers();
    const { rerender } = renderHook(
      ({ answers }: { answers: Record<string, string | string[]> }) =>
        useObjectiveDraft({ uid: 7, docId: 99, tid: 'c-1', answers }),
      { initialProps: { answers: { q1: 'A' } } },
    );

    rerender({ answers: { q1: 'B' } });

    await vi.advanceTimersByTimeAsync(1100);

    expect(stores.get('hydro')?.get('7/99/c-1')).toBeDefined();
  });
});