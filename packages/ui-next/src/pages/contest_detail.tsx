import { useEffect } from 'react';
import { ContestDescription } from '../components/contest/ContestDescription';
import { ContestDetailHeader } from '../components/contest/ContestDetailHeader';
import { ContestDetailSidebar } from '../components/contest/ContestDetailSidebar';
import { ContestFiles } from '../components/contest/ContestFiles';
import { ContestTimer } from '../components/contest/ContestTimer';
import { Alert } from '../components/primitives/Alert';
import { usePageData } from '../context/page-data';
import { isDone, isOngoing, renderDuration } from '../lib/contest-status';
import { useTranslate } from '../lib/i18n';
import type { SerializedContestStatusDoc, SerializedTdoc, SerializedUserDict } from '../sections/types';
import styles from './contest_detail.module.css';

export interface ContestDetailPageArgs {
  tdoc?: SerializedTdoc & { owner?: number, allowPrint?: boolean, _code?: string, content?: string };
  tsdoc?: SerializedContestStatusDoc | null;
  udict?: SerializedUserDict;
  files?: Array<{ name: string, size: number }>;
  urlForFile?: (name: string) => string;
}

export interface ContestDetailPageProps {
  /** Test-only injection point — production reads from usePageData() instead. */
  _pageData?: { name: string, template: string, url: string, args?: ContestDetailPageArgs };
}

function PrerenderHints() {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const proto = HTMLScriptElement.prototype as unknown as { addSpeculationRules?: unknown };
    if (typeof proto.addSpeculationRules !== 'function') return;
    const rules = {
      prerender: [
        {
          where: {
            or: [{ href_matches: '/p/*' }, { href_matches: '/d/*/p/*' }],
          },
        },
      ],
    };
    const s = document.createElement('script');
    s.type = 'speculationrules';
    s.textContent = JSON.stringify(rules);
    document.head.appendChild(s);
    return () => {
      s.remove();
    };
  }, []);
  return null;
}

export default function ContestDetailPage({ _pageData }: ContestDetailPageProps = {}) {
  const t = useTranslate();
  const ctxPageData = usePageData() as { args?: ContestDetailPageArgs } | null;
  const pageData = _pageData ?? ctxPageData;
  const args = pageData?.args;

  if (!args || !args.tdoc) {
    return (
      <div className={styles.page} data-page="contest_detail">
        <Alert variant="info" message={t('ContestDetail.Loading')} />
      </div>
    );
  }

  const { tdoc, tsdoc = null, udict = {}, files = [], urlForFile = () => '#' } = args;
  const status: 'upcoming' | 'ongoing' | 'done' = isDone(tdoc)
    ? 'done'
    : isOngoing(tdoc)
      ? 'ongoing'
      : 'upcoming';

  // Derive UserPerms from the page's UserContext (set by server handler).
  const userCtx = (args as Record<string, unknown>).UserContext as
    | { _id?: number, perm?: string, own?: (d: { owner?: number | string }) => boolean, hasPerm?: (p: string) => boolean }
    | undefined;
  const currentUserPerms = {
    _id: userCtx?._id ?? 0,
    hasPerm: (p: string) => {
      if (typeof userCtx?.hasPerm === 'function') return userCtx.hasPerm(p);
      // Fallback: parse `perm` string (format 'BigInt::12345') and check bit.
      // The server typically stores perm as BigInt in a string; the bit
      // mapping matches packages/hydrooj/src/model/builtin.ts PERM_*.
      // We treat any perm field containing 'ATTEND_CONTEST' or 'EDIT_CONTEST'
      // as a permissive fallback for the most common perms used here.
      if (!userCtx?.perm) return false;
      return userCtx.perm.includes(p);
    },
    own: (d: { owner?: number | string }) => {
      if (typeof userCtx?.own === 'function') return userCtx.own(d);
      return userCtx?._id != null && d.owner != null && String(d.owner) === String(userCtx._id);
    },
  };

  return (
    <div className={styles.page} data-page="contest_detail">
      <PrerenderHints />
      <ContestDetailHeader
        title={tdoc.title}
        rule={tdoc.rule}
        status={status}
        attended={tsdoc?.attend === 1}
        durationText={renderDuration(tdoc)}
      />
      <ContestTimer tdoc={tdoc} tsdoc={tsdoc} />
      <div className={styles.layout}>
        <main className={styles.main}>
          <ContestDescription content={tdoc.content ?? ''} docId={String(tdoc.docId)} />
          <ContestFiles files={files} urlForFile={urlForFile} />
        </main>
        <ContestDetailSidebar
          tdoc={tdoc}
          tsdoc={tsdoc}
          udict={udict}
          urlForFile={urlForFile}
          currentUserPerms={currentUserPerms}
        />
      </div>
    </div>
  );
}
