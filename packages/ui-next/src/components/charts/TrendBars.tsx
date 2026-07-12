import styles from './TrendBars.module.css';

interface Props {
  values: number[];
  gradientFrom?: string;
  gradientTo?: string;
}

export function TrendBars({ values, gradientFrom = 'var(--cyan)', gradientTo = 'var(--cyan)' }: Props) {
  const clamped = values.map((v) => Math.max(0, Math.min(1, v)));
  return (
    <div className={styles.trend}>
      {clamped.map((v, i) => (
        <div
          key={i}
          data-trend-bar=""
          className={styles.bar}
          style={{
            height: `${v * 100}%`,
            background: `linear-gradient(180deg, ${gradientFrom}, ${gradientTo})`,
          }}
        />
      ))}
    </div>
  );
}
