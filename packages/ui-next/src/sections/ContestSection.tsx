import { Card } from '../components/primitives/Card';
import { Chip } from '../components/primitives/Chip';
import { Link } from '../components/link';
import { isOngoing, isUpcoming, renderDuration } from '../lib/contest-status';
import { formatDate } from '../lib/datetime';
import { ruleText } from '../lib/rule-text';
import type { SectionProps, SerializedTdoc } from './types';
import styles from './ContestSection.module.css';

export function ContestSection({ payload }: SectionProps): JSX.Element | null {
  const [tdocs = [], tsdict = {}] = Array.isArray(payload) ? payload : [[], {}];
  if (!tdocs.length) return null;
  const tdict = tsdict as Record<string, { attend?: number }>;
  return (
    <Card variant="default" header={<h3 className={styles.header}>比赛</h3>}>
      <ol className={styles.list}>
        {tdocs.map((tdoc: SerializedTdoc) => {
          const ongoing = isOngoing(tdoc);
          const upcoming = isUpcoming(tdoc);
          const enrolled = tdict[tdoc.docId]?.attend === 1;
          return (
            <li key={tdoc.docId} className={styles.item}>
              <div className={styles.dateBlock}>
                <div className={styles.dateDay}>{formatDate(tdoc.beginAt, { day: 'numeric' })}</div>
                <div className={styles.dateMonth}>
                  {formatDate(tdoc.beginAt, { year: 'numeric', month: '2-digit' })}
                </div>
              </div>
              <div className={styles.body}>
                <Link to="contest_detail" params={{ tid: tdoc.docId }} className={styles.title}>
                  {tdoc.title}
                </Link>
                <ul className={styles.meta}>
                  <li><Chip variant="tag">{ruleText(tdoc.rule)}</Chip></li>
                  {tdoc.rated && <li><Chip variant="diff">Rated</Chip></li>}
                  <li className={styles.text}>{renderDuration(tdoc)} 小时</li>
                  <li className={styles.text}>{tdoc.attend ?? 0} 人</li>
                  {ongoing && <li><Chip variant="diff">进行中</Chip></li>}
                  {upcoming && <li><Chip variant="tag">未开始</Chip></li>}
                  {enrolled && <li><Chip>已报名</Chip></li>}
                </ul>
              </div>
            </li>
          );
        })}
      </ol>
      <div className={styles.footer}>
        <Link to="contest_main" className={styles.more}>更多 →</Link>
      </div>
    </Card>
  );
}
