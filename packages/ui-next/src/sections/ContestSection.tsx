import { Link } from '../components/link';
import { Card } from '../components/primitives/Card';
import { Chip } from '../components/primitives/Chip';
import { isDone, isOngoing, isUpcoming, renderDuration } from '../lib/contest-status';
import { formatDate } from '../lib/datetime';
import { ruleText } from '../lib/rule-text';
import styles from './ContestSection.module.css';
import type { SectionProps, SerializedTdoc } from './types';

export function ContestSection({ payload }: SectionProps): JSX.Element | null {
  const [tdocs = [], tsdict = {}] = Array.isArray(payload) ? payload : [[], {}];
  if (!tdocs.length) return null;
  const tdict = tsdict as Record<string, { attend?: number }>;
  return (
    <Card
      variant="default"
      header={
        <div className={styles.headerContent}>
          <h3 className={styles.header}>比赛</h3>

          <div className={styles.footer}>
            <Link to="contest_main" className={styles.more}>更多 →</Link>
          </div>
        </div>
      }>
      <ol className={styles.list}>
        {tdocs.map((tdoc: SerializedTdoc) => {
          const ongoing = isOngoing(tdoc);
          const upcoming = isUpcoming(tdoc);
          // Done = clock has run out and we're not in either of the other states.
          const done = !ongoing && !upcoming && isDone(tdoc);
          const enrolled = tdict[tdoc.docId]?.attend === 1;
          return (
            <li key={tdoc.docId} className={styles.item}>
              <div className={styles.dateBlock}>
                <div className={styles.dateDay}>{formatDate(tdoc.beginAt, { day: 'numeric' })}</div>
              </div>
              <div className={styles.body}>
                <Link to="contest_detail" params={{ tid: tdoc.docId }} className={styles.title}>
                  {tdoc.title}
                </Link>
                <ul className={styles.meta}>
                  {/* 前面:稳定的属性 chip — 规则 + Rated */}
                  <li><Chip variant="tag">{ruleText(tdoc.rule)}</Chip></li>
                  {tdoc.rated && <li><Chip variant="diff">Rated</Chip></li>}
                  {/* 中间视觉间隔 */}
                  <li className={styles.divider} aria-hidden />
                  {/* 末尾:动态状态 — 时长 / 人数 / 比赛阶段 / 已报名 */}
                  <li className={styles.text}>{renderDuration(tdoc)} 小时</li>
                  <li className={styles.text}>{tdoc.attend ?? 0} 人</li>
                  {ongoing && <li><Chip variant="ongoing">进行中</Chip></li>}
                  {upcoming && <li><Chip variant="upcoming">未开始</Chip></li>}
                  {done && <li><Chip variant="ended">已结束</Chip></li>}
                  {enrolled && <li><Chip>已报名</Chip></li>}
                </ul>
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
