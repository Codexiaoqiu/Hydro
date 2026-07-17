import type { PropsWithChildren } from 'react';
import styles from './Button.module.css';

interface Props { variant?: 'primary' | 'ghost', onClick?: () => void, type?: 'button' | 'submit', disabled?: boolean }

export function Button({ variant = 'ghost', onClick, type = 'button', disabled, children }: PropsWithChildren<Props>) {
  return (
    <button type={type} className={`${styles.btn} ${styles[variant]}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
