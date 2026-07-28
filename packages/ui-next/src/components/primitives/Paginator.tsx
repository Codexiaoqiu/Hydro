import { Link } from '../link';
import styles from './Paginator.module.css';

export interface PaginatorProps {
  current: number;
  total: number;
  buildHref: (page: number) => string;
  /** Optional aria-label override. Defaults to a Chinese label. */
  ariaLabel?: string;
}

function buildItems(current: number, total: number): Array<number | 'gap'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const items: Array<number | 'gap'> = [1];
  const window = 1;
  if (current - window > 2) items.push('gap');
  for (let i = Math.max(2, current - window); i <= Math.min(total - 1, current + window); i += 1) {
    items.push(i);
  }
  if (current + window < total - 1) items.push('gap');
  items.push(total);
  return items;
}

export function Paginator({ current, total, buildHref, ariaLabel = '分页' }: PaginatorProps) {
  if (!total || total <= 1) return null;
  const items = buildItems(current, total);
  return (
    <nav className={styles.pager} aria-label={ariaLabel}>
      {items.map((it, idx) => {
        if (it === 'gap') {
          return (
            <span key={`g-${idx}`} className={styles.gap} aria-hidden="true">…</span>
          );
        }
        const active = it === current;
        return (
          <Link
            key={it}
            href={buildHref(it)}
            className={active ? `${styles.item} ${styles.active}` : styles.item}
            aria-current={active ? 'page' : undefined}
          >
            {it}
          </Link>
        );
      })}
    </nav>
  );
}
