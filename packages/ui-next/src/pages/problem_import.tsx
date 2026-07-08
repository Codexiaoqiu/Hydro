import { useState, type FormEvent, type ReactNode } from 'react';
import { usePageData } from '../context/page-data';
import { Link } from '../components/link';
import { AuthShell } from '../components/auth/AuthShell';
import { TopNav } from '../components/nav/TopNav';
import { NavLink } from '../components/nav/NavLink';
import { Alert, Button, Checkbox, Input, RateLimitAlert } from '../components/primitives';
import { HydroClientError, request } from '../hooks/use-api';

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

function ProblemImportShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <TopNav brand="Hydro" currentRoute="problem_import">
        <NavLink to="homepage">Home</NavLink>
        <NavLink to="problem_main">Problems</NavLink>
      </TopNav>
      <AuthShell
        title={title}
        subtitle="Upload a problem package (zip) exported from another judge."
        hideTopNav
        footLinks={<Link to="problem_main">← Back to problem list</Link>}
      >
        {children}
      </AuthShell>
    </>
  );
}

function ProblemImportForm({ args, importerType }: { args: Args; importerType: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [preferredPrefix, setPreferredPrefix] = useState('');
  const [hidden, setHidden] = useState(false);
  const [keepUser, setKeepUser] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<HydroClientError | null>(null);
  const [done, setDone] = useState(false);

  const showKeepUser = !!args.UserContext?.hasPriv?.(8) && !importerType;
  const actionUrl = `/problem/import/${encodeURIComponent(importerType)}`;

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) {
      setError(new HydroClientError({ code: 400, message: 'Please choose a zip file to import.' }));
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
        setError(new HydroClientError({ code: 0, message: err instanceof Error ? err.message : 'Unexpected upload failure.' }));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProblemImportShell title={importerType ? `Import via ${importerType}` : 'Import problems'}>
      {error && error.code !== 429 && <Alert variant="error" message={error.message} />}
      <RateLimitAlert error={error} />
      {done ? (
        <Alert variant="success" title="Import complete" message="Your problems have been added. Visit the problem list to see them." />
      ) : (
        <form onSubmit={submit} method="POST" encType="multipart/form-data" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Package (.zip)</span>
            <input
              type="file"
              accept=".zip,application/zip"
              onChange={(e) => setFile(e.currentTarget.files?.[0] ?? null)}
              required
            />
          </label>
          <Input
            label="Preferred prefix"
            name="preferredPrefix"
            value={preferredPrefix}
            onChange={(e) => setPreferredPrefix(e.currentTarget.value)}
            hint="Leave empty for default."
            placeholder="Leave empty for default"
          />
          <Checkbox name="hidden" label="Import as hidden" checked={hidden} onChange={(e) => setHidden(e.currentTarget.checked)} />
          {showKeepUser && <Checkbox name="keepUser" label="Keep original uploader" checked={keepUser} onChange={(e) => setKeepUser(e.currentTarget.checked)} />}
          <Button type="submit" variant="primary" disabled={submitting || !file}>
            {submitting ? 'Importing…' : 'Import'}
          </Button>
        </form>
      )}
    </ProblemImportShell>
  );
}

export default function ProblemImportPage() {
  const pageData = usePageData() as unknown as ImportPageData;

  if (!isPageDataReady(pageData)) {
    return (
      <ProblemImportShell title="Import problems">
        <p style={{ margin: 0 }}>Loading...</p>
      </ProblemImportShell>
    );
  }

  const importerType = getImporterType(pageData.args);
  return <ProblemImportForm args={pageData.args} importerType={importerType} />;
}
