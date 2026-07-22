import { STATUS, STATUS_SHORT_TEXTS } from '@hydrooj/common';
import { Alert } from '../components/primitives/Alert';
import { ContestBackLink } from '../components/contest/ContestBackLink';
import { ContestDetailHeader } from '../components/contest/ContestDetailHeader';
import { ContestTimer } from '../components/contest/ContestTimer';
import { ContestDetailSidebar } from '../components/contest/ContestDetailSidebar';
import { isDone, isOngoing, renderDuration } from '../lib/contest-status';
import { useTranslate } from '../lib/i18n';
import { usePageData } from '../context/page-data';
import { Link } from '../components/link';
import { useBuildUrl } from '../hooks/use-build-url';
import type { SerializedContestStatusDoc, SerializedTdoc, SerializedUserDict } from '../sections/types';
import styles from './contest_problemlist.module.css';

export type ContestProblemListPageArgs = {
  tdoc?: SerializedTdoc & { owner?: number; allowPrint?: boolean; _code?: string };
  tsdoc?: SerializedContestStatusDoc | null;
  pdict?: Record<number, { docId: number; pid: string; title: string }>;
  psdict?: Record<number, { rid?: string; score?: number; status?: number }>;
  rdict?: Record<string, { _id: string; status?: number }>;
  udict?: SerializedUserDict;
  tcdocs?: Array<{ _id: string; subject?: number; content: string; owner?: number; reply?: Array<{ content: string }> }>;
  showScore?: boolean;
  canViewRecord?: boolean;
};

export type ContestProblemListPageProps = {
  _pageData?: { name: string; template: string; url: string; args?: ContestProblemListPageArgs };
};

export default function ContestProblemListPage({ _pageData }: ContestProblemListPageProps = {}) {
  const t = useTranslate();
  const buildUrl = useBuildUrl();
  const ctxPageData = usePageData() as { args?: ContestProblemListPageArgs } | null;
  const pageData = _pageData ?? ctxPageData;
  const args = pageData?.args;

  if (!args || !args.tdoc) {
    return (
      <div className={styles.page} data-page="contest_problemlist">
        <Alert variant="info" message={t('ContestDetail.Loading')} />
      </div>
    );
  }

  const {
    tdoc,
    tsdoc = null,
    pdict = {},
    psdict = {},
    udict = {},
    tcdocs = [],
    showScore = false,
    canViewRecord = false,
  } = args;
  const status: 'upcoming' | 'ongoing' | 'done' = isDone(tdoc)
    ? 'done'
    : isOngoing(tdoc)
      ? 'ongoing'
      : 'upcoming';
  const pids = tdoc.pids ?? [];

  const userCtx = (args as Record<string, unknown>).UserContext as
    | { _id?: number; perm?: string; hasPerm?: (p: string) => boolean; own?: (d: { owner?: number | string }) => boolean }
    | undefined;
  const currentUserPerms = {
    _id: userCtx?._id ?? 0,
    hasPerm: (p: string) => {
      if (typeof userCtx?.hasPerm === 'function') return userCtx.hasPerm(p);
      if (!userCtx?.perm) return false;
      return userCtx.perm.includes(p);
    },
    own: (d: { owner?: number | string }) => {
      if (typeof userCtx?.own === 'function') return userCtx.own(d);
      return userCtx?._id != null && d.owner != null && String(d.owner) === String(userCtx._id);
    },
  };

  return (
    <div className={styles.page} data-page="contest_problemlist">
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
          <ContestBackLink tdoc={tdoc} block />
          {tsdoc?.attend === 1 && isOngoing(tdoc) && (
            <div className={styles.banner}>{t('ContestProblemList.AttendedBanner')}</div>
          )}

          {pids.length === 0 ? (
            <p className={styles.empty}>{t('ContestProblemList.EmptyProblems')}</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t('ContestProblemList.HeaderNumber')}</th>
                  <th>{t('ContestProblemList.HeaderProblem')}</th>
                  {showScore && <th className={styles.scoreCell}>{t('ContestProblemList.HeaderScore')}</th>}
                  {canViewRecord && <th>{t('ContestProblemList.HeaderStatus')}</th>}
                  <th>{t('ContestProblemList.HeaderSubmit')}</th>
                </tr>
              </thead>
              <tbody>
                {pids.map((pid: number, idx: number) => {
                  const pdoc = pdict[pid];
                  const psdoc = psdict[pid];
                  const score = psdoc?.score;
                  const statusNum = psdoc?.status;
                  const isAccepted = statusNum === STATUS.STATUS_ACCEPTED;
                  const statusLabel = statusNum != null
                    ? STATUS_SHORT_TEXTS[statusNum] ?? `status:${statusNum}`
                    : '—';
                  const submitHref = buildUrl('problem_submit', { pid: String(pdoc?.docId ?? pid) });
                  return (
                    <tr key={pid}>
                      <td>{String.fromCharCode(65 + idx)}</td>
                      <td className={styles.titleCell}>
                        {pdoc
                          ? <Link to="problem_detail" params={{ pid: String(pdoc.docId) }}>{pdoc.title}</Link>
                          : `Problem #${pid}`}
                      </td>
                      {showScore && (
                        <td className={styles.scoreCell}>{score != null ? score : '—'}</td>
                      )}
                      {canViewRecord && (
                        <td className={isAccepted ? styles.statusAccept : styles.statusOther}>
                          {statusLabel}
                        </td>
                      )}
                      <td>
                        {status === 'ongoing' && tsdoc?.attend === 1 ? (
                          <Link to="problem_submit" params={{ pid: String(pdoc?.docId ?? pid) }} searchParams={{ tid: tdoc.docId }}>
                            {t('ContestProblemList.HeaderSubmit')}
                          </Link>
                        ) : (
                          <span className={styles.submitDisabled}>
                            {t('ContestProblemList.SubmitDisabled')}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          <section className={styles.clarify}>
            <h2 className={styles.clarifyTitle}>{t('ContestProblemList.AddClarification')}</h2>
            {tcdocs.length === 0 ? (
              <p className={styles.empty}>{t('ContestProblemList.EmptyClarification')}</p>
            ) : (
              tcdocs.map((c) => (
                <article key={c._id} className={styles.clarifyItem}>
                  <div className={styles.clarifyMeta}>#{c.subject ?? '—'}</div>
                  <div className={styles.clarifyBody}>{c.content}</div>
                  {c.reply && c.reply.length > 0 && c.reply.map((r, i) => (
                    <div key={i} className={styles.clarifyBody}>↳ {r.content}</div>
                  ))}
                </article>
              ))
            )}
          </section>
        </main>
        <ContestDetailSidebar
          tdoc={tdoc}
          tsdoc={tsdoc}
          udict={udict}
          urlForFile={() => '#'}
          currentUserPerms={currentUserPerms}
        />
      </div>
    </div>
  );
}
