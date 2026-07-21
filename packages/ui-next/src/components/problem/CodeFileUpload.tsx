import { useRef, useState } from 'react';
import { Button } from '../primitives/Button';
import styles from './CodeFileUpload.module.css';

export interface CodeFileUploadProps {
  /** Hidden native input name. */
  name?: string;
  /** Visible button label. */
  buttonLabel?: string;
  /** Hint shown under the button. */
  hint?: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function CodeFileUpload({
  name = 'file',
  buttonLabel = 'Upload File',
  hint,
}: CodeFileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const pickFiles = () => fileInputRef.current?.click();

  const onInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.currentTarget.files?.[0] ?? null;
    setFile(next);
  };

  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    const next = event.dataTransfer.files?.[0] ?? null;
    if (!next) return;
    setFile(next);
    // Mirror the dropped file onto the hidden input so the form submits it.
    if (fileInputRef.current) {
      const dt = new DataTransfer();
      dt.items.add(next);
      fileInputRef.current.files = dt.files;
    }
  };

  const onDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(true);
  };

  const onDragLeave = () => setDragOver(false);

  const remove = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className={styles.root}>
      <div className={styles.controls}>
        <input
          ref={fileInputRef}
          type="file"
          name={name}
          className={styles.hiddenInput}
          onChange={onInputChange}
        />
        <Button type="button" variant="primary" onClick={pickFiles}>
          {buttonLabel}
        </Button>
        {hint && <small className={styles.hint}>{hint}</small>}
      </div>
      <div
        className={`${styles.dropzone} ${dragOver ? styles.dropzoneActive : ''}`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
      >
        {file ? (
          <div className={styles.fileChip}>
            <span className={styles.fileName}>{file.name}</span>
            <span className={styles.fileSize}>{formatSize(file.size)}</span>
            <button
              type="button"
              className={styles.removeBtn}
              onClick={remove}
              aria-label={`Remove ${file.name}`}
            >
              ×
            </button>
          </div>
        ) : (
          <span className={styles.placeholder}>
            Drag a file here or click the button above.
          </span>
        )}
      </div>
    </div>
  );
}
