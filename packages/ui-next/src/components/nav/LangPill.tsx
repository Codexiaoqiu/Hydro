import styles from './LangPill.module.css';

export function LangPill({ label, onClick }: { label: string, onClick?: () => void }) {
  return <button type="button" className={styles.pill} onClick={onClick}>🌐 {label} ▾</button>;
}
