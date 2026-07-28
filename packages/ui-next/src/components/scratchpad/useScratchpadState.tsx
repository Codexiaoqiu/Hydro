import type { PropsWithChildren } from 'react';
import { useMemo, useReducer } from 'react';
import { initialScratchpadState, scratchpadReducer } from './reducer';
import type { ScratchpadContextValue } from './ScratchpadContext';
import { ScratchpadContext } from './ScratchpadContext';

export interface ScratchpadProviderProps {
  initialLang: string;
  initialCode: string;
}

export function ScratchpadProvider({
  initialLang,
  initialCode,
  children,
}: PropsWithChildren<ScratchpadProviderProps>) {
  const [state, dispatch] = useReducer(
    scratchpadReducer,
    undefined,
    () => initialScratchpadState(initialLang, initialCode),
  );
  const value = useMemo<ScratchpadContextValue>(() => ({ state, dispatch }), [state]);
  return <ScratchpadContext.Provider value={value}>{children}</ScratchpadContext.Provider>;
}
