import { createContext, useContext } from 'react';
import type { Dispatch } from 'react';
import type { ScratchpadAction, ScratchpadState } from './types';

export interface ScratchpadContextValue {
  state: ScratchpadState;
  dispatch: Dispatch<ScratchpadAction>;
}

export const ScratchpadContext = createContext<ScratchpadContextValue | null>(null);

export function useScratchpad(): ScratchpadContextValue {
  const ctx = useContext(ScratchpadContext);
  if (!ctx) throw new Error('useScratchpad must be used inside <ScratchpadProvider>');
  return ctx;
}

// Re-export ScratchpadProvider from useScratchpadState for public API surface
export { ScratchpadProvider } from './useScratchpadState.tsx';
