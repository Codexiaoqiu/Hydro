import { useState, type FormEvent } from 'react';
import { usePageData } from '../context/page-data';
import { useNavigate } from '../context/router';
import { TopNav } from '../components/nav/TopNav';
import { NavLink } from '../components/nav/NavLink';
import { Link } from '../components/link';
import { Alert, Button, RateLimitAlert } from '../components/primitives';
import { HydroClientError, request } from '../hooks/use-api';
import { useTranslate } from '../lib/i18n';

interface LangOption { value: string; label: string; }
interface Args {
  pdoc?: { docId: number; pid?: string; title: string; config?: { langs?: string[]; type?: string } };
  langRange?: LangOption[];
  codeLang?: string;
  tid?: string;
}

export default function ProblemSubmitPage() {
  const { args } = usePageData() as unknown as { args: Args };
  const navigate = useNavigate();
  const t = useTranslate();
  const { pdoc, langRange = [], codeLang = '', tid } = args;
  const [lang, setLang] = useState(codeLang || langRange[0]?.value || '');
  const [code, setCode] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [pretestInput, setPretestInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<HydroClientError | null>(null);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!code.trim() && !file) {
      setError(new HydroClientError({ code: 400, message: t('ProblemSubmit.ErrorNoCodeOrFile') }));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const url = `/p/${encodeURIComponent(String(pdoc?.docId ?? ''))}/submit${tid ? `?tid=${encodeURIComponent(tid)}` : ''}`;
      if (file) {
        const mfd = new FormData();
        mfd.set('lang', lang);
        if (code) mfd.set('code', code);
        mfd.set('file', file);
        if (pretestInput) mfd.set('input', pretestInput);
        const resp = await request.postFile<{ rid?: string; tid?: string }>(url, mfd);
        afterSubmit(resp);
      } else {
        const fd = new URLSearchParams();
        fd.set('lang', lang);
        fd.set('code', code);
        if (pretestInput) fd.set('input', pretestInput);
        const resp = await request.post<{ rid?: string; tid?: string }>(url, fd);
        afterSubmit(resp);
      }
    } catch (err) {
      if (err instanceof HydroClientError) setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const afterSubmit = (resp: { rid?: string; tid?: string }) => {
    if (resp.rid) navigate(`/record/${encodeURIComponent(resp.rid)}`);
    else if (resp.tid) navigate(`/`);
    else if (typeof window !== 'undefined') window.location.reload();
  };

  const pretestAllowed = pdoc?.config?.type === 'default' || pdoc?.config?.type === 'remote_judge';

  return (
    <>
      <TopNav brand="Hydro" currentRoute="problem_submit">
        <NavLink to="homepage">{t('Common.Home')}</NavLink>
        <NavLink to="problem_main">{t('Common.Problems')}</NavLink>
      </TopNav>
      <main style={{ maxWidth: 1080, margin: '0 auto', padding: 'var(--space-6)' }}>
        <header style={{ marginBottom: 'var(--space-4)' }}>
          <Link to="problem_detail" params={{ pid: pdoc?.pid ?? String(pdoc?.docId ?? '') }}>{t('ProblemSubmit.BackToProblem')}</Link>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', margin: 'var(--space-2) 0 0' }}>
            {t('ProblemSubmit.TitlePrefix')}{pdoc?.title}
          </h1>
        </header>

        {error && error.code !== 429 && <Alert variant="error" message={error.message} />}
        <RateLimitAlert error={error} />

        <form onSubmit={submit} method="POST" encType="multipart/form-data" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{t('ProblemSubmit.Language')}</span>
            <select
              name="lang"
              value={lang}
              onChange={(e) => setLang(e.currentTarget.value)}
              required
              style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
            >
              {langRange.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{t('ProblemSubmit.SourceCode')}</span>
            <textarea
              name="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t('ProblemSubmit.SourcePlaceholder')}
              spellCheck={false}
              autoFocus
              style={{
                width: '100%', minHeight: 360, padding: 'var(--space-4)',
                borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
                background: 'var(--surface)', color: 'var(--text)',
                fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)',
              }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{t('ProblemSubmit.UploadFile')}</span>
            <input type="file" name="file" onChange={(e) => setFile(e.currentTarget.files?.[0] ?? null)} />
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-mute)' }}>
              {t('ProblemSubmit.UploadHint')}
            </span>
          </label>

          {pretestAllowed && (
            <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{t('ProblemSubmit.PretestInput')}</span>
              <textarea
                name="input"
                value={pretestInput}
                onChange={(e) => setPretestInput(e.target.value)}
                placeholder={t('ProblemSubmit.PretestPlaceholder')}
                style={{
                  width: '100%', minHeight: 120, padding: 'var(--space-3)',
                  borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
                  background: 'var(--surface)', color: 'var(--text)',
                  fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)',
                }}
              />
            </label>
          )}

          <input type="hidden" name="tid" value={tid ?? ''} />
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? t('ProblemSubmit.Submitting') : t('ProblemSubmit.Submit')}
          </Button>
        </form>
      </main>
    </>
  );
}