import { PERM, PRIV } from './perm-constants';

/**
 * The shape of `UserContext` once it has been serialized across the wire.
 *
 * On the server `User` is a real class with prototype methods (`hasPerm`,
 * `hasPriv`, `own`). After `JSON.stringify` runs through the framework
 * serializer (`framework/framework/serializer.ts`) those methods are stripped
 * because they live on the prototype, not on the instance. The remaining
 * fields are plain data:
 *
 *   - `_id`       — kept (numeric user id; 0 for anonymous)
 *   - `perm`      — emitted as `"BigInt::N"` (BigInt cannot be JSON-encoded)
 *   - `priv`      — plain number
 *   - `scope`     — same BigInt-string encoding as `perm`
 *   - `uname`,
 *     `avatar`,
 *     `viewLang`, etc.
 *
 * The helpers below parse that shape back into something we can call
 * permission checks against.
 */
export interface UserContextShape {
  _id?: number;
  perm?: bigint | string | number;
  scope?: bigint | string | number;
  priv?: number;
  uname?: string;
  avatar?: string;
  [k: string]: unknown;
}

export type AnyUserContext = UserContextShape | null | undefined;

const BIGINT_PREFIX = 'BigInt::';
const BIGINT_RE = /^BigInt::(-?\d+)$/;

function parseBig(value: unknown): bigint {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') return BigInt(value);
  if (typeof value === 'string') {
    const m = value.match(BIGINT_RE);
    if (m) return BigInt(m[1]);
    // Tolerate the prefix-less numeric string form just in case a future
    // serializer change drops the marker.
    if (/^-?\d+$/.test(value)) return BigInt(value);
  }
  return 0n;
}

function parsePerm(ctx: AnyUserContext): bigint {
  if (!ctx) return 0n;
  // Server-side semantics: `hasPerm` requires (perm & scope & mask) === mask,
  // where `scope` is the per-domain bitmask that the user session is allowed
  // to exercise. The scope is part of the session cookie, not the user doc,
  // but the server conveniently sets `scope` on the UserContext as well so
  // the SPA can reproduce the same gate.
  //
  // The default scope for an unauthenticated user is `PERM_ALL` — a huge
  // bitmask that effectively disables scope-based gating, so anonymous users
  // only see perm checks succeed when the constant actually equals 0. Tests
  // that don't care about scope pass the UserContext without one; we mirror
  // the default by treating a missing scope as PERM_ALL.
  const perm = parseBig(ctx.perm);
  const rawScope = (ctx as UserContextShape).scope;
  if (rawScope === undefined || rawScope === null) {
    // Mirror server default: scope = PERM_ALL, which doesn't strip bits.
    return perm;
  }
  return perm & parseBig(rawScope);
}

function parsePriv(ctx: AnyUserContext): number {
  if (!ctx) return 0;
  const p = ctx.priv;
  return typeof p === 'number' ? p : 0;
}

export function isLoggedIn(ctx: AnyUserContext): boolean {
  return !!(ctx && ctx._id);
}

/**
 * Returns true if the user's effective permission bitmask contains every bit
 * of `mask`. Accepts a single bigint or a union of them.
 */
export function hasPerm(ctx: AnyUserContext, mask: bigint | bigint[]): boolean {
  const p = parsePerm(ctx);
  if (Array.isArray(mask)) return mask.some((m) => (p & m) === m);
  return (p & mask) === mask;
}

/**
 * Returns true if the user's privilege bitmask contains every bit of `mask`.
 */
export function hasPriv(ctx: AnyUserContext, mask: number | number[]): boolean {
  const p = parsePriv(ctx);
  if (Array.isArray(mask)) return mask.some((m) => (p & m) === m);
  return (p & mask) === mask;
}

/**
 * Mirror of the server-side `User.own` (see `packages/hydrooj/src/model/user.ts:121`):
 *
 *   - If `checkPerm` is provided, the user must also have that bit (the
 *     SELF variant of an edit perm, e.g. PERM_EDIT_PROBLEM_SELF).
 *   - Otherwise it's just owner / maintainer check.
 */
export function own<T extends { owner?: number, maintainer?: number[] }>(
  ctx: AnyUserContext,
  doc: T | null | undefined,
  checkPerm?: bigint,
): boolean {
  if (!ctx || !ctx._id || !doc) return false;
  if (checkPerm !== undefined && !hasPerm(ctx, checkPerm)) return false;
  return doc.owner === ctx._id || (doc.maintainer || []).includes(ctx._id);
}

// ---- Named business helpers ----------------------------------------------

export function canSubmitProblem(ctx: AnyUserContext): boolean {
  return hasPerm(ctx, PERM.PERM_SUBMIT_PROBLEM);
}

export function canCreateProblem(ctx: AnyUserContext): boolean {
  return hasPerm(ctx, PERM.PERM_CREATE_PROBLEM);
}

export function canEditProblem<T extends { owner?: number, maintainer?: number[] }>(
  ctx: AnyUserContext,
  doc?: T,
): boolean {
  return (
    own(ctx, doc, PERM.PERM_EDIT_PROBLEM_SELF)
    || hasPerm(ctx, PERM.PERM_EDIT_PROBLEM)
  );
}

export function canRejudgeProblem(ctx: AnyUserContext): boolean {
  return hasPerm(ctx, PERM.PERM_REJUDGE_PROBLEM);
}

export function canRejudgeAny(ctx: AnyUserContext): boolean {
  return hasPerm(ctx, PERM.PERM_REJUDGE);
}

export function canViewDiscussion(ctx: AnyUserContext): boolean {
  return hasPerm(ctx, PERM.PERM_VIEW_DISCUSSION);
}

export function canCreateDiscussion(ctx: AnyUserContext): boolean {
  return hasPerm(ctx, PERM.PERM_CREATE_DISCUSSION);
}

export function canViewProblemSolution(ctx: AnyUserContext): boolean {
  return hasPerm(ctx, PERM.PERM_VIEW_PROBLEM_SOLUTION);
}

export function canViewAcceptedSolution(ctx: AnyUserContext): boolean {
  return hasPerm(ctx, PERM.PERM_VIEW_PROBLEM_SOLUTION_ACCEPT);
}

export function canReadProblemData(ctx: AnyUserContext): boolean {
  return hasPriv(ctx, PRIV.PRIV_READ_PROBLEM_DATA);
}

/**
 * Anonymous users (uid 0) don't have PRIV_USER_PROFILE set — every helper
 * above already short-circuits on missing perm bits, so this is mostly a
 * readability helper.
 */
export function isRegisteredUser(ctx: AnyUserContext): boolean {
  return hasPriv(ctx, PRIV.PRIV_USER_PROFILE) && isLoggedIn(ctx);
}

export function canViewContest(ctx: AnyUserContext): boolean {
  return hasPerm(ctx, PERM.PERM_VIEW_CONTEST);
}

export function canCreateContest(ctx: AnyUserContext): boolean {
  return hasPerm(ctx, PERM.PERM_CREATE_CONTEST);
}

export function canViewHiddenContest(ctx: AnyUserContext): boolean {
  return hasPerm(ctx, PERM.PERM_VIEW_HIDDEN_CONTEST);
}

export function canEditSystem(ctx: AnyUserContext): boolean {
  return hasPriv(ctx, PRIV.PRIV_EDIT_SYSTEM);
}