import { useTranslate } from '../../lib/i18n';
import styles from './ContestFiles.module.css';

export interface ContestFileInfo {
  name: string;
  size: number;
}

export interface ContestFilesProps {
  files: ContestFileInfo[];
  urlForFile: (name: string) => string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

export function ContestFiles({ files, urlForFile }: ContestFilesProps) {
  const t = useTranslate();
  if (!files || files.length === 0) {
    return (
      <section className={styles.wrap} data-testid="contest-files">
        <h2 className={styles.title}>Files</h2>
        <p className={styles.empty}>{t('ContestDetail.NoFiles')}</p>
      </section>
    );
  }
  return (
    <section className={styles.wrap} data-testid="contest-files">
      <h2 className={styles.title}>Files</h2>
      <ul className={styles.list}>
        {files.map((file) => (
          <li key={file.name} className={styles.row}>
            <a
              className={styles.name}
              href={urlForFile(file.name)}
              target="_blank"
              rel="noopener noreferrer"
            >
              {file.name}
            </a>
            <span className={styles.size}>{formatSize(file.size)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
