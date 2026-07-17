import type { CSSProperties, ReactNode } from 'react';
import styles from './Loading.module.css';

export type LoadingSize = 'block' | 'inline';

export interface LoadingProps {
  size?: LoadingSize;
  label?: ReactNode;
  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
}

export function Loading({
  size = 'block',
  ariaLabel = 'Loading',
  className,
}: LoadingProps) {
  const sizeClass = size === 'inline' ? styles.inline : styles.block;
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
      className={[styles.root, sizeClass, className].filter(Boolean).join(' ')}
    >
      <svg
        className={styles.ring}
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <circle
          cx="8"
          cy="8"
          r="6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray="9.42 28.27"
        />
      </svg>
    </div>
  );
}
