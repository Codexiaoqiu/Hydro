import { Link } from '../components/link';
import { Card } from '../components/primitives/Card';
import styles from './RecentProblemsSection.module.css';
import type { SectionProps, SerializedPdoc } from './types';

// Local short label table. Mirrors @hydrooj/common's STATUS_SHORT_TEXTS so
// this package stays free of @hydrooj/common as a runtime dep (see
// lib/difficulty.ts for the same pattern).
const STATUS_SHORT: Record<number, string> = {
  1: 'AC',
  2: 'WA',
  3: 'TLE',
  4: 'MLE',
  5: 'OLE',
  6: 'RE',
  7: 'CE',
  8: 'SE',
  9: 'IGN',
  11: 'HK',
  30: 'IGN',
  31: 'FE',
};

function statusBadgeClass(status: number): string {
  if (status === 1) return styles.statusAc;
  if (status >= 2 && status <= 11) return styles.statusFail;
  if (status >= 20 && status <= 22) return styles.statusPending;
  return styles.statusMute;
}

export function RecentProblemsSection({ payload }: SectionProps): JSX.Element | null {
  const t = Array.isArray(payload) ? payload : [[], {}];
  const pdocs: SerializedPdoc[] = t[0] ?? [];
  const psdict = (t[1] ?? {}) as Record<string, { status?: number, rid?: string }>;
  if (!pdocs.length) return null;
  return (
    <Card variant="default" header={<h3 className={styles.title}>最新题目</h3>}>
      <ol className={styles.list}>
        {pdocs.map((p) => {
          const ps = psdict[p.docId];
          const status = ps?.status;
          // Build the detail URL only when we have a usable pid. When both
          // p.pid and p.docId are missing, fall back to a plain title to avoid
          // useBuildUrl's "Missing parameters: pid" throw.
          const pidForLink = p.pid || (p.docId != null && p.docId !== 0 ? String(p.docId) : '');
          const linkable = pidForLink.length > 0;
          const pidLabel = p.pid || (p.docId != null ? String(p.docId) : '—');
          return (
            <li key={p.docId ?? p.pid ?? Math.random()} className={styles.item}>
              <div className={styles.cellPid}>
                <span className={styles.pid}>{pidLabel}</span>
                {linkable ? (
                  <Link
                    to="problem_detail"
                    params={{ pid: pidForLink }}
                    className={styles.label}
                    title={p.title}
                  >
                    {p.title}
                  </Link>
                ) : (
                  <span className={styles.labelMuted} title={p.title}>{p.title || '未命名题目'}</span>
                )}
              </div>
              <div className={styles.cellStatus}>
                {status !== undefined && (
                  <span
                    className={`${styles.status} ${statusBadgeClass(status)}`}
                    title={`状态码 ${status}`}
                  >
                    {STATUS_SHORT[status] ?? status}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
