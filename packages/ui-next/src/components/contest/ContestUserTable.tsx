import { useMemo } from 'react';
import { Button } from '../primitives/Button';
import { request } from '../../hooks/use-api';
import { useToast } from '../primitives/Toast';
import { formatDateTime } from '../../lib/datetime';
import styles from './ContestUserTable.module.css';

export interface ContestUserRow {
  uid: number;
  startAt?: string;
  endAt?: string;
  unrank?: boolean;
}

export interface ContestUserTableProps {
  rows: ContestUserRow[];
  udict: Record<string, { _id: number; uname: string }>;
  tdoc: { docId: number; beginAt: string; endAt: string; duration?: number };
  onChange: () => void;
}

function personalEndAt(row: ContestUserRow, tdoc: ContestUserTableProps['tdoc']): number {
  const starts = row.startAt ? new Date(row.startAt).getTime() : 0;
  const dur = (tdoc.duration ?? 0) * 3600_000;
  const per = starts && dur ? starts + dur : Infinity;
  const tdocEnd = new Date(tdoc.endAt).getTime();
  const rowEnd = row.endAt ? new Date(row.endAt).getTime() : Infinity;
  return Math.min(per, tdocEnd, rowEnd);
}

export function ContestUserTable({ rows, udict, tdoc, onChange }: ContestUserTableProps) {
  const toast = useToast();
  const now = useMemo(() => Date.now(), []);
  const op = async (body: Record<string, unknown>) => {
    const fd = new URLSearchParams();
    Object.entries(body).forEach(([k, v]) => fd.set(k, String(v)));
    try {
      await request.post(window.location.pathname, fd);
      onChange();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <table className={styles.table}>
      <colgroup>
        <col className={styles.colUid} /><col className={styles.colUser} />
        <col className={styles.colTime} /><col className={styles.colTime} />
        <col className={styles.colRank} /><col className={styles.colAction} />
      </colgroup>
      <thead><tr><th>Uid</th><th>User</th><th>Start</th><th>End</th><th>Rank</th><th>Action</th></tr></thead>
      <tbody>
        {rows.length === 0 && <tr><td colSpan={6} className={styles.empty}>No attendees</td></tr>}
        {rows.map((r) => {
          const udoc = udict[String(r.uid)];
          const end = personalEndAt(r, tdoc);
          const resumable = end < Math.min(new Date(tdoc.endAt).getTime(), now === 0 ? Infinity : now) && end < new Date(tdoc.endAt).getTime();
          return (
            <tr key={r.uid}>
              <td className={styles.mono}>{r.uid}</td>
              <td>{udoc?.uname ?? `#${r.uid}`}</td>
              <td>{r.startAt ? formatDateTime(r.startAt) : '—'}</td>
              <td>{r.endAt ? formatDateTime(r.endAt) : (r.startAt && tdoc.duration ? formatDateTime(new Date(new Date(r.startAt).getTime() + tdoc.duration * 3600_000).toISOString()) : '—')}</td>
              <td>
                <Button variant="ghost" onClick={() => op({ operation: 'rank', uid: r.uid })}>
                  {r.unrank ? 'UnRank' : 'Rank'}
                </Button>
              </td>
              <td>
                {resumable && (
                  <Button variant="ghost" onClick={() => op({ operation: 'resume', uid: r.uid })}>
                    Resume
                  </Button>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
