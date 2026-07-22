import { useState } from 'react';
import { Button } from '../components/primitives/Button';
import { ContestBackLink } from '../components/contest/ContestBackLink';
import { ContestManagementSidebar } from '../components/contest/ContestManagementSidebar';
import { ContestUserAddDialog } from '../components/contest/ContestUserAddDialog';
import { ContestUserTable } from '../components/contest/ContestUserTable';
import { usePageData } from '../context/page-data';
import { useTranslate } from '../lib/i18n';
import styles from './contest_user.module.css';

interface Args {
  tdoc?: { docId: number; title?: string; beginAt: string; endAt: string; duration?: number };
  tsdocs?: Array<{ uid: number; startAt?: string; endAt?: string; unrank?: boolean }>;
  udict?: Record<string, { _id: number; uname: string }>;
  UserContext?: { domainId?: string };
}

export default function ContestUserPage() {
  const { args } = usePageData() as unknown as { args: Args };
  const t = useTranslate();
  const tdoc = args?.tdoc;
  const [showAdd, setShowAdd] = useState(false);
  const [, setReload] = useState(0);

  if (!tdoc) return <p style={{ padding: 'var(--space-6)' }}>{t('Common.Loading')}</p>;

  return (
    <div className={styles.page} data-page="contest_user">
      <div className={styles.layout}>
        <main className={styles.main}>
          <ContestBackLink tdoc={tdoc} />
          <header className={styles.header}>
            <h1 className={styles.title}>{t('ContestUser.Title')}</h1>
            <Button variant="primary" onClick={() => setShowAdd(true)}>
              {t('ContestUser.Add')}
            </Button>
          </header>
          <ContestUserTable
            rows={args?.tsdocs ?? []}
            udict={args?.udict ?? {}}
            tdoc={tdoc}
            onChange={() => { setReload((x) => x + 1); window.location.reload(); }}
          />
        </main>
        <ContestManagementSidebar tdoc={tdoc} />
      </div>
      <ContestUserAddDialog open={showAdd} onClose={() => setShowAdd(false)} onAdded={() => window.location.reload()} domainId={args?.UserContext?.domainId} />
    </div>
  );
}
