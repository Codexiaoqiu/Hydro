import styles from './Trend.module.css';

interface Props { values: number[], color?: 'cyan' | 'blue', height?: number }

export function Trend({ values, color = 'cyan', height = 50 }: Props) {
  const max = Math.max(...values, 1);
  return (
    <div className={styles.trend} style={{ height }}>
      {values.map((v, i) => (
        <div
          key={i}
          className={`${styles.bar} ${color === 'blue' ? styles.blue : ''}`}
          style={{ height: `${(v / max) * 100}%` }}
        />
      ))}
    </div>
  );
}
