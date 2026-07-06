import type { PropsWithChildren, ReactNode } from 'react';
import { useLocation } from '../../context/router';
import { BrandMark } from './BrandMark';
import styles from './TopNav.module.css';

interface Props { brand: string; currentRoute?: string; right?: ReactNode; }

export function TopNav({ brand, currentRoute, right, children }: PropsWithChildren<Props>) {
  // currentRoute prop wins; fall back to last route segment from location
  const location = useLocation();
  const inferred = currentRoute ?? (location.pathname.split('/').filter(Boolean).pop() || 'homepage');
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