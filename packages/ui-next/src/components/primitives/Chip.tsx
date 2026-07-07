import type { PropsWithChildren, ReactNode } from 'react';
import styles from './Chip.module.css';

interface Props { variant?: 'default' | 'diff' | 'tag'; icon?: ReactNode; }

export function Chip({ variant = 'default', icon, children }: PropsWithChildren<Props>) {
  const variantClass = variant === 'diff' ? styles.diff : variant === 'tag' ? styles.tag : '';
  return <span className={`${styles.chip} ${variantClass}`}>{icon}{children}</span>;
}