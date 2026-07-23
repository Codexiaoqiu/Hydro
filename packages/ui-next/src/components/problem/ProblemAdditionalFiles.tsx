import { useRef, useState } from 'react';
import { HydroClientError, request } from '../../hooks/use-api';
import { useTranslate } from '../../lib/i18n';
import { useFileSelection } from '../../hooks/use-file-selection';
import { type RenameChange } from '../../lib/file-rename';
import { Button, Checkbox, ConfirmDialog } from '../primitives';
import { BatchRenameDialog } from '../files/BatchRenameDialog';
import { FilePreviewDialog } from '../files/FilePreviewDialog';
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

const TYPE = 'additional_file';

function formatSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Sidebar widget that mirrors the ui-default "Additional Files" section on
 * the problem edit page: a header with an Upload button + a list of files
 * with per-row Delete, multi-select batch rename, and inline preview. Upload,
 * delete and rename each fire an independent POST to `/p/:pid/files` (see
 * `ProblemFilesHandler.postUploadFile` / `postRenameFiles` / `postDeleteFiles`
 * in handler/problem.ts), exactly like ui-default's helpers do.
 */
export function ProblemAdditionalFiles({ pid, files, disabled, onChange }: Props) {
  const t = useTranslate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelFile, setConfirmDelFile] = useState<string | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const names = files.map((f) => f.name);
  const endpoint = `/p/${encodeURIComponent(pid)}/files`;
  const selection = useFileSelection(names);
  const selected = [...selection.selected];

  const upload = async (fileList: FileList | null) => {
    if (!fileList || !fileList.length) return;
    setUploading(true);
    setError(null);
    try {
      const next = [...files];
      for (const file of Array.from(fileList)) {
        const fd = new FormData();
        fd.set('operation', 'upload_file');
        fd.set('type', TYPE);
        fd.set('filename', file.name);
        fd.set('file', file);
        await request.postFile(endpoint, fd);
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
      await request.post(endpoint, {
        operation: 'delete_files',
        files: [name],
        type: TYPE,
      });
      selection.clear();
      onChange(files.filter((f) => f.name !== name));
    } catch (err) {
      setError(err instanceof HydroClientError ? err.message : String(err));
    } finally {
      setConfirmDelFile(null);
    }
  };

  const rename = async (changes: RenameChange[]) => {
    if (!changes.length) return;
    setError(null);
    try {
      await request.post(endpoint, {
        operation: 'rename_files',
        type: TYPE,
        files: changes.map((c) => c.oldName),
        newNames: changes.map((c) => c.newName),
      });
      const map = new Map(changes.map((c) => [c.oldName, c.newName]));
      selection.clear();
      onChange(files.map((f) => (map.has(f.name) ? { ...f, name: map.get(f.name)! } : f)));
    } catch (err) {
      setError(err instanceof HydroClientError ? err.message : String(err));
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
          <>
            <div className={styles.toolbar}>
              <Button variant="ghost" onClick={selection.selectAll} disabled={disabled}>
                {t('ProblemAdditionalFiles.SelectAll')}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setRenameOpen(true)}
                disabled={disabled || selected.length === 0}
              >
                {t('ProblemAdditionalFiles.Rename')}
              </Button>
            </div>
            <ul className={styles.list}>
              {files.map((f) => (
                <li key={f.name} className={styles.item}>
                  <Checkbox
                    checked={selection.isSelected(f.name)}
                    disabled={disabled}
                    aria-label={`${t('ProblemAdditionalFiles.SelectAll')} ${f.name}`}
                    onChange={() => selection.toggle(f.name)}
                  />
                  <button
                    type="button"
                    className={styles.name}
                    title={f.name}
                    aria-label={`${t('ProblemAdditionalFiles.Preview')} ${f.name}`}
                    onClick={() => setPreview(f.name)}
                  >
                    {f.name}
                  </button>
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
          </>
        )}
      </div>

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
