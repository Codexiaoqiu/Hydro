import { useState } from 'react';
import { Button } from '../components/primitives/Button';
import { ContestBackLink } from '../components/contest/ContestBackLink';
import { ContestManagementSidebar } from '../components/contest/ContestManagementSidebar';
import { ContestBalloonSetColor } from '../components/contest/ContestBalloonSetColor';
import { ContestBalloonTable, type BalloonRow } from '../components/contest/ContestBalloonTable';
import { usePageData } from '../context/page-data';
import { useBalloonPoll } from '../hooks/use-balloon-poll';
import { useTranslate } from '../lib/i18n';
import { isOngoing } from '../lib/contest-status';
import styles from './contest_balloon.module.css';

interface Args {
  tdoc?: { docId: number; title?: string; beginAt?: string; endAt?: string; duration?: number };
  rows?: BalloonRow[];
  pdict?: Record<string, { docId: number; title: string; color?: string }>;
  udict?: Record<string, { _id: number; uname: string }>;
}

export default function ContestBalloonPage() {
  const { args } = usePageData() as unknown as { args: Args };
  const t = useTranslate();
  const tdoc = args?.tdoc;
  const [showSetColor, setShowSetColor] = useState(false);

  const ongoing = tdoc ? isOngoing(tdoc as any, null) : false;
  const { data, refresh } = useBalloonPoll<{
    rows: BalloonRow[]; pdict: Args['pdict']; udict: Args['udict'];
  }>({
    url: `${window.location.pathname}${window.location.search}`,
    enabled: ongoing,
  });
  const rows = data?.rows ?? args?.rows ?? [];
  const pdict = data?.pdict ?? args?.pdict ?? {};
  const udict = data?.udict ?? args?.udict ?? {};

  if (!tdoc) return <p style={{ padding: 'var(--space-6)' }}>{t('Common.Loading')}</p>;

  return (
    <div className={styles.page} data-page="contest_balloon">
      <div className={styles.layout}>
        <main className={styles.main}>
          <ContestBackLink tdoc={tdoc} />
          <header className={styles.header}>
            <h1 className={styles.title}>{t('ContestBalloon.Title')}</h1>
            <Button variant="ghost" onClick={() => setShowSetColor(true)}>
              {t('ContestBalloon.SetColor')}
            </Button>
          </header>
          <ContestBalloonTable
            rows={rows}
            pdict={pdict}
            udict={udict}
            onSend={() => refresh()}
          />
        </main>
        <ContestManagementSidebar tdoc={tdoc} />
      </div>
      <ContestBalloonSetColor open={showSetColor} onClose={() => setShowSetColor(false)} onSaved={() => refresh()} />
    </div>
  );
}
