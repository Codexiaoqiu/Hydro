import { useCallback, useEffect, useRef, useState } from 'react';

export interface UploadEntry {
  file: File;
  progress: number;
  status: 'queued' | 'uploading' | 'done' | 'failed' | 'cancelled';
  error?: string;
}

export interface UseFileUploadArgs {
  url: string;
  type: string;
  /** Called once when a batch reaches a terminal state (all entries settled).
   *  Not invoked on unmount, on `cancel()`, or when the batch is superseded
   *  by a new `upload()` call. */
  onSettled?: (entries: UploadEntry[]) => void;
}

export interface UseFileUpload {
  entries: UploadEntry[];
  upload: (files: File[]) => void;
  cancel: () => void;
}

/**
 * Uploads files sequentially over XHR (so upload progress is observable),
 * posting the FormData shape expected by Hydro's `upload_file` operation.
 * A single request is in flight at a time; `cancel()` and unmount both abort it.
 *
 * Concurrency safety: each call to `upload()` increments a `batchId` ref.
 * XHR callbacks and recursive `run()` continuations that fire after the batch
 * has been superseded (by unmount, a new batch, or `cancel()`) are no-ops
 * and never patch state or start the next XHR.
 */
export function useFileUpload({ url, type, onSettled }: UseFileUploadArgs): UseFileUpload {
  const [entries, setEntries] = useState<UploadEntry[]>([]);
  const entriesRef = useRef<UploadEntry[]>([]);
  const activeXhr = useRef<XMLHttpRequest | null>(null);
  const mounted = useRef(true);
  const batchIdRef = useRef(0);
  const onSettledRef = useRef(onSettled);
  onSettledRef.current = onSettled;

  const commit = useCallback((next: UploadEntry[]) => {
    entriesRef.current = next;
    if (mounted.current) setEntries(next);
  }, []);

  const patchBatch = useCallback((batch: number, index: number, partial: Partial<UploadEntry>) => {
    if (batchIdRef.current !== batch) return;
    commit(entriesRef.current.map((e, i) => (i === index ? { ...e, ...partial } : e)));
  }, [commit]);

  const upload = useCallback((files: File[]) => {
    if (!files.length) return;
    // Abort any in-flight request from a previous batch and supersede its token
    // so its remaining callbacks cannot patch the new batch's state.
    activeXhr.current?.abort();
    activeXhr.current = null;
    const batch = ++batchIdRef.current;

    commit(files.map((file) => ({ file, progress: 0, status: 'queued' as const })));

    const run = (index: number) => {
      // Guard: bail if the batch was superseded (new upload / cancel / unmount)
      // before any subsequent side-effects (including creating a new XHR).
      if (!mounted.current || batchIdRef.current !== batch || index >= files.length) {
        if (index >= files.length) {
          activeXhr.current = null;
          onSettledRef.current?.(entriesRef.current);
        }
        return;
      }
      const file = files[index];
      patchBatch(batch, index, { status: 'uploading' });

      const xhr = new XMLHttpRequest();
      activeXhr.current = xhr;
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && e.total > 0) patchBatch(batch, index, { progress: e.loaded / e.total });
      };
      xhr.onload = () => {
        if (batchIdRef.current !== batch) return;
        activeXhr.current = null;
        if (xhr.status >= 200 && xhr.status < 300) {
          patchBatch(batch, index, { status: 'done', progress: 1 });
        } else {
          patchBatch(batch, index, { status: 'failed', error: xhr.responseText || `HTTP ${xhr.status}` });
        }
        run(index + 1);
      };
      xhr.onerror = () => {
        if (batchIdRef.current !== batch) return;
        activeXhr.current = null;
        patchBatch(batch, index, { status: 'failed', error: 'Network error' });
        run(index + 1);
      };
      xhr.onabort = () => {
        if (batchIdRef.current !== batch) return;
        activeXhr.current = null;
        patchBatch(batch, index, { status: 'cancelled' });
        // intentionally do not call run(index + 1): cancel stops the batch.
      };

      const fd = new FormData();
      fd.append('operation', 'upload_file');
      fd.append('type', type);
      fd.append('filename', file.name);
      fd.append('file', file);
      xhr.open('POST', url);
      xhr.send(fd);
    };

    run(0);
  }, [url, type, commit, patchBatch]);

  const cancel = useCallback(() => {
    // Cancel aborts the in-flight XHR but does NOT bump the batch token: the
    // abort handler must still mark the current entry as 'cancelled'. New
    // entries are blocked because the abort handler intentionally does not
    // call run(index + 1) (so onSettled also won't fire).
    activeXhr.current?.abort();
    activeXhr.current = null;
  }, []);

  useEffect(() => () => {
    mounted.current = false;
    batchIdRef.current++; // invalidate any in-flight batch
    activeXhr.current?.abort();
    activeXhr.current = null;
  }, []);

  return { entries, upload, cancel };
}