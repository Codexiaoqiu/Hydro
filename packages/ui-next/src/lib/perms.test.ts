import { describe, expect, it } from 'vitest';
import { PERM, PRIV } from './perm-constants';
import {
  canCreateContest, canCreateProblem, canEditProblem, canRejudgeProblem,
  canSubmitProblem, canViewContest, canViewDiscussion, canViewHiddenContest,
  canViewProblemSolution, hasPerm, hasPriv, isLoggedIn, isRegisteredUser, own,
} from './perms';

const big = (n: bigint) => `BigInt::${n}`;

describe('hasPerm', () => {
  it('returns false when UserContext is missing', () => {
    expect(hasPerm(undefined, PERM.PERM_VIEW_CONTEST)).toBe(false);
    expect(hasPerm(null, PERM.PERM_VIEW_CONTEST)).toBe(false);
  });

  it('returns false when perm field is missing or malformed', () => {
    expect(hasPerm({}, PERM.PERM_VIEW_CONTEST)).toBe(false);
    expect(hasPerm({ perm: '' }, PERM.PERM_VIEW_CONTEST)).toBe(false);
    expect(hasPerm({ perm: 'not-a-bigint' }, PERM.PERM_VIEW_CONTEST)).toBe(false);
    expect(hasPerm({ perm: 'BigInt::abc' }, PERM.PERM_VIEW_CONTEST)).toBe(false);
  });

  it('detects exactly the view contest bit', () => {
    const onlyView = { perm: big(1n << 41n) };
    expect(hasPerm(onlyView, PERM.PERM_VIEW_CONTEST)).toBe(true);
    expect(hasPerm(onlyView, PERM.PERM_CREATE_CONTEST)).toBe(false);
    expect(hasPerm(onlyView, PERM.PERM_VIEW_HIDDEN_CONTEST)).toBe(false);
  });

  it('detects exactly the create contest bit', () => {
    const onlyCreate = { perm: big(1n << 44n) };
    expect(hasPerm(onlyCreate, PERM.PERM_VIEW_CONTEST)).toBe(false);
    expect(hasPerm(onlyCreate, PERM.PERM_CREATE_CONTEST)).toBe(true);
    expect(hasPerm(onlyCreate, PERM.PERM_VIEW_HIDDEN_CONTEST)).toBe(false);
  });

  it('detects a union of bits', () => {
    const both = { perm: big((1n << 41n) | (1n << 44n)) };
    expect(canViewContest(both)).toBe(true);
    expect(canCreateContest(both)).toBe(true);
    expect(canViewHiddenContest(both)).toBe(false);
  });

  it('named helpers use mask semantics', () => {
    const viewCreate = { perm: big((1n << 41n) | (1n << 44n)) };
    const viewOnly = { perm: big(1n << 41n) };
    expect(canViewContest(viewCreate)).toBe(true);
    expect(canCreateContest(viewCreate)).toBe(true);
    expect(canViewContest(viewOnly)).toBe(true);
    expect(canCreateContest(viewOnly)).toBe(false);
  });

  it('locks the bit positions used by the page-level checks', () => {
    // Regression guard for the old hard-coded numbers: bit 8 is *not* submit.
    expect(PERM.PERM_SUBMIT_PROBLEM).toBe(1n << 9n);
    expect(PERM.PERM_REJUDGE_PROBLEM).toBe(1n << 13n);
    expect(PERM.PERM_VIEW_DISCUSSION).toBe(1n << 27n);
    expect(PERM.PERM_VIEW_PROBLEM_SOLUTION).toBe(1n << 15n);
    expect(PERM.PERM_VIEW_PROBLEM_SOLUTION_ACCEPT).toBe(1n << 65n);
    expect(PERM.PERM_EDIT_PROBLEM_SELF).toBe(1n << 6n);
    expect(PERM.PERM_EDIT_PROBLEM).toBe(1n << 5n);
    expect(PERM.PERM_CREATE_PROBLEM).toBe(1n << 4n);
  });

  it('detects submit / rejudge / discussion / solution via named helpers', () => {
    const ctx = { perm: big(
      PERM.PERM_SUBMIT_PROBLEM
      | PERM.PERM_REJUDGE_PROBLEM
      | PERM.PERM_VIEW_DISCUSSION
      | PERM.PERM_VIEW_PROBLEM_SOLUTION
      | PERM.PERM_VIEW_PROBLEM_SOLUTION_ACCEPT,
    ) };
    expect(canSubmitProblem(ctx)).toBe(true);
    expect(canRejudgeProblem(ctx)).toBe(true);
    expect(canViewDiscussion(ctx)).toBe(true);
    expect(canViewProblemSolution(ctx)).toBe(true);
  });

  it('treats scope as an additional AND mask', () => {
    // User has the perm, but their session scope doesn't — effective: no.
    const ctx = { perm: big(PERM.PERM_SUBMIT_PROBLEM), scope: big(0n) };
    expect(canSubmitProblem(ctx)).toBe(false);
    const ctx2 = {
      perm: big(PERM.PERM_SUBMIT_PROBLEM),
      scope: big(PERM.PERM_SUBMIT_PROBLEM),
    };
    expect(canSubmitProblem(ctx2)).toBe(true);
  });
});

describe('hasPriv / isRegisteredUser', () => {
  it('returns false for missing context', () => {
    expect(hasPriv(undefined, PRIV.PRIV_USER_PROFILE)).toBe(false);
  });

  it('reads plain-number priv field', () => {
    expect(hasPriv({ priv: PRIV.PRIV_USER_PROFILE }, PRIV.PRIV_USER_PROFILE)).toBe(true);
    expect(hasPriv({ priv: 0 }, PRIV.PRIV_USER_PROFILE)).toBe(false);
  });

  it('isRegisteredUser requires both login and the priv bit', () => {
    expect(isRegisteredUser({ _id: 1, priv: PRIV.PRIV_USER_PROFILE })).toBe(true);
    expect(isRegisteredUser({ _id: 1, priv: 0 })).toBe(false);
    expect(isRegisteredUser({ _id: 0, priv: PRIV.PRIV_USER_PROFILE })).toBe(false);
  });
});

describe('own', () => {
  it('returns false without a logged-in user', () => {
    expect(own(null, { owner: 1 })).toBe(false);
    expect(own({ _id: 0 }, { owner: 0 })).toBe(false);
  });

  it('matches owner', () => {
    expect(own({ _id: 7 }, { owner: 7 })).toBe(true);
    expect(own({ _id: 7 }, { owner: 8 })).toBe(false);
  });

  it('matches maintainer array', () => {
    expect(own({ _id: 7 }, { owner: 8, maintainer: [7, 9] })).toBe(true);
  });

  it('requires the SELF perm when one is supplied', () => {
    // No perm bit: cannot edit someone else's problem even if they own it.
    const ctx = { _id: 7, perm: big(0n) };
    expect(own(ctx, { owner: 7 }, PERM.PERM_EDIT_PROBLEM_SELF)).toBe(false);
    const ctx2 = { _id: 7, perm: big(PERM.PERM_EDIT_PROBLEM_SELF) };
    expect(own(ctx2, { owner: 7 }, PERM.PERM_EDIT_PROBLEM_SELF)).toBe(true);
  });
});

describe('canCreateProblem / canEditProblem', () => {
  it('canCreateProblem gates on the create bit', () => {
    expect(canCreateProblem({ perm: big(PERM.PERM_CREATE_PROBLEM) })).toBe(true);
    expect(canCreateProblem({ perm: big(0n) })).toBe(false);
  });

  it('canEditProblem accepts either SELF ownership or the global bit', () => {
    const ownerSelf = {
      _id: 3,
      perm: big(PERM.PERM_EDIT_PROBLEM_SELF),
    };
    expect(canEditProblem(ownerSelf, { owner: 3 })).toBe(true);
    expect(canEditProblem(ownerSelf, { owner: 4 })).toBe(false);
    const admin = { perm: big(PERM.PERM_EDIT_PROBLEM) };
    expect(canEditProblem(admin, { owner: 4 })).toBe(true);
  });
});

describe('isLoggedIn', () => {
  it('returns true only for positive uid', () => {
    expect(isLoggedIn(undefined)).toBe(false);
    expect(isLoggedIn(null)).toBe(false);
    expect(isLoggedIn({})).toBe(false);
    expect(isLoggedIn({ _id: 0 })).toBe(false);
    expect(isLoggedIn({ _id: 1 })).toBe(true);
  });
});
