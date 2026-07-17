import type { PropsWithChildren } from 'react';
import { useUiContext } from '../../context/page-data';
import { defineSlot } from '../../registry';
import { TopNav } from '../nav/TopNav';
import styles from './auth-layout.module.css';

interface AuthLayoutProps extends PropsWithChildren {
  /** Hide the global top nav. Defaults to true (mirroring ui-default's immersive layout). */
  hideTopNav?: boolean;
  /** Brand string shown in the TopNav (defaults to "Hydro"). */
  brand?: string;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children, hideTopNav = true, brand = 'Hydro' }) => {
  const ui = useUiContext();
  // Respect explicit override; fall back to the AuthShell data-attr
  // (set by `<AuthShell hideTopNav>`) when available, otherwise default-hide.
  const computedHide = hideTopNav && ui?.authShellHideTopNav !== false;
  return (
    <div className={styles.root} data-hide-top-nav={computedHide ? 'true' : 'false'}>
      {!computedHide && (
        <TopNav brand={brand} currentRoute={typeof window !== 'undefined' ? window.location.pathname : ''} />
      )}
      <main className={styles.main}>{children}</main>
    </div>
  );
};

/**
 * Layout slot used by every page under `/login`, `/register`, `/lostpass`,
 * `/user/sudo`, etc. Replaces ui-default's `layout/immersive.html`:
 *
 *   - By default hides the global TopNav so the form sits in a calm, centered shell.
 *   - Pages that want a visible nav can pass `hideTopNav={false}` or set
 *     `UiContext.authShellHideTopNav = false` before mount.
 */
export default defineSlot('layout:auth', AuthLayout);
