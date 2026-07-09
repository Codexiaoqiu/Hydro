/* eslint-disable react-refresh/only-export-components */

import {
  createContext, type ReactNode, useCallback, useContext, useMemo, useState,
} from 'react';

export interface PageData {
  name: string;
  template: string;
  args: {
    UserContext: Record<string, any>;
    UiContext: Record<string, any>;
    [key: string]: any;
  };
  url: string;
}

interface PageDataContextValue {
  data: PageData;
  setData: React.Dispatch<React.SetStateAction<PageData>>;
}

interface UiContextValue {
  value: Record<string, any>;
  /** Merge (shallow) new fields into the live UiContext and trigger a re-render. */
  setField: (patch: Record<string, any>) => void;
}

const PageDataContext = createContext<PageDataContextValue | null>(null);
const UiContextContext = createContext<UiContextValue | null>(null);

interface PageDataProviderProps {
  initial: PageData;
  children: ReactNode;
}

export function PageDataProvider({ initial, children }: PageDataProviderProps) {
  const [data, setData] = useState<PageData>(initial);
  const [uiContext, setUiContextState] = useState<Record<string, any>>(
    () => initial.args.UiContext ?? {},
  );

  const setField = useCallback((patch: Record<string, any>) => {
    setUiContextState((prev) => ({ ...prev, ...patch }));
  }, []);

  const pageValue = useMemo(() => ({ data, setData }), [data]);
  const uiValue = useMemo(() => ({ value: uiContext, setField }), [uiContext, setField]);

  return (
    <PageDataContext.Provider value={pageValue}>
      <UiContextContext.Provider value={uiValue}>{children}</UiContextContext.Provider>
    </PageDataContext.Provider>
  );
}

function usePageDataContext(): PageDataContextValue {
  const ctx = useContext(PageDataContext);
  if (!ctx) throw new Error('usePageData must be used within PageDataProvider');
  return ctx;
}

function useUiContextContext(): UiContextValue {
  const ctx = useContext(UiContextContext);
  if (!ctx) throw new Error('useUiContext must be used within PageDataProvider');
  return ctx;
}

export function usePageData(): PageData {
  return usePageDataContext().data;
}

export function useSetPageData(): React.Dispatch<React.SetStateAction<PageData>> {
  return usePageDataContext().setData;
}

export function useUiContext(): PageData['args']['UiContext'] {
  return useUiContextContext().value;
}

/**
 * Returns a setter that shallow-merges patches into the live UiContext and
 * triggers a re-render for every `useUiContext()` consumer. Use this from any
 * page that wants to publish derived fields (e.g. the active `problemId`,
 * pretest URLs, mode flags) for downstream slot panels to read.
 */
export function useSetUiContext(): (patch: Record<string, any>) => void {
  return useUiContextContext().setField;
}

export function useUserContext(): PageData['args']['UserContext'] {
  return usePageDataContext().data.args.UserContext;
}
