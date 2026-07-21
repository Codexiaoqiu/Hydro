import { renderHook } from '@testing-library/react';
import { act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ScratchpadProvider, useScratchpad } from './ScratchpadContext';

describe('useScratchpad', () => {
  it('throws when used outside provider', () => {
    expect(() => renderHook(() => useScratchpad())).toThrow(/ScratchpadProvider/);
  });

  it('returns state and dispatch inside provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ScratchpadProvider initialLang="cpp" initialCode="">
        {children}
      </ScratchpadProvider>
    );
    const { result } = renderHook(() => useScratchpad(), { wrapper });
    expect(result.current.state.lang).toBe('cpp');
    act(() => result.current.dispatch({ type: 'SET_CODE', payload: 'x' }));
    expect(result.current.state.code).toBe('x');
  });
});
