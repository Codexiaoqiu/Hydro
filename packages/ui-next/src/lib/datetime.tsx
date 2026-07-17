/**
 * Date helpers. Pure functions; no React deps. zh-CN locale hardcoded to match
 * the rest of ui-next (see problem_main.tsx).
 */

export function formatDate(
  iso: string,
  opts?: Intl.DateTimeFormatOptions,
): string {
  // Default: slashed 2-digit ("2026/07/08"). When the caller passes custom opts,
  // use the long-form base ("2026年7月8日") with user overrides merged in.
  const base: Intl.DateTimeFormatOptions = opts
    ? { year: 'numeric', month: 'long', day: 'numeric' }
    : { year: 'numeric', month: '2-digit', day: '2-digit' };
  return new Intl.DateTimeFormat('zh-CN', { ...base, ...opts }).format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function timeAgo(iso: string, now = Date.now()): string {
  const diff = now - new Date(iso).getTime();
  const rtf = new Intl.RelativeTimeFormat('zh-CN', { numeric: 'auto' });
  if (diff < 60_000) return '几秒前';
  if (diff < 3600_000) return rtf.format(-Math.round(diff / 60_000), 'minute');
  if (diff < 86400_000) return rtf.format(-Math.round(diff / 3600_000), 'hour');
  if (diff < 30 * 86400_000) return rtf.format(-Math.round(diff / 86_400_000), 'day');
  if (diff < 365 * 86400_000) return rtf.format(-Math.round(diff / (30 * 86400_000)), 'month');
  return rtf.format(-Math.round(diff / (365 * 86400_000)), 'year');
}

/** Extract the embedded timestamp from a hex ObjectId (first 4 bytes = seconds since epoch). */
export function objectIdTime(hex: string): number {
  if (!hex || hex.length < 8) return 0;
  return Number.parseInt(hex.slice(0, 8), 16) * 1000;
}
