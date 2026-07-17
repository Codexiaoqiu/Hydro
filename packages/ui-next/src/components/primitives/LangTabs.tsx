import styles from './LangTabs.module.css';

interface Option { value: string, label: string }
interface Props { options: Option[], active: string, onChange: (v: string) => void }

export function LangTabs({ options, active, onChange }: Props) {
  return (
    <div className={styles.tabs}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={`${styles.tab} ${o.value === active ? styles.on : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
