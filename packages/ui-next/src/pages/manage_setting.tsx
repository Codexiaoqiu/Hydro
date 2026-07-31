import { useState } from 'react';
import { Button } from '../components/primitives/Button';
import { Card } from '../components/primitives/Card';
import { usePageData } from '../context/page-data';

interface SystemSetting {
  key: string;
  name?: string;
  desc?: string;
  value?: string | number | boolean;
  type?: 'text' | 'number' | 'boolean' | 'select' | 'password' | 'float' | 'radio' | 'textarea' | 'markdown';
  family?: string;
  flag?: number;
  range?: string[];
}

interface Args {
  UserContext?: Record<string, unknown>;
  UiContext?: Record<string, unknown>;
  settings?: SystemSetting[];
  current?: Record<string, string | number | boolean>;
}

function displayValue(raw: string | number | boolean | undefined, type: SystemSetting['type']): string {
  if (raw === undefined || raw === null || raw === '') return '—';
  if (type === 'boolean') return raw ? 'Yes' : 'No';
  return String(raw);
}

function displayInputType(type: SystemSetting['type']): 'text' | 'number' | 'checkbox' | 'textarea' {
  if (type === 'number' || type === 'float') return 'number';
  if (type === 'boolean') return 'checkbox';
  if (type === 'textarea' || type === 'markdown') return 'textarea';
  return 'text';
}

/**
 * Normalise the in-memory value of a setting into a string suitable for an
 * `<input defaultValue>` (text/number/textarea). Booleans are handled by the
 * checkbox branch separately.
 */
function rawToString(raw: string | number | boolean | undefined): string {
  if (raw === undefined || raw === null) return '';
  return String(raw);
}

export default function ManageSettingPage() {
  const { args } = usePageData() as unknown as { args: Args };
  const settings = args?.settings ?? [];
  const current = args?.current ?? {};

  // `editingKey` is null when no dialog is open. When non-null it holds the
  // SystemSettings.key for the row currently being edited.
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const editing = editingKey ? settings.find((s) => s.key === editingKey) ?? null : null;
  const editingValue = editing
    ? (current[editing.key] !== undefined ? current[editing.key] : editing.value)
    : undefined;

  if (settings.length === 0) {
    return (
      <div className="manage-setting">
        <Card variant="default" header={<h1 className="manage-setting__title">Settings</h1>}>
          <p className="manage-setting__empty" role="status">
            No settings available.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="manage-setting">
      <Card variant="default" header={<h1 className="manage-setting__title">Settings</h1>}>
        <table className="manage-setting__table data-table">
          <colgroup>
            <col className="manage-setting__col-key" />
            <col className="manage-setting__col-value" />
            <col className="manage-setting__col-action" />
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className="manage-setting__header">Key</th>
              <th scope="col" className="manage-setting__header">Value</th>
              <th scope="col" className="manage-setting__header">Action</th>
            </tr>
          </thead>
          <tbody>
            {settings.map((s) => {
              const raw = current[s.key] !== undefined ? current[s.key] : s.value;
              return (
                <tr key={s.key} className="manage-setting__row">
                  <td className="manage-setting__cell manage-setting__cell--key">{s.key}</td>
                  <td className="manage-setting__cell manage-setting__cell--value">
                    {displayValue(raw, s.type)}
                  </td>
                  <td className="manage-setting__cell manage-setting__cell--action">
                    <Button
                      variant="primary"
                      type="button"
                      onClick={() => setEditingKey(s.key)}
                      aria-label={`Edit ${s.key}`}
                    >
                      Edit
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {/*
        Edit dialog: native `<form method="post" action="/manage/setting">`
        posts the row's `<key>=<value>` to `SystemSettingHandler.post`, which
        iterates the body and persists each via `system.set(...)`. Booleans
        additionally emit a hidden `booleanKeys.<key>` companion so the
        handler can detect unchecked submissions (the standard HTML
        checkbox gotcha — unchecked checkboxes don't appear in form data
        at all, so without the hidden companion unchecking would silently
        keep the previous value).
      */}
      {editing ? (
        <div className="manage-setting__dialog" role="dialog" aria-modal="true" aria-label={`Edit ${editing.key}`}>
          <form
            method="post"
            action="/manage/setting"
            className="manage-setting__dialog-form"
          >
            <h2 className="manage-setting__dialog-title">Edit {editing.name ?? editing.key}</h2>
            <p className="manage-setting__dialog-hint" id={`manage-setting-hint-${editing.key}`}>
              {editing.desc ?? `Key: ${editing.key}`}
            </p>
            {displayInputType(editing.type) === 'textarea' ? (
              <textarea
                className="manage-setting__dialog-input"
                name={editing.key}
                defaultValue={rawToString(editingValue)}
                rows={6}
                aria-describedby={`manage-setting-hint-${editing.key}`}
              />
            ) : displayInputType(editing.type) === 'checkbox' ? (
              // Boolean contract (must mirror `templates/partials/setting.html`
              // + `SystemSettingHandler.post` in packages/hydrooj/src/handler/manage.ts):
              //   1. The main checkbox submits `key=true` when checked.
              //   2. The hidden `booleanKeys.key` companion is always sent so
              //      the server can detect unchecked submissions and persist
              //      `false` — without this hidden field, unchecking a
              //      checkbox would silently keep the previous value (the
              //      standard HTML "checkbox absent when unchecked" gotcha).
              // The dot in `editing.key` is honored by `co-body`'s
              // `allowDots=true` setting, so the hidden field arrives at the
              // handler as the nested path `args.booleanKeys.<key>` that
              // `SystemSettingHandler.post` reads to identify unset booleans.
              <label className="manage-setting__dialog-bool">
                <input
                  type="checkbox"
                  name={editing.key}
                  value="true"
                  defaultChecked={Boolean(editingValue)}
                  aria-describedby={`manage-setting-hint-${editing.key}`}
                />
                <span>Enabled</span>
                <input type="hidden" name={`booleanKeys.${editing.key}`} value="true" />
              </label>
            ) : (
              <input
                className="manage-setting__dialog-input"
                type={displayInputType(editing.type)}
                name={editing.key}
                defaultValue={rawToString(editingValue)}
                aria-describedby={`manage-setting-hint-${editing.key}`}
              />
            )}
            <div className="manage-setting__dialog-actions">
              <Button variant="primary" type="submit">Save</Button>
              <Button variant="ghost" type="button" onClick={() => setEditingKey(null)}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
