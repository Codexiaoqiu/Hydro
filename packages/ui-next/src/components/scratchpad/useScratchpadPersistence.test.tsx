import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useScratchpadPersistence } from './useScratchpadPersistence';

// Lightweight fake-idb so we don't need to install the real package in tests.
const stores = new Map<string, Map<string, string>>();
vi.mock('idb-keyval', () => ({
  get: (k: string) => Promise.resolve(stores.get('hydro')?.get(k)),
  set: (k: string, v: string) => {
    if (!stores.has('hydro')) stores.set('hydro', new Map());
    stores.get('hydro')!.set(k, v);
    return Promise.resolve();
  },
}));

describe('useScratchpadPersistence', () => {
  it('writes code to idb after debounce', async () => {
    stores.clear();
    const { rerender } = renderHook(
      ({ code }: { code: string }) => useScratchpadPersistence({ problemKey: 'k1', code, onLoaded: () => {} }),
      { initialProps: { code: 'int main(){}' } },
    );
    rerender({ code: 'int main(){return 0;}' });
    await waitFor(() => {
      expect(stores.get('hydro')?.get('k1')).toBe('int main(){return 0;}');
    }, { timeout: 1500 });
  });

  it('invokes onLoaded with persisted draft', async () => {
    stores.set('hydro', new Map([['k2', 'persisted']]));
    const onLoaded = vi.fn();
    renderHook(() => useScratchpadPersistence({ problemKey: 'k2', code: '', onLoaded }));
    await waitFor(() => expect(onLoaded).toHaveBeenCalledWith('persisted'));
  });
});
