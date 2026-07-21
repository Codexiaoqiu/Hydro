import { Link } from '../link';
import { useTranslate } from '../../lib/i18n';
import styles from './ContestManagementSidebar.module.css';

export interface ContestManagementSidebarProps {
  tdoc: { docId: number; title?: string };
}

interface Entry { labelKey: string; route: string; }
const ENTRIES: Entry[] = [
  { labelKey: 'ContestMgmt.Edit', route: 'contest_edit' },
  { labelKey: 'ContestMgmt.Manage', route: 'contest_manage' },
  { labelKey: 'ContestMgmt.Export', route: 'contest_export' },
  { labelKey: 'ContestMgmt.Attendees', route: 'contest_user' },
  { labelKey: 'ContestMgmt.Balloon', route: 'contest_balloon' },
  { labelKey: 'ContestMgmt.Clarifications', route: 'contest_clarification' },
];

export function ContestManagementSidebar({ tdoc }: ContestManagementSidebarProps) {
  const t = useTranslate();
  return (
    <aside className={styles.root} aria-label={t('ContestMgmt.SidebarAria')}>
      <h3 className={styles.title}>{tdoc.title ?? t('ContestMgmt.Contest')}</h3>
      <nav className={styles.nav}>
        {ENTRIES.map((e) => (
          <Link key={e.route} to={e.route} params={{ tid: String(tdoc.docId) }} className={styles.link}>
            {t(e.labelKey)}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
