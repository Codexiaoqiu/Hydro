import { isDone, isOngoing } from './contest-status';
import type { SerializedContestStatusDoc, SerializedTdoc } from '../sections/types';

export type UserPerms = {
  _id: number;
  hasPerm: (perm: string) => boolean;
  own: (doc: { owner?: number | string }) => boolean;
};

export type ContestActionFlags = {
  canAttend: boolean;
  canEarlyEnd: boolean;
  canSubscribe: boolean;
  canShowScoreboard: boolean;
  canShowHiddenScoreboard: boolean;
  canShowAllRecord: boolean;
  canShowSelfRecord: boolean;
  canEdit: boolean;
  canManage: boolean;
  canPrint: boolean;
  canViewCode: boolean;
  canShowDiscussion: boolean;
  canCreateDiscussion: boolean;
};

const P = {
  ATTEND: 'PERM_ATTEND_CONTEST',
  EDIT: 'PERM_EDIT_CONTEST',
  VIEW_HIDDEN_SCOREBOARD: 'PERM_VIEW_HIDDEN_CONTEST_SCOREBOARD',
  READ_RECORD_CODE: 'PERM_READ_RECORD_CODE',
  VIEW_DISCUSSION: 'PERM_VIEW_DISCUSSION',
  CREATE_DISCUSSION: 'PERM_CREATE_DISCUSSION',
} as const;

export function computeContestActions(
  tdoc: SerializedTdoc,
  tsdoc: SerializedContestStatusDoc | null,
  user: UserPerms,
): ContestActionFlags {
  const attended = tsdoc?.attend === 1;
  const ongoing = isOngoing(tdoc);
  const done = isDone(tdoc);
  const isOwner = user.own(tdoc as { owner?: number | string });

  return {
    canAttend: !attended && !done && user.hasPerm(P.ATTEND),
    canEarlyEnd: tdoc.rule !== 'homework' && attended && ongoing,
    canSubscribe: attended,
    canShowScoreboard: done || ongoing,
    canShowHiddenScoreboard: done && user.hasPerm(P.VIEW_HIDDEN_SCOREBOARD),
    canShowAllRecord: done && user.hasPerm(P.READ_RECORD_CODE),
    canShowSelfRecord: attended,
    canEdit: isOwner || user.hasPerm(P.EDIT),
    canManage: isOwner || user.hasPerm(P.EDIT),
    canPrint: Boolean(tdoc.allowPrint) && (ongoing || done),
    canViewCode: done && user.hasPerm(P.READ_RECORD_CODE),
    canShowDiscussion: user.hasPerm(P.VIEW_DISCUSSION),
    canCreateDiscussion: user.hasPerm(P.CREATE_DISCUSSION),
  };
}
