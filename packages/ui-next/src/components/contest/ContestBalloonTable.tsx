import { Button } from '../primitives/Button';
import { useTranslate } from '../../lib/i18n';
import { request } from '../../hooks/use-api';
import { useToast } from '../primitives/Toast';
import styles from './ContestBalloonTable.module.css';

export interface BalloonRow {
  _id: string;
  problem: number;
  status: 'pending' | 'done';
  submitBy: string;
  sendBy?: string;
  first?: boolean;
}

export interface ContestBalloonTableProps {
  rows: BalloonRow[];
  pdict: Record<string, { docId: number; title: string; color?: string }>;
  udict: Record<string, { _id: number; uname: string }>;
  onSend: (bid: string) => void;
}

const COLOR_DEFAULT = '#fbbd23';

export function ContestBalloonTable({ rows, pdict, udict, onSend }: ContestBalloonTableProps) {
  const toast = useToast();
  const t = useTranslate();
  const send = async (bid: string) => {
    const fd = new URLSearchParams();
    fd.set('operation', 'done');
    fd.set('balloon', bid);
    try {
      await request.post(window.location.pathname, fd);
      toast.success(t('ContestBalloon.MarkedSent'));
      onSend(bid);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };
  return (
    <table className={styles.table}>
      <colgroup>
        <col className={styles.colStatus} />
        <col className={styles.colBid} />
        <col className={styles.colProblem} />
        <col className={styles.colUser} />
        <col className={styles.colAwards} />
        <col className={styles.colAction} />
      </colgroup>
      <thead>
        <tr>
          <th>{t('ContestBalloon.Status')}</th>
          <th>{t('ContestBalloon.Bid')}</th>
          <th>{t('ContestBalloon.Problem')}</th>
          <th>{t('ContestBalloon.Submitter')}</th>
          <th>{t('ContestBalloon.Awards')}</th>
          <th>{t('ContestBalloon.Action')}</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && (
          <tr><td colSpan={6} className={styles.empty}>{t('ContestBalloon.Empty')}</td></tr>
        )}
        {rows.map((r) => {
          const pdoc = pdict[String(r.problem)];
          const udoc = udict[r.submitBy];
          const color = pdoc?.color ?? COLOR_DEFAULT;
          return (
            <tr key={r._id} data-status={r.status}>
              <td>
                <span
                  className={`${styles.dot} ${styles[r.status]}`}
                  aria-label={t(`ContestBalloon.Status.${r.status}`)}
                />
              </td>
              <td className={styles.mono}>{r._id}</td>
              <td>
                <span className={styles.swatch} style={{ background: color }} aria-hidden />
                {pdoc?.title ?? `#${r.problem}`}
              </td>
              <td>{udoc?.uname ?? r.submitBy}</td>
              <td>{r.first ? <span className={styles.first}>{t('ContestBalloon.First')}</span> : null}</td>
              <td>
                {r.status === 'pending' ? (
                  <Button variant="ghost" onClick={() => send(r._id)}>{t('ContestBalloon.Send')}</Button>
                ) : (
                  <span className={styles.done}>{t('ContestBalloon.Done')}</span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
