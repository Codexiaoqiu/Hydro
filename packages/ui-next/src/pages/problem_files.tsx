import { useState } from 'react';
import { Link } from '../components/link';
import { ProblemAdditionalFiles, type ProblemAdditionalFile } from '../components/problem/ProblemAdditionalFiles';
import { Alert, Button, Card } from '../components/primitives';
import { usePageData } from '../context/page-data';
import { useTranslate } from '../lib/i18n';

interface Args {
  /**
   * Server injects from `ProblemFilesHandler.get` (handler/problem.ts:662):
   *   - `pdoc.additional_file`  — current additional-file list (sorted)
   *   - `pdoc.reference`        — when this problem is a cross-domain reference
   *   - `pdoc.docId / .pid`     — needed to address the upload endpoint
   */
  pdoc?: {
    docId: number;
    pid?: string;
    title?: string;
    additional_file?: ProblemAdditionalFile[];
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
      <main style={{ maxWidth: 720, margin: '0 auto', padding: 'var(--space-6)' }}>
        <Alert variant="error" message={t('ProblemFiles.NotFound')} />
      </main>
    );
  }

  const isReference = !!pdoc.reference;
  const pid = pdoc.pid ?? String(pdoc.docId);

  return (
    <main style={{
      maxWidth: 960, margin: '0 auto', padding: 'var(--space-6)',
      display: 'flex', flexDirection: 'column', gap: 'var(--space-5)',
    }}>
      <header style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <Link to="problem_edit" params={{ pid }}>{t('ProblemFiles.BackToEdit')}</Link>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', margin: 0 }}>
          {pdoc.title ?? t('ProblemFiles.Title')}
        </h1>
        <p style={{ margin: 0, color: 'var(--text-mute)', fontSize: 'var(--text-sm)' }}>
          {t('ProblemFiles.Subtitle')}
        </p>
      </header>

      {isReference && (
        <Alert variant="info" message={t('ProblemFiles.ReferenceNotice')} />
      )}

      <Card variant="default" header={<h2 style={{ margin: 0, fontSize: 'var(--text-lg)' }}>{t('ProblemFiles.AdditionalSection')}</h2>}>
        <ProblemAdditionalFiles
          pid={pid}
          files={files}
          disabled={isReference}
          onChange={setFiles}
        />
      </Card>

      <footer style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
        <Link to="problem_detail" params={{ pid }}>
          <Button variant="primary" type="button">{t('ProblemFiles.Done')}</Button>
        </Link>
      </footer>
    </main>
  );
}
