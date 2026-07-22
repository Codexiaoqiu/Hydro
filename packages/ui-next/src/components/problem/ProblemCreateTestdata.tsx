import { useState } from 'react';
import { Button } from '../primitives/Button';
import { useTranslate } from '../../lib/i18n';
import { request } from '../../hooks/use-api';
import styles from './ProblemCreateTestdata.module.css';

export interface ProblemCreateTestdataProps {
  pid: string;
  onCreated: (name: string) => void;
}

export function ProblemCreateTestdata({ pid, onCreated }: ProblemCreateTestdataProps) {
  const [busy, setBusy] = useState(false);
  const t = useTranslate();
  const create = async () => {
    const name = window.prompt(t('ProblemCreateTestdata.FilenamePrompt'));
    if (!name) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', new Blob([''], { type: 'text/plain' }), name);
      fd.append('filename', name);
      fd.append('type', 'testdata');
      fd.append('operation', 'upload_file');
      await request.postFile(`/p/${encodeURIComponent(pid)}/files`, fd);
      onCreated(name);
    } finally { setBusy(false); }
  }
  ;
  return (
    <Button variant="ghost" onClick={create} disabled={busy}>
      {busy ? t('ProblemCreateTestdata.Creating') : `+ ${t('ProblemCreateTestdata.Create')}`}
    </Button>
  );
}
