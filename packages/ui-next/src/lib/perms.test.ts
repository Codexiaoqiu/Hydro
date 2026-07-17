import { describe, expect, it } from 'vitest';
import { PERM } from './perm-constants';
import { canCreateContest, canViewContest, canViewHiddenContest, hasPerm } from './perms';

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
    const onlyView = `BigInt::${1n << 41n}`;
    expect(hasPerm({ perm: onlyView }, PERM.PERM_VIEW_CONTEST)).toBe(true);
    expect(hasPerm({ perm: onlyView }, PERM.PERM_CREATE_CONTEST)).toBe(false);
    expect(hasPerm({ perm: onlyView }, PERM.PERM_VIEW_HIDDEN_CONTEST)).toBe(false);
  });

  it('detects exactly the create contest bit', () => {
    const onlyCreate = `BigInt::${1n << 44n}`;
    expect(hasPerm({ perm: onlyCreate }, PERM.PERM_VIEW_CONTEST)).toBe(false);
    expect(hasPerm({ perm: onlyCreate }, PERM.PERM_CREATE_CONTEST)).toBe(true);
    expect(hasPerm({ perm: onlyCreate }, PERM.PERM_VIEW_HIDDEN_CONTEST)).toBe(false);
  });

  it('detects a union of bits', () => {
    const both = `BigInt::${(1n << 41n) | (1n << 44n)}`;
    expect(canViewContest({ perm: both })).toBe(true);
    expect(canCreateContest({ perm: both })).toBe(true);
    expect(canViewHiddenContest({ perm: both })).toBe(false);
  });

  it('named helpers use mask semantics', () => {
    const viewCreate = { perm: `BigInt::${(1n << 41n) | (1n << 44n)}` };
    const viewOnly = { perm: `BigInt::${1n << 41n}` };
    expect(canViewContest(viewCreate)).toBe(true);
    expect(canCreateContest(viewCreate)).toBe(true);
    expect(canViewContest(viewOnly)).toBe(true);
    expect(canCreateContest(viewOnly)).toBe(false);
  });
});
