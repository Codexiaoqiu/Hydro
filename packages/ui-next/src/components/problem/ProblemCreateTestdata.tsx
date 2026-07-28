import { useState } from 'react';
import { request } from '../../hooks/use-api';
import { useTranslate } from '../../lib/i18n';
import { Button } from '../primitives/Button';

export interface ProblemCreateTestdataProps {
  pid: string;
  onCreated: (name: string) => void;
  /** Disabled when the problem is a cross-domain reference. */
  disabled?: boolean;
}

export function ProblemCreateTestdata({ pid, onCreated, disabled }: ProblemCreateTestdataProps) {
  const [busy, setBusy] = useState(false);
  const t = useTranslate();
  const create = async () => {
    if (disabled) return;
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
    <Button variant="ghost" onClick={create} disabled={disabled || busy}>
      {busy ? t('ProblemCreateTestdata.Creating') : `+ ${t('ProblemCreateTestdata.Create')}`}
    </Button>
  );
}
