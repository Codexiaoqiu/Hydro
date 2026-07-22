import { useRef, useState } from 'react';
import { Button } from '../primitives/Button';
import { useTranslate } from '../../lib/i18n';
import { request } from '../../hooks/use-api';
import { useToast } from '../primitives/Toast';
import { ProblemCreateTestdata } from './ProblemCreateTestdata';
import { ProblemGenerateTestdata } from './ProblemGenerateTestdata';
import styles from './ProblemTestdata.module.css';

export interface ProblemTestdataFile { name: string; size: number }
export interface ProblemTestdataProps {
  pid: string;
  files: ProblemTestdataFile[];
  disabled?: boolean;
  onChange: (next: ProblemTestdataFile[]) => void;
}

export function ProblemTestdata({ pid, files, disabled, onChange }: ProblemTestdataProps) {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const t = useTranslate();

  const upload = async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('filename', file.name);
    fd.append('type', 'testdata');
    fd.append('operation', 'upload_file');
    await request.postFile(`/p/${encodeURIComponent(pid)}/files`, fd);
    onChange([...files, { name: file.name, size: file.size }]);
  };

  const onUpload = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const list = ev.target.files;
    if (!list) return;
    setBusy(true);
    try {
      for (let i = 0; i < list.length; i++) await upload(list[i]);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = async (names: string[]) => {
    setBusy(true);
    try {
      const fd = new URLSearchParams();
      fd.set('operation', 'delete_files');
      fd.set('type', 'testdata');
      names.forEach((n) => fd.append('files', n));
      await request.post(`/p/${encodeURIComponent(pid)}/files`, fd);
      onChange(files.filter((f) => !names.includes(f.name)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  };

  const downloadZip = async () => {
    setBusy(true);
    try {
      const fd = new URLSearchParams();
      fd.set('operation', 'get_links');
      fd.set('type', 'testdata');
      files.forEach((f) => fd.append('files', f.name));
      const resp = await request.post<{ links: Record<string, string> }>(`/p/${encodeURIComponent(pid)}/files`, fd);
      // Download first link; ui-next simplifies ui-default's StreamSaver approach
      const first = Object.values(resp.links)[0];
      if (first) window.location.href = first;
      else toast.error(t('ProblemTestdata.NoLinks'));
    } finally { setBusy(false); }
  };

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <h3 className={styles.title}>{t('ProblemTestdata.Title', { count: files.length })}</h3>
        <div className={styles.tools}>
          <label className={styles.upload}>
            {busy ? t('ProblemTestdata.Uploading') : t('ProblemTestdata.Upload')}
            <input ref={inputRef} type="file" multiple disabled={disabled || busy} onChange={onUpload} />
          </label>
          <ProblemCreateTestdata pid={pid} onCreated={(name) => onChange([...files, { name, size: 0 }])} />
          <ProblemGenerateTestdata pid={pid} testdata={files.map((f) => f.name)} onGenerated={() => window.location.reload()} />
          {files.length > 0 && (
            <Button variant="ghost" onClick={downloadZip} disabled={busy}>{t('ProblemTestdata.DownloadZip')}</Button>
          )}
        </div>
      </header>
      {files.length === 0 ? (
        <p className={styles.empty}>{t('ProblemTestdata.Empty')}</p>
      ) : (
        <ul className={styles.list}>
          {files.map((f) => (
            <li key={f.name} className={styles.row}>
              <a href={`/p/${encodeURIComponent(pid)}/file/${encodeURIComponent(f.name)}?type=testdata`} className={styles.name}>{f.name}</a>
              <span className={styles.size}>{(f.size / 1024).toFixed(1)} KB</span>
              <Button variant="ghost" onClick={() => remove([f.name])} disabled={disabled || busy} aria-label={`delete ${f.name}`}>×</Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
