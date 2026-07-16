import { useEffect, useMemo, useState } from 'react';
import { usePageData } from '../context/page-data';
import { HydroClientError } from '../hooks/use-api';
import { Link } from '../components/link';
import { Alert, Button } from '../components/primitives';
import { useTranslate } from '../lib/i18n';

interface Rdoc {
  _id: string;
  status?: number;
  score?: number;
  lang?: string;
  uid: number;
  pid?: number | string;
  judgeAt?: number;
}
interface Args {
  rdocs?: Rdoc[];
  udict?: Record<number, { uname?: string; avatar?: string }>;
  pdoc?: { title?: string; pid?: string; docId?: number };
  UiContext?: {
    socketUrl?: string;
    rids?: string[];
  };
  filter?: {
    uidOrName?: string;
    pid?: string;
    tid?: string;
    language?: string;
    status?: string;
    all?: boolean;
    allDomain?: boolean;
  };
  languages?: Array<{ value: string; label: string }>;
}

export default function RecordMainPage() {
  const { args } = usePageData() as unknown as { args: Args };
  const { rdocs = [], udict = {}, pdoc, UiContext, filter, languages = [] } = args;
  const navigate = useNavigate();
  const t = useTranslate();
  const [live, setLive] = useState<Record<string, Partial<Rdoc>>>({});
  const [query, setQuery] = useState({
    uidOrName: filter?.uidOrName ?? '',
    pid: filter?.pid ?? '',
    language: filter?.language ?? '',
    status: filter?.status ?? '',
    all: !!filter?.all,
    allDomain: !!filter?.allDomain,
  });
  const [error, setError] = useState<HydroClientError | null>(null);

  useEffect(() => {
    const rids = UiContext?.rids ?? rdocs.map((r) => String(r._id));
    if (!rids.length || typeof EventSource === 'undefined') return;
    const url = UiContext?.socketUrl ?? `/record-conn?${rids.map((id) => `rid=${encodeURIComponent(id)}`).join('&')}`;
    const es = new EventSource(url);
    es.addEventListener('update', (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data) as { rid: string; status?: number; score?: number };
        setLive((prev) => ({ ...prev, [data.rid]: { ...prev[data.rid], ...data } }));
      } catch { /* ignore */ }
    });
    return () => es.close();
  }, [UiContext?.socketUrl, UiContext?.rids, rdocs]);

  const merged = useMemo(() => {
    return rdocs.map((r) => ({ ...r, ...live[String(r._id)] }));
  }, [rdocs, live]);

  const apply = async (patch: Partial<typeof query>) => {
    const params = new URLSearchParams();
    const next = { ...query, ...patch };
    Object.entries(next).forEach(([k, v]) => {
      if (typeof v === 'boolean') { if (v) params.set(k, '1'); }
      else if (v) params.set(k, String(v));
    });
    if (typeof window === 'undefined') return;
    const qs = params.toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    try {
      await navigate(url);
      setError(null);
    } catch (err) {
      if (err instanceof HydroClientError) setError(err);
    }
  };

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

  return (
    <>
      <main style={{ maxWidth: 1320, margin: '0 auto', padding: 'var(--space-6)' }}>
        <header style={{ marginBottom: 'var(--space-4)' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', margin: 0 }}>{t('RecordMain.Title')}</h1>
          {pdoc?.title && <p style={{ color: 'var(--text-mute)', margin: 'var(--space-1) 0 0' }}>{pdoc.title}</p>}
        </header>

        {error && <Alert variant="error" message={error.message} />}

        <form
          onSubmit={(e) => { e.preventDefault(); void apply({}); }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr) auto', gap: 'var(--space-3)', alignItems: 'end', marginBottom: 'var(--space-4)' }}
        >
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 'var(--text-xs)' }}>{t('Common.User')}</span>
            <input value={query.uidOrName} onChange={(e) => setQuery({ ...query, uidOrName: e.currentTarget.value })} style={inputStyle} placeholder={t('RecordMain.UserPlaceholder')} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 'var(--text-xs)' }}>{t('RecordDetail.Problem')}</span>
            <input value={query.pid} onChange={(e) => setQuery({ ...query, pid: e.currentTarget.value })} style={inputStyle} placeholder={t('RecordMain.ProblemPlaceholder')} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 'var(--text-xs)' }}>{t('Common.Lang')}</span>
            <select value={query.language} onChange={(e) => setQuery({ ...query, language: e.currentTarget.value })} style={inputStyle}>
              <option value="">{t('Common.Any')}</option>
              {languages.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 'var(--text-xs)' }}>{t('Common.Status')}</span>
            <select value={query.status} onChange={(e) => setQuery({ ...query, status: e.currentTarget.value })} style={inputStyle}>
              <option value="">{t('Common.Any')}</option>
              {STATUS_KEYS.map((s, i) => <option key={i} value={String(i)}>{t(s)}</option>)}
            </select>
          </label>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <label><input type="checkbox" checked={query.all} onChange={(e) => setQuery({ ...query, all: e.currentTarget.checked })} /> {t('Common.All')}</label>
            <label><input type="checkbox" checked={query.allDomain} onChange={(e) => setQuery({ ...query, allDomain: e.currentTarget.checked })} /> {t('RecordMain.AllDomains')}</label>
          </div>
          <Button type="submit" variant="primary">{t('RecordMain.Filter')}</Button>
        </form>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--text-mute)' }}>
              <th style={th}>{t('RecordMain.HeaderId')}</th>
              <th style={th}>{t('RecordMain.HeaderUser')}</th>
              <th style={th}>{t('RecordMain.HeaderProblem')}</th>
              <th style={th}>{t('RecordMain.HeaderLang')}</th>
              <th style={th}>{t('RecordMain.HeaderStatus')}</th>
              <th style={th}>{t('RecordMain.HeaderScore')}</th>
              <th style={th}>{t('RecordMain.HeaderTime')}</th>
            </tr>
          </thead>
          <tbody>
            {merged.map((r) => (
              <tr key={r._id} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={td}><Link to="record_detail" params={{ rid: String(r._id) }}>{String(r._id).slice(-6)}</Link></td>
                <td style={td}>{udict[r.uid]?.uname ?? `#${r.uid}`}</td>
                <td style={td}>{r.pid ? <Link to="problem_detail" params={{ pid: String(r.pid) }}>{String(r.pid)}</Link> : '—'}</td>
                <td style={td}>{r.lang ?? '—'}</td>
                <td style={td}>{r.status !== undefined && STATUS_KEYS[r.status] ? t(STATUS_KEYS[r.status]) : t('Record.Status.Pending')}</td>
                <td style={td}>{r.score ?? '—'}</td>
                <td style={td}>{r.judgeAt ? new Date(r.judgeAt).toLocaleTimeString() : '—'}</td>
              </tr>
            ))}
            {!merged.length && (
              <tr><td style={td} colSpan={7}><em style={{ color: 'var(--text-mute)' }}>{t('RecordMain.NoSubmissions')}</em></td></tr>
            )}
          </tbody>
        </table>
      </main>
    </>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '8px 10px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  color: 'var(--text)',
  fontFamily: 'inherit',
};
const th: React.CSSProperties = { padding: 'var(--space-2) var(--space-3)', fontWeight: 600, fontSize: 'var(--text-xs)', textTransform: 'uppercase' };
const td: React.CSSProperties = { padding: 'var(--space-2) var(--space-3)' };