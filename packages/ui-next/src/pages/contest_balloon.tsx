import { useState } from 'react';
import { Button } from '../components/primitives/Button';
import { ContestBackLink } from '../components/contest/ContestBackLink';
import { ContestManagementSidebar } from '../components/contest/ContestManagementSidebar';
import { ContestBalloonSetColor } from '../components/contest/ContestBalloonSetColor';
import {
  ContestBalloonTable,
  type BalloonDoc,
  type BalloonColor,
  type PdocLite,
  type UdicLite,
} from '../components/contest/ContestBalloonTable';
import { usePageData } from '../context/page-data';
import { useBalloonPoll } from '../hooks/use-balloon-poll';
import { useTranslate } from '../lib/i18n';
import { isOngoing } from '../lib/contest-status';
import styles from './contest_balloon.module.css';

interface Args {
  tdoc?: {
    _id: string;
    docId: string;
    title?: string;
    beginAt?: string;
    endAt?: string;
    duration?: number;
    pids?: number[];
    balloon?: Record<string, BalloonColor>;
  };
  bdocs?: BalloonDoc[];
  pdict?: Record<number, PdocLite>;
  udict?: Record<number, UdicLite>;
}

interface Polled {
  bdocs: BalloonDoc[];
  pdict: Record<number, PdocLite>;
  udict: Record<number, UdicLite>;
}

export default function ContestBalloonPage() {
  const { args } = usePageData() as unknown as { args: Args };
  const t = useTranslate();
  const tdoc = args?.tdoc;
  const [showSetColor, setShowSetColor] = useState(false);

  const ongoing = tdoc?.beginAt && tdoc?.endAt ? isOngoing(tdoc as any, Date.now()) : false;
  const { data, refresh } = useBalloonPoll<Polled>({
    url: `${window.location.pathname}${window.location.search}`,
    enabled: ongoing,
  });
  const bdocs = data?.bdocs ?? args?.bdocs ?? [];
  const pdict = data?.pdict ?? args?.pdict ?? {};
  const udict = data?.udict ?? args?.udict ?? {};
  const balloon = tdoc?.balloon ?? {};
  const pids = tdoc?.pids ?? [];

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
            bdocs={bdocs}
            pids={pids}
            pdict={pdict}
            udict={udict}
            balloon={balloon}
            onSend={async () => { await refresh(); }}
          />
        </main>
        <ContestManagementSidebar tdoc={tdoc} />
      </div>
      <ContestBalloonSetColor
        open={showSetColor}
        onClose={() => setShowSetColor(false)}
        onSaved={() => { void refresh(); }}
        pids={pids}
        initial={balloon}
      />
    </div>
  );
}