/**
 * `/home/settings/:category` — single page that handles every preference,
 * account, and per-domain user settings category. The server injects a list
 * of `_Setting` rows (`family / key / value / type / range / flag / desc`),
 * and we render one control per row, save by POSTing back to the same URL.
 *
 * Replaces `home_preference.page.jsx` (no independent URL — legacy nav links
 * `home_settings?category=preference`) and subsumes both `home_settings`
 * and per-category variants of `home_domain`/`home_account` in ui-default.
 */
import { type FormEvent, useMemo, useState } from 'react';
import { Alert, Button, Input } from '../components/primitives';
import { useToast } from '../components/primitives/Toast';
import { usePageData } from '../context/page-data';
import { request } from '../hooks/use-api';
import { useTranslate } from '../lib/i18n';

// Mirrors packages/hydrooj/src/model/setting.ts::_Setting. Only the fields we
// actually render are typed here; the rest are forwarded as-is to the server.
interface SettingRow {
  family: string;
  key: string;
  value: unknown;
  name: string;
  desc?: string;
  flag?: number;
  type: 'text' | 'number' | 'boolean' | 'markdown' | 'textarea' | 'json' | 'select';
  range?: Record<string, string> | null;
}

interface Args {
  category: 'preference' | 'account' | 'domain';
  page_name: string;
  current: Record<string, unknown>;
  settings: SettingRow[];
}

const FLAG_DISABLED = 2;
const FLAG_HIDDEN = 1;

function isDisabled(flag?: number) {
  return Boolean(flag && (flag & FLAG_DISABLED));
}
function isHidden(flag?: number) {
  return Boolean(flag && (flag & FLAG_HIDDEN));
}

function Field({ s, value, onChange }: { s: SettingRow, value: unknown, onChange: (v: unknown) => void }) {
  if (s.type === 'boolean') {
    return (
      <label style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
        <input
          type="checkbox"
          role="switch"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.currentTarget.checked)}
        />
        <span style={{ color: 'var(--text-mute)', fontSize: 'var(--text-sm)' }}>
          {value ? '✓' : '·'}
        </span>
      </label>
    );
  }
  if (s.type === 'select') {
    return (
      <select
        value={String(value ?? '')}
        onChange={(e) => onChange(e.currentTarget.value)}
        style={{ padding: 'var(--space-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', minWidth: 200 }}
      >
        {Object.entries(s.range ?? {}).map(([k, label]) => (
          <option key={k} value={k}>{label}</option>
        ))}
      </select>
    );
  }
  if (s.type === 'number') {
    return (
      <Input
        type="number"
        value={String(value ?? 0)}
        onChange={(e) => onChange(Number(e.currentTarget.value))}
      />
    );
  }
  if (s.type === 'markdown' || s.type === 'textarea') {
    return (
      <textarea
        value={String(value ?? '')}
        onChange={(e) => onChange(e.currentTarget.value)}
        rows={6}
        style={{
          width: '100%',
          padding: 'var(--space-2)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
          background: 'var(--bg-1)',
          color: 'var(--text)',
          fontFamily: s.type === 'markdown' ? 'var(--font-mono)' : 'inherit',
          resize: 'vertical',
        }}
      />
    );
  }
  return (
    <Input
      type="text"
      value={String(value ?? '')}
      onChange={(e) => onChange(e.currentTarget.value)}
    />
  );
}

export default function HomeSettingsPage() {
  const { args } = usePageData() as unknown as { args: Args };
  const t = useTranslate();
  const toast = useToast();
  // `args.settings ?? []` produces a fresh array reference every render, which
  // would invalidate every downstream `useMemo`. Stabilise it first by
  // JSON-fingerprinting the row contents — cheap and exact for this page
  // because each row is a small JSON object.
  const settingsKey = useMemo(() => JSON.stringify(args.settings ?? []), [args.settings]);
  const rows = useMemo<SettingRow[]>(
    () => (args.settings ?? []) as SettingRow[],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settingsKey],
  );

  // Initialize values from server-injected `current` (user doc), falling back
  // to schema defaults when the field is unset.
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const init: Record<string, unknown> = {};
    for (const s of rows) {
      const v = args.current?.[s.key];
      init[s.key] = v ?? s.value;
    }
    return init;
  });

  const grouped = useMemo(() => {
    const out: Record<string, SettingRow[]> = {};
    for (const s of rows) {
      if (isHidden(s.flag)) continue;
      (out[s.family] ||= []).push(s);
    }
    return out;
  }, [rows]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const usp = new URLSearchParams();
      usp.set('category', args.category);
      const booleanKeys: string[] = [];
      for (const s of rows) {
        if (s.type === 'boolean') {
          if (values[s.key]) usp.set(s.key, 'on'); else booleanKeys.push(s.key);
          continue;
        }
        if (values[s.key] !== undefined && values[s.key] !== null) {
          usp.set(s.key, String(values[s.key]));
        }
      }
      if (booleanKeys.length) usp.set('booleanKeys', booleanKeys.join(','));
      await request.post(`/home/settings/${args.category}`, usp);
      toast.success(t('HomeSettings.Saved'));
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: 'var(--space-6)' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', margin: '0 0 var(--space-4)' }}>
        {t(`HomeSettings.Title.${args.category}`)}
      </h1>

      {error && <Alert variant="error" message={error} />}

      {Object.keys(grouped).length === 0 && (
        <Alert variant="info" message={t('HomeSettings.NoSettings')} />
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        {Object.entries(grouped).map(([family, settings]) => (
          <section
            key={family}
            style={{
              padding: 'var(--space-4)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--surface)',
            }}>
            <h2 style={{
              fontSize: 'var(--text-md)',
              margin: '0 0 var(--space-3)',
              color: 'var(--text-mute)',
            }}>
              {family}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {settings.map((s) => (
                <label
                  key={s.key}
                  style={{
                    display: 'flex', flexDirection: 'column', gap: 'var(--space-1)',
                    opacity: isDisabled(s.flag) ? 0.6 : 1,
                  }}>
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                    {s.name || s.key}
                  </span>
                  {s.desc && (
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-mute)' }}>
                      {s.desc}
                    </span>
                  )}
                  <Field
                    s={s}
                    value={values[s.key]}
                    onChange={(v) => setValues((prev) => ({ ...prev, [s.key]: v }))}
                  />
                </label>
              ))}
            </div>
          </section>
        ))}

        {Object.keys(grouped).length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? t('Common.Loading') : t('Common.Save')}
            </Button>
          </div>
        )}
      </form>
    </main>
  );
}
