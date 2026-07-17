import styles from './BrandMark.module.css';

export function BrandMark({ name }: { name: string }) {
  return (
    <span className={styles.brand}>
      <span className={styles.mark} />
      {name}
    </span>
  );
}
