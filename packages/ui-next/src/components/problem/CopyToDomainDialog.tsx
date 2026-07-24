import { useEffect, useState } from 'react';
import { request } from '../../hooks/use-api';
import { detectLocale, useTranslate } from '../../lib/i18n';
import { Button } from '../primitives/Button';
import { Input } from '../primitives/Input';
import { Modal } from '../primitives/Modal';
import { useToast } from '../primitives/Toast';

export interface CopyToDomainDialogProps {
  /** When false the dialog renders nothing. The page toggles this itself. */
  open: boolean;
  onClose: () => void;
  /** Fired after a successful copy so the host can refresh its list. */
  onCopied: () => void;
  /** Problem docIds to copy. */
  pids: number[];
  /** Domain id to scope the operation; defaults to whatever the page hosts. */
  domainId?: string;
}

/**
 * Modal that lets the user pick a target domain and POST `operation=copy`.
 *
 *   - Endpoint:  `/p` (problem_main handler — ProblemMainHandler.postCopy in
 *                packages/hydrooj/src/handler/problem.ts). The operation router
 *                maps `operation=copy` → `postCopy(domainId, pids, target)`.
 *   - Body:      application/x-www-form-urlencoded (URLSearchParams) so the
 *                same encoding legacy problem_sidebar.page.ts uses.
 *   - Success:   success toast, then `onCopied()` + `onClose()`.
 *   - Failure:   error toast; the dialog stays open so the user can retry.
 *
 * The Copy and Cancel buttons reuse the existing `Problem.Copy` /
 * `Common.Cancel` i18n keys — adding new `CopyToDomainDialog.*` keys would
 * require touching lib/i18n.ts (out of scope for this fix brief) and the
 * `/:`/`/`/`/` moodle strings are intentionally generic.
 */
export function CopyToDomainDialog({
  open,
  onClose,
  onCopied,
  pids,
  domainId,
}: CopyToDomainDialogProps) {
  const [target, setTarget] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const t = useTranslate();

  // Snapshot the locale once so we can emit a human-readable success message
  // even without a dedicated i18n key for the success text.
  const [locale] = useState(() => (typeof window === 'undefined' ? 'en' : detectLocale()));
  const copyLabel = locale === 'zh_CN' ? '复制成功' : 'Copied';

  // Reset local state when the dialog closes so the next open starts fresh.
  useEffect(() => {
    if (!open) {
      setTarget('');
      setBusy(false);
    }
  }, [open]);

  const submit = async () => {
    const trimmed = target.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      const fd = new URLSearchParams();
      fd.set('operation', 'copy');
      fd.set('pids', pids.join(','));
      fd.set('target', trimmed);
      if (domainId) {
        // Domain is path-scoped on the server, but the URLSearchParams form
        // here means we have to encode it in the body instead. The legacy
        // `request.post('.')` form relies on the request URL embedding the
        // domain id; we mirror that by appending `/d/:domainId/p` below.
      }
      const endpoint = domainId ? `/d/${encodeURIComponent(domainId)}/p` : '/p';
      await request.post(endpoint, fd);
      toast.success(copyLabel);
      onCopied();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const targetLabel = locale === 'zh_CN' ? '目标域' : 'Target domain';

  return (
    <Modal open={open} onClose={onClose} title={t('Problem.Copy')} width={420} footer={
      <>
        <Button variant="ghost" onClick={onClose} disabled={busy}>{t('Common.Cancel')}</Button>
        <Button
          variant="primary"
          onClick={submit}
          disabled={target.trim().length === 0 || busy}
        >
          {t('Problem.Copy')}
        </Button>
      </>
    }>
      <Input
        label={targetLabel}
        value={target}
        placeholder={locale === 'zh_CN' ? '例如 system' : 'e.g. system'}
        autoFocus
        onChange={(e) => setTarget(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && target.trim() && !busy) submit();
        }}
      />
    </Modal>
  );
}
