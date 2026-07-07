import type { PropsWithChildren, ReactNode } from 'react';
import styles from './Eyebrow.module.css';

export function Eyebrow({ dot = true, children }: PropsWithChildren<{ dot?: boolean; icon?: ReactNode }>) {
  return <span className={styles.eyebrow}>{dot && <span className={styles.dot} />}{children}</span>;
}