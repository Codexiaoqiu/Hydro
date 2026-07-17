import { type FormEvent, useState } from 'react';
import { Alert, Button, Switch } from '../components/primitives';
import { usePageData } from '../context/page-data';
import { HydroClientError, request } from '../hooks/use-api';
import { canEditSystem } from '../lib/perms';

interface Args {
  UserContext?: Record<string, unknown>;
  uiNext?: boolean;
}

/**
 * `/admin/ui` — toggle ui-next on/off globally. Writes the boolean to
 * `SettingModel` via `/admin/ui` POST. The boolean is exposed on every
 * subsequent page via `UiContext.uiNext`.
 */
export default function AdminUiPage() {
  const { args } = usePageData() as unknown as { args: Args };
  const canEdit = canEditSystem(args?.UserContext as any);
  const [enabled, setEnabled] = useState(!!args?.uiNext);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<HydroClientError | null>(null);
  const [saved, setSaved] = useState(false);

  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const fd = new URLSearchParams();
      fd.set('next', enabled ? 'on' : 'off');
      await request.post('/admin/ui', fd);
      setSaved(true);
    } catch (err) {
      if (err instanceof HydroClientError) setError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <main style={{ maxWidth: 720, margin: '0 auto', padding: 'var(--space-6)' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)' }}>UI renderer</h1>
        <p style={{ color: 'var(--text-mute)' }}>
          Choose which renderer serves user-facing pages. ui-next is the React 19 / Vite SPA renderer
          with a dark-first design system; ui-default is the legacy Foundation-based renderer.
        </p>

        {!canEdit && <Alert variant="warn" title="Read-only" message="You don't have permission to change this setting." />}
        {error && <Alert variant="error" message={error.message} />}
        {saved && <Alert variant="success" title="Saved" message="UI preference updated." />}

        <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginTop: 'var(--space-5)' }}>
          <Switch
            label="Use ui-next (experimental)"
            description="Renders every page with the new SPA renderer when set to on."
            checked={enabled}
            disabled={!canEdit || saving}
            onChange={(e) => setEnabled(e.currentTarget.checked)}
          />
          <Button type="submit" variant="primary" disabled={!canEdit || saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </form>
      </main>
    </>
  );
}
