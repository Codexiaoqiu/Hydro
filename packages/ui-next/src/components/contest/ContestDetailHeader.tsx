import { Chip } from '../primitives/Chip';
import { Eyebrow } from '../primitives/Eyebrow';
import { ruleText } from '../../lib/rule-text';
import styles from './ContestDetailHeader.module.css';

type Status = 'upcoming' | 'ongoing' | 'done';

export type ContestDetailHeaderProps = {
  title: string;
  rule: string;
  status: Status;
  attended: boolean;
  durationText: string;
};

function statusVariant(status: Status): 'upcoming' | 'ongoing' | 'ended' {
  if (status === 'upcoming') return 'upcoming';
  if (status === 'ongoing') return 'ongoing';
  return 'ended';
}

function statusLabel(status: Status): string {
  if (status === 'upcoming') return 'Upcoming / 未开始';
  if (status === 'ongoing') return 'Ongoing / 进行中';
  return 'Ended / 已结束';
}

export function ContestDetailHeader({
  title,
  rule,
  status,
  attended,
  durationText,
}: ContestDetailHeaderProps) {
  return (
    <header className={styles.header} data-testid="contest-detail-header">
      <Eyebrow>{ruleText(rule)}</Eyebrow>
      <h1 className={styles.title}>{title}</h1>
      <div className={styles.meta}>
        <Chip variant={statusVariant(status)}>{statusLabel(status)}</Chip>
        {attended && <Chip variant="tag">Attended / 已报名</Chip>}
        <span className={styles.duration}>{durationText}</span>
      </div>
    </header>
  );
}
