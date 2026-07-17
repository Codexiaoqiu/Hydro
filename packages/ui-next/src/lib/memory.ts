// UI-side formatter for the byte counts the backend hands us in
// pdoc.config.memoryMin / memoryMax (see problem-detail sidebar).
//
// We don't reuse @hydrooj/utils' parseMemoryMB here because:
//   1. The package is server-only and pulls in Node-only deps at the top
//      level (path, fs) that the bundler would either dead-code out or
//      fail on.
//   2. parseMemoryMB expects a string with a unit suffix ("256m", "1g")
//      and returns MiB; on the client we already have a raw byte count and
//      just want to render it. Doing the arithmetic ourselves keeps the
//      formatter honest about which unit it chose and avoids surprises
//      when the server changes its scale.

const KIB = 1024;
const MIB = KIB * 1024;
const GIB = MIB * 1024;
const TIB = GIB * 1024;

/**
 * Format a memory-limit byte count for display.
 *
 *   - `undefined` / `null` → "—" (no limit configured)
 *   - `0`                  → "0B" (let the user see the problem exists, just
 *                              has no limit; not the same as "no data")
 *   - exact GiB multiples  → "1GiB"
 *   - exact MiB multiples  → "256MiB"
 *   - exact KiB multiples  → "1024KiB"
 *   - everything else      → one-decimal GiB/MiB/KiB with trailing "iB" suffix
 *
 * Thresholds are based on the *raw byte count* (not the formatted value),
 * so 1_500_000_000 bytes → "1.4GiB" rather than rounding up to 2GiB.
 */
export function formatMemoryMB(bytes?: number | null): string {
  if (bytes === undefined || bytes === null) return '—';
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes === 0) return '0B';
  if (bytes >= TIB && bytes % TIB === 0) return `${bytes / TIB}TiB`;
  if (bytes >= TIB) return `${(bytes / TIB).toFixed(1)}TiB`;
  if (bytes >= GIB && bytes % GIB === 0) return `${bytes / GIB}GiB`;
  if (bytes >= GIB) return `${(bytes / GIB).toFixed(1)}GiB`;
  if (bytes >= MIB && bytes % MIB === 0) return `${bytes / MIB}MiB`;
  if (bytes >= MIB) return `${(bytes / MIB).toFixed(1)}MiB`;
  if (bytes >= KIB && bytes % KIB === 0) return `${bytes / KIB}KiB`;
  if (bytes >= KIB) return `${(bytes / KIB).toFixed(1)}KiB`;
  return `${bytes}B`;
}
