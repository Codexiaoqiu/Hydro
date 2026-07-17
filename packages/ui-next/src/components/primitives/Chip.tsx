import type { PropsWithChildren, ReactNode } from 'react';
import styles from './Chip.module.css';

interface Props { variant?: 'default' | 'diff' | 'tag' | 'ongoing' | 'upcoming' | 'ended', icon?: ReactNode }

export function Chip({ variant = 'default', icon, children }: PropsWithChildren<Props>) {
  const variantClass = ({
    diff: styles.diff,
    tag: styles.tag,
    ongoing: styles.ongoing,
    upcoming: styles.upcoming,
    ended: styles.ended,
  } as const)[variant as 'diff' | 'tag' | 'ongoing' | 'upcoming' | 'ended'] ?? '';
  return <span className={`${styles.chip} ${variantClass}`}>{icon}{children}</span>;
}
