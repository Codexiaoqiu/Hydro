/* @vitest-environment happy-dom */
import { describe, expect, it } from 'vitest';
import type { SerializedTdoc } from '../sections/types';
import {
  isDone,
  isExtended,
  isOngoing,
  isUpcoming,
  renderDuration,
  statusText,
} from './contest-status';

// Anchor "now" so bucket boundaries are deterministic.
const NOW = new Date('2026-07-08T12:00:00Z').getTime();

function tdoc(over: Partial<SerializedTdoc> = {}): SerializedTdoc {
  return {
    _id: '60a000000000000000000001',
    docId: '60a000000000000000000001',
    title: 'Test',
    rule: 'acm',
    beginAt: new Date(NOW - 3600_000).toISOString(),
    endAt: new Date(NOW + 3600_000).toISOString(),
    ...over,
  };
}

describe('isOngoing', () => {
  it('true inside [beginAt, endAt)', () => {
    expect(isOngoing(tdoc(), NOW)).toBe(true);
  });
  it('false exactly at endAt', () => {
    expect(isOngoing(tdoc({ endAt: new Date(NOW).toISOString() }), NOW)).toBe(false);
  });
  it('false before beginAt', () => {
    expect(isOngoing(
      tdoc({
        beginAt: new Date(NOW + 60_000).toISOString(),
        endAt: new Date(NOW + 3600_000).toISOString(),
      }),
      NOW,
    )).toBe(false);
  });
});

describe('isUpcoming', () => {
  it('true within next 7 days', () => {
    expect(isUpcoming(
      tdoc({
        beginAt: new Date(NOW + 3 * 86_400_000).toISOString(),
        endAt: new Date(NOW + 3 * 86_400_000 + 3600_000).toISOString(),
      }),
      7,
      NOW,
    )).toBe(true);
  });
  it('false 30 days out by default', () => {
    expect(isUpcoming(
      tdoc({
        beginAt: new Date(NOW + 30 * 86_400_000).toISOString(),
        endAt: new Date(NOW + 30 * 86_400_000 + 3600_000).toISOString(),
      }),
      7,
      NOW,
    )).toBe(false);
  });
  it('false when already started', () => {
    expect(isUpcoming(tdoc(), 7, NOW)).toBe(false);
  });
});

describe('isDone', () => {
  it('true after endAt', () => {
    expect(isDone(
      tdoc({
        beginAt: new Date(NOW - 7200_000).toISOString(),
        endAt: new Date(NOW - 60_000).toISOString(),
      }),
      NOW,
    )).toBe(true);
  });
});

describe('isExtended', () => {
  it('true inside penalty window', () => {
    expect(isExtended(
      tdoc({ penaltySince: new Date(NOW - 30 * 60_000).toISOString() }),
      NOW,
    )).toBe(true);
  });
  it('false when no penaltySince', () => {
    expect(isExtended(tdoc(), NOW)).toBe(false);
  });
});

describe('renderDuration', () => {
  it('uses t.duration when set', () => {
    expect(renderDuration(tdoc({ duration: 5 }))).toBe('5.0');
  });
  it('derives from endAt - beginAt in hours', () => {
    expect(renderDuration(tdoc({
      duration: undefined,
      beginAt: new Date(NOW).toISOString(),
      endAt: new Date(NOW + 2 * 3600_000).toISOString(),
    }))).toBe('2.0');
  });
  it("returns '?' when both missing", () => {
    expect(renderDuration(tdoc({ duration: undefined, beginAt: '', endAt: '' }))).toBe('?');
  });
});

describe('statusText', () => {
  it('已结束', () => expect(statusText(
    tdoc({ beginAt: new Date(NOW - 7200_000).toISOString(), endAt: new Date(NOW - 60_000).toISOString() }),
    undefined,
    NOW,
  )).toBe('已结束'));
  it('进行中', () => expect(statusText(tdoc(), undefined, NOW)).toBe('进行中'));
  it('未开始 (upcoming)', () => expect(statusText(
    tdoc({
      beginAt: new Date(NOW + 3600_000).toISOString(),
      endAt: new Date(NOW + 7200_000).toISOString(),
    }),
    undefined,
    NOW,
  )).toBe('未开始'));
  it('trainings: 已完成 when enroll & done', () => expect(statusText(
    tdoc({ beginAt: new Date(NOW - 7200_000).toISOString(), endAt: new Date(NOW - 60_000).toISOString() }),
    { attend: 1, enroll: 1, done: true, donePids: ['1'], totalPids: 1 },
    NOW,
  )).toBe('已完成'));
});
