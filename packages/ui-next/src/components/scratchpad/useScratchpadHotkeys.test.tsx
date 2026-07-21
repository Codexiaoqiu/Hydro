import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useScratchpadHotkeys } from './useScratchpadHotkeys';

describe('useScratchpadHotkeys', () => {
  function press(key: string, opts: KeyboardEventInit = {}) {
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...opts }));
    });
  }

  it('F9 triggers onRunPretest when canPretest', () => {
    const onRunPretest = vi.fn();
    renderHook(() => useScratchpadHotkeys({ onRunPretest, onSubmit: vi.fn(), onExit: vi.fn(), onTogglePretest: vi.fn(), onToggleRecords: vi.fn(), canPretest: true }));
    press('F9');
    expect(onRunPretest).toHaveBeenCalledOnce();
  });

  it('F10 triggers onSubmit', () => {
    const onSubmit = vi.fn();
    renderHook(() => useScratchpadHotkeys({ onRunPretest: vi.fn(), onSubmit, onExit: vi.fn(), onTogglePretest: vi.fn(), onToggleRecords: vi.fn(), canPretest: false }));
    press('F10');
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('Alt+Q triggers onExit', () => {
    const onExit = vi.fn();
    renderHook(() => useScratchpadHotkeys({ onRunPretest: vi.fn(), onSubmit: vi.fn(), onExit, onTogglePretest: vi.fn(), onToggleRecords: vi.fn(), canPretest: false }));
    press('q', { altKey: true });
    expect(onExit).toHaveBeenCalledOnce();
  });

  it('does not fire F9 when canPretest=false', () => {
    const onRunPretest = vi.fn();
    renderHook(() => useScratchpadHotkeys({ onRunPretest, onSubmit: vi.fn(), onExit: vi.fn(), onTogglePretest: vi.fn(), onToggleRecords: vi.fn(), canPretest: false }));
    press('F9');
    expect(onRunPretest).not.toHaveBeenCalled();
  });
});
