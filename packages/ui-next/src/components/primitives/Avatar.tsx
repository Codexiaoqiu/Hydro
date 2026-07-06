import styles from './Avatar.module.css';

interface Props { name?: string; size?: number; }
export function Avatar({ name = '?', size = 40 }: Props) {
  const letter = (name.trim()[0] || '?').toUpperCase();
  return <div className={styles.avatar} style={{ width: size, height: size, fontSize: size * 0.4 }}>{letter}</div>;
}