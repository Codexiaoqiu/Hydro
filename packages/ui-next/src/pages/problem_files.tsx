import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from '../components/link';
import { Alert, Button, Card } from '../components/primitives';
import { useToast } from '../components/primitives/Toast';
import { ProblemTestdata, type ProblemTestdataFile } from '../components/problem/ProblemTestdata';
import { type ProblemAdditionalFile, ProblemAdditionalFiles } from '../components/problem/ProblemAdditionalFiles';
import { usePageData } from '../context/page-data';
import { request } from '../hooks/use-api';
import { useTranslate } from '../lib/i18n';
import { canEditProblem } from '../lib/perms';
import styles from './problem_files.module.css';

interface Args {
  /**
   * `ProblemFilesHandler.get` (handler/problem.ts:668) injects the file lists
   * as **top-level** response fields, not nested under `pdoc`:
   *   - `testdata`        — sorted testdata file list (`pdoc.data`)
   *   - `additional_file` — sorted additional-file list
   *   - `reference`       — set when this problem is a cross-domain reference
   * `pdoc` still carries `docId` / `pid` / `title` for addressing + display.
   * `owner` / `maintainer` (when present) drive the PERM_EDIT_PROBLEM_SELF
   * half of `canEditProblem`; the global PERM_EDIT_PROBLEM bit wins otherwise.
   */
  pdoc?: {
    docId: number;
    pid?: string;
    title?: string;
    owner?: number;
    maintainer?: number[];
  };
  testdata?: ProblemTestdataFile[];
  additional_file?: ProblemAdditionalFile[];
  reference?: { domainId: string, pid: string | number };
  UserContext?: Record<string, unknown>;
}

export default function ProblemFilesPage() {
  const page = usePageData();
  const args = page.args as unknown as Args;
  const t = useTranslate();
  const toast = useToast();
  const pdoc = args?.pdoc;

  // Local mirrors so uploads / deletes / renames update the lists immediately.
  // After every mutation we re-request the page as JSON (`recalibrate`) so the
  // client converges on the server's authoritative, sorted list instead of a
  // full-page reload.
  const [testdata, setTestdata] = useState<ProblemTestdataFile[]>(args?.testdata ?? []);
  const [files, setFiles] = useState<ProblemAdditionalFile[]>(args?.additional_file ?? []);

  // I1 (review): in-flight recalibrate responses can race each other when
  // mutations land faster than the JSON refresh resolves. We tag each call
  // with an incrementing token and only apply the body whose token is still
  // the latest — stale responses are silently dropped.
  const tokenRef = useRef(0);

  const recalibrate = useCallback(async () => {
    const token = ++tokenRef.current;
    try {
      const body = await request.get<{ testdata?: ProblemTestdataFile[]; additional_file?: ProblemAdditionalFile[] }>(page.url);
      if (token !== tokenRef.current) return; // a newer mutation has superseded us
      if (Array.isArray(body?.testdata)) setTestdata(body.testdata);
      if (Array.isArray(body?.additional_file)) setFiles(body.additional_file);
    } catch (err) {
      if (token !== tokenRef.current) return; // superseded — caller owns the state
      // I2 (review): never swallow recalibrate failures. Optimistic state is
      // kept (the local mutation has already been applied); surface a toast so
      // the user knows the canonical list may be stale and can retry.
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(t('ProblemFiles.RecalibrateFailed', { message: msg }));
    }
  }, [page.url, toast, t]);

  // Abort in-flight refreshes on unmount (token monotonicity also guards
  // against stale updates, but this prevents wasted network on teardown).
  useEffect(() => () => { tokenRef.current++; }, []);

  if (!pdoc) {
    return (
      <main className={styles.notFound}>
        <Alert variant="error" message={t('ProblemFiles.NotFound')} />
      </main>
    );
  }

  const isReference = !!args.reference;
  // Mirror ui-default's perm gate: PERM_EDIT_PROBLEM (or SELF-ownership) is
  // required to mutate the testdata / additional files; references are always
  // read-only because the foreign domain owns them. canEditProblem already
  // honours scope from the UserContext, so anonymous visitors on a non-public
  // problem get `false`.
  const canEdit = !isReference && canEditProblem(
    args.UserContext as never,
    pdoc as { owner?: number, maintainer?: number[] },
  );
  const pid = pdoc.pid ?? String(pdoc.docId);

  const onTestdataChange = (next: ProblemTestdataFile[]) => { setTestdata(next); recalibrate(); };
  const onAdditionalChange = (next: ProblemAdditionalFile[]) => { setFiles(next); recalibrate(); };

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

      <Card variant="default" header={<h2 className={styles.sectionTitle}>{t('ProblemFiles.TestdataSection')}</h2>}>
        <ProblemTestdata pid={pid} files={testdata} disabled={!canEdit} onChange={onTestdataChange} />
      </Card>

      <Card variant="default" header={<h2 className={styles.sectionTitle}>{t('ProblemFiles.AdditionalSection')}</h2>}>
        <ProblemAdditionalFiles
          pid={pid}
          files={files}
          disabled={!canEdit}
          onChange={onAdditionalChange}
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
