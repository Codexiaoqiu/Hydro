import { useRef, useState } from 'react';
import { Button } from '../primitives/Button';
import { Checkbox } from '../primitives/Checkbox';
import { ConfirmDialog } from '../primitives/ConfirmDialog';
import { useTranslate } from '../../lib/i18n';
import { request } from '../../hooks/use-api';
import { useToast } from '../primitives/Toast';
import { useFileSelection } from '../../hooks/use-file-selection';
import { buildDownloadZip } from '../../lib/download-zip';
import { type RenameChange } from '../../lib/file-rename';
import { BatchRenameDialog } from '../files/BatchRenameDialog';
import { FilePreviewDialog } from '../files/FilePreviewDialog';
import { ProblemCreateTestdata } from './ProblemCreateTestdata';
import { ProblemGenerateTestdata } from './ProblemGenerateTestdata';
import styles from './ProblemTestdata.module.css';

export interface ProblemTestdataFile { name: string; size: number }
export interface ProblemTestdataProps {
  pid: string;
  files: ProblemTestdataFile[];
  disabled?: boolean;
  /** Called after any mutation with the optimistic next list. The page uses
   *  this to re-request the authoritative file list as JSON. */
  onChange: (next: ProblemTestdataFile[]) => void;
}

const TYPE = 'testdata';

export function ProblemTestdata({ pid, files, disabled, onChange }: ProblemTestdataProps) {
  const [busy, setBusy] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [confirmSingle, setConfirmSingle] = useState<string | null>(null);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const t = useTranslate();

  const names = files.map((f) => f.name);
  const endpoint = `/p/${encodeURIComponent(pid)}/files`;
  const selection = useFileSelection(names);
  const selected = [...selection.selected];

  const upload = async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('filename', file.name);
    fd.append('type', TYPE);
    fd.append('operation', 'upload_file');
    await request.postFile(endpoint, fd);
  };

  const onUpload = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const list = ev.target.files;
    if (!list) return;
    setBusy(true);
    try {
      const next = [...files];
      for (let i = 0; i < list.length; i++) {
        await upload(list[i]);
        if (!next.find((f) => f.name === list[i].name)) next.push({ name: list[i].name, size: list[i].size });
      }
      onChange(next);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = async (targets: string[]) => {
    if (!targets.length) return;
    setBusy(true);
    try {
      await request.post(endpoint, { operation: 'delete_files', type: TYPE, files: targets });
      selection.clear();
      onChange(files.filter((f) => !targets.includes(f.name)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  };

  const rename = async (changes: RenameChange[]) => {
    if (!changes.length) return;
    const renameFiles = changes.map((c) => c.oldName);
    const newNames = changes.map((c) => c.newName);
    setBusy(true);
    try {
      await request.post(endpoint, {
        operation: 'rename_files', type: TYPE, files: renameFiles, newNames,
      });
      const map = new Map(changes.map((c) => [c.oldName, c.newName]));
      selection.clear();
      onChange(files.map((f) => (map.has(f.name) ? { ...f, name: map.get(f.name)! } : f)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  };

  const downloadZip = async () => {
    setBusy(true);
    try {
      const resp = await request.post<{ links: Record<string, string> }>(endpoint, {
        operation: 'get_links', type: TYPE, files: names,
      });
      const targets = names
        .map((n) => ({ filename: n, url: resp.links?.[n] }))
        .filter((tg): tg is { filename: string; url: string } => !!tg.url);
      if (!targets.length) { toast.error(t('ProblemTestdata.NoLinks')); return; }
      const { blob, failures } = await buildDownloadZip(targets);
      if (failures.length) toast.error(t('ProblemTestdata.ZipFailed', { count: failures.length }));
      if (blob && typeof URL !== 'undefined' && URL.createObjectURL) {
        const objUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objUrl;
        a.download = `${pid}-testdata.zip`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(objUrl);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
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
          <ProblemCreateTestdata pid={pid} disabled={disabled} onCreated={(name) => onChange([...files, { name, size: 0 }])} />
          <ProblemGenerateTestdata pid={pid} testdata={names} disabled={disabled} onGenerated={() => onChange(files)} />
          {files.length > 0 && (
            <Button variant="ghost" onClick={downloadZip} disabled={disabled || busy}>{t('ProblemTestdata.DownloadZip')}</Button>
          )}
        </div>
      </header>
      {files.length === 0 ? (
        <p className={styles.empty}>{t('ProblemTestdata.Empty')}</p>
      ) : (
        <>
          <div className={styles.tools}>
            <Button variant="ghost" onClick={selection.selectAll} disabled={disabled}>{t('ProblemTestdata.SelectAll')}</Button>
            <Button variant="ghost" onClick={() => setRenameOpen(true)} disabled={disabled || selected.length === 0}>{t('ProblemTestdata.Rename')}</Button>
            <Button variant="ghost" onClick={() => setConfirmBulk(true)} disabled={disabled || busy || selected.length === 0}>{t('ProblemTestdata.DeleteSelected')}</Button>
          </div>
          <ul className={styles.list}>
            {files.map((f) => (
              <li key={f.name} className={styles.row}>
                <Checkbox
                  checked={selection.isSelected(f.name)}
                  disabled={disabled}
                  aria-label={`${t('ProblemTestdata.Select')} ${f.name}`}
                  onChange={() => selection.toggle(f.name)}
                />
                <button
                  type="button"
                  className={styles.name}
                  aria-label={`${t('ProblemTestdata.Preview')} ${f.name}`}
                  onClick={() => setPreview(f.name)}
                >
                  {f.name}
                </button>
                <span className={styles.size}>{(f.size / 1024).toFixed(1)} KB</span>
                <Button variant="ghost" onClick={() => setConfirmSingle(f.name)} disabled={disabled || busy} aria-label={`delete ${f.name}`}>×</Button>
              </li>
            ))}
          </ul>
        </>
      )}

      <BatchRenameDialog
        open={renameOpen}
        selected={selected}
        existing={names}
        onClose={() => setRenameOpen(false)}
        onConfirm={rename}
      />

      {preview && (
        <FilePreviewDialog
          open
          filename={preview}
          url={`/p/${encodeURIComponent(pid)}/file/${encodeURIComponent(preview)}?type=${TYPE}`}
          uploadUrl={endpoint}
          type={TYPE}
          size={files.find((f) => f.name === preview)?.size}
          readOnly={disabled}
          onClose={() => setPreview(null)}
          onSaved={() => onChange(files)}
        />
      )}

      <ConfirmDialog
        open={!!confirmSingle}
        title={t('ProblemTestdata.DeleteFileTitle')}
        message={t('ProblemTestdata.DeleteFileConfirm', { name: confirmSingle ?? '' })}
        confirmLabel={t('ProblemTestdata.Delete')}
        cancelLabel={t('Common.Cancel')}
        variant="danger"
        onConfirm={async () => {
          if (confirmSingle) {
            const target = confirmSingle;
            setConfirmSingle(null);
            await remove([target]);
          }
        }}
        onCancel={() => setConfirmSingle(null)}
      />

      <ConfirmDialog
        open={confirmBulk}
        title={t('ProblemTestdata.DeleteSelectedTitle')}
        message={t('ProblemTestdata.DeleteSelectedConfirm', { count: selected.length, files: selected.join(', ') })}
        confirmLabel={t('ProblemTestdata.DeleteSelected')}
        cancelLabel={t('Common.Cancel')}
        variant="danger"
        onConfirm={async () => {
          const targets = [...selected];
          setConfirmBulk(false);
          await remove(targets);
        }}
        onCancel={() => setConfirmBulk(false)}
      />
    </div>
  );
}
