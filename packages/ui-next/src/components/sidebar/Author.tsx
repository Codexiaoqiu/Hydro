import { Avatar } from '../primitives/Avatar';
import styles from './Author.module.css';

interface Props { name: string, contribution?: string }

export function Author({ name, contribution }: Props) {
  return (
    <div className={styles.author}>
      <Avatar name={name} />
      <div className={styles.meta}>
        <b>{name}</b>
        {contribution && <small>{contribution}</small>}
      </div>
    </div>
  );
}
