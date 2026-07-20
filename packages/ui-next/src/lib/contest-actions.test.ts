/* @vitest-environment happy-dom */
import { describe, expect, it } from 'vitest';
import type { SerializedContestStatusDoc, SerializedTdoc } from '../sections/types';
import { computeContestActions, type UserPerms } from './contest-actions';

// Use Date.now() as anchor so isOngoing/isDone (which default to Date.now())
// always see the fixture as "ongoing" by default. Per-test overrides shift
// endAt into the past or future relative to this same anchor.
const NOW = Date.now();

function makeTdoc(over: Partial<SerializedTdoc> = {}): SerializedTdoc {
  return {
    _id: '60a000000000000000000001',
    docId: '60a000000000000000000001',
    title: 'Test',
    rule: 'acm',
    beginAt: new Date(NOW - 3600_000).toISOString(),
    endAt: new Date(NOW + 3600_000).toISOString(),
    owner: 1,
    pids: [],
    allowPrint: false,
    ...over,
  };
}

function makeTsdoc(over: Partial<SerializedContestStatusDoc> = {}): SerializedContestStatusDoc {
  return { attend: 0, subscribe: 0, ...over };
}

function makeUser(over: Partial<UserPerms> = {}): UserPerms {
  return {
    _id: 1,
    hasPerm: () => false,
    own: () => false,
    ...over,
  };
}

describe('computeContestActions', () => {
  describe('canAttend', () => {
    it('false when already attended', () => {
      const flags = computeContestActions(
        makeTdoc(),
        makeTsdoc({ attend: 1 }),
        makeUser({ hasPerm: () => true }),
      );
      expect(flags.canAttend).toBe(false);
    });

    it('false when contest is done', () => {
      const flags = computeContestActions(
        makeTdoc({ endAt: new Date(NOW - 60_000).toISOString() }),
        null,
        makeUser({ hasPerm: () => true }),
      );
      expect(flags.canAttend).toBe(false);
    });

    it('false without permission', () => {
      const flags = computeContestActions(makeTdoc(), null, makeUser({ hasPerm: () => false }));
      expect(flags.canAttend).toBe(false);
    });

    it('true when not attended, ongoing, and has permission', () => {
      const flags = computeContestActions(makeTdoc(), null, makeUser({ hasPerm: () => true }));
      expect(flags.canAttend).toBe(true);
    });
  });

  describe('canEarlyEnd', () => {
    it('true when ongoing and attended and not homework', () => {
      const flags = computeContestActions(
        makeTdoc(),
        makeTsdoc({ attend: 1 }),
        makeUser(),
      );
      expect(flags.canEarlyEnd).toBe(true);
    });

    it('false for homework rule', () => {
      const flags = computeContestActions(
        makeTdoc({ rule: 'homework' }),
        makeTsdoc({ attend: 1 }),
        makeUser(),
      );
      expect(flags.canEarlyEnd).toBe(false);
    });

    it('false when not attended', () => {
      const flags = computeContestActions(makeTdoc(), null, makeUser());
      expect(flags.canEarlyEnd).toBe(false);
    });

    it('false when not ongoing', () => {
      const flags = computeContestActions(
        makeTdoc({ endAt: new Date(NOW - 60_000).toISOString() }),
        makeTsdoc({ attend: 1 }),
        makeUser(),
      );
      expect(flags.canEarlyEnd).toBe(false);
    });
  });

  describe('canSubscribe', () => {
    it('true when attended', () => {
      expect(computeContestActions(makeTdoc(), makeTsdoc({ attend: 1 }), makeUser()).canSubscribe).toBe(true);
    });

    it('false when not attended', () => {
      expect(computeContestActions(makeTdoc(), null, makeUser()).canSubscribe).toBe(false);
    });
  });

  describe('canShowScoreboard', () => {
    it('true when ongoing', () => {
      expect(computeContestActions(makeTdoc(), null, makeUser()).canShowScoreboard).toBe(true);
    });

    it('true when done', () => {
      const flags = computeContestActions(
        makeTdoc({ endAt: new Date(NOW - 60_000).toISOString() }),
        null,
        makeUser(),
      );
      expect(flags.canShowScoreboard).toBe(true);
    });

    it('false when not started and not done', () => {
      const flags = computeContestActions(
        makeTdoc({
          beginAt: new Date(NOW + 3600_000).toISOString(),
          endAt: new Date(NOW + 7200_000).toISOString(),
        }),
        null,
        makeUser(),
      );
      expect(flags.canShowScoreboard).toBe(false);
    });
  });

  describe('canShowHiddenScoreboard', () => {
    it('true only when done and has perm', () => {
      const flags = computeContestActions(
        makeTdoc({ endAt: new Date(NOW - 60_000).toISOString() }),
        null,
        makeUser({ hasPerm: (p) => p === 'PERM_VIEW_HIDDEN_CONTEST_SCOREBOARD' }),
      );
      expect(flags.canShowHiddenScoreboard).toBe(true);
    });

    it('false without perm', () => {
      const flags = computeContestActions(
        makeTdoc({ endAt: new Date(NOW - 60_000).toISOString() }),
        null,
        makeUser(),
      );
      expect(flags.canShowHiddenScoreboard).toBe(false);
    });
  });

  describe('canShowAllRecord', () => {
    it('true when done and has READ_RECORD_CODE perm', () => {
      const flags = computeContestActions(
        makeTdoc({ endAt: new Date(NOW - 60_000).toISOString() }),
        null,
        makeUser({ hasPerm: (p) => p === 'PERM_READ_RECORD_CODE' }),
      );
      expect(flags.canShowAllRecord).toBe(true);
    });

    it('false when ongoing even with perm', () => {
      const flags = computeContestActions(
        makeTdoc(),
        null,
        makeUser({ hasPerm: (p) => p === 'PERM_READ_RECORD_CODE' }),
      );
      expect(flags.canShowAllRecord).toBe(false);
    });
  });

  describe('canShowSelfRecord', () => {
    it('true when attended', () => {
      expect(computeContestActions(makeTdoc(), makeTsdoc({ attend: 1 }), makeUser()).canShowSelfRecord).toBe(true);
    });

    it('false when not attended', () => {
      expect(computeContestActions(makeTdoc(), null, makeUser()).canShowSelfRecord).toBe(false);
    });
  });

  describe('canEdit / canManage', () => {
    it('canEdit true when owner', () => {
      const tdoc = makeTdoc({ owner: 7 });
      const user = makeUser({ _id: 7, own: (d: { owner?: number | string }) => d.owner === 7 });
      expect(computeContestActions(tdoc, null, user).canEdit).toBe(true);
    });

    it('canEdit true when has PERM_EDIT_CONTEST', () => {
      const user = makeUser({ hasPerm: (p) => p === 'PERM_EDIT_CONTEST' });
      expect(computeContestActions(makeTdoc(), null, user).canEdit).toBe(true);
    });

    it('canManage same logic as canEdit', () => {
      const tdoc = makeTdoc({ owner: 7 });
      const user = makeUser({ _id: 7, own: (d: { owner?: number | string }) => d.owner === 7 });
      const flags = computeContestActions(tdoc, null, user);
      expect(flags.canEdit).toBe(true);
      expect(flags.canManage).toBe(true);
    });

    it('false when neither owner nor perm', () => {
      expect(computeContestActions(makeTdoc(), null, makeUser()).canEdit).toBe(false);
    });
  });

  describe('canPrint', () => {
    it('true when allowPrint and ongoing', () => {
      const tdoc = makeTdoc({ allowPrint: true });
      expect(computeContestActions(tdoc, null, makeUser()).canPrint).toBe(true);
    });

    it('true when allowPrint and done', () => {
      const tdoc = makeTdoc({ allowPrint: true, endAt: new Date(NOW - 60_000).toISOString() });
      expect(computeContestActions(tdoc, null, makeUser()).canPrint).toBe(true);
    });

    it('false when allowPrint is false', () => {
      const tdoc = makeTdoc({ allowPrint: false });
      expect(computeContestActions(tdoc, null, makeUser()).canPrint).toBe(false);
    });
  });

  describe('canViewCode', () => {
    it('true when done and has READ_RECORD_CODE perm', () => {
      const flags = computeContestActions(
        makeTdoc({ endAt: new Date(NOW - 60_000).toISOString() }),
        null,
        makeUser({ hasPerm: (p) => p === 'PERM_READ_RECORD_CODE' }),
      );
      expect(flags.canViewCode).toBe(true);
    });

    it('false when ongoing', () => {
      const flags = computeContestActions(
        makeTdoc(),
        null,
        makeUser({ hasPerm: (p) => p === 'PERM_READ_RECORD_CODE' }),
      );
      expect(flags.canViewCode).toBe(false);
    });
  });

  describe('canShowDiscussion / canCreateDiscussion', () => {
    it('canShowDiscussion requires VIEW_DISCUSSION perm', () => {
      const user = makeUser({ hasPerm: (p) => p === 'PERM_VIEW_DISCUSSION' });
      expect(computeContestActions(makeTdoc(), null, user).canShowDiscussion).toBe(true);
    });

    it('canCreateDiscussion requires CREATE_DISCUSSION perm', () => {
      const user = makeUser({ hasPerm: (p) => p === 'PERM_CREATE_DISCUSSION' });
      expect(computeContestActions(makeTdoc(), null, user).canCreateDiscussion).toBe(true);
    });

    it('false without perms', () => {
      const flags = computeContestActions(makeTdoc(), null, makeUser());
      expect(flags.canShowDiscussion).toBe(false);
      expect(flags.canCreateDiscussion).toBe(false);
    });
  });

  describe('null tsdoc handling', () => {
    it('does not throw when tsdoc is null and computes flags based on tdoc', () => {
      expect(() => computeContestActions(makeTdoc(), null, makeUser())).not.toThrow();
    });
  });
});
