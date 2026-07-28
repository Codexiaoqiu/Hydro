<<<<<<< Updated upstream
import { useEffect, useState } from 'react';
import { STATUS } from '@hydrooj/common';
=======
import { useEffect, useRef, useState } from 'react';
>>>>>>> Stashed changes
import { Button } from '../primitives/Button';
import { Input } from '../primitives/Input';
import { Modal } from '../primitives/Modal';
import { useTranslate } from '../../lib/i18n';
import { request } from '../../hooks/use-api';
import { useToast } from '../primitives/Toast';
import { isTerminalStatus } from '../../lib/record-terminal';
import styles from './ProblemGenerateTestdata.module.css';

export interface ProblemGenerateTestdataProps {
  pid: string;
  testdata: string[];
  /** Disables the trigger and the Start button. Used when the user can't edit
   *  (cross-domain reference) or when the testdata list is empty. */
  disabled?: boolean;
  onGenerated: () => void;
  /** Disabled when the problem is a cross-domain reference. */
  disabled?: boolean;
}

<<<<<<< Updated upstream
function isAcceptedStatus(value: unknown): boolean {
  // Server-side `STATUS.STATUS_ACCEPTED` is a numeric enum value (1). The
  // legacy "STATUS_ACCEPTED" string form is still accepted so the modal works
  // with both new and previously-deployed server builds.
  return value === STATUS.STATUS_ACCEPTED || value === 'STATUS_ACCEPTED';
}

export function ProblemGenerateTestdata({ pid, testdata, disabled, onGenerated }: ProblemGenerateTestdataProps) {
=======
/** Wire-protocol tag for messages posted from `record_detail.tsx` (running
 *  inside the iframe) to the opener. Anything that doesn't carry this tag
 *  is ignored — keeping the contract narrow makes future protocol bumps safe. */
const IFRAME_STATUS_MESSAGE = 'hydro-record-status';

/**
 * Validates a postMessage payload from the record-detail iframe. Returns
 * `true` only for messages:
 *   - sent from the same origin as us (otherwise the message could be forged
 *     by a tab the user opened in another domain);
 *   - carrying the typed envelope `{ type: 'hydro-record-status', status: number }`;
 *   - where `status` is a recognised terminal verdict (`@hydrooj/common` STATUS).
 */
function isSameOriginStatusPayload(e: MessageEvent): e is MessageEvent<{ type: string; status: number }> {
  if (e.origin !== window.location.origin) return false;
  const data = e.data;
  if (!data || typeof data !== 'object') return false;
  return (data as { type?: unknown }).type === IFRAME_STATUS_MESSAGE;
}

export function ProblemGenerateTestdata({ pid, testdata, onGenerated, disabled }: ProblemGenerateTestdataProps) {
>>>>>>> Stashed changes
  const [open, setOpen] = useState(false);
  const [gen, setGen] = useState('');
  const [std, setStd] = useState('');
  const [recordUrl, setRecordUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const t = useTranslate();

  // Mirror the latest `open` + `onGenerated` + `toast` + `t` into refs so the
  // window message listener stays attached for the lifetime of the component
  // (I1: no listener churn on every prop change). Without this, every render
  // would re-attach the listener — and in StrictMode that meant a duplicate
  // listener during development, so messages were handled twice.
  const openRef = useRef(open);
  const onGeneratedRef = useRef(onGenerated);
  const toastRef = useRef(toast);
  const tRef = useRef(t);
  useEffect(() => { openRef.current = open; }, [open]);
  useEffect(() => { onGeneratedRef.current = onGenerated; }, [onGenerated]);
  useEffect(() => { toastRef.current = toast; }, [toast]);
  useEffect(() => { tRef.current = t; }, [t]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
<<<<<<< Updated upstream
      if (isAcceptedStatus(e.data?.status)) {
        setOpen(false);
        setRecordUrl(null);
        onGenerated();
        toast.success(t('ProblemGenerateTestdata.Generated'));
=======
      if (!isSameOriginStatusPayload(e)) return;
      if (!isTerminalStatus(e.data.status)) return;
      if (!openRef.current) return;
      openRef.current = false;
      setOpen(false);
      setRecordUrl(null);
      onGeneratedRef.current();
      if (e.data.status === 1 /* STATUS_ACCEPTED */) {
        toastRef.current.success(tRef.current('ProblemGenerateTestdata.Generated'));
>>>>>>> Stashed changes
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const closeAndReset = () => {
    setOpen(false);
    setRecordUrl(null);
  };

  const start = async () => {
    setBusy(true);
    try {
<<<<<<< Updated upstream
      const fd = new URLSearchParams();
      fd.set('operation', 'generate_testdata');
      fd.set('gen', gen);
      fd.set('std', std);
      // `postGenerateTestdata` lives in `ProblemFilesHandler` at
      // `/p/:pid/files` (handler/problem.ts:794). Posting to `/p/:pid` would
      // route to `ProblemDetailHandler` which has no such operation.
      const resp = await request.post<{ url: string }>(`/p/${encodeURIComponent(pid)}/files`, fd);
=======
      // Brief §1: generate-testdata is the same files endpoint as uploads/
      // deletes/renames — `/p/:pid/files`, not `/p/:pid`. Body is the JSON
      // operation envelope decoded by `use-api` via `Content-Type: application/json`.
      const resp = await request.post<{ url: string }>(
        `/p/${encodeURIComponent(pid)}/files`,
        { operation: 'generate_testdata', gen, std },
      );
>>>>>>> Stashed changes
      setRecordUrl(resp.url);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
      // Brief §5: never leave the modal stuck in "running" when the request
      // failed — close it and forget the record URL.
      closeAndReset();
    } finally {
      setBusy(false);
    }
  };

  const canStart = !!gen && !!std && !busy;
  const triggerDisabled = !!disabled || testdata.length === 0;

  return (
    <>
<<<<<<< Updated upstream
      <Button variant="ghost" onClick={() => setOpen(true)} disabled={triggerDisabled}>
=======
      <Button
        variant="ghost"
        onClick={() => { if (!disabled) setOpen(true); }}
        disabled={disabled || testdata.length === 0}
      >
>>>>>>> Stashed changes
        {t('ProblemGenerateTestdata.Title')}
      </Button>
      <Modal open={open && !disabled} onClose={() => setOpen(false)} title={t('ProblemGenerateTestdata.ModalTitle')} width={640}>
        {!recordUrl ? (
          <div className={styles.form}>
            <Input label={t('ProblemGenerateTestdata.GeneratorLabel')} value={gen} onChange={(e) => setGen(e.currentTarget.value)} hint={t('ProblemGenerateTestdata.Hint')} />
            <Input label={t('ProblemGenerateTestdata.StdLabel')} value={std} onChange={(e) => setStd(e.currentTarget.value)} />
            <Button variant="primary" onClick={start} disabled={!canStart || disabled}>
              {busy ? t('ProblemGenerateTestdata.Starting') : t('ProblemGenerateTestdata.Start')}
            </Button>
          </div>
        ) : (
          <iframe
            title="generate-record"
            src={recordUrl}
            className={styles.frame}
            onError={() => {
              toast.error(t('ProblemGenerateTestdata.GenerateFailed'));
              closeAndReset();
            }}
          />
        )}
      </Modal>
    </>
  );
}
