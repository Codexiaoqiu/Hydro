import { STATUS, STATUS_SHORT_TEXTS } from '@hydrooj/common';
import { useTranslate } from '../../lib/i18n';
import { Link } from '../link';
import styles from './ContestSubmissionList.module.css';

export interface ContestSubmissionRecord {
  _id: string;
  pid: number;
  status?: number;
  lang?: string;
  time?: number;
  memory?: number;
  uid?: number;
}

export interface ContestSubmissionListProps {
  /** Records for the current user within this contest. */
  rdocs: ContestSubmissionRecord[];
  /** Mapping pid -> alphabetic label (A, B, C …). */
  pidLabels?: Record<number, string>;
  /** Number of records to show per problem. Defaults to 3. */
  limitPerProblem?: number;
}

export function ContestSubmissionList({
  rdocs,
  pidLabels = {},
  limitPerProblem = 3,
}: ContestSubmissionListProps) {
  const t = useTranslate();

  // Group by pid, keep most-recent first (input is already sorted _id desc).
  const grouped = new Map<number, ContestSubmissionRecord[]>();
  for (const r of rdocs || []) {
    const arr = grouped.get(r.pid) || [];
    arr.push(r);
    grouped.set(r.pid, arr);
  }

  const entries = Array.from(grouped.entries());
  if (entries.length === 0) {
    return (
      <section className={styles.wrap} data-testid="contest-submissions">
        <h2 className={styles.title}>Submissions</h2>
        <p className={styles.empty}>{t('ContestProblemList.EmptySubmissions')}</p>
      </section>
    );
  }

  return (
    <section className={styles.wrap} data-testid="contest-submissions">
      <h2 className={styles.title}>Submissions</h2>
      {entries.map(([pid, list], idx) => (
        <details
          key={pid}
          className={styles.details}
          data-testid={`submissions-${pid}`}
          open={idx === 0}
        >
          <summary className={styles.summary}>
            {pidLabels[pid] || '#'}<span className={styles.count}>{list.length}</span>
          </summary>
          <ul className={styles.list}>
            {list.slice(0, limitPerProblem).map((r) => (
              <SubRow key={r._id} r={r} />
            ))}
            {list.length > limitPerProblem && (
              <li className={styles.more}>
                + {list.length - limitPerProblem} more
              </li>
            )}
          </ul>
        </details>
      ))}
    </section>
  );
}

function SubRow({ r }: { r: ContestSubmissionRecord }) {
  const status = r.status ?? STATUS.STATUS_WAITING;
  const short = STATUS_SHORT_TEXTS[status as STATUS] ?? '';
  const cls = status === STATUS.STATUS_ACCEPTED
    ? styles.rowAccept
    : status >= STATUS.STATUS_JUDGING
      ? styles.rowProgress
      : styles.rowOther;
  return (
    <li className={cls} data-testid={`submission-${r._id}`}>
      <Link className={styles.link} to="record_detail" params={{ rid: r._id }}>
        {short || `#${r._id.slice(-4)}`}
      </Link>
      <span className={styles.meta}>{r.lang ?? ''}</span>
      <span className={styles.meta}>{r.time != null ? `${r.time}ms` : ''}</span>
    </li>
  );
}
