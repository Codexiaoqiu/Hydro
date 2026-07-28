import styles from './UserStat.module.css';

export interface UserStatProps {
  submitted?: number;
  accepted?: number;
  liked?: number;
  labels?: { submitted?: string, accepted?: string, liked?: string };
}

export function UserStat({
  submitted = 0, accepted = 0, liked = 0,
  labels = { submitted: '提交', accepted: '通过', liked: '题解获赞' },
}: UserStatProps) {
  return (
    <div className={styles.stat} data-testid="user-stat">
      <div className={styles.cell}>
        <div className={styles.num}>{submitted}</div>
        <div className={styles.label}>{labels.submitted}</div>
      </div>
      <div className={styles.cell}>
        <div className={styles.num}>{accepted}</div>
        <div className={styles.label}>{labels.accepted}</div>
      </div>
      <div className={styles.cell}>
        <div className={styles.num}>{liked}</div>
        <div className={styles.label}>{labels.liked}</div>
      </div>
    </div>
  );
}
