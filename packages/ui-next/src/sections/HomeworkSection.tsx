import { Card } from '../components/primitives/Card';
import { Chip } from '../components/primitives/Chip';
import { Link } from '../components/link';
import { isExtended } from '../lib/contest-status';
import { formatDate } from '../lib/datetime';
import type { SectionProps, SerializedTdoc } from './types';
import styles from './HomeworkSection.module.css';

export function HomeworkSection({ payload }: SectionProps): JSX.Element | null {
  const [htdocs = [], htsdict = {}] = Array.isArray(payload) ? payload : [[], {}];
  if (!htdocs.length) return null;
  const tdict = htsdict as Record<string, { done?: boolean }>;
  return (
    <Card variant="default" header={<h3 className={styles.header}>作业</h3>}>
      <ol className={styles.list}>
        {htdocs.map((h: SerializedTdoc) => {
          const extended = isExtended(h);
          const done = tdict[h.docId]?.done;
          return (
            <li key={h.docId} className={styles.item}>
              <div className={styles.dateBlock}>
                <div className={styles.dateDay}>{formatDate(h.penaltySince ?? h.endAt, { day: 'numeric' })}</div>
                <div className={styles.dateMonth}>
                  {formatDate(h.penaltySince ?? h.endAt, { year: 'numeric', month: '2-digit' })}
                </div>
              </div>
              <div className={styles.body}>
                <Link to="homework_detail" params={{ hid: h.docId }} className={styles.title}>
                  {h.title}
                </Link>
                <ul className={styles.meta}>
                  {extended && <li><Chip variant="diff">已延期</Chip></li>}
                  {done && <li><Chip>已完成</Chip></li>}
                  {!done && <li><Chip variant="tag">待完成</Chip></li>}
                </ul>
              </div>
            </li>
          );
        })}
      </ol>
      <div className={styles.footer}>
        <Link to="homework_main" className={styles.more}>更多 →</Link>
      </div>
    </Card>
  );
}
