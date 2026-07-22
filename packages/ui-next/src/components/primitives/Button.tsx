import type { PropsWithChildren } from 'react';
import styles from './Button.module.css';

interface Props { variant?: 'primary' | 'ghost', onClick?: () => void, type?: 'button' | 'submit', disabled?: boolean, 'aria-label'?: string }

export function Button({ variant = 'ghost', onClick, type = 'button', disabled, children, ...rest }: PropsWithChildren<Props>) {
  return (
    <button type={type} className={`${styles.btn} ${styles[variant]}`} onClick={onClick} disabled={disabled} {...rest}>
      {children}
    </button>
  );
}
