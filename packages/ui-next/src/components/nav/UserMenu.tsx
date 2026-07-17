import { useEffect, useRef, useState } from 'react';
import { useNavigate } from '../../context/router';
import { useTranslate } from '../../lib/i18n';
import styles from './UserMenu.module.css';

export interface UserMenuUser {
  _id: number;
  uname?: string;
  mail?: string;
  avatar?: string;
  role?: string;
}

interface Props {
  user: UserMenuUser;
}

function avatarSrc(user: UserMenuUser): string | undefined {
  if (!user.avatar) return undefined;
  // Mirrors the ui-default Gravatar handling: values are stored as
  // `gravatar:<email>` and rendered through cn.gravatar.com. Any other
  // value is treated as an already-resolved URL.
  if (user.avatar.startsWith('gravatar:')) {
    const email = user.avatar.slice('gravatar:'.length);
    const hash = user.mail || email;
    return `//cn.gravatar.com/avatar/${hash}?d=mm&s=64`;
  }
  return user.avatar;
}

/**
 * Top-right user indicator. Renders an avatar + username chip; clicking
 * opens a dropdown with profile / settings / logout actions.
 */
export function UserMenu({ user }: Props) {
  const navigate = useNavigate();
  const t = useTranslate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const src = avatarSrc(user);
  const display = user.uname || user.mail || `User ${user._id}`;

  return (
    <div className={styles.wrap} ref={ref}>
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {src ? (
          <img className={styles.avatar} src={src} alt="" />
        ) : (
          <span className={styles.avatarFallback} aria-hidden="true">
            {display.slice(0, 1).toUpperCase()}
          </span>
        )}
        <span className={styles.name}>{display}</span>
        <span className={styles.chevron} aria-hidden="true">▾</span>
      </button>
      {open && (
        <div role="menu" className={styles.menu}>
          <button
            type="button"
            role="menuitem"
            className={styles.item}
            onClick={() => { setOpen(false); navigate(`/user/${user._id}`); }}
          >
            {t('UserMenu.Profile')}
          </button>
          <button
            type="button"
            role="menuitem"
            className={styles.item}
            onClick={() => { setOpen(false); navigate('/home/settings/account'); }}
          >
            {t('UserMenu.Settings')}
          </button>
          <div className={styles.sep} />
          <form method="post" action="/logout" style={{ margin: 0 }}>
            <button
              type="submit"
              role="menuitem"
              className={styles.item}
            >
              {t('UserMenu.Logout')}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
