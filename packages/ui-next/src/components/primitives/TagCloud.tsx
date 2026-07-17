import styles from './TagCloud.module.css';

export function TagCloud({ tags }: { tags: string[] }) {
  return <div className={styles.cloud}>{tags.map((t, i) => <span key={i} className={styles.tag}>{t}</span>)}</div>;
}
