import { useEffect, useRef, useState } from 'react';
import { request } from '../../hooks/use-api';
import { useTranslate } from '../../lib/i18n';
import {
  IFRAME_STATUS_MESSAGE,
  type IframeStatusPayload,
  isAcceptedStatus,
  isTerminalRecordStatus,
  isTrustedIframeOrigin,
} from '../../lib/iframe-protocol';
import { Button } from '../primitives/Button';
import { Input } from '../primitives/Input';
import { Modal } from '../primitives/Modal';
import { useToast } from '../primitives/use-toast';
import styles from './ProblemGenerateTestdata.module.css';

export interface ProblemGenerateTestdataProps {
  pid: string;
  testdata: string[];
  /**
   * Disables the trigger and the Start button. Used when the user can't edit
   *  (cross-domain reference) or when the testdata list is empty.
   */
  disabled?: boolean;
  onGenerated: () => void;
}

export function ProblemGenerateTestdata({ pid, testdata, disabled, onGenerated }: ProblemGenerateTestdataProps) {
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
      // Idempotency: bail if the modal is already closed (Pre-Flight Finding 1).
      // record_detail may re-stream the same terminal status over SSE reconnects;
      // we must not re-trigger onGenerated or re-toast in that case.
      if (!openRef.current) return;
      if (typeof e.data !== 'object' || e.data === null) return;
      const data = e.data as Partial<IframeStatusPayload>;
      if (data.type !== IFRAME_STATUS_MESSAGE) return;
      if (!isTrustedIframeOrigin(e.origin)) return;
      const status = data.status;
      if (!isTerminalRecordStatus(status)) return;
      setOpen(false);
      setRecordUrl(null);
      onGeneratedRef.current();
      toastRef.current.success(
        isAcceptedStatus(status)
          ? tRef.current('ProblemGenerateTestdata.Generated')
          : tRef.current('ProblemGenerateTestdata.GenerateFailed'),
      );
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
      const fd = new URLSearchParams();
      fd.set('operation', 'generate_testdata');
      fd.set('gen', gen);
      fd.set('std', std);
      // `postGenerateTestdata` lives in `ProblemFilesHandler` at
      // `/p/:pid/files` (handler/problem.ts:794). Posting to `/p/:pid` would
      // route to `ProblemDetailHandler` which has no such operation.
      const resp = await request.post<{ url: string }>(`/p/${encodeURIComponent(pid)}/files`, fd);
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
      <Button variant="ghost" onClick={() => setOpen(true)} disabled={triggerDisabled}>
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
