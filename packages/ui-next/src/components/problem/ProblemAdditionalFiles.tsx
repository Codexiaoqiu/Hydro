import { useRef, useState } from 'react';
import { useTranslate } from '../../lib/i18n';
import { HydroClientError, request } from '../../hooks/use-api';
import { ConfirmDialog } from '../primitives';
import styles from './ProblemAdditionalFiles.module.css';

export interface ProblemAdditionalFile {
  name: string;
  size: number;
}

interface Props {
  pid: string;
  files: ProblemAdditionalFile[];
  disabled?: boolean;
  onChange: (next: ProblemAdditionalFile[]) => void;
}

function formatSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Sidebar widget that mirrors the ui-default "Additional Files" section on
 * the problem edit page: a header with an Upload button + a list of files
 * with per-row Delete. Upload and delete are *not* part of the main form
 * — each fires an independent POST to `/p/:pid/files` (see
 * `ProblemFilesHandler.postUploadFile` / `postDeleteFiles` in handler/problem.ts),
 * exactly like ui-default's `uploadFiles()` helper does.
 */
export function ProblemAdditionalFiles({ pid, files, disabled, onChange }: Props) {
  const t = useTranslate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelFile, setConfirmDelFile] = useState<string | null>(null);

  const upload = async (selected: FileList | null) => {
    if (!selected || !selected.length) return;
    setUploading(true);
    setError(null);
    try {
      const next = [...files];
      for (const file of Array.from(selected)) {
        const fd = new FormData();
        fd.set('operation', 'upload_file');
        fd.set('type', 'additional_file');
        fd.set('filename', file.name);
        fd.set('file', file);
        await request.postFile(`/p/${encodeURIComponent(pid)}/files`, fd);
        if (!next.find((f) => f.name === file.name)) {
          next.push({ name: file.name, size: file.size });
        }
      }
      onChange(next);
    } catch (err) {
      setError(err instanceof HydroClientError ? err.message : String(err));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const remove = async (name: string) => {
    setError(null);
    try {
      await request.post(`/p/${encodeURIComponent(pid)}/files`, {
        operation: 'delete_files',
        files: [name],
        type: 'additional_file',
      });
      onChange(files.filter((f) => f.name !== name));
    } catch (err) {
      setError(err instanceof HydroClientError ? err.message : String(err));
    } finally {
      setConfirmDelFile(null);
    }
  };

  return (
    <>
    <div className={styles.widget}>
      <div className={styles.head}>
        <h3 className={styles.title}>{t('ProblemAdditionalFiles.Title')}</h3>
        <button
          type="button"
          className={styles.uploadBtn}
          disabled={disabled || uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? t('ProblemAdditionalFiles.Uploading') : t('ProblemAdditionalFiles.Upload')}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          onChange={(e) => upload(e.currentTarget.files)}
        />
      </div>
      {error && <p className={styles.error}>{error}</p>}
      {files.length === 0 ? (
        <p className={styles.empty}>{t('ProblemAdditionalFiles.Empty')}</p>
      ) : (
        <ul className={styles.list}>
          {files.map((f) => (
            <li key={f.name} className={styles.item}>
              <span className={styles.name} title={f.name}>{f.name}</span>
              <span className={styles.size}>{formatSize(f.size)}</span>
              <button
                type="button"
                className={styles.removeBtn}
                disabled={disabled}
                aria-label={t('ProblemAdditionalFiles.Delete')}
                onClick={() => setConfirmDelFile(f.name)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>

      <ConfirmDialog
        open={!!confirmDelFile}
        title={t('ProblemAdditionalFiles.DeleteFileTitle')}
        message={t('ProblemAdditionalFiles.DeleteFileConfirm', { name: confirmDelFile ?? '' })}
        confirmLabel={t('ProblemAdditionalFiles.Delete')}
        cancelLabel={t('Common.Cancel')}
        variant="danger"
        onConfirm={() => confirmDelFile && remove(confirmDelFile)}
        onCancel={() => setConfirmDelFile(null)}
      />
    </>
  );
}