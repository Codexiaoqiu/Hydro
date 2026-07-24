import styles from './ContestPrivateFiles.module.css';

export interface ContestPrivateFile {
  _id?: string;
  name: string;
  size: number;
}

export interface ContestPrivateFilesProps {
  files: ContestPrivateFile[];
  urlForFile: (name: string) => string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

export function ContestPrivateFiles({ files, urlForFile }: ContestPrivateFilesProps) {
  if (!files || files.length === 0) return null;

  return (
    <section className={styles.wrap} data-testid="contest-private-files">
      <h3 className={styles.title}>Materials</h3>
      <ul className={styles.list}>
        {files.map((f) => (
          <li key={f.name} className={styles.row}>
            <a
              className={styles.name}
              href={urlForFile(f.name)}
              target="_blank"
              rel="noopener noreferrer"
              download
            >
              {f.name}
            </a>
            <span className={styles.size}>{formatSize(f.size)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
