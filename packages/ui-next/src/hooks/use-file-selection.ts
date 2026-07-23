import { useCallback, useEffect, useState } from 'react';

export interface UseFileSelection {
  selected: Set<string>;
  isSelected: (name: string) => boolean;
  toggle: (name: string) => void;
  selectAll: () => void;
  invert: () => void;
  clear: () => void;
  setSelected: (names: string[]) => void;
}

/**
 * Manages a Set-based multi-selection over a list of file names.
 * The selection is automatically pruned when a name leaves `available`.
 */
export function useFileSelection(available: string[]): UseFileSelection {
  const [selected, setSelectedState] = useState<Set<string>>(() => new Set());

  // Drop stale names when the available list changes.
  useEffect(() => {
    setSelectedState((prev) => {
      const next = new Set<string>();
      for (const name of available) if (prev.has(name)) next.add(name);
      return next.size === prev.size ? prev : next;
    });
  }, [available]);

  const isSelected = useCallback((name: string) => selected.has(name), [selected]);

  const toggle = useCallback((name: string) => {
    setSelectedState((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedState(new Set(available));
  }, [available]);

  const invert = useCallback(() => {
    setSelectedState((prev) => {
      const next = new Set<string>();
      for (const name of available) if (!prev.has(name)) next.add(name);
      return next;
    });
  }, [available]);

  const clear = useCallback(() => setSelectedState(new Set()), []);

  const setSelected = useCallback((names: string[]) => setSelectedState(new Set(names)), []);

  return { selected, isSelected, toggle, selectAll, invert, clear, setSelected };
}
