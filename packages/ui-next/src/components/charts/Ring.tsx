import styles from './Ring.module.css';

interface Props {
  percent: number;
  size?: number;
  gradientFrom?: string;
  gradientTo?: string;
}

const CIRCUMFERENCE = 251;

export function Ring({ percent, size = 86, gradientFrom, gradientTo }: Props) {
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = CIRCUMFERENCE * (1 - clamped / 100);

  return (
    <div className={styles.ring} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 100 100">
        <defs>
          <linearGradient id="ring-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={gradientFrom ?? 'var(--cyan)'} />
            <stop offset="100%" stopColor={gradientTo ?? 'var(--violet)'} />
          </linearGradient>
        </defs>
        <circle className={styles.track} cx="50" cy="50" r="40" />
        <circle
          className={styles.bar}
          cx="50"
          cy="50"
          r="40"
          style={{ strokeDashoffset: offset }}
        />
      </svg>
    </div>
  );
}
