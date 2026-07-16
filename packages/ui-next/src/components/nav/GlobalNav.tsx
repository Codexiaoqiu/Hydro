import type { ReactNode } from 'react';
import { useNavigate } from '../../context/router';
import { usePageData } from '../../context/page-data';
import { useTranslate } from '../../lib/i18n';
import { Button } from '../primitives/Button';
import { ThemeToggle } from '../ThemeToggle';
import { TopNav } from './TopNav';
import { NavLink } from './NavLink';
import { LangPill } from './LangPill';

interface Props {
  /**
   * Optional override for the active route. Defaults to the page's `name`
   * (e.g. "problem_detail") pulled from PageData, which every page in
   * ui-next already receives from the server-injected `__HYDRO_INJECTION__`.
   */
  currentRoute?: string;
  /**
   * Extra NavLinks to append after the 4 standard entries. Used by pages
   * that want to surface a section-specific entry (e.g. record_main adding
   * "我的提交").
   */
  extraLinks?: ReactNode;
  /**
   * Extra widgets to render on the right side, before the user actions.
   */
  extraRight?: ReactNode;
}

interface MinimalUserContext {
  _id?: number;
  uname?: string;
  viewLangName?: string;
}

const STANDARD_LINKS: Array<{ to: string; key: 'Home' | 'Problems' | 'Contests' | 'Discussions' }> = [
  { to: 'homepage', key: 'Home' },
  { to: 'problem_main', key: 'Problems' },
  { to: 'contest_main', key: 'Contests' },
  { to: 'discussion_main', key: 'Discussions' },
];

/**
 * The single source of truth for the top navigation bar. Every page goes
 * through the `layout:default` slot (see `components/layout.tsx`), which
 * renders this component once, so the links, login buttons, language
 * switcher, and theme toggle are identical across the app.
 */
export function GlobalNav({ currentRoute, extraLinks, extraRight }: Props) {
  const navigate = useNavigate();
  const t = useTranslate();
  const { name, args } = usePageData();
  const user = (args as { UserContext?: MinimalUserContext }).UserContext;
  const isLoggedIn = !!user?._id;
  const route = currentRoute ?? name ?? 'homepage';

  return (
    <TopNav
      brand="Hydro"
      currentRoute={route}
      right={
        <>
          {extraRight}
          <LangPill label={user?.viewLangName || '中文'} />
          <ThemeToggle />
          {isLoggedIn ? null : (
            <>
              <Button variant="ghost" onClick={() => navigate('/login')}>
                {t('Common.Login')}
              </Button>
              <Button variant="primary" onClick={() => navigate('/register')}>
                {t('Common.Register')}
              </Button>
            </>
          )}
        </>
      }
    >
      {STANDARD_LINKS.map(({ to, key }) => (
        <NavLink key={to} to={to} active={route === to}>
          {t(`Common.${key}`)}
        </NavLink>
      ))}
      {extraLinks}
    </TopNav>
  );
}
