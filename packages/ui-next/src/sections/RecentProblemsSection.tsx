import { Card } from '../components/primitives/Card';
import { Link } from '../components/link';
import { objectIdTime, timeAgo } from '../lib/datetime';
import type { SectionProps, SerializedPdoc } from './types';
import styles from './RecentProblemsSection.module.css';

export function RecentProblemsSection({ payload }: SectionProps): JSX.Element | null {
  const t = Array.isArray(payload) ? payload : [[], {}];
  const pdocs: SerializedPdoc[] = t[0] ?? [];
  const psdict = (t[1] ?? {}) as Record<string, { status?: number; rid?: string }>;
  if (!pdocs.length) return null;
  return (
    <Card variant="default" header={<h3 className={styles.title}>最新题目</h3>}>
      <ol className={styles.list}>
        {pdocs.map((p) => {
          const when = p._id ? timeAgo(new Date(objectIdTime(p._id)).toISOString()) : '';
          return (
            <li key={p.docId} className={styles.item}>
              <Link to="problem_detail" params={{ pid: p.pid }} className={styles.link}>
                <span className={styles.pid}>{p.pid}</span>
                <span className={styles.label}>{p.title}</span>
              </Link>
              {when && <span className={styles.time}>{when}</span>}
              {psdict[p.docId]?.status !== undefined && (
                <span className={styles.status}>{psdict[p.docId].status}</span>
              )}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
