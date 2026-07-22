import { useBuildUrl } from '../../hooks/use-build-url';
import { formatFileSize } from '../../lib/format';
import { useTranslate } from '../../lib/i18n';
import { Link } from '../link';
import { Button, Card } from '../primitives';
import styles from './ProblemFiles.module.css';

interface ProblemFile {
  name: string;
  size: number;
}

export interface ProblemFilesProps {
  pdoc: {
    docId: number | string;
    additional_file?: ProblemFile[];
  };
}

/**
 * Sidebar card for the "additional files" panel on a problem. Shows the file
 * list (if any) and a CTA that navigates to the full `/p/:pid/files` page.
 * Mirrors the visual structure of `partials/problem-sidebar-information.html`
 * but only renders the additional-files slice.
 *
 * File rows are themselves download links — matching the
 * `partials/problem_files.html` template, which wraps the filename in an
 * `<a>` that hits `problem_file_download`. We keep the CTA a *single* button
 * because the surrounding `/files` page is the canonical manage view; a
 * duplicate "View all" CTA added no navigation surface and confused the
 * visual hierarchy.
 */
export function ProblemFiles({ pdoc }: ProblemFilesProps) {
  const buildUrl = useBuildUrl();
  const t = useTranslate();
  const files = pdoc.additional_file ?? [];
  const manageHref = buildUrl('problem_files', { pid: String(pdoc.docId) });

  return (
    <Card variant="default" header={<h3 className={styles.title}>{t('ProblemFiles.Title')}</h3>}>
      <div className={styles.filesCard}>
        {files.length === 0 ? (
          <p className={styles.empty}>{t('ProblemFiles.Empty')}</p>
        ) : (
          <ul className={styles.list}>
            {files.map((f) => {
              const downloadHref = buildUrl(
                'problem_file_download',
                { pid: String(pdoc.docId), filename: f.name },
                { type: 'additional_file' },
              );
              return (
                <li key={f.name} className={styles.item}>
                  <Link href={downloadHref} download className={styles.name}>
                    {f.name}
                  </Link>
                  <span className={styles.size}>{formatFileSize(f.size)}</span>
                </li>
              );
            })}
          </ul>
        )}
        <div className={styles.actions}>
          <Link href={manageHref}>
            <Button variant="primary" type="button">{t('ProblemFiles.Manage')}</Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
