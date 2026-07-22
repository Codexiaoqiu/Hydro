import { useEffect, useState } from 'react';
import { Button } from '../primitives/Button';
import { Input } from '../primitives/Input';
import { Modal } from '../primitives/Modal';
import { request } from '../../hooks/use-api';
import { useToast } from '../primitives/Toast';
import styles from './ProblemGenerateTestdata.module.css';

export interface ProblemGenerateTestdataProps {
  pid: string;
  testdata: string[];
  onGenerated: () => void;
}

export function ProblemGenerateTestdata({ pid, testdata, onGenerated }: ProblemGenerateTestdataProps) {
  const [open, setOpen] = useState(false);
  const [gen, setGen] = useState('');
  const [std, setStd] = useState('');
  const [recordUrl, setRecordUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!open) return;
    const onMessage = (e: MessageEvent) => {
      if (e.data?.status === 'STATUS_ACCEPTED') {
        setOpen(false);
        setRecordUrl(null);
        onGenerated();
        toast.success('Testdata generated');
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [open, onGenerated, toast]);

  const start = async () => {
    setBusy(true);
    try {
      const fd = new URLSearchParams();
      fd.set('operation', 'generate_testdata');
      fd.set('gen', gen);
      fd.set('std', std);
      const resp = await request.post<{ url: string }>(`/p/${encodeURIComponent(pid)}`, fd);
      setRecordUrl(resp.url);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)} disabled={testdata.length === 0}>
        Generate Testdata
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Generate Testdata" width={640}>
        {!recordUrl ? (
          <div className={styles.form}>
            <Input label="Generator source" value={gen} onChange={(e) => setGen(e.currentTarget.value)} hint="One of the existing files in testdata" />
            <Input label="Standard output source" value={std} onChange={(e) => setStd(e.currentTarget.value)} />
            <Button variant="primary" onClick={start} disabled={!gen || !std || busy}>
              {busy ? 'Starting…' : 'Start'}
            </Button>
          </div>
        ) : (
          <iframe title="generate-record" src={recordUrl} className={styles.frame} />
        )}
      </Modal>
    </>
  );
}
