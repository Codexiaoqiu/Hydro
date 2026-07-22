import { useState } from 'react';
import { Button } from '../components/primitives/Button';
import { ContestBackLink } from '../components/contest/ContestBackLink';
import { ContestClarificationList } from '../components/contest/ContestClarificationList';
import { ContestClarificationForm } from '../components/contest/ContestClarificationForm';
import { ContestManagementSidebar } from '../components/contest/ContestManagementSidebar';
import { usePageData } from '../context/page-data';
import { useTranslate } from '../lib/i18n';
import styles from './contest_clarification.module.css';

interface Args {
  tdoc?: { docId: number; pids: number[]; title?: string };
  tcdocs?: Array<{ _id: string; subject: number; owner: number; content: string; reply?: Array<{ owner: number; content: string }> }>;
  pdict?: Record<string, unknown>;
  udict?: Record<string, { _id: number; uname: string }>;
}

export default function ContestClarificationPage() {
  const { args } = usePageData() as unknown as { args: Args };
  const t = useTranslate();
  const tdoc = args?.tdoc;
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [broadcastOpen, setBroadcastOpen] = useState(false);

  if (!tdoc) return <p style={{ padding: 'var(--space-6)' }}>{t('Common.Loading')}</p>;

  return (
    <div className={styles.page} data-page="contest_clarification">
      <div className={styles.layout}>
        <main className={styles.main}>
          <ContestBackLink tdoc={tdoc} />
          <header className={styles.header}>
            <h1 className={styles.title}>{t('ContestClarification.Title')}</h1>
            <Button variant="primary" onClick={() => setBroadcastOpen(true)}>
              {t('ContestClarification.Broadcast')}
            </Button>
          </header>
          <ContestClarificationList
            items={args?.tcdocs ?? []}
            pdict={args?.pdict ?? {}}
            udict={args?.udict ?? {}}
            onReply={(did) => setReplyTo(did)}
          />
          {(replyTo || broadcastOpen) && (
            <div className={styles.replyForm}>
              {broadcastOpen ? (
                <ContestClarificationForm mode="broadcast" tdoc={tdoc as any} onSubmitted={() => { setBroadcastOpen(false); window.location.reload(); }} />
              ) : (
                <ContestClarificationForm mode="reply" tdoc={tdoc as any} did={replyTo ?? undefined} onSubmitted={() => { setReplyTo(null); window.location.reload(); }} />
              )}
            </div>
          )}
        </main>
        <ContestManagementSidebar tdoc={tdoc} />
      </div>
    </div>
  );
}
