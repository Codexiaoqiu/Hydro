import type { PropsWithChildren, ReactNode } from 'react';
import styles from './Card.module.css';

interface Props {
  variant?: 'default' | 'side' | 'stat';
  header?: ReactNode;
}

export function Card({ variant = 'default', header, children }: PropsWithChildren<Props>) {
  const variantClass = variant === 'side' ? styles.side : variant === 'stat' ? styles.stat : styles.card;
  return (
    <div className={variantClass}>
      {header && <div className={styles.header}>{header}</div>}
      {children}
    </div>
  );
}