import { useEffect, useState } from 'react';
import styles from './Ring.module.css';

interface Props {
  percent: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}

export function Ring({ percent, size = 86, strokeWidth = 10, label }: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const target = circumference * (1 - Math.max(0, Math.min(100, percent)) / 100);
  const [offset, setOffset] = useState(circumference);

  useEffect(() => {
    const id = requestAnimationFrame(() => setOffset(target));
    return () => cancelAnimationFrame(id);
  }, [target]);

  return (
    <div className={styles.wrap} style={{ width: size, height: size }}>
      <svg className={styles.svg} width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id="hydro-ring-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--cyan)" />
            <stop offset="100%" stopColor="var(--violet)" />
          </linearGradient>
        </defs>
        <circle className={styles.track} cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} />
        <circle className={styles.bar} cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth}
                strokeDasharray={circumference} strokeDashoffset={offset} />
      </svg>
      {label && (
        <div className={styles.center}>
          <b className={styles.big}>{Math.round(percent)}%</b>
          <span className={styles.small}>{label}</span>
        </div>
      )}
    </div>
  );
}