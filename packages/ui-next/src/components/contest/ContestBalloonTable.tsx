import { Button } from '../primitives/Button';
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
  const send = async (bid: string) => {
    const fd = new URLSearchParams();
    fd.set('operation', 'done');
    fd.set('balloon', bid);
    try {
      await request.post(window.location.pathname, fd);
      toast.success('Balloon marked as sent');
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
          <th>Status</th><th>Bid</th><th>Problem</th><th>Submitter</th><th>Awards</th><th>Action</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && <tr><td colSpan={6} className={styles.empty}>No balloons</td></tr>}
        {rows.map((r) => {
          const pdoc = pdict[String(r.problem)];
          const udoc = udict[r.submitBy];
          const color = pdoc?.color ?? COLOR_DEFAULT;
          return (
            <tr key={r._id} data-status={r.status}>
              <td><span className={`${styles.dot} ${styles[r.status]}`} aria-label={r.status} /></td>
              <td className={styles.mono}>{r._id}</td>
              <td>
                <span className={styles.swatch} style={{ background: color }} aria-hidden />
                {pdoc?.title ?? `#${r.problem}`}
              </td>
              <td>{udoc?.uname ?? r.submitBy}</td>
              <td>{r.first ? <span className={styles.first}>First</span> : null}</td>
              <td>
                {r.status === 'pending' ? (
                  <Button variant="ghost" onClick={() => send(r._id)}>Send</Button>
                ) : (
                  <span className={styles.done}>Done</span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
