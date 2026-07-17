import type { ReactNode } from 'react';
import { useMemo } from 'react';
import styles from './Menu.module.css';

export interface MenuItemForm {
  /** URL the form submits to. Empty string submits to the current page. */
  action: string;
  /** HTTP method. Defaults to POST. */
  method?: 'POST' | 'GET';
  /** Hidden form fields. Each entry becomes `<input type="hidden" name={k} value={v}>`. */
  body?: Record<string, string>;
  /**
   * Read a CSRF token from `<meta name="csrf-token">` (preferred) or
   * `<input name="_csrf">` (fallback) and submit it as a hidden field.
   *
   * Hydro's framework uses Referer-based CSRF checks for same-origin POSTs
   * (`framework/framework/server.ts::CsrfTokenError`), so this is only
   * required for sites that additionally enforce a token check.
   */
  csrf?: boolean;
}

export interface MenuItem {
  /** Stable React key. Falls back to the array index. */
  key?: string;
  /** Display text (preferred). */
  title?: string;
  /** Legacy alias for `title`. */
  label?: string;
  /** Decorative icon, rendered before the label. */
  icon?: ReactNode;
  /** Optional badge rendered on the right edge. */
  badge?: string | number;
  /** Click handler. Ignored if `href` or `form` is set. */
  onClick?: () => void;
  /** Render as `<a href>`. Higher priority than `onClick`. */
  href?: string;
  /**
   * Render as a hidden `<form>` + submit button so cookies and CSRF tokens
   * are sent by the browser without any JavaScript. Higher priority than
   * `href`. Accepts:
   *   - an object describing the form, or
   *   - `true` (use the top-level `action` / `postBody` / `method` / `csrf`
   *     fields for compatibility with the existing call sites).
   */
  form?: MenuItemForm | true;
  /** Top-level fallback for `form.action` when `form: true`. */
  action?: string;
  /** Top-level fallback for `form.body` when `form: true`. */
  postBody?: Record<string, string>;
  /** Top-level fallback for `form.method` when `form: true`. */
  method?: 'POST' | 'GET';
  /** Top-level fallback for `form.csrf` when `form: true`. */
  csrf?: boolean;
  /** Render as a thin divider instead of a row. */
  separator?: boolean;
}

function readCsrfToken(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const meta = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null;
  if (meta?.content) return meta.content;
  const input = document.querySelector('input[name="_csrf"]') as HTMLInputElement | null;
  if (input?.value) return input.value;
  return undefined;
}

function resolveForm(it: MenuItem): MenuItemForm | null {
  if (it.form === undefined) return null;
  if (typeof it.form === 'object') {
    return {
      action: it.form.action,
      method: it.form.method ?? 'POST',
      body: it.form.body,
      csrf: it.form.csrf,
    };
  }
  // form === true: pull the form config from top-level fields.
  return {
    action: it.action ?? '',
    method: it.method ?? 'POST',
    body: it.postBody,
    csrf: it.csrf,
  };
}

export function Menu({ items }: { items: MenuItem[] }) {
  return (
    <div className={styles.menu}>
      {items.map((it, i) => {
        const key = it.key ?? i;
        if (it.separator) {
          return <div key={key} className={styles.sep} role="separator" aria-orientation="horizontal" />;
        }
        return <MenuRow key={key} item={it} />;
      })}
    </div>
  );
}

function MenuRow({ item: it }: { item: MenuItem }) {
  const text = it.title ?? it.label;
  const formConfig = useMemo(() => resolveForm(it), [it]);

  const body = (
    <>
      <span className={styles.l}>{it.icon}{text}</span>
      {it.badge !== undefined && <span className={styles.badge}>{it.badge}</span>}
    </>
  );

  if (formConfig) {
    return <FormRow form={formConfig} body={body} />;
  }
  if (it.href) {
    return (
      <a className={styles.row} href={it.href}>
        {body}
      </a>
    );
  }
  if (it.onClick) {
    return (
      <button type="button" className={styles.row} onClick={it.onClick}>
        {body}
      </button>
    );
  }
  return <span className={styles.row}>{body}</span>;
}

function FormRow({ form, body }: { form: MenuItemForm, body: ReactNode }) {
  // Read the CSRF token once on mount. Browsers cache `<meta>` and `<input>`
  // contents for the lifetime of the page, so re-reading on every render
  // would just churn React state for no benefit.
  const csrf = useMemo(() => (form.csrf ? readCsrfToken() : undefined), [form.csrf]);
  const fields = form.body ?? {};
  return (
    <form action={form.action} method={form.method ?? 'POST'} className={styles.form}>
      {csrf && <input type="hidden" name="_csrf" value={csrf} />}
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button type="submit" className={styles.row}>
        {body}
      </button>
    </form>
  );
}
