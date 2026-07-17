import { Ring } from '../components/charts/Ring';
import { Link } from '../components/link';
import { Card } from '../components/primitives/Card';
import { Chip } from '../components/primitives/Chip';
import { statusText } from '../lib/contest-status';
import { ruleText } from '../lib/rule-text';
import styles from './TrainingSection.module.css';
import type { SectionProps, SerializedTdoc } from './types';

export function TrainingSection({ payload }: SectionProps): JSX.Element | null {
  const [tdocs = [], tsdict = {}] = Array.isArray(payload) ? payload : [[], {}];
  if (!tdocs.length) return null;
  const tdict = tsdict as Record<
    string,
    {
      attend?: number;
      enroll?: number;
      done?: boolean;
      donePids?: string[];
      totalPids?: number;
    }
  >;
  return (
    <Card variant="default" header={<h3 className={styles.header}>训练</h3>}>
      <ol className={styles.list}>
        {tdocs.map((t: SerializedTdoc) => {
          const s = tdict[t.docId];
          const progress = s?.totalPids
            ? Math.round(((s.donePids?.length ?? 0) / s.totalPids) * 100)
            : 0;
          return (
            <li key={t.docId} className={styles.item}>
              <div className={styles.ringWrap}>
                <Ring percent={progress} size={48} />
              </div>
              <div className={styles.body}>
                <Link to="training_detail" params={{ tid: t.docId }} className={styles.title}>
                  {t.title}
                </Link>
                <ul className={styles.meta}>
                  <li><Chip variant="tag">{ruleText(t.rule)}</Chip></li>
                  <li><Chip>{statusText(t, s)}</Chip></li>
                  <li className={styles.text}>{s?.attend ?? 0} 人</li>
                </ul>
              </div>
            </li>
          );
        })}
      </ol>
      <div className={styles.footer}>
        <Link to="training_main" className={styles.more}>更多 →</Link>
      </div>
    </Card>
  );
}
