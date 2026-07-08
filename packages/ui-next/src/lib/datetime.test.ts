/* @vitest-environment happy-dom */
import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime, objectIdTime, timeAgo } from './datetime';

// Pin a deterministic now (2026-07-08T00:00:00Z) so timeAgo buckets are stable regardless
// of the host clock. Adjust per CI clock skew only if assertions fail.
const NOW = new Date('2026-07-08T00:00:00Z').getTime();

describe('formatDate', () => {
  it('renders default zh-CN year-month-day', () => {
    expect(formatDate('2026-07-08T00:00:00Z')).toBe('2026/07/08');
  });
  it('accepts custom Intl options', () => {
    expect(formatDate('2026-07-08T00:00:00Z', { day: 'numeric' })).toBe('2026年7月8日');
  });
});

describe('formatDateTime', () => {
  it('renders year-month-day hour:minute', () => {
    expect(formatDateTime('2026-07-08T13:45:00Z')).toMatch(/^2026\/07\/08\s*\d{2}:45$/);
  });
});

describe('timeAgo', () => {
  it('seconds bucket', () => {
    expect(timeAgo(new Date(NOW - 5_000).toISOString(), NOW)).toBe('几秒前');
  });
  it('minutes bucket', () => {
    expect(timeAgo(new Date(NOW - 5 * 60_000).toISOString(), NOW)).toBe('5分钟前');
  });
  it('hours bucket', () => {
    expect(timeAgo(new Date(NOW - 3 * 3600_000).toISOString(), NOW)).toBe('3小时前');
  });
  it('days bucket', () => {
    expect(timeAgo(new Date(NOW - 4 * 86_400_000).toISOString(), NOW)).toBe('4天前');
  });
  it('months bucket', () => {
    expect(timeAgo(new Date(NOW - 90 * 86_400_000).toISOString(), NOW)).toBe('3个月前');
  });
  it('years bucket', () => {
    expect(timeAgo(new Date(NOW - 2 * 365 * 86_400_000).toISOString(), NOW)).toBe('2年前');
  });
});

describe('objectIdTime', () => {
  it('extracts the 4-byte timestamp from a hex ObjectId (ms)', () => {
    // 0x69000000 = 2026-01-01T00:00:00Z roughly; just assert the parsing shape.
    const t = objectIdTime('690101000000000000000000');
    expect(t).toBe(0x69010100 * 1000);
  });
  it('returns 0 for an empty hex', () => {
    expect(objectIdTime('')).toBe(0);
  });
});