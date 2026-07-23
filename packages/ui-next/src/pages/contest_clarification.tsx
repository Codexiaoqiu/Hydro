import { useState } from 'react';
import { Button } from '../components/primitives/Button';
import { ContestBackLink } from '../components/contest/ContestBackLink';
import { ContestClarificationList, type ClarItem } from '../components/contest/ContestClarificationList';
import { ContestClarificationForm } from '../components/contest/ContestClarificationForm';
import { ContestManagementSidebar } from '../components/contest/ContestManagementSidebar';
import { usePageData } from '../context/page-data';
import { useTranslate } from '../lib/i18n';
import styles from './contest_clarification.module.css';

interface Args {
  tdoc?: { docId: number; pids: number[]; title?: string };
  tcdocs?: ClarItem[];
  pdict?: Record<number, { docId?: number; title?: string }>;
  udict?: Record<string, { _id: number; uname: string }>;
  UserContext?: { _id?: number };
}

export default function ContestClarificationPage() {
  const { args } = usePageData() as unknown as { args: Args };
  const t = useTranslate();
  const tdoc = args?.tdoc;
  const currentUid = (args?.UserContext as { _id?: number } | undefined)?._id ?? 0;
  const [items, setItems] = useState<ClarItem[]>(() => args?.tcdocs ?? []);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [askOpen, setAskOpen] = useState(false);

  if (!tdoc) return <p style={{ padding: 'var(--space-6)' }}>{t('Common.Loading')}</p>;

  // Generate a stable client-side id for the optimistic thread. The next
  // server poll would replace this with the real ObjectId, but local
  // append keeps the UI snappy without a reload.
  const fakeId = () => `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const onReplySubmitted = (did: string) => (payload?: { content?: string }) => {
    setReplyTo(null);
    if (payload?.content) {
      setItems((prev) => prev.map((it) => (
        it._id === did
          ? { ...it, reply: [...(it.reply ?? []), { owner: 0, content: payload.content! }] }
          : it
      )));
    }
  };

  const onBroadcastSubmitted = (payload?: { subject?: number; content?: string }) => {
    setBroadcastOpen(false);
    if (payload?.content) {
      const newItem: ClarItem = {
        _id: fakeId(),
        subject: payload.subject ?? 0,
        owner: 0, // jury posts are owned by 0 in the backend
        content: payload.content,
        reply: [],
      };
      setItems((prev) => [newItem, ...prev]);
    }
  };

  const onAskSubmitted = (payload?: { subject?: number; content?: string }) => {
    setAskOpen(false);
    if (payload?.content) {
      // Contestant-authored clarification: use a non-zero owner -> response
      // from the server will overwrite `owner` with the real uid when the
      // page is polled again.
      const newItem: ClarItem = {
        _id: fakeId(),
        subject: payload.subject ?? -1,
        owner: 1,
        content: payload.content,
        reply: [],
      };
      setItems((prev) => [newItem, ...prev]);
    }
  };

  return (
    <div className={styles.page} data-page="contest_clarification">
      <div className={styles.layout}>
        <main className={styles.main}>
          <ContestBackLink tdoc={tdoc} />
          <header className={styles.header}>
            <h1 className={styles.title}>{t('ContestClarification.Title')}</h1>
            <div className={styles.headerActions}>
              <Button variant="ghost" onClick={() => setAskOpen(true)}>
                {t('ContestClarification.Ask')}
              </Button>
              <Button variant="primary" onClick={() => setBroadcastOpen(true)}>
                {t('ContestClarification.Broadcast')}
              </Button>
            </div>
          </header>
          <ContestClarificationList
            items={items}
            pids={tdoc.pids}
            pdict={args?.pdict ?? {}}
            udict={args?.udict ?? {}}
            currentUid={currentUid}
            onReply={(did) => setReplyTo(did)}
          />
          {(replyTo || broadcastOpen || askOpen) && (
            <div className={styles.replyForm}>
              {broadcastOpen && (
                <ContestClarificationForm mode="broadcast" tdoc={tdoc as any} onSubmitted={onBroadcastSubmitted} />
              )}
              {askOpen && (
                <ContestClarificationForm mode="ask" tdoc={tdoc as any} onSubmitted={onAskSubmitted} />
              )}
              {replyTo && (
                <ContestClarificationForm mode="reply" tdoc={tdoc as any} did={replyTo} onSubmitted={onReplySubmitted(replyTo)} />
              )}
            </div>
          )}
        </main>
        <ContestManagementSidebar tdoc={tdoc} />
      </div>
    </div>
  );
}
