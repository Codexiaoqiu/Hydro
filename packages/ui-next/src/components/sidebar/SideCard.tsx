import type { PropsWithChildren, ReactNode } from 'react';
import styles from './SideCard.module.css';

interface Props {
  title: string;
  children: ReactNode;
  accent?: boolean;
}

export function SideCard({ title, children, accent = true }: PropsWithChildren<Props>) {
  return (
    <div className={styles.card}>
      <h4 className={styles.h}>
        {accent && <span className={styles.dot} data-accent-dot="" />}
        {title}
      </h4>
      {children}
    </div>
  );
}
