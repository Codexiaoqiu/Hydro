import type { PropsWithChildren } from 'react';
import styles from './Button.module.css';

interface Props { variant?: 'primary' | 'ghost'; onClick?: () => void; type?: 'button' | 'submit'; }

export function Button({ variant = 'ghost', onClick, type = 'button', children }: PropsWithChildren<Props>) {
  return (
    <button type={type} className={`${styles.btn} ${styles[variant]}`} onClick={onClick}>
      {children}
    </button>
  );
}