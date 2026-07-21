import { Alert } from '../components/primitives/Alert';
import { usePageData } from '../context/page-data';
import { useTranslate } from '../lib/i18n';

export interface ErrorPageArgs {
  error?: {
    message?: string;
    name?: string;
    code?: number;
    params?: unknown[];
    stack?: string;
  };
}

export type ErrorPageProps = {
  _pageData?: { name: string; template: string; url: string; args?: ErrorPageArgs };
};

function substitute(template: string, params: unknown[] = []): string {
  return template.replace(/\{(\d+)\}/g, (_, idx) => {
    const v = params[Number(idx)];
    return v === undefined || v === null ? `{${idx}}` : String(v);
  });
}

export default function ErrorPage({ _pageData }: ErrorPageProps = {}) {
  const t = useTranslate();
  const ctxPageData = usePageData() as { args?: ErrorPageArgs } | null;
  const pageData = _pageData ?? ctxPageData;
  const err = pageData?.args?.error;

  if (!err) {
    return (
      <div data-page="error" style={{ padding: 'var(--space-6) var(--space-8)' }}>
        <Alert variant="info" message={t('Common.Loading')} />
      </div>
    );
  }

  const code = typeof err.code === 'number' ? err.code : null;
  const variant = code === 404 ? 'warn' : code === 403 ? 'warn' : 'error';
  const title = code === 404
    ? t('ErrorPage.NotFound')
    : code === 403
      ? t('ErrorPage.Forbidden')
      : t('ErrorPage.Error');
  const raw = err.message ?? t('ErrorPage.Unknown');
  const message = substitute(raw, err.params ?? []);

  return (
    <div data-page="error" style={{ padding: 'var(--space-6) var(--space-8)' }}>
      <Alert variant={variant} title={title} message={message} />
      {import.meta.env.DEV && err.stack && (
        <pre style={{
          marginTop: 'var(--space-4)',
          padding: 'var(--space-3)',
          background: 'var(--bg-1)',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--text-xs)',
          overflow: 'auto',
          maxHeight: '320px',
        }}>{err.stack}</pre>
      )}
    </div>
  );
}