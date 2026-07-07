import styles from './CtaCard.module.css';

interface Props { title: string; subtitle?: string; actionLabel: string; onAction?: () => void; }

export function CtaCard({ title, subtitle, actionLabel, onAction }: Props) {
  return (
    <div className={styles.cta}>
      <div className={styles.text}>
        <b>{title}</b>
        {subtitle && <small>{subtitle}</small>}
      </div>
      <button type="button" className={styles.btn} onClick={onAction}>{actionLabel}</button>
    </div>
  );
}