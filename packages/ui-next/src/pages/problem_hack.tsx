import { useState, type FormEvent } from 'react';
import { usePageData } from '../context/page-data';
import { Link } from '../components/link';
import { Alert, Button, Checkbox, RateLimitAlert } from '../components/primitives';
import { HydroClientError, request } from '../hooks/use-api';
import { useTranslate } from '../lib/i18n';

interface Args {
  pdoc?: { docId: number; pid?: string; title: string };
  rdoc?: { _id: string };
  tid?: string;
}

export default function ProblemHackPage() {
  const { args } = usePageData() as unknown as { args: Args };
  const { pdoc, rdoc, tid } = args;
  const t = useTranslate();
  const [input, setInput] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [autoOrganize, setAutoOrganize] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<HydroClientError | null>(null);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const url = `/p/${encodeURIComponent(String(pdoc?.docId ?? ''))}/hack/${encodeURIComponent(rdoc?._id ?? '')}${tid ? `?tid=${encodeURIComponent(tid)}` : ''}`;
      if (file) {
        const fd = new FormData();
        if (input) fd.set('input', input);
        if (autoOrganize) fd.set('autoOrganizeInput', 'on');
        fd.set('file', file);
        await request.postFile(url, fd);
      } else {
        const fd = new URLSearchParams();
        if (input) fd.set('input', input);
        if (autoOrganize) fd.set('autoOrganizeInput', 'on');
        await request.post(url, fd);
      }
      if (rdoc?._id && typeof window !== 'undefined') {
        window.location.href = `/record/${encodeURIComponent(rdoc._id)}`;
      }
    } catch (err) {
      if (err instanceof HydroClientError) setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <main style={{ maxWidth: 720, margin: '0 auto', padding: 'var(--space-6)' }}>
        <header style={{ marginBottom: 'var(--space-4)' }}>
          <Link to="problem_detail" params={{ pid: pdoc?.pid ?? String(pdoc?.docId ?? '') }}>{t('ProblemHack.BackToProblem')}</Link>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', margin: 'var(--space-2) 0 0' }}>
            {t('ProblemHack.Title')}
          </h1>
        </header>

        {error && error.code !== 429 && <Alert variant="error" message={error.message} />}
        <RateLimitAlert error={error} />

        <form onSubmit={submit} method="POST" encType="multipart/form-data" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{t('ProblemHack.InputLabel')}</span>
            <textarea
              name="input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('ProblemHack.InputPlaceholder')}
              spellCheck={false}
              style={{
                width: '100%', minHeight: 200, padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
                background: 'var(--surface)', color: 'var(--text)',
                fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)',
              }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{t('ProblemHack.UploadLabel')}</span>
            <input type="file" name="file" onChange={(e) => setFile(e.currentTarget.files?.[0] ?? null)} />
          </label>

          <Checkbox name="autoOrganizeInput" label={t('ProblemHack.AutoOrganize')} checked={autoOrganize} onChange={(e) => setAutoOrganize(e.currentTarget.checked)} />

          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? t('ProblemHack.Submitting') : t('ProblemHack.Hack')}
          </Button>
        </form>
      </main>
    </>
  );
}