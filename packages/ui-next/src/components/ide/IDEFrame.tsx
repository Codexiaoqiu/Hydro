import type { PropsWithChildren, ReactNode } from 'react';
import styles from './IDEFrame.module.css';

interface Props { filename: string, actions?: ReactNode[], lineNo?: number }

export function IDEFrame({ filename, actions = [], lineNo, children }: PropsWithChildren<Props>) {
  return (
    <div className={styles.ide}>
      <div className={styles.bar}>
        <span className={styles.dots}><i /><i /><i /></span>
        <span>{filename}</span>
        <span className={styles.actions}>{actions.map((a, i) => <span key={i}>{a}</span>)}</span>
      </div>
      <div className={styles.body}>
        {lineNo !== undefined && <span className={styles.ln}>{lineNo}</span>}
        <span className={styles.v}>{children}</span>
      </div>
    </div>
  );
}
