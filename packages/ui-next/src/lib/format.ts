/**
 * Display formatting helpers used across `ui-next`.
 *
 * Keep these stable and dependency-free so every component can import them
 * from a server / client boundary (which is the rendering path used by the
 * `next` renderer with `asFallback: true`).
 *
 * Two byte-size helpers coexist on purpose:
 *   - `formatFileSize` — the F2 contract for `ProblemFiles.tsx`. Decimal or
 *     binary base with a space between the number and the unit (e.g.
 *     "1.0 KiB"). Accepts non-negative numbers; returns '' for invalid.
 *   - `formatBytes`   — the F3 contract. Strict binary (KiB/MiB/GiB/TiB) with
 *     no separator and the IEC "iB" suffix, matching `framework/utils/lib/
 *     common.ts#size()`. Treats `0` and invalid inputs as placeholders.
 *
 * Pick whichever one matches the downstream consumer's expectations;
 * `formatBytes` is preferred for new code in the problem-detail sidebar so
 * ui-next stays numerically identical to ui-default.
 */

export interface FormatFileSizeOptions {
  /**
   * Number of decimal digits kept on the resulting number. Default `1` for
   * sub-GiB units (matches `framework/utils/lib/common.ts#size`) and `2` for
   * `GiB` and above where precision matters more.
   */
  decimals?: number;
  /**
   * Base for the conversion. Defaults to `1024` (binary, `KiB/MiB/GiB`) to
   * match the framework helper; pass `1000` for the SI decimal style.
   */
  base?: 1000 | 1024;
}

const BINARY_UNITS = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
const DECIMAL_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

/**
 * Render a byte count as a human-friendly string with a space between the
 * number and the unit (e.g. `"1.5 KiB"`). Used by the F2 sidebar file list.
 *
 * Negative or non-finite inputs return `''` so the caller can keep the
 * surrounding element mounted without showing `NaN B` to the user.
 */
export function formatFileSize(bytes: number, opts: FormatFileSizeOptions = {}): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  const base = opts.base ?? 1024;
  const units = base === 1024 ? BINARY_UNITS : DECIMAL_UNITS;
  if (bytes < base) return `${bytes} ${units[0]}`;

  let value = bytes;
  let unitIndex = 0;
  while (value >= base && unitIndex < units.length - 1) {
    value /= base;
    unitIndex += 1;
  }
  const decimals = opts.decimals ?? (unitIndex >= 3 ? 2 : 1);
  return `${value.toFixed(decimals)} ${units[unitIndex]}`;
}

/**
 * Framework-compatible byte formatter that does not separate the number and
 * the unit. Mirrors `framework/utils/lib/common.ts#size()` numerically so
 * ui-default and ui-next render the same string for the same byte count.
 *
 *   - `undefined` / `null` / NaN / negative → '—'
 *   - `0`                                → '—' (treats no-data as a
 *                                            placeholder, matching the test
 *                                            contract)
 *   - exact GiB multiples → '1GiB'
 *   - non-multiples → one-decimal GiB (e.g. '2.5GiB')
 *
 * Use `formatBytes(bytes, { binary: false })` for decimal (KB/MB/GB) when
 * the downstream consumer explicitly wants SI units.
 */
export interface FormatBytesOptions {
  /** `true` (default) for binary base (1024), `false` for decimal (1000). */
  binary?: boolean;
}

const KIB = 1024;
const MIB = KIB ** 2;
const GIB = KIB ** 3;
const TIB = KIB ** 4;
const KB = 1000;
const MB = KB ** 2;
const GB = KB ** 3;
const TB = KB ** 4;

export function formatBytes(
  bytes: number | null | undefined,
  opts: FormatBytesOptions = {},
): string {
  if (
    bytes === undefined
    || bytes === null
    || !Number.isFinite(bytes)
    || bytes < 0
  ) return '—';
  if (bytes === 0) return '—';
  const binary = opts.binary !== false;
  if (binary) {
    if (bytes >= TIB) return `${trim(bytes / TIB)}TiB`;
    if (bytes >= GIB) return `${trim(bytes / GIB)}GiB`;
    if (bytes >= MIB) return `${trim(bytes / MIB)}MiB`;
    if (bytes >= KIB) return `${trim(bytes / KIB)}KiB`;
    return `${bytes}B`;
  } else {
    if (bytes >= TB) return `${trim(bytes / TB)}TB`;
    if (bytes >= GB) return `${trim(bytes / GB)}GB`;
    if (bytes >= MB) return `${trim(bytes / MB)}MB`;
    if (bytes >= KB) return `${trim(bytes / KB)}KB`;
    return `${bytes}B`;
  }
}

function trim(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(1).replace(/\.0$/, '');
}

/**
 * Render a count (`nSubmit` / `nAccept`) for display in a table cell.
 *   - `undefined` / `null` → '?' (no signal yet)
 *   - exactly 0           → '—' (we treat a literal zero count as "no data"
 *                              so the table doesn't render a misleading "0")
 *   - otherwise            → stringified number
 *
 * Originally lived in `lib/difficulty.ts`; moved here so any module that
 * needs to render counts (problem lists, dashboards) can share one helper.
 */
export function formatN(n: number | null | undefined): string {
  if (n === undefined || n === null) return '?';
  if (n === 0) return '—';
  return String(n);
}