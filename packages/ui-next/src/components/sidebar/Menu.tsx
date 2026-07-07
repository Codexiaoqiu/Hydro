import type { ReactNode } from 'react';
import styles from './Menu.module.css';

export interface MenuItem { label: string; icon?: ReactNode; badge?: string | number; onClick?: () => void; }

export function Menu({ items }: { items: MenuItem[] }) {
  return (
    <div className={styles.menu}>
      {items.map((it, i) => (
        <a key={i} className={styles.row} onClick={it.onClick}>
          <span className={styles.l}>{it.icon}{it.label}</span>
          {it.badge !== undefined && <span className={styles.badge}>{it.badge}</span>}
        </a>
      ))}
    </div>
  );
}