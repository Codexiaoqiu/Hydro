import { describe, expect, it } from 'vitest';
import { canResumeContestUser } from './contest-user';

const HOUR = 3_600_000;

describe('canResumeContestUser', () => {
  const contestEnd = Date.UTC(2026, 11, 31, 0, 0, 0); // 2026-12-31T00:00:00Z
  const toIso = (ms: number) => new Date(ms).toISOString();
  const tdoc = (overrides: Record<string, unknown> = {}) => ({
    endAt: toIso(contestEnd),
    duration: 0,
    ...overrides,
  });
  const tsdoc = (overrides: Record<string, unknown> = {}) => ({
    endAt: toIso(contestEnd - HOUR), // user endAt < contest endAt
    startAt: undefined,
    ...overrides,
  });
  const inContest = contestEnd - HOUR / 2; // half hour before contest end

  it('returns false when tsdoc has no endAt', () => {
    expect(canResumeContestUser(
      tdoc(),
      tsdoc({ endAt: undefined }),
      inContest,
    )).toBe(false);
  });

  it('returns false when contest has already ended', () => {
    expect(canResumeContestUser(
      tdoc(),
      tsdoc(),
      contestEnd + 1,
    )).toBe(false);
  });

  it('returns false when tsdoc.endAt is at or after contest endAt', () => {
    expect(canResumeContestUser(
      tdoc(),
      tsdoc({ endAt: toIso(contestEnd) }),
      inContest,
    )).toBe(false);
    expect(canResumeContestUser(
      tdoc(),
      tsdoc({ endAt: toIso(contestEnd + HOUR) }),
      inContest,
    )).toBe(false);
  });

  it('returns true when tsdoc.endAt < contest endAt and contest is still ongoing', () => {
    expect(canResumeContestUser(
      tdoc(),
      tsdoc({ endAt: toIso(contestEnd - HOUR) }),
      inContest,
    )).toBe(true);
  });

  it('returns false when duration is exhausted (now - startAt >= duration * hour)', () => {
    const startAt = contestEnd - 10 * HOUR; // 10h ago
    expect(canResumeContestUser(
      tdoc({ duration: 5 }),
      tsdoc({ endAt: toIso(contestEnd - 1), startAt: toIso(startAt) }),
      contestEnd - 1,
    )).toBe(false);
  });

  it('returns true when duration exists and personal elapsed is under quota', () => {
    const startAt = contestEnd - 2 * HOUR; // started 2h ago
    expect(canResumeContestUser(
      tdoc({ duration: 5 }),
      tsdoc({ endAt: toIso(contestEnd - 1), startAt: toIso(startAt) }),
      contestEnd - 1,
    )).toBe(true);
  });

  it('treats duration = 0 as "no duration limit" (no elapsed check)', () => {
    const startAt = contestEnd - 100 * HOUR;
    expect(canResumeContestUser(
      tdoc({ duration: 0 }),
      tsdoc({ endAt: toIso(contestEnd - 1), startAt: toIso(startAt) }),
      contestEnd - 1,
    )).toBe(true);
  });

  it('treats missing startAt as "no elapsed consumption" when duration > 0', () => {
    expect(canResumeContestUser(
      tdoc({ duration: 5 }),
      tsdoc({ endAt: toIso(contestEnd - 1), startAt: undefined }),
      contestEnd - 1,
    )).toBe(true);
  });
});
