import { useEffect, useRef } from 'react';
import { get, set } from 'idb-keyval';

export interface UseScratchpadPersistenceArgs {
  problemKey: string;
  code: string;
  onLoaded: (draft: string) => void;
}

export function useScratchpadPersistence({ problemKey, code, onLoaded }: UseScratchpadPersistenceArgs) {
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  useEffect(() => {
    let cancelled = false;
    get(problemKey).then((value) => {
      if (cancelled) return;
      if (typeof value === 'string') onLoadedRef.current(value);
    });
    return () => {
      cancelled = true;
    };
  }, [problemKey]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void set(problemKey, code);
    }, 800);
    return () => window.clearTimeout(timer);
  }, [problemKey, code]);
}
