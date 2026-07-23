import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../primitives/Button';
import { useTranslate } from '../../lib/i18n';
import { request } from '../../hooks/use-api';
import { useToast } from '../primitives/Toast';
import { canResumeContestUser } from '../../lib/contest-user';
import { formatDateTime } from '../../lib/datetime';
import styles from './ContestUserTable.module.css';

export interface ContestUserRow {
  uid: number;
  startAt?: string;
  endAt?: string;
  unrank?: boolean;
}

export interface ContestUserTableProps {
  /** Server-authoritative rows. Component keeps a local copy for optimistic
   *  updates and rolls back on failure. */
  rows: ContestUserRow[];
  udict: Record<string, { _id: number; uname: string }>;
  tdoc: { docId: number; beginAt: string; endAt: string; duration?: number };
  /** Pinned clock (ms). Lets tests assert boundary conditions deterministically;
   *  in production the page reads `useJsonPoll` and forwards a fresh value. */
  nowMs: number;
  /** Fires AFTER a successful mutation so the parent can JSON-calibrate by
   *  refetching (e.g. via `useJsonPoll.refresh`). The page must NOT call
   *  `window.location.reload()`. */
  onChange?: () => void;
}

function personalEndAt(row: ContestUserRow, tdoc: ContestUserTableProps['tdoc']): number {
  const starts = row.startAt ? new Date(row.startAt).getTime() : 0;
  const dur = (tdoc.duration ?? 0) * 3_600_000;
  const per = starts && dur ? starts + dur : Number.POSITIVE_INFINITY;
  const tdocEnd = new Date(tdoc.endAt).getTime();
  const rowEnd = row.endAt ? new Date(row.endAt).getTime() : Number.POSITIVE_INFINITY;
  return Math.min(per, tdocEnd, rowEnd);
}

/**
 * Contest attendee table. Each row exposes the four actions specified by the
 * brief: Delete, Resume (when eligible), and a Rank / UnRank toggle whose
 * LABEL describes the action it will execute (not the current state). A
 * user that is currently unranked (`row.unrank === true`) shows the "Rank"
 * button — clicking it will rank them. Symmetrically, a ranked user shows
 * the "UnRank" button. This avoids the legacy ambiguity where the label
 * flipped with state and a reader could not tell which way the toggle would
 * push the row.
 *
 * Mutations are optimistic: we update the local copy immediately, POST to
 * the page via `request.post`, then defer to the parent via `onChange()`
 * to JSON-calibrate. Failures roll back to the previous server state and
 * surface a toast — `window.location.reload()` is never called (the brief
 * forbids it).
 */
export function ContestUserTable({ rows, udict, tdoc, nowMs, onChange }: ContestUserTableProps) {
  const toast = useToast();
  const t = useTranslate();
  // Local copy for optimistic mutations. Resync only when server row content changes.
  const [local, setLocal] = useState<ContestUserRow[]>(rows);
  const rowsSignature = JSON.stringify(rows.map(
    (row) => `${row.uid}:${row.unrank ?? false}:${row.startAt ?? ''}:${row.endAt ?? ''}`,
  ));
  const previousRowsSignature = useRef(rowsSignature);
  useEffect(() => {
    if (rowsSignature === previousRowsSignature.current) return;
    previousRowsSignature.current = rowsSignature;
    setLocal(rows);
  }, [rows, rowsSignature]);
  const op = async (
    uid: number,
    operation: string,
    optimistic: (r: ContestUserRow[]) => ContestUserRow[],
  ) => {
    const previous = local;
    const next = optimistic(local);
    setLocal(next); // optimistic
    const fd = new URLSearchParams();
    fd.set('operation', operation);
    fd.set('uid', String(uid));
    try {
      await request.post(window.location.pathname, fd);
      onChange?.();
    } catch (e) {
      setLocal(previous); // rollback
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };
  const deleteRow = (uid: number) =>
    op(uid, 'delete', (r) => r.filter((x) => x.uid !== uid));
  const rank = (uid: number) =>
    op(uid, 'rank', (r) => r.map((x) => (x.uid === uid ? { ...x, unrank: false } : x)));
  const unrank = (uid: number) =>
    op(uid, 'unrank', (r) => r.map((x) => (x.uid === uid ? { ...x, unrank: true } : x)));
  const resume = (uid: number) =>
    op(uid, 'resume', (r) => r);

  const end = useMemo(() => new Date(tdoc.endAt).getTime(), [tdoc.endAt]);

  return (
    <table className={styles.table}>
      <colgroup>
        <col className={styles.colUid} /><col className={styles.colUser} />
        <col className={styles.colTime} /><col className={styles.colTime} />
        <col className={styles.colAction} /><col className={styles.colAction} />
      </colgroup>
      <thead>
        <tr>
          <th>{t('ContestUser.Uid')}</th>
          <th>{t('ContestUser.User')}</th>
          <th>{t('ContestUser.Start')}</th>
          <th>{t('ContestUser.End')}</th>
          <th>{t('ContestUser.Action')}</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {local.length === 0 && (
          <tr><td colSpan={6} className={styles.empty}>{t('ContestUser.Empty')}</td></tr>
        )}
        {local.map((r) => {
          const udoc = udict[String(r.uid)];
          const resumable = canResumeContestUser(
            { endAt: tdoc.endAt, duration: tdoc.duration },
            { startAt: r.startAt, endAt: r.endAt },
            nowMs,
          );
          return (
            <tr key={r.uid}>
              <td className={styles.mono}>{r.uid}</td>
              <td>{udoc?.uname ?? `#${r.uid}`}</td>
              <td>{r.startAt ? formatDateTime(r.startAt) : '—'}</td>
              <td>{r.endAt ? formatDateTime(r.endAt) : (r.startAt && tdoc.duration ? formatDateTime(new Date(new Date(r.startAt).getTime() + tdoc.duration * 3_600_000).toISOString()) : '—')}</td>
              <td>
                <div className={styles.actions}>
                  <Button variant="ghost" onClick={() => (r.unrank ? rank(r.uid) : unrank(r.uid))}>
                    {r.unrank ? t('ContestUser.Rank') : t('ContestUser.UnRank')}
                  </Button>
                  {resumable && (
                    <Button variant="ghost" onClick={() => resume(r.uid)}>
                      {t('ContestUser.Resume')}
                    </Button>
                  )}
                  <Button variant="danger" onClick={() => deleteRow(r.uid)}>
                    {t('ContestUser.Delete')}
                  </Button>
                </div>
              </td>
              <td />
            </tr>
          );
        })}
        {end < nowMs && null}
      </tbody>
    </table>
  );
}
