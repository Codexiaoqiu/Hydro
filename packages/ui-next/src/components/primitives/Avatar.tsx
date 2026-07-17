import type { CSSProperties } from 'react';
import styles from './Avatar.module.css';

interface Props {
  name?: string;
  size?: number | string;
  title?: string;
}
export function Avatar({ name = '?', size = 40, title }: Props) {
  const letter = (name.trim()[0] || '?').toUpperCase();
  const numericSize = typeof size === 'number' ? size : undefined;
  const style: CSSProperties = {
    width: size,
    height: size,
    ...(numericSize !== undefined ? { fontSize: numericSize * 0.4 } : {}),
  };
  return (
    <div className={styles.avatar} style={style} title={title} aria-label={title}>
      {letter}
    </div>
  );
}
