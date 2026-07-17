import { type FormEvent, type ReactNode, useState } from 'react';
import { AuthShell } from '../components/auth/AuthShell';
import { Link } from '../components/link';
import { Alert, Button, Checkbox, Input, Loading, RateLimitAlert } from '../components/primitives';
import { usePageData } from '../context/page-data';
import { HydroClientError, request } from '../hooks/use-api';
import { useTranslate } from '../lib/i18n';

interface Args {
  type?: string;
  UserContext?: { hasPriv?: (priv: number) => boolean };
}

interface ImportPageData {
  name?: string;
  template?: string;
  args?: Args;
}

function isPageDataReady(pageData: ImportPageData): pageData is ImportPageData & { args: Args } {
  const { args } = pageData;
  return !!args && !!(pageData.name || pageData.template || typeof args.type === 'string');
}

function getImporterType(args: Args) {
  return args.type ?? (typeof window !== 'undefined' ? window.location.pathname.split('/').pop() ?? '' : '');
}

function ProblemImportShell({ title, subtitle, children }: { title: string, subtitle: string, children: ReactNode }) {
  const t = useTranslate();
  return (
    <>
      <AuthShell
        title={title}
        subtitle={subtitle}
        hideTopNav
        footLinks={<Link to="problem_main">{t('ProblemImport.ShellBackToList')}</Link>}
      >
        {children}
      </AuthShell>
    </>
  );
}

function ProblemImportForm({ args, importerType }: { args: Args, importerType: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [preferredPrefix, setPreferredPrefix] = useState('');
  const [hidden, setHidden] = useState(false);
  const [keepUser, setKeepUser] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<HydroClientError | null>(null);
  const [done, setDone] = useState(false);
  const t = useTranslate();

  const showKeepUser = !!args.UserContext?.hasPriv?.(8) && !importerType;
  const actionUrl = `/problem/import/${encodeURIComponent(importerType)}`;

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) {
      setError(new HydroClientError({ code: 400, message: t('ProblemImport.ErrorNoFile') }));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set('file', file);
      if (preferredPrefix) fd.set('preferredPrefix', preferredPrefix);
      if (hidden) fd.set('hidden', 'on');
      if (keepUser) fd.set('keepUser', 'on');
      await request.postFile(actionUrl, fd);
      setDone(true);
    } catch (err) {
      if (err instanceof HydroClientError) {
        setError(err);
      } else {
        setError(new HydroClientError({ code: 0, message: err instanceof Error ? err.message : t('ProblemImport.UnexpectedError') }));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const shellTitle = importerType ? `${t('ProblemImport.ShellTitleWith')}${importerType}` : t('ProblemImport.ShellTitle');
  const shellSubtitle = t('ProblemImport.ShellSubtitle');

  return (
    <ProblemImportShell title={shellTitle} subtitle={shellSubtitle}>
      {error && error.code !== 429 && <Alert variant="error" message={error.message} />}
      <RateLimitAlert error={error} />
      {done ? (
        <Alert variant="success" title={t('ProblemImport.ImportCompleteTitle')} message={t('ProblemImport.ImportCompleteMessage')} />
      ) : (
        <form
          onSubmit={submit}
          method="POST"
          encType="multipart/form-data"
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
        >
          <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{t('ProblemImport.PackageLabel')}</span>
            <input
              type="file"
              accept=".zip,application/zip"
              onChange={(e) => setFile(e.currentTarget.files?.[0] ?? null)}
              required
            />
          </label>
          <Input
            label={t('ProblemImport.PreferredPrefixLabel')}
            name="preferredPrefix"
            value={preferredPrefix}
            onChange={(e) => setPreferredPrefix(e.currentTarget.value)}
            hint={t('ProblemImport.PreferredPrefixHint')}
            placeholder={t('ProblemImport.PreferredPrefixPlaceholder')}
          />
          <Checkbox name="hidden" label={t('ProblemImport.HiddenLabel')} checked={hidden} onChange={(e) => setHidden(e.currentTarget.checked)} />
          {showKeepUser && (
            <Checkbox
              name="keepUser"
              label={t('ProblemImport.KeepUserLabel')}
              checked={keepUser}
              onChange={(e) => setKeepUser(e.currentTarget.checked)}
            />
          )}
          <Button type="submit" variant="primary" disabled={submitting || !file}>
            {submitting ? t('ProblemImport.Importing') : t('ProblemImport.Import')}
          </Button>
        </form>
      )}
    </ProblemImportShell>
  );
}

export default function ProblemImportPage() {
  const pageData = usePageData() as unknown as ImportPageData;
  const t = useTranslate();

  if (!isPageDataReady(pageData)) {
    return (
      <ProblemImportShell title={t('ProblemImport.ShellTitle')} subtitle={t('ProblemImport.ShellSubtitle')}>
        <Loading size="inline" label={t('ProblemImport.Loading')} />
      </ProblemImportShell>
    );
  }

  const importerType = getImporterType(pageData.args);
  return <ProblemImportForm args={pageData.args} importerType={importerType} />;
}
