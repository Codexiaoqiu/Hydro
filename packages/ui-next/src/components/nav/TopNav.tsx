import type { PropsWithChildren, ReactNode } from 'react';
import { BrandMark } from './BrandMark';
import styles from './TopNav.module.css';

interface Props { brand: string; currentRoute?: string; right?: ReactNode; }

export function TopNav({ brand, currentRoute, right, children }: PropsWithChildren<Props>) {
  // currentRoute prop wins; fall back to last path segment
  const inferred = currentRoute
    ?? (typeof window !== 'undefined'
      ? (window.location.pathname.split('/').filter(Boolean).pop() || 'homepage')
      : 'homepage');
  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>
        <BrandMark name={brand} />
        <div className={styles.links}>
          {children}
        </div>
        <div className={styles.spacer} />
        <div className={styles.right}>{right}</div>
      </div>
    </nav>
  );
}