import { useState } from 'react';
import { request } from '../../hooks/use-api';
import { useBuildUrl } from '../../hooks/use-build-url';
import { computeContestActions, type UserPerms } from '../../lib/contest-actions';
import { useTranslate } from '../../lib/i18n';
import type { SerializedContestStatusDoc, SerializedTdoc, SerializedUserDict } from '../../sections/types';
import { Link } from '../link';
import { Alert } from '../primitives/Alert';
import { Button } from '../primitives/Button';
import { ConfirmDialog } from '../primitives/ConfirmDialog';
import { useToast } from '../primitives/Toast';
import styles from './ContestDetailSidebar.module.css';

export interface ContestDetailSidebarProps {
  tdoc: SerializedTdoc & { owner?: number, allowPrint?: boolean, _code?: string };
  tsdoc: SerializedContestStatusDoc | null;
  udict: SerializedUserDict;
  urlForFile: (name: string) => string;
  currentUserPerms?: UserPerms;
}

const DEFAULT_USER: UserPerms = {
  _id: 0,
  hasPerm: () => false,
  own: () => false,
};

export function ContestDetailSidebar({
  tdoc,
  tsdoc,
  udict,
  urlForFile: _urlForFile,
  currentUserPerms = DEFAULT_USER,
}: ContestDetailSidebarProps) {
  const t = useTranslate();
  const buildUrl = useBuildUrl();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [confirmEarlyEnd, setConfirmEarlyEnd] = useState(false);
  const [pending, setPending] = useState(false);

  const flags = computeContestActions(tdoc, tsdoc, currentUserPerms);
  const contestUrl = buildUrl('contest_detail', { tid: tdoc.docId });
  const ownerUdoc = tdoc.owner != null ? udict[tdoc.owner] : undefined;

  async function postOp(operation: string, extra: Record<string, string> = {}) {
    setError(null);
    setPending(true);
    try {
      const fd = new URLSearchParams({ operation, ...extra });
      await request.post(contestUrl, fd, { credentials: 'same-origin' });
      window.location.reload();
    } catch (e: any) {
      const msg = e?.message ?? t('ContestDetail.NetworkError');
      setError(msg);
      toast.error(msg);
    } finally {
      setPending(false);
    }
  }

  function onAttend() {
    if (tdoc._code) {
      const code = window.prompt(t('ContestDetail.InvitationCode'));
      if (!code) return;
      postOp('attend', { code });
    } else {
      postOp('attend');
    }
  }

  return (
    <aside className={styles.sidebar} data-testid="contest-sidebar">
      {ownerUdoc && (
        <div className={styles.owner}>
          <span>{t('Problem.Uploader')}:</span>
          <strong>{ownerUdoc.uname}</strong>
        </div>
      )}

      {error && <Alert variant="error" message={error} />}

      {flags.canAttend && (
        <Button variant="primary" onClick={onAttend} disabled={pending} data-testid="btn-attend">
          {t('ContestDetail.Attend')}
        </Button>
      )}

      {flags.canEarlyEnd && (
        <>
          <Button variant="ghost" onClick={() => setConfirmEarlyEnd(true)} disabled={pending} data-testid="btn-early-end">
            {t('ContestDetail.EndEarly')}
          </Button>
          <ConfirmDialog
            open={confirmEarlyEnd}
            title={t('ContestDetail.EndEarly')}
            message={t('ContestDetail.EndEarlyConfirm')}
            confirmLabel={t('Common.Yes')}
            cancelLabel={t('Common.Cancel')}
            variant="danger"
            onConfirm={() => {
              setConfirmEarlyEnd(false);
              postOp('early_end');
            }}
            onCancel={() => setConfirmEarlyEnd(false)}
          />
        </>
      )}

      {flags.canSubscribe && (
        <Button
          variant="ghost"
          onClick={() => postOp('subscribe', { subscribe: tsdoc?.subscribe === 1 ? '0' : '1' })}
          disabled={pending}
          data-testid="btn-subscribe"
        >
          {tsdoc?.subscribe === 1 ? t('ContestDetail.Unsubscribe') : t('ContestDetail.Subscribe')}
        </Button>
      )}

      <nav className={styles.section}>
        <p className={styles.title}>{t('Common.Contests')}</p>
        {flags.canShowScoreboard && (
          <Link className={styles.action} to="contest_scoreboard" params={{ tid: tdoc.docId }}>
            {t('ContestDetail.Scoreboard')}
          </Link>
        )}
        {flags.canShowHiddenScoreboard && (
          <Link className={styles.action} to="contest_scoreboard_view" params={{ tid: tdoc.docId, view: 'hidden' }}>
            {t('ContestDetail.HiddenScoreboard')}
          </Link>
        )}
        {flags.canShowSelfRecord && (
          <Link
            className={styles.action}
            to="record_main"
            params={{ query: JSON.stringify({ tid: tdoc.docId, uidOrName: currentUserPerms._id }) }}
          >
            {t('ContestDetail.MySubmissions')}
          </Link>
        )}
        {flags.canShowAllRecord && (
          <Link
            className={styles.action}
            to="record_main"
            params={{ query: JSON.stringify({ tid: tdoc.docId }) }}
          >
            {t('ContestDetail.AllSubmissions')}
          </Link>
        )}
        {flags.canPrint && (
          <Link className={styles.action} to="contest_print" params={{ tid: tdoc.docId }}>
            {t('ContestDetail.Print')}
          </Link>
        )}
        {flags.canViewCode && (
          <Link className={styles.action} to="contest_code" params={{ tid: tdoc.docId }}>
            {t('ContestDetail.Code')}
          </Link>
        )}
        {flags.canShowDiscussion && (
          <Link className={styles.action} to="discussion_node" params={{ type: 'contest', name: tdoc.docId }}>
            {t('ContestDetail.Discussion')}
          </Link>
        )}
        {flags.canCreateDiscussion && (
          <Link className={styles.action} to="discussion_create" params={{ type: 'contest', name: tdoc.docId }}>
            + {t('ContestDetail.Discussion')}
          </Link>
        )}
      </nav>

      {(flags.canEdit || flags.canManage) && (
        <nav className={styles.section}>
          <p className={styles.title}>Admin</p>
          {flags.canEdit && (
            <Link className={styles.action} to="contest_edit" params={{ tid: tdoc.docId }}>
              {t('ContestDetail.Edit')}
            </Link>
          )}
          {flags.canManage && (
            <Link className={styles.action} to="contest_manage" params={{ tid: tdoc.docId }}>
              {t('ContestDetail.Manage')}
            </Link>
          )}
        </nav>
      )}
    </aside>
  );
}
