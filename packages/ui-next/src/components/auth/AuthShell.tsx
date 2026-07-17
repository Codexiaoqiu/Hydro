import type { ReactNode } from 'react';
import styles from './AuthShell.module.css';

export interface AuthShellProps {
  /** Brand content for the left pane (typically the wordmark + headline + subline). */
  brand?: ReactNode;
  /** Title shown at the top of the form pane (e.g. "Login", "Register"). */
  title?: ReactNode;
  /** Optional supporting text rendered below the title. */
  subtitle?: ReactNode;
  /** Footer links rendered inside the brand pane (e.g. "Forgot password"). */
  footLinks?: ReactNode;
  /** The form content (rendered inside the right pane). */
  children?: ReactNode;
  /** Whether the parent layout should hide its top navigation. Defaults to false. */
  hideTopNav?: boolean;
  className?: string;
}

/**
 * Two-pane shell used inside `layout:auth` to host login / register / lostpass /
 * sudo pages. Left pane carries the brand identity; right pane is the actual
 * form. The layout is responsive: stacks vertically below 880px width.
 */
export function AuthShell({
  brand,
  title,
  subtitle,
  footLinks,
  children,
  hideTopNav = false,
  className,
}: AuthShellProps) {
  return (
    <div
      className={`${styles.shell} ${className ?? ''}`}
      data-hide-top-nav={hideTopNav ? 'true' : 'false'}
    >
      <aside className={styles.brandPane} aria-hidden={false}>
        {brand ?? (
          <div className={styles.brand}>
            <span className={styles.headline}>Hydro</span>
          </div>
        )}
        <div className={styles.brandBody}>
          {subtitle && <p className={styles.subline}>{subtitle}</p>}
        </div>
        {footLinks && <div className={styles.footLinks}>{footLinks}</div>}
      </aside>
      <section className={styles.formPane}>
        {title && <h1 className={styles.title}>{title}</h1>}
        {children}
      </section>
    </div>
  );
}
