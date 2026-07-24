import { useMemo, useState } from 'react';
import { getScoreColor, STATUS, STATUS_SHORT_TEXTS } from '@hydrooj/common';
import { Ring } from '../components/charts/Ring';
import { Alert } from '../components/primitives/Alert';
import { ContestBackLink } from '../components/contest/ContestBackLink';
import { ContestClarificationInlineForm } from '../components/contest/ContestClarificationInlineForm';
import { ContestDetailHeader } from '../components/contest/ContestDetailHeader';
import { ContestPrivateFiles } from '../components/contest/ContestPrivateFiles';
import { ContestSubmissionList } from '../components/contest/ContestSubmissionList';
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
  tdoc?: SerializedTdoc & {
    owner?: number;
    allowPrint?: boolean;
    _code?: string;
    privateFiles?: Array<{ name: string; size: number }>;
  };
  tsdoc?: SerializedContestStatusDoc | null;
  pdict?: Record<number, { docId: number; pid: string; title: string }>;
  psdict?: Record<number, { rid?: string; score?: number; status?: number }>;
  rdict?: Record<string, { _id: string; status?: number }>;
  rdocs?: Array<{
    _id: string;
    pid: number;
    status?: number;
    score?: number;
    lang?: string;
    time?: number;
    memory?: number;
    uid?: number;
  }>;
  udict?: SerializedUserDict;
  tcdocs?: Array<{
    _id: string;
    subject?: number;
    content: string;
    owner?: number;
    reply?: Array<{ _id?: string; content: string }>;
  }>;
  showScore?: boolean;
  canViewRecord?: boolean;
};

export type ContestProblemListPageProps = {
  _pageData?: { name: string; template: string; url: string; args?: ContestProblemListPageArgs };
};

/** Status code → CSS modifier used by the status cell. Mirrors common's STATUS_CODES. */
function statusModifier(status: number | undefined): 'accept' | 'fail' | 'progress' | 'ignored' | 'pending' {
  if (status == null) return 'pending';
  if (status === STATUS.STATUS_ACCEPTED || status === STATUS.STATUS_HACK_SUCCESSFUL) return 'accept';
  if (status === STATUS.STATUS_JUDGING || status === STATUS.STATUS_COMPILING || status === STATUS.STATUS_FETCHED) return 'progress';
  if (status === STATUS.STATUS_CANCELED || status === STATUS.STATUS_IGNORED || status === STATUS.STATUS_FORMAT_ERROR) return 'ignored';
  return 'fail';
}

function StatusCell({
  status,
  score,
}: {
  status: number | undefined;
  score: number | undefined;
}) {
  const short = status != null ? STATUS_SHORT_TEXTS[status] ?? `status:${status}` : '—';
  const mod = statusModifier(status);
  const color = score != null && Number.isFinite(score) ? getScoreColor(score) : undefined;
  if (mod === 'progress') {
    return (
      <div className={`${styles.statusCell} ${styles.statusProgress}`} data-testid={`status-progress-${status ?? 'none'}`}>
        <Ring percent={50} size={28} gradientFrom="var(--cyan)" gradientTo="var(--violet)" />
        <span className={styles.statusLabel}>{short}</span>
      </div>
    );
  }
  const isAccepted = mod === 'accept';
  const isFail = mod === 'fail';
  return (
    <div
      className={`${styles.statusCell} ${isAccepted ? styles.statusAccept : ''} ${isFail ? styles.statusFail : styles.statusOther}`}
      data-testid={`status-${mod}-${status ?? 'none'}`}
    >
      {isAccepted && (
        <svg className={styles.statusIcon} viewBox="0 0 16 16" aria-hidden="true" data-testid="icon-accept">
          <circle cx="8" cy="8" r="7" fill="currentColor" opacity="0.15" />
          <path d="M4 8.5 L7 11.5 L12 5.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {isFail && (
        <svg className={styles.statusIcon} viewBox="0 0 16 16" aria-hidden="true" data-testid="icon-fail">
          <circle cx="8" cy="8" r="7" fill="currentColor" opacity="0.15" />
          <path d="M5 5 L11 11 M11 5 L5 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )}
      {color ? (
        <span className={styles.statusScore} style={{ color }} data-testid={`status-score-${status ?? 'none'}`}>{score}</span>
      ) : (
        <span className={styles.statusLabel}>{short}</span>
      )}
    </div>
  );
}

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
    rdocs = [],
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

  // pid -> alphabetic label "A", "B", "C"…
  const pidLabels = useMemo<Record<number, string>>(() => {
    const out: Record<number, string> = {};
    pids.forEach((pid, idx) => { out[pid] = String.fromCharCode(65 + idx); });
    return out;
  }, [pids]);

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
  const isAdminOrOwner = currentUserPerms.hasPerm('PERM_EDIT_CONTEST') || currentUserPerms.own(tdoc);

  const urlForFile = (name: string) => buildUrl(
    'contest_file_download',
    { tid: String(tdoc.docId), type: 'private', filename: name },
  );

  // Reply/broadcast forms live on the dedicated `/contest/:tid/clarification`
  // page (see ContestClarificationForm), mirroring ui-default. The
  // `contest_problemlist` page only hosts the contestant's "ask" form,
  // matching ui-default `templates/contest_problemlist.html:180-208`.

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
                        <td>
                          <StatusCell status={statusNum} score={score} />
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

          {canViewRecord && (
            <ContestSubmissionList
              rdocs={rdocs}
              pidLabels={pidLabels}
              limitPerProblem={3}
            />
          )}

          <section className={styles.clarify}>
            <h2 className={styles.clarifyTitle}>{t('ContestProblemList.AddClarification')}</h2>

            {tsdoc?.attend === 1 && (
              <ContestClarificationInlineForm
                tdoc={{ docId: tdoc.docId, pids }}
                onSubmitted={() => { window.location.reload(); }}
              />
            )}

            {tcdocs.length === 0 ? (
              <p className={styles.empty}>{t('ContestProblemList.EmptyClarification')}</p>
            ) : (
              tcdocs.map((c) => (
                <article key={c._id} className={styles.clarifyItem} data-testid={`clarify-${c._id}`}>
                  <div className={styles.clarifyMeta}>
                    #{pidLabels[c.subject as number] ?? '—'}
                    {c.owner === 0 ? ` · ${t('ContestClarification.Jury')}` : ''}
                  </div>
                  <div className={styles.clarifyBody}>{c.content}</div>
                  {c.reply && c.reply.length > 0 && c.reply.map((r, i) => (
                    <div key={i} className={styles.clarifyReply}>↳ {r.content}</div>
                  ))}
                  {/* Reply/broadcast UI lives on /contest/:tid/clarification
                      (ContestClarificationForm), matching ui-default layout. */}
                </article>
              ))
            )}
          </section>
        </main>
        <ContestDetailSidebar
          tdoc={tdoc}
          tsdoc={tsdoc}
          udict={udict}
          urlForFile={urlForFile}
          currentUserPerms={currentUserPerms}
        />
        {tdoc.privateFiles && tdoc.privateFiles.length > 0 && (
          <ContestPrivateFiles files={tdoc.privateFiles} urlForFile={urlForFile} />
        )}
      </div>
    </div>
  );
}
