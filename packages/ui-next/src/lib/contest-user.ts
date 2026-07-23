/**
 * Pure resume eligibility check used by `components/contest/ContestUserTable.tsx`
 * and `pages/contest_user.tsx`. Centralises the boundary conditions so a
 * row renderer and a row action (Rank / UnRank / Resume / Delete) cannot drift.
 *
 * Resume is allowed when ALL of the following hold (mirroring the legacy
 * `pages/contest_user.html` button states):
 *
 *   1. `tsdoc.endAt` is present (the attendee actually has a stored deadline)
 *   2. the contest has not yet ended:  `now < tdoc.endAt`
 *   3. the attendee's deadline is strictly inside the contest window:
 *      `tsdoc.endAt < tdoc.endAt`
 *   4. if the contest is a duration-style contest (`tdoc.duration > 0`) the
 *      attendee still has personal time remaining:
 *      `now - tsdoc.startAt < tdoc.duration * 3_600_000`
 *
 * A missing `tsdoc.startAt` is treated as "not started yet" → no elapsed
 * consumption, so the duration branch is satisfied.
 */
export function canResumeContestUser(
  tdoc: { endAt: string; duration?: number },
  tsdoc: { startAt?: string; endAt?: string },
  now: number,
): boolean {
  if (!tsdoc?.endAt) return false;
  const contestEnd = new Date(tdoc.endAt).getTime();
  if (now >= contestEnd) return false;
  const userEnd = new Date(tsdoc.endAt).getTime();
  if (userEnd >= contestEnd) return false;
  if (tdoc.duration && tsdoc.startAt) {
    const elapsed = now - new Date(tsdoc.startAt).getTime();
    if (elapsed >= tdoc.duration * 3_600_000) return false;
  }
  return true;
}
