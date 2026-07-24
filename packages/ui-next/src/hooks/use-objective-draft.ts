import { useCallback, useEffect, useMemo, useRef } from 'react';
import { del, get, set } from 'idb-keyval';
import type { ObjectiveAnswers } from '../components/problem/ObjectiveForm';

export interface UseObjectiveDraftArgs {
  uid: number | string | undefined;
  docId: number | string;
  tid?: string;
  answers: ObjectiveAnswers;
  /** Invoked with the previously persisted draft when one exists. */
  onLoaded?: (draft: ObjectiveAnswers) => void;
  /** Debounce window for writes; defaults to 1000ms. */
  debounceMs?: number;
}

export interface UseObjectiveDraftResult {
  /** Removes the persisted draft (call after a successful submit). */
  clear: () => Promise<void>;
}

/**
 * Persists objective-form drafts to IndexedDB keyed by `${uid}/${docId}/${tid ?? '_'}`.
 * Reads the existing draft on mount and exposes a `clear()` function that wipes
 * the entry — intended to be called after a successful submit.
 *
 * Writes are debounced so that each keystroke does not trigger an IDB roundtrip.
 */
export function useObjectiveDraft({
  uid,
  docId,
  tid,
  answers,
  onLoaded,
  debounceMs = 1000,
}: UseObjectiveDraftArgs): UseObjectiveDraftResult {
  const key = useMemo(() => {
    const u = uid === undefined || uid === null ? '_' : String(uid);
    const t = tid ?? '_';
    return `${u}/${docId}/${t}`;
  }, [uid, docId, tid]);

  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  // Hydrate from IndexedDB on key change (problem switch).
  useEffect(() => {
    let cancelled = false;
    void get(key).then((value) => {
      if (cancelled) return;
      if (typeof value !== 'string') return;
      try {
        const parsed = JSON.parse(value);
        if (parsed && typeof parsed === 'object') {
          onLoadedRef.current?.(parsed as ObjectiveAnswers);
        }
      } catch {
        // Corrupted draft — ignore.
      }
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  // Debounced write on every change to `answers`.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void set(key, JSON.stringify(answers));
    }, debounceMs);
    return () => window.clearTimeout(timer);
  }, [key, answers, debounceMs]);

  const clear = useCallback(async () => {
    await del(key);
  }, [key]);

  return { clear };
}