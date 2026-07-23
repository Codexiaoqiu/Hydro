import { useEffect, useMemo, useState } from 'react';
import { Button } from '../components/primitives/Button';
import { ContestBackLink } from '../components/contest/ContestBackLink';
import { ContestManagementSidebar } from '../components/contest/ContestManagementSidebar';
import { ContestUserAddDialog } from '../components/contest/ContestUserAddDialog';
import {
  ContestUserTable,
  type ContestUserRow,
} from '../components/contest/ContestUserTable';
import { usePageData } from '../context/page-data';
import { useJsonPoll } from '../hooks/use-json-poll';
import { useTranslate } from '../lib/i18n';
import { isOngoing } from '../lib/contest-status';
import styles from './contest_user.module.css';

interface Args {
  tdoc?: {
    docId: number;
    title?: string;
    beginAt: string;
    endAt: string;
    duration?: number;
  };
  tsdocs?: ContestUserRow[];
  udict?: Record<string, { _id: number; uname: string }>;
  UserContext?: { domainId?: string };
}

interface Polled {
  tsdocs: ContestUserRow[];
  udict: Record<string, { _id: number; uname: string }>;
}

/**
 * `contest_user` page — manages contest attendees (Add / Delete / Rank /
 * UnRank / Resume) by polling the page URL while the contest is live and
 * JSON-calibrating after every successful mutation.
 *
 *   - Initial data is delivered via SSR-injected `args`. `useJsonPoll`
 *     (Task 1) refetches the same endpoint periodically so admins see late
 *     joiners without manual reloads.
 *   - Mutations are issued by `ContestUserTable`'s row buttons (which already
 *     post to `window.location.pathname`). On success we call `refresh()`
 *     to re-read JSON, NOT `window.location.reload()` — that would lose the
 *     optimistic row state and discard `useUiContext()` patches.
 *   - `nowMs` is fed from a 1Hz heartbeat only while the contest is `isOngoing`
 *     so the Resume column flips on expiry without a refetch round-trip.
 *   - `domainId` flows from `args.UserContext.domainId` (SSSR-injected) into
 *     `ContestUserAddDialog` → `UserSelectAutoComplete` so the real backend
 *     `users` API is called instead of the nonexistent `/user/search` route.
 */
export default function ContestUserPage() {
  const { args } = usePageData() as unknown as { args: Args };
  const t = useTranslate();
  const tdoc = args?.tdoc;
  const domainId = args?.UserContext?.domainId ?? 'system';
  const [showAdd, setShowAdd] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const ongoing = tdoc
    ? isOngoing({ beginAt: tdoc.beginAt, endAt: tdoc.endAt }, Date.now())
    : false;
  const { data, refresh } = useJsonPoll<Polled>({
    url: `${window.location.pathname}${window.location.search}`,
    enabled: !!tdoc,
    intervalMs: 30_000,
  });
  const rows = useMemo(
    () => data?.tsdocs ?? args?.tsdocs ?? [],
    [data?.tsdocs, args?.tsdocs],
  );
  const udict = useMemo(
    () => data?.udict ?? args?.udict ?? {},
    [data?.udict, args?.udict],
  );

  useEffect(() => {
    if (!ongoing) return undefined;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [ongoing]);

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
            rows={rows}
            udict={udict}
            tdoc={tdoc}
            nowMs={nowMs}
            onChange={() => {
              void refresh();
              setNowMs(Date.now());
            }}
          />
        </main>
        <ContestManagementSidebar tdoc={tdoc} />
      </div>
      <ContestUserAddDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onAdded={() => { void refresh(); setShowAdd(false); }}
        domainId={domainId}
      />
    </div>
  );
}
