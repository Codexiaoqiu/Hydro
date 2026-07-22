import { Link } from '../link';
import { useTranslate } from '../../lib/i18n';
import styles from './ContestBackLink.module.css';

export interface ContestBackLinkProps {
  /** TDoc (or any object with `docId`) used to build the back-link target. */
  tdoc: { docId?: number | string } | null | undefined;
  /**
   * Route to navigate to. Defaults to `contest_detail`.
   * Use `contest_main` for top-level pages like `contest_create`.
   */
  to?: 'contest_detail' | 'contest_main';
  /** Optional i18n key override. Defaults to `Contest.BackToContest`. */
  labelKey?: string;
  /** Pass `true` to render a card-style block instead of the inline pill. */
  block?: boolean;
}

/**
 * "Back to contest" navigation aid shared by every contest sub-page.
 *
 * Most contest sub-pages (`balloon`, `clarification`, `manage`, `user`,
 * `edit`, `problemlist`, `scoreboard`) are reached from `contest_detail`,
 * so this component renders a small chevron link that returns to either
 * `contest_detail` (default) or `contest_main` (for top-level forms).
 *
 * Returns `null` when there is no resolvable contest id, so callers can
 * drop the component in unconditionally.
 */
export function ContestBackLink({
  tdoc,
  to = 'contest_detail',
  labelKey = 'Contest.BackToContest',
  block = false,
}: ContestBackLinkProps) {
  const t = useTranslate();
  const docId = tdoc?.docId;
  const params = docId != null ? { tid: String(docId) } : undefined;
  if (to === 'contest_detail' && !params) return null;
  return (
    <Link
      to={to}
      params={params}
      className={block ? styles.blockLink : styles.link}
      data-testid="contest-back-link"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>{t(labelKey)}</span>
    </Link>
  );
}