import styles from './ContestList.module.css';

export interface ContestItem { title: string; emoji?: string; date: string; onClick?: () => void; }

export function ContestList({ items }: { items: ContestItem[] }) {
  return (
    <div>
      {items.map((c, i) => (
        <div key={i} className={styles.item} onClick={c.onClick}>
          <div className={styles.l}>
            <div className={styles.ico}>{c.emoji ?? '🏆'}</div>
            {c.title}
          </div>
          <div className={styles.r}>{c.date}</div>
        </div>
      ))}
    </div>
  );
}