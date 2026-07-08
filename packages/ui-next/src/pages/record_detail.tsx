import { useEffect, useMemo, useRef, useState } from 'react';
import { usePageData } from '../context/page-data';
import { TopNav } from '../components/nav/TopNav';
import { NavLink } from '../components/nav/NavLink';
import { Link } from '../components/link';
import { Alert, Button } from '../components/primitives';
import { Menu } from '../components/sidebar/Menu';

interface Rdoc {
  _id: string;
  status?: number;
  score?: number;
  code?: string;
  files?: { code?: string; hack?: string };
  lang?: string;
  domainId?: string;
  judgeAt?: number;
  hackTarget?: string;
  uid: number;
}
interface Pdoc { docId: number; pid?: string; title: string; config?: { hackable?: boolean } }
interface Args {
  rdoc: Rdoc;
  pdoc: Pdoc;
  tdoc?: { rule?: string; docId?: string };
  udoc?: { uname?: string };
  judge_udoc?: { uname?: string };
  allRevs?: Array<[string, number]>;
  rev?: string;
  UserContext?: {
    _id?: number;
    hasPerm?: (p: number) => boolean;
  };
}

const STATUS_TEXT = ['Accepted', 'Wrong Answer', 'Time Limit Exceeded', 'Memory Limit Exceeded',
  'Runtime Error', 'System Error', 'Compile Error', 'Presentation Error'];

function statusLabel(s?: number): string {
  if (s === undefined) return 'Pending';
  return STATUS_TEXT[s] ?? `Status ${s}`;
}

function highlightFor(lang?: string): string {
  if (!lang) return 'plaintext';
  if (lang === '_' || lang === 'objective') return 'plaintext';
  return lang;
}

export default function RecordDetailPage() {
  const { args } = usePageData() as unknown as { args: Args };
  const { rdoc, pdoc, tdoc, udoc, judge_udoc, allRevs = [], rev, UserContext } = args;
  const [liveStatus, setLiveStatus] = useState<number | undefined>(rdoc.status);
  const [liveScore, setLiveScore] = useState<number | undefined>(rdoc.score);
  // Mirror liveStatus into a ref so the EventSource lifecycle effect does not
  // have to depend on it. Without this, every SSE push would setState, which
  // would re-run the effect, closing and reopening the EventSource each tick
  // (reconnect storm).
  const liveStatusRef = useRef<number | undefined>(liveStatus);

  useEffect(() => {
    if (rev) return;
    if (typeof liveStatusRef.current === 'number' && STATUS_TEXT[liveStatusRef.current]) return;
    if (typeof EventSource === 'undefined') return;
    const es = new EventSource(`/record-detail-conn?domainId=${encodeURIComponent(String(rdoc.domainId ?? ''))}&rid=${encodeURIComponent(String(rdoc._id))}`);
    es.addEventListener('update', (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data);
        if (typeof data.status === 'number') {
          setLiveStatus(data.status);
          liveStatusRef.current = data.status;
          // Terminal status — no more updates expected, close the stream.
          if (STATUS_TEXT[data.status]) es.close();
        }
        if (typeof data.score === 'number') setLiveScore(data.score);
      } catch { /* ignore */ }
    });
    return () => es.close();
  }, [rdoc._id, rdoc.domainId, rev]);

  const isAdmin = !!UserContext?.hasPerm?.(/* PERM_REJUDGE */ 4096);
  const isOwner = UserContext?._id === rdoc.uid;
  const canHack = !rdoc.hackTarget && !isOwner && pdoc.config?.hackable && liveStatus === 0 && !!UserContext?._id;

  const code = rdoc.code ?? '';
  const codeLang = highlightFor(rdoc.lang);

  const info = useMemo(() => {
    const rows: Array<[string, React.ReactNode]> = [];
    rows.push(['Submit By', <Link key="sb" to="user_detail" params={{ uid: String(rdoc.uid) }}>{udoc?.uname ?? rdoc.uid}</Link>]);
    if (rdoc.hackTarget) rows.push(['Hacked', <Link key="h" to="record_detail" params={{ rid: String(rdoc.hackTarget) }}>View source</Link>]);
    rows.push(['Problem', <Link key="p" to="problem_detail" params={{ pid: pdoc.pid ?? String(pdoc.docId) }}>{pdoc.title}</Link>]);
    if (tdoc?.rule && tdoc.rule !== 'normal') {
      rows.push([tdoc.rule === 'homework' ? 'Homework' : 'Contest',
        <Link key="t" to={tdoc.rule === 'homework' ? 'homework_detail' : 'contest_detail'} params={{ tid: String(tdoc.docId) }}>{String(tdoc.docId)}</Link>]);
    }
    if (rdoc.lang) rows.push(['Language', codeLang]);
    if (code) rows.push(['Code Length', `${code.length} B`]);
    if (rdoc.judgeAt) rows.push(['Judged At', new Date(rdoc.judgeAt).toLocaleString()]);
    if (judge_udoc?.uname) rows.push(['Judged By', judge_udoc.uname]);
    return rows;
  }, [rdoc, pdoc, tdoc, udoc, judge_udoc, code, codeLang]);

  return (
    <>
      <TopNav brand="Hydro" currentRoute="record_detail">
        <NavLink to="homepage">Home</NavLink>
        <NavLink to="record_main">Submissions</NavLink>
      </TopNav>
      <main style={{ maxWidth: 1320, margin: '0 auto', padding: 'var(--space-6)' }}>
        <header style={{ marginBottom: 'var(--space-4)' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', margin: 0 }}>
            Submission #{String(rdoc._id)}
          </h1>
          <div style={{ color: 'var(--text-mute)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>
            <strong style={{ color: 'var(--text)' }}>{statusLabel(liveStatus)}</strong>
            {liveScore !== undefined && <> · score {liveScore}</>}
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 'var(--space-6)' }}>
          <section>
            {typeof liveStatus === 'number' && (
              <Alert variant="info" title="Live" message={`Status: ${statusLabel(liveStatus)}`} />
            )}
            <div style={{ marginTop: 'var(--space-3)', display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              <a href={`/record/${encodeURIComponent(String(rdoc._id))}?download=true`}>
                <Button variant="ghost">Download code</Button>
              </a>
              {rdoc.files?.hack && (
                <a href={`/record/${encodeURIComponent(String(rdoc._id))}?download=hack`}>
                  <Button variant="ghost">Download hack input</Button>
                </a>
              )}
            </div>
            <pre style={{ marginTop: 'var(--space-4)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', background: 'var(--bg-1)', border: '1px solid var(--border)', overflow: 'auto' }}>
              <code className={`language-${codeLang}`}>{code || '(empty)'}</code>
            </pre>

            {allRevs.length > 0 && (
              <section style={{ marginTop: 'var(--space-5)' }}>
                <h2 style={{ fontSize: 'var(--text-md)' }}>History</h2>
                <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  <li><Link to="record_detail" params={{ rid: String(rdoc._id) }}>Latest version</Link></li>
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
                  key: 'rejudge', title: 'Rejudge', form: true, action: '', postBody: { operation: 'rejudge' },
                },
                isAdmin && !rdoc.files?.hack && {
                  key: 'cancel-score', title: 'Cancel score', form: true, action: '', postBody: { operation: 'cancel' },
                },
                canHack && {
                  key: 'hack',
                  title: 'Hack',
                  href: `/p/${encodeURIComponent(String(pdoc.docId))}/hack/${encodeURIComponent(String(rdoc._id))}`,
                },
              ].filter(Boolean) as never}
            />
            <div style={{ padding: 'var(--space-4)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', background: 'var(--surface)' }}>
              <h3 style={{ fontSize: 'var(--text-md)', margin: '0 0 var(--space-3)' }}>Information</h3>
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