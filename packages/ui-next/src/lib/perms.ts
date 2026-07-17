import { PERM } from './perm-constants';

export function hasPerm(UserContext: any, mask: bigint): boolean {
  const perm = UserContext?.perm;
  if (typeof perm !== 'string') return false;
  const match = perm.match(/^BigInt::(\d+)$/);
  if (!match) return false;
  return (BigInt(match[1]) & mask) !== 0n;
}

export function canViewContest(UserContext: any): boolean {
  return hasPerm(UserContext, PERM.PERM_VIEW_CONTEST);
}

export function canCreateContest(UserContext: any): boolean {
  return hasPerm(UserContext, PERM.PERM_CREATE_CONTEST);
}

export function canViewHiddenContest(UserContext: any): boolean {
  return hasPerm(UserContext, PERM.PERM_VIEW_HIDDEN_CONTEST);
}
