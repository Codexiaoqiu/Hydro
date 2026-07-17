import type { PropsWithChildren } from 'react';
import { Link } from '../link';
import styles from './NavLink.module.css';

interface Props { to: string, active?: boolean }

export function NavLink({ to, active, children }: PropsWithChildren<Props>) {
  return (
    <Link to={to} className={`${styles.link} ${active ? styles.active : ''}`}>{children}</Link>
  );
}
