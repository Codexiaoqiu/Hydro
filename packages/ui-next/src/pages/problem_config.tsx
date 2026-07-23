import { useCallback, useMemo, useState } from 'react';
import { Button } from '../components/primitives/Button';
import { ConfirmDialog } from '../components/primitives/ConfirmDialog';
import { useToast } from '../components/primitives/Toast';
import { ProblemConfigBasicForm } from '../components/problem/ProblemConfigBasicForm';
import { ProblemConfigEditor } from '../components/problem/ProblemConfigEditor';
import { ProblemConfigTree } from '../components/problem/ProblemConfigTree';
import { usePageData } from '../context/page-data';
import { request } from '../hooks/use-api';
import { useTranslate } from '../lib/i18n';
import { detectSubtasks } from '../lib/testdata-detect';
import {
  dumpProblemConfigYaml, migrateCasesToSubtasks, parseProblemConfigYaml,
  validateProblemConfigYaml, type ProblemConfigYaml,
} from '../lib/yaml-config';
import styles from './problem_config.module.css';

interface Args {
  pdoc?: { docId: number; pid?: string };
  testdata?: string[];
  config?: string;
}

type Tab = 'editor' | 'basic' | 'subtasks';

export default function ProblemConfigPage() {
  const { args } = usePageData() as unknown as { args: Args };
  const t = useTranslate();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('editor');
  const initialConfig = useMemo(() => {
    const parsed = parseProblemConfigYaml(args?.config ?? '');
    // Migrate legacy `cases` + `score` configs into a single 'sum' subtask,
    // mirroring ui-default's `pages/problem_config.page.tsx` reducer so the
    // editor and subtask tree don't silently drop data.
    return migrateCasesToSubtasks(parsed);
  }, [args?.config]);
  const [yamlText, setYamlText] = useState(() => dumpProblemConfigYaml(initialConfig));
  const [parsed, setParsed] = useState<ProblemConfigYaml>(initialConfig);
  const [saving, setSaving] = useState(false);
  const [confirmInvalid, setConfirmInvalid] = useState(false);

  const validation = useMemo(() => validateProblemConfigYaml(parsed), [parsed]);
  const validationOk = validation.ok;
  const rawErrors: ReadonlyArray<{ instancePath?: string; message?: string }> = validationOk
    ? []
    : (validation as Extract<typeof validation, { ok: false }>).errors ?? [];

  const onYamlChange = useCallback((next: string, nextParsed: ProblemConfigYaml) => {
    setYamlText(next);
    setParsed(nextParsed);
  }, []);

  const onAutoDetect = useCallback(() => {
    const files = args?.testdata ?? [];
    const subtasks = detectSubtasks(files);
    const next: ProblemConfigYaml = { ...parsed, subtasks: subtasks.map((s) => ({
      type: 'sum' as const,
      score: s.score,
      cases: s.cases,
      id: s.id,
    })) };
    setParsed(next);
    setYamlText(dumpProblemConfigYaml(next));
    toast.success(t('ProblemConfig.AutoDetected', { count: subtasks.length }));
  }, [args?.testdata, parsed, toast, t]);

  const save = useCallback(async (force = false) => {
    if (!args?.pdoc) return;
    if (!validation.ok && !force) {
      // I-3: when validation fails the user can still confirm to save anyway.
      // The ConfirmDialog intercepts and re-invokes save(true) on confirm.
      setConfirmInvalid(true);
      return;
    }
    setSaving(true);
    try {
      // Run the saved config through the same filtering/dump pipeline so the
      // server-side file matches what the editor would produce locally.
      const cleanYaml = dumpProblemConfigYaml(parsed);
      const fd = new FormData();
      fd.append('file', new Blob([cleanYaml], { type: 'text/yaml' }), 'config.yaml');
      fd.append('filename', 'config.yaml');
      fd.append('type', 'testdata');
      fd.append('operation', 'upload_file');
      const pid = args.pdoc.pid ?? String(args.pdoc.docId);
      await request.postFile(`/p/${encodeURIComponent(pid)}/files`, fd);
      toast.success(t('ProblemConfig.Saved'));
      // Reload to pick up server-side canonical state (parity with
      // ui-default's `window.location.reload()` after save).
      if (typeof window !== 'undefined') window.location.reload();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }, [validation, args?.pdoc, parsed, toast, t]);

  if (!args?.pdoc) return <p style={{ padding: 'var(--space-6)' }}>{t('Common.Loading')}</p>;

  return (
    <div className={styles.page} data-page="problem_config">
      <header className={styles.header}>
        <h1 className={styles.title}>{t('ProblemConfig.Title')}</h1>
        <Button variant="primary" onClick={() => save()} disabled={saving}>
          {saving ? t('Common.Loading') : t('Common.Save')}
        </Button>
      </header>
      {rawErrors.length > 0 && (
        <ul className={styles.errorList} role="alert">
          {rawErrors.map((e, i) => (
            <li key={i} className={styles.errorItem}>
              {t('ProblemConfig.ValidationErrorItem', {
                path: e.instancePath || '/',
                message: e.message ?? '',
              })}
            </li>
          ))}
        </ul>
      )}
      <nav className={styles.tabs} role="tablist">
        {(['editor', 'basic', 'subtasks'] as Tab[]).map((k) => (
          <button key={k} role="tab" aria-selected={tab === k} className={`${styles.tab} ${tab === k ? styles.on : ''}`} onClick={() => setTab(k)}>
            {t(`ProblemConfig.Tab.${k}`)}
          </button>
        ))}
      </nav>
      <main className={styles.body}>
        {tab === 'editor' && <ProblemConfigEditor value={yamlText} onChange={onYamlChange} />}
        {tab === 'basic' && <ProblemConfigBasicForm config={parsed} onChange={(next) => { setParsed(next); setYamlText(dumpProblemConfigYaml(next)); }} />}
        {tab === 'subtasks' && (
          <ProblemConfigTree
            config={parsed}
            testdata={args.testdata ?? []}
            onChange={(next) => { setParsed(next); setYamlText(dumpProblemConfigYaml(next)); }}
            onAutoDetect={onAutoDetect}
          />
        )}
      </main>

      <ConfirmDialog
        open={confirmInvalid}
        title="Config has validation errors"
        message="The YAML does not match the schema. Save anyway?"
        confirmLabel="Save anyway"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => { setConfirmInvalid(false); void save(true); }}
        onCancel={() => setConfirmInvalid(false)}
      />
    </div>
  );
}
