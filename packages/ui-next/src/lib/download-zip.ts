import { type Zippable, zipSync } from 'fflate';

export interface DownloadTarget {
  /** Path (including any folders) the file takes inside the archive. */
  filename: string;
  /** URL to fetch the file contents from. */
  url: string;
}

export interface DownloadFailure {
  filename: string;
  reason: string;
}

export interface BuildDownloadZipResult {
  /** The assembled archive, or `null` when no target downloaded successfully. */
  blob: Blob | null;
  /** One entry per target that could not be fetched. */
  failures: DownloadFailure[];
}

/** Maximum number of files fetched in parallel. */
const MAX_CONCURRENT_DOWNLOADS = 4;

/**
 * Downloads every target concurrently (capped at MAX_CONCURRENT_DOWNLOADS to
 * avoid opening hundreds of sockets on large testdata sets) and packs the
 * ones that succeed into a single in-memory ZIP. Unlike a fail-fast approach,
 * a failed download never aborts its siblings — the caller receives the
 * archive of whatever downloaded plus a `failures` list describing what was
 * skipped.
 *
 * Downloads run via a small async pool; the archive is built synchronously
 * with `fflate.zipSync` (no worker / streaming), which keeps behaviour
 * deterministic and testable but holds every downloaded file in memory at
 * once.
 *
 * LIMITATION: for production-grade streaming of multi-GB archives, switch to
 * the server-side `get_links` pre-signed-URL endpoint and pipe each response
 * into a `TransformStream` that writes a streaming ZIP (e.g. via a Service
 * Worker or `@zip.js/zip.js`). Out of scope for this fix.
 *
 * An abort is treated as a no-op rather than an error: the returned result is
 * `{ blob: null, failures: [] }`. Aborts never produce per-file failure
 * entries — the caller asked to cancel, so the absence of output is the
 * expected outcome, not a per-target problem to report.
 *
 * @param targets files to download and zip.
 * @param signal optional AbortSignal; aborting returns `{blob:null,failures:[]}`
 *   regardless of how many targets had already completed.
 */
export async function buildDownloadZip(
  targets: DownloadTarget[],
  signal?: AbortSignal,
): Promise<BuildDownloadZipResult> {
  if (!targets.length) return { blob: null, failures: [] };

  const files: Zippable = {};
  const failures: DownloadFailure[] = [];
  const settled: Array<PromiseSettledResult<{ filename: string, data: Uint8Array }>> = new Array(targets.length);

  let next = 0;
  const workers = Array.from(
    { length: Math.min(MAX_CONCURRENT_DOWNLOADS, targets.length) },
    async () => {
      while (true) {
        if (signal?.aborted) return;
        // Yield to the event loop so the UI thread can paint progress /
        // respond to abort signals between bursts.
        await Promise.resolve();
        const i = next++;
        if (i >= targets.length) return;
        const target = targets[i];
        settled[i] = await (async () => {
          try {
            const res = await fetch(target.url, { signal });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const buf = await res.arrayBuffer();
            return { status: 'fulfilled' as const, value: { filename: target.filename, data: new Uint8Array(buf) } };
          } catch (reason) {
            return { status: 'rejected' as const, reason };
          }
        })();
      }
    },
  );
  await Promise.all(workers);

  // Abort: drop all results (successes and rejections alike) — the caller
  // asked to cancel, so any completed downloads are intentionally discarded.
  if (signal?.aborted) return { blob: null, failures: [] };

  const results = settled.filter((r): r is PromiseSettledResult<{ filename: string, data: Uint8Array }> => r !== undefined);

  // Map each settled result back to its original target so `failures` carries
  // the original filename. The pool order is deterministic (workers fetch
  // strictly increasing indices), so the settled array index equals the
  // target index for the entries it contains; missing entries map to nothing.
  settled.forEach((result, index) => {
    if (!result) return;
    const target = targets[index];
    if (result.status === 'fulfilled') {
      files[result.value.filename] = result.value.data;
    } else {
      const err = result.reason as { message?: string, name?: string } | undefined;
      const reason = (err && typeof err === 'object' && (err.message || err.name))
        ? String(err.message || err.name)
        : String(result.reason);
      failures.push({ filename: target.filename, reason });
    }
  });

  if (!Object.keys(files).length) return { blob: null, failures };

  const zipped = zipSync(files);
  const blob = new Blob([zipped], { type: 'application/zip' });
  return { blob, failures };
}
