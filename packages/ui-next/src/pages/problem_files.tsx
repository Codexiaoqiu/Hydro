import { useState } from 'react';
import { Link } from '../components/link';
import { Alert, Button, Card } from '../components/primitives';
import { ProblemTestdata } from '../components/problem/ProblemTestdata';
import { type ProblemAdditionalFile, ProblemAdditionalFiles } from '../components/problem/ProblemAdditionalFiles';
import { usePageData } from '../context/page-data';
import { useTranslate } from '../lib/i18n';
import styles from './problem_files.module.css';

interface Args {
  /**
   * Server injects from `ProblemFilesHandler.get` (handler/problem.ts:662):
   *   - `pdoc.additional_file`  — current additional-file list (sorted)
   *   - `pdoc.reference`        — when this problem is a cross-domain reference
   *   - `pdoc.docId / .pid`     — needed to address the upload endpoint
   *   - `pdoc.testdata`         — current testdata file list
   */
  pdoc?: {
    docId: number;
    pid?: string;
    title?: string;
    additional_file?: ProblemAdditionalFile[];
    testdata?: Array<{ name: string; size: number }>;
    reference?: { domainId: string, pid: string | number };
  };
}

export default function ProblemFilesPage() {
  const { args } = usePageData() as unknown as { args: Args };
  const t = useTranslate();
  const pdoc = args?.pdoc;

  // Local mirror so uploads / deletes update the list immediately without a
  // full page round-trip. Re-syncs whenever the server-provided list changes
  // (e.g. after a navigation back from edit).
  const [files, setFiles] = useState<ProblemAdditionalFile[]>(
    pdoc?.additional_file ?? [],
  );

  if (!pdoc) {
    return (
      <main className={styles.notFound}>
        <Alert variant="error" message={t('ProblemFiles.NotFound')} />
      </main>
    );
  }

  const isReference = !!pdoc.reference;
  const pid = pdoc.pid ?? String(pdoc.docId);
  const testdata: Array<{ name: string; size: number }> = (pdoc as any).testdata ?? [];

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link to="problem_edit" params={{ pid }}>{t('ProblemFiles.BackToEdit')}</Link>
        <h1 className={styles.headerTitle}>
          {pdoc.title ?? t('ProblemFiles.Title')}
        </h1>
        <p className={styles.headerSubtitle}>
          {t('ProblemFiles.Subtitle')}
        </p>
      </header>

      {isReference && (
        <Alert variant="info" message={t('ProblemFiles.ReferenceNotice')} />
      )}

      {!isReference && (
        <Card variant="default" header={<h2 className={styles.sectionTitle}>{t('ProblemFiles.TestdataSection')}</h2>}>
          <ProblemTestdata pid={pid} files={testdata} disabled={isReference} onChange={() => window.location.reload()} />
        </Card>
      )}

      <Card variant="default" header={<h2 className={styles.sectionTitle}>{t('ProblemFiles.AdditionalSection')}</h2>}>
        <ProblemAdditionalFiles
          pid={pid}
          files={files}
          disabled={isReference}
          onChange={setFiles}
        />
      </Card>

      <footer className={styles.footer}>
        <Link to="problem_detail" params={{ pid }}>
          <Button variant="primary" type="button">{t('ProblemFiles.Done')}</Button>
        </Link>
      </footer>
    </main>
  );
}
