import { useEffect, useState } from 'react';
import { STATUS } from '@hydrooj/common';
import { Button } from '../primitives/Button';
import { Input } from '../primitives/Input';
import { Modal } from '../primitives/Modal';
import { useTranslate } from '../../lib/i18n';
import { request } from '../../hooks/use-api';
import { useToast } from '../primitives/Toast';
import styles from './ProblemGenerateTestdata.module.css';

export interface ProblemGenerateTestdataProps {
  pid: string;
  testdata: string[];
  /** Disables the trigger and the Start button. Used when the user can't edit
   *  (cross-domain reference) or when the testdata list is empty. */
  disabled?: boolean;
  onGenerated: () => void;
}

function isAcceptedStatus(value: unknown): boolean {
  // Server-side `STATUS.STATUS_ACCEPTED` is a numeric enum value (1). The
  // legacy "STATUS_ACCEPTED" string form is still accepted so the modal works
  // with both new and previously-deployed server builds.
  return value === STATUS.STATUS_ACCEPTED || value === 'STATUS_ACCEPTED';
}

export function ProblemGenerateTestdata({ pid, testdata, disabled, onGenerated }: ProblemGenerateTestdataProps) {
  const [open, setOpen] = useState(false);
  const [gen, setGen] = useState('');
  const [std, setStd] = useState('');
  const [recordUrl, setRecordUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const t = useTranslate();

  useEffect(() => {
    if (!open) return;
    const onMessage = (e: MessageEvent) => {
      if (isAcceptedStatus(e.data?.status)) {
        setOpen(false);
        setRecordUrl(null);
        onGenerated();
        toast.success(t('ProblemGenerateTestdata.Generated'));
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [open, onGenerated, toast, t]);

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
      <Modal open={open} onClose={() => setOpen(false)} title={t('ProblemGenerateTestdata.ModalTitle')} width={640}>
        {!recordUrl ? (
          <div className={styles.form}>
            <Input label={t('ProblemGenerateTestdata.GeneratorLabel')} value={gen} onChange={(e) => setGen(e.currentTarget.value)} hint={t('ProblemGenerateTestdata.Hint')} />
            <Input label={t('ProblemGenerateTestdata.StdLabel')} value={std} onChange={(e) => setStd(e.currentTarget.value)} />
            <Button variant="primary" onClick={start} disabled={!canStart || disabled}>
              {busy ? t('ProblemGenerateTestdata.Starting') : t('ProblemGenerateTestdata.Start')}
            </Button>
          </div>
        ) : (
          <iframe title="generate-record" src={recordUrl} className={styles.frame} />
        )}
      </Modal>
    </>
  );
}
