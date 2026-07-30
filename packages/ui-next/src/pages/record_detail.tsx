import { STATUS } from '@hydrooj/common';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '../components/link';
import { Alert, Button } from '../components/primitives';
import { Menu } from '../components/sidebar/Menu';
import { usePageData } from '../context/page-data';
import { useTranslate } from '../lib/i18n';
import { IFRAME_STATUS_MESSAGE } from '../lib/iframe-protocol';
import { canRejudgeAny, isLoggedIn } from '../lib/perms';
import { isTerminalStatus } from '../lib/record-terminal';

interface Rdoc {
  _id: string;
  status?: number;
  score?: number;
  code?: string;
  files?: { code?: string, hack?: string };
  lang?: string;
  domainId?: string;
  judgeAt?: number;
  hackTarget?: string;
  uid: number;
}
interface Pdoc { docId: number, pid?: string, title: string, config?: { hackable?: boolean } }
interface Args {
  rdoc: Rdoc;
  pdoc: Pdoc;
  tdoc?: { rule?: string, docId?: string };
  udoc?: { uname?: string };
  judge_udoc?: { uname?: string };
  allRevs?: Array<[string, number]>;
  rev?: string;
  UserContext?: {
    _id?: number;
    hasPerm?: (p: number) => boolean;
  };
}

/**
 * Maps every `@hydrooj/common` `STATUS.*` value to its i18n key.
 *
 *  Replaces the legacy `STATUS_KEYS[s]` array-index lookup. The old array
 *  only covered 8 entries (0..7 by accident of array ordering) and mapped
 *  the wrong label to statuses 5, 6 and 8+ — using STATUS values directly
 *  avoids the array-index foot-gun and keeps coverage in lock-step with
 *  the upstream enum.
 *
 *  Brief §C3: terminal-status coverage now includes 8 (SystemError),
 *  9 (Canceled), 11 (Hacked), 32 (HackSuccessful) and 33 (HackUnsuccessful)
 *  — see `isTerminalStatus` in `lib/record-terminal.ts`.
 */
const STATUS_LABEL_KEYS: Readonly<Record<number, string>> = {
  [STATUS.STATUS_WAITING]: 'Record.Status.Pending',
  [STATUS.STATUS_ACCEPTED]: 'Record.Status.Accepted',
  [STATUS.STATUS_WRONG_ANSWER]: 'Record.Status.WrongAnswer',
  [STATUS.STATUS_TIME_LIMIT_EXCEEDED]: 'Record.Status.TimeLimitExceeded',
  [STATUS.STATUS_MEMORY_LIMIT_EXCEEDED]: 'Record.Status.MemoryLimitExceeded',
  [STATUS.STATUS_OUTPUT_LIMIT_EXCEEDED]: 'Record.Status.RuntimeError',
  [STATUS.STATUS_RUNTIME_ERROR]: 'Record.Status.RuntimeError',
  [STATUS.STATUS_COMPILE_ERROR]: 'Record.Status.CompileError',
  [STATUS.STATUS_SYSTEM_ERROR]: 'Record.Status.SystemError',
  [STATUS.STATUS_CANCELED]: 'Record.Status.PresentationError',
  [STATUS.STATUS_ETC]: 'Record.Status.PresentationError',
  [STATUS.STATUS_HACKED]: 'Record.Status.PresentationError',
  [STATUS.STATUS_JUDGING]: 'Record.Status.Pending',
  [STATUS.STATUS_COMPILING]: 'Record.Status.Pending',
  [STATUS.STATUS_FETCHED]: 'Record.Status.Pending',
  [STATUS.STATUS_IGNORED]: 'Record.Status.PresentationError',
  [STATUS.STATUS_FORMAT_ERROR]: 'Record.Status.PresentationError',
  [STATUS.STATUS_HACK_SUCCESSFUL]: 'Record.Status.Accepted',
  [STATUS.STATUS_HACK_UNSUCCESSFUL]: 'Record.Status.PresentationError',
};

function statusLabel(s: number | undefined, t: (k: string) => string): string {
  if (s === undefined) return t('Record.Status.Pending');
  const key = STATUS_LABEL_KEYS[s];
  return key ? t(key) : `Status ${s}`;
}

function highlightFor(lang?: string): string {
  if (!lang) return 'plaintext';
  if (lang === '_' || lang === 'objective') return 'plaintext';
  return lang;
}

export default function RecordDetailPage() {
  const { args } = usePageData() as unknown as { args: Args };
  const { rdoc, pdoc, tdoc, udoc, judge_udoc, allRevs = [], rev, UserContext } = args;
  const t = useTranslate();
  const [liveStatus, setLiveStatus] = useState<number | undefined>(rdoc.status);
  const [liveScore, setLiveScore] = useState<number | undefined>(rdoc.score);
  // Mirror liveStatus into a ref so the EventSource lifecycle effect does not
  // have to depend on it. Without this, every SSE push would setState, which
  // would re-run the effect, closing and reopening the EventSource each tick
  // (reconnect storm).
  const liveStatusRef = useRef<number | undefined>(liveStatus);

  // Detect iframe mode: when this page is opened inside ProblemGenerateTestdata's
  // modal, `window.parent !== window`. We forward terminal status updates to
  // the parent so the modal can close itself without polling.
  const isIframe = typeof window !== 'undefined' && window.parent !== window;

  // I7: postMessage fires at most once per (record, status). Without this,
  // every status push — including the same value redundantly echoed over SSE —
  // would re-notify the parent, which may already have torn down the modal.
  const firedRef = useRef<number | null>(null);

  useEffect(() => {
    if (rev) return undefined;
    if (typeof liveStatusRef.current === 'number' && isTerminalStatus(liveStatusRef.current)) return undefined;
    if (typeof EventSource === 'undefined') return undefined;
    const es = new EventSource(`/record-detail-conn?domainId=${encodeURIComponent(String(rdoc.domainId ?? ''))}&rid=${encodeURIComponent(String(rdoc._id))}`);
    es.addEventListener('update', (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data);
        if (typeof data.status === 'number') {
          setLiveStatus(data.status);
          liveStatusRef.current = data.status;
          // Tell the parent window we have an accepted result. ui-next's
          // ProblemGenerateTestdata modal embeds this page in an iframe and
          // listens for a `{status: STATUS.STATUS_ACCEPTED}` postMessage to
          // close itself once the generation record finishes AC.
          if (data.status === STATUS.STATUS_ACCEPTED) {
            try { window.parent?.postMessage({ status: STATUS.STATUS_ACCEPTED }, '*'); } catch { /* parent gone */ }
          }
          // Terminal status — no more updates expected, close the stream.
          if (isTerminalStatus(data.status)) es.close();
        }
        if (typeof data.score === 'number') setLiveScore(data.score);
      } catch { /* ignore */ }
    });
    return () => es.close();
  }, [rdoc._id, rdoc.domainId, rev]);

  // Iframe mode: when the judge reaches a terminal status, forward it to the
  // parent window using the shared `{ type: 'hydro-record-status', status }`
  // protocol so the parent (e.g. ProblemGenerateTestdata) can close its
  // modal and refresh its own data. Non-iframe pages skip this path entirely.
  //
  // firedRef guards against re-firing for the same status (re-judges may
  // re-stream a terminal value across SSE reconnects).
  useEffect(() => {
    if (!isIframe) return undefined;
    if (!isTerminalStatus(liveStatus)) return undefined;
    if (typeof window === 'undefined') return undefined;
    if (firedRef.current === liveStatus) return undefined;
    firedRef.current = liveStatus;
    try {
      window.parent.postMessage(
        { type: IFRAME_STATUS_MESSAGE, status: liveStatus },
        '*',
      );
    } catch { /* ignore — parent may be gone, the modal will simply not close */ }
    return undefined;
  }, [isIframe, liveStatus]);

  // Reset firedRef when navigating to a different record (the page is
  // remounted on rid change, but guard defensively for in-place arg swaps).
  useEffect(() => { firedRef.current = null; }, [rdoc._id]);

  const isAdmin = canRejudgeAny(UserContext);
  const isOwner = isLoggedIn(UserContext) && UserContext?._id === rdoc.uid;
  const canHack = !rdoc.hackTarget && !isOwner && pdoc.config?.hackable && liveStatus === 0 && isLoggedIn(UserContext);

  const code = rdoc.code ?? '';
  const codeLang = highlightFor(rdoc.lang);

  const info = useMemo(() => {
    const rows: Array<[string, React.ReactNode]> = [];
    rows.push([t('RecordDetail.SubmitBy'), <Link key="sb" to="user_detail" params={{ uid: String(rdoc.uid) }}>{udoc?.uname ?? rdoc.uid}</Link>]);
    if (rdoc.hackTarget) rows.push([t('RecordDetail.Hacked'), <Link key="h" to="record_detail" params={{ rid: String(rdoc.hackTarget) }}>{t('RecordDetail.ViewSource')}</Link>]);
    rows.push([t('RecordDetail.Problem'), <Link key="p" to="problem_detail" params={{ pid: pdoc.pid ?? String(pdoc.docId) }}>{pdoc.title}</Link>]);
    if (tdoc?.rule && tdoc.rule !== 'normal') {
      rows.push([tdoc.rule === 'homework' ? t('RecordDetail.Homework') : t('RecordDetail.Contest'),
        <Link key="t" to={tdoc.rule === 'homework' ? 'homework_detail' : 'contest_detail'} params={{ tid: String(tdoc.docId) }}>{String(tdoc.docId)}</Link>]);
    }
    if (rdoc.lang) rows.push([t('RecordDetail.Language'), codeLang]);
    if (code) rows.push([t('RecordDetail.CodeLength'), `${code.length}${t('RecordDetail.CodeLengthUnit')}`]);
    if (rdoc.judgeAt) rows.push([t('RecordDetail.JudgedAt'), new Date(rdoc.judgeAt).toLocaleString()]);
    if (judge_udoc?.uname) rows.push([t('RecordDetail.JudgedBy'), judge_udoc.uname]);
    return rows;
  }, [rdoc, pdoc, tdoc, udoc, judge_udoc, code, codeLang, t]);

  return (
    <>
      <main style={{ maxWidth: 1320, margin: '0 auto', padding: 'var(--space-6)' }}>
        <header style={{ marginBottom: 'var(--space-4)' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', margin: 0 }}>
            {t('RecordDetail.TitlePrefix')}{String(rdoc._id)}
          </h1>
          <div style={{ color: 'var(--text-mute)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>
            <strong style={{ color: 'var(--text)' }}>{statusLabel(liveStatus, t)}</strong>
            {liveScore !== undefined && <> · {t('Common.Score')} {liveScore}</>}
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 'var(--space-6)' }}>
          <section>
            {typeof liveStatus === 'number' && (
              <Alert variant="info" title={t('RecordDetail.Live')} message={`${t('RecordDetail.StatusPrefix')}${statusLabel(liveStatus, t)}`} />
            )}
            <div style={{ marginTop: 'var(--space-3)', display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              <a href={`/record/${encodeURIComponent(String(rdoc._id))}?download=true`}>
                <Button variant="ghost">{t('RecordDetail.DownloadCode')}</Button>
              </a>
              {rdoc.files?.hack && (
                <a href={`/record/${encodeURIComponent(String(rdoc._id))}?download=hack`}>
                  <Button variant="ghost">{t('RecordDetail.DownloadHack')}</Button>
                </a>
              )}
            </div>
            <pre style={{ marginTop: 'var(--space-4)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', background: 'var(--bg-1)', border: '1px solid var(--border)', overflow: 'auto' }}>
              <code className={`language-${codeLang}`}>{code || t('RecordDetail.Empty')}</code>
            </pre>

            {allRevs.length > 0 && (
              <section style={{ marginTop: 'var(--space-5)' }}>
                <h2 style={{ fontSize: 'var(--text-md)' }}>{t('RecordDetail.History')}</h2>
                <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  <li><Link to="record_detail" params={{ rid: String(rdoc._id) }}>{t('RecordDetail.LatestVersion')}</Link></li>
                  {allRevs.map(([revId, time]) => (
                    <li key={revId}>
                      <Link to="record_detail" params={{ rid: String(rdoc._id) }} searchParams={{ rev: revId }}>
                        {new Date(time).toLocaleString()}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </section>

          <aside style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <Menu
              items={[
                isAdmin && !rdoc.files?.hack && {
                  key: 'rejudge', title: t('RecordDetail.Rejudge'), form: true, action: '', postBody: { operation: 'rejudge' },
                },
                isAdmin && !rdoc.files?.hack && {
                  key: 'cancel-score', title: t('RecordDetail.CancelScore'), form: true, action: '', postBody: { operation: 'cancel' },
                },
                canHack && {
                  key: 'hack',
                  title: t('RecordDetail.Hack'),
                  href: `/p/${encodeURIComponent(String(pdoc.docId))}/hack/${encodeURIComponent(String(rdoc._id))}`,
                },
              ].filter(Boolean) as never}
            />
            <div style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', background: 'var(--surface)' }}>
              <h3 style={{ fontSize: 'var(--text-md)', margin: '0 0 var(--space-3)' }}>{t('RecordDetail.Information')}</h3>
              <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: 'var(--space-2) var(--space-4)', fontSize: 'var(--text-sm)' }}>
                {info.map(([k, v]) => (<span key={k} style={{ display: 'contents' }}><dt style={{ color: 'var(--text-mute)' }}>{k}</dt><dd style={{ margin: 0 }}>{v}</dd></span>))}
              </dl>
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}
