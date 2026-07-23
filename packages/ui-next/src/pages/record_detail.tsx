import { STATUS } from '@hydrooj/common';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '../components/link';
import { Alert, Button } from '../components/primitives';
import { Menu } from '../components/sidebar/Menu';
import { usePageData } from '../context/page-data';
import { useTranslate } from '../lib/i18n';
import { canRejudgeAny, isLoggedIn } from '../lib/perms';

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

const STATUS_KEYS = [
  'Record.Status.Accepted',
  'Record.Status.WrongAnswer',
  'Record.Status.TimeLimitExceeded',
  'Record.Status.MemoryLimitExceeded',
  'Record.Status.RuntimeError',
  'Record.Status.SystemError',
  'Record.Status.CompileError',
  'Record.Status.PresentationError',
];

function statusLabel(s: number | undefined, t: (k: string) => string): string {
  if (s === undefined) return t('Record.Status.Pending');
  return STATUS_KEYS[s] ? t(STATUS_KEYS[s]) : `Status ${s}`;
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

  useEffect(() => {
    if (rev) return;
    if (typeof liveStatusRef.current === 'number' && STATUS_KEYS[liveStatusRef.current]) return;
    if (typeof EventSource === 'undefined') return;
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
          if (STATUS_KEYS[data.status]) es.close();
        }
        if (typeof data.score === 'number') setLiveScore(data.score);
      } catch { /* ignore */ }
    });
    return () => es.close();
  }, [rdoc._id, rdoc.domainId, rev]);

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
