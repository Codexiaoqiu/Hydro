import { STATUS, STATUS_SHORT_TEXTS } from '@hydrooj/common';
import styles from './SubmissionStatusChart.module.css';

export interface SubmissionStatusChartProps {
  counts: Partial<Record<STATUS, number>>;
}

export function SubmissionStatusChart({ counts }: SubmissionStatusChartProps) {
  const entries = Object.entries(counts).filter(([, n]) => (n ?? 0) > 0);
  if (entries.length === 0) {
    return <p className={styles.empty}>暂无提交</p>;
  }
  const total = entries.reduce((sum, [, n]) => sum + (n ?? 0), 0);
  return (
    <div className={styles.chart} data-testid="submission-status-chart">
      {entries.map(([k, n]) => {
        const status = Number(k) as STATUS;
        const pct = total ? (n! / total) * 100 : 0;
        return (
          <div key={k} className={styles.cell} data-status={status} title={`${STATUS_SHORT_TEXTS[status]} ${n}`}>
            <div className={styles.bar} style={{ height: `${pct}%` }} />
            <div className={styles.label}>{STATUS_SHORT_TEXTS[status]}</div>
            <div className={styles.count}>{n}</div>
          </div>
        );
      })}
    </div>
  );
}
