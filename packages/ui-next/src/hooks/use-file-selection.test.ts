import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useFileSelection } from './use-file-selection';

const NAMES = ['a.txt', 'b.txt', 'c.txt'];

describe('useFileSelection', () => {
  it('starts with an empty selection', () => {
    const { result } = renderHook(() => useFileSelection(NAMES));
    expect(result.current.selected.size).toBe(0);
    expect(result.current.isSelected('a.txt')).toBe(false);
  });

  it('toggles a single name on and off', () => {
    const { result } = renderHook(() => useFileSelection(NAMES));
    act(() => result.current.toggle('a.txt'));
    expect(result.current.isSelected('a.txt')).toBe(true);
    act(() => result.current.toggle('a.txt'));
    expect(result.current.isSelected('a.txt')).toBe(false);
  });

  it('selects all names', () => {
    const { result } = renderHook(() => useFileSelection(NAMES));
    act(() => result.current.selectAll());
    expect([...result.current.selected].sort()).toEqual([...NAMES].sort());
  });

  it('inverts the current selection', () => {
    const { result } = renderHook(() => useFileSelection(NAMES));
    act(() => result.current.toggle('a.txt'));
    act(() => result.current.invert());
    expect([...result.current.selected].sort()).toEqual(['b.txt', 'c.txt']);
  });

  it('clears the selection', () => {
    const { result } = renderHook(() => useFileSelection(NAMES));
    act(() => result.current.selectAll());
    act(() => result.current.clear());
    expect(result.current.selected.size).toBe(0);
  });

  it('drops stale names when the available list shrinks', () => {
    const { result, rerender } = renderHook(({ names }) => useFileSelection(names), {
      initialProps: { names: NAMES },
    });
    act(() => result.current.selectAll());
    rerender({ names: ['a.txt'] });
    expect([...result.current.selected]).toEqual(['a.txt']);
  });
});
