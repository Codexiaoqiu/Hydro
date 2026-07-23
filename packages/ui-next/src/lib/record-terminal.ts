/**
 * Source-of-truth for "is this record status a terminal verdict?" used by:
 *
 *   - `pages/record_detail.tsx` — decides when to forward the status to the
 *     parent window via postMessage (iframe protocol).
 *   - `components/problem/ProblemGenerateTestdata.tsx` — decides when to close
 *     the generate-testdata modal and refresh the testdata list.
 *
 * Keeping one Set keyed by `@hydrooj/common` `STATUS.*` values is cheaper and
 * safer than indexing into a label-array (`STATUS_KEYS[s]`) which leaks the
 * 0..7 assumptions of the legacy UI and silently misses STATUS_SYSTEM_ERROR (8),
 * STATUS_CANCELED (9), STATUS_HACKED (11), STATUS_HACK_SUCCESSFUL (32) and
 * STATUS_HACK_UNSUCCESSFUL (33).
 *
 * "Terminal" here means: judging will not produce further state changes for
 * this record. In-progress statuses (WAITING / COMPILING / JUDGING / FETCHED)
 * are deliberately excluded so consumers do not accidentally treat them as
 * a finished verdict.
 */
import { STATUS } from '@hydrooj/common';

/**
 * `STATUS.*` values considered a finished verdict.
 *
 * Includes the legacy 1..7 buckets, the missing-in-array system/hack/cancel
 * states (8, 9, 11, 32, 33), and the post-judging cleanup states
 * (`STATUS_ETC`, `STATUS_IGNORED`, `STATUS_FORMAT_ERROR`) so the parent
 * reliably tears down the iframe when the judge finishes — regardless of
 * whether the verdict is AC, WA, or any of the verifier-side failures.
 */
const TERMINAL_STATUSES: ReadonlySet<number> = new Set<number>([
  STATUS.STATUS_ACCEPTED,                 //  1
  STATUS.STATUS_WRONG_ANSWER,             //  2
  STATUS.STATUS_TIME_LIMIT_EXCEEDED,      //  3
  STATUS.STATUS_MEMORY_LIMIT_EXCEEDED,    //  4
  STATUS.STATUS_OUTPUT_LIMIT_EXCEEDED,    //  5
  STATUS.STATUS_RUNTIME_ERROR,            //  6
  STATUS.STATUS_COMPILE_ERROR,            //  7
  STATUS.STATUS_SYSTEM_ERROR,             //  8
  STATUS.STATUS_CANCELED,                 //  9
  STATUS.STATUS_ETC,                      // 10
  STATUS.STATUS_HACKED,                   // 11
  STATUS.STATUS_IGNORED,                  // 30
  STATUS.STATUS_FORMAT_ERROR,             // 31
  STATUS.STATUS_HACK_SUCCESSFUL,          // 32
  STATUS.STATUS_HACK_UNSUCCESSFUL,        // 33
]);

/** Statuses that explicitly mean "still running" — must never be reported as
 *  terminal even by accident. */
const IN_PROGRESS_STATUSES: ReadonlySet<number> = new Set<number>([
  STATUS.STATUS_WAITING,    //  0
  STATUS.STATUS_JUDGING,    // 20
  STATUS.STATUS_COMPILING,  // 21
  STATUS.STATUS_FETCHED,    // 22
]);

/**
 * Type-guard: returns true only when `status` is a finite integer present in
 * the terminal set. Anything else (undefined, NaN, finite-but-unknown, the
 * in-progress statuses above) returns false.
 */
export function isTerminalStatus(status: unknown): status is number {
  return typeof status === 'number'
    && Number.isFinite(status)
    && !IN_PROGRESS_STATUSES.has(status)
    && TERMINAL_STATUSES.has(status);
}

/** True when `status` is one of the explicit "still running" values. */
export function isInProgressStatus(status: unknown): status is number {
  return typeof status === 'number' && IN_PROGRESS_STATUSES.has(status);
}
