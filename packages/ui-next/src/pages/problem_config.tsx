import { useCallback, useMemo, useState } from 'react';
import { Button } from '../components/primitives/Button';
import { useToast } from '../components/primitives/Toast';
import { ProblemConfigBasicForm } from '../components/problem/ProblemConfigBasicForm';
import { ProblemConfigEditor } from '../components/problem/ProblemConfigEditor';
import { ProblemConfigTree } from '../components/problem/ProblemConfigTree';
import { usePageData } from '../context/page-data';
import { request } from '../hooks/use-api';
import { useTranslate } from '../lib/i18n';
import { detectSubtasks } from '../lib/testdata-detect';
import { dumpProblemConfigYaml, parseProblemConfigYaml, validateProblemConfigYaml, type ProblemConfigYaml } from '../lib/yaml-config';
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
  const [yamlText, setYamlText] = useState(args?.config ?? '');
  const [parsed, setParsed] = useState<ProblemConfigYaml>(() => parseProblemConfigYaml(args?.config ?? ''));
  const [saving, setSaving] = useState(false);

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
      score: s.score, cases: s.cases, time_limit: 1000, memory_limit: 256,
    })) };
    setParsed(next);
    setYamlText(dumpProblemConfigYaml(next));
    toast.success(t('ProblemConfig.AutoDetected', { count: subtasks.length }));
  }, [args?.testdata, parsed, toast, t]);

  const save = useCallback(async () => {
    if (!validation.ok) { toast.error(t('ProblemConfig.InvalidYaml')); return; }
    if (!args?.pdoc) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('file', new Blob([yamlText], { type: 'text/yaml' }), 'config.yaml');
      fd.append('filename', 'config.yaml');
      fd.append('type', 'testdata');
      fd.append('operation', 'upload_file');
      const pid = args.pdoc.pid ?? String(args.pdoc.docId);
      await request.postFile(`/p/${encodeURIComponent(pid)}/files`, fd);
      toast.success(t('ProblemConfig.Saved'));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }, [validation, args?.pdoc, yamlText, toast, t]);

  if (!args?.pdoc) return <p style={{ padding: 'var(--space-6)' }}>{t('Common.Loading')}</p>;

  return (
    <div className={styles.page} data-page="problem_config">
      <header className={styles.header}>
        <h1 className={styles.title}>{t('ProblemConfig.Title')}</h1>
        <Button variant="primary" onClick={save} disabled={saving || !validation.ok}>
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
    </div>
  );
}
