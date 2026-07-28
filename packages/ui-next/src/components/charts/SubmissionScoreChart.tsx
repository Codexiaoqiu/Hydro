import { TrendBars } from './TrendBars';
import styles from './SubmissionScoreChart.module.css';

export interface SubmissionScoreChartProps {
  scores: number[];
  /** Bucket count. Default 10 (0-9, 10-19, ..., 90-100). */
  buckets?: number;
}

export function SubmissionScoreChart({ scores, buckets = 10 }: SubmissionScoreChartProps) {
  if (scores.length === 0) {
    return <p className={styles.empty}>暂无分数</p>;
  }
  const counts = new Array<number>(buckets).fill(0);
  for (const s of scores) {
    const clamped = Math.max(0, Math.min(100, s));
    const idx = Math.min(buckets - 1, Math.floor((clamped / 100) * buckets));
    counts[idx] += 1;
  }
  const max = Math.max(...counts, 1);
  const values = counts.map((c) => c / max);
  return (
    <div className={styles.chart} data-testid="submission-score-chart">
      <TrendBars values={values} />
    </div>
  );
}
