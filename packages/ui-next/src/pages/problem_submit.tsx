import { useState } from 'react';
import { Link } from '../components/link';
import { Button, Card } from '../components/primitives';
import type { LangMeta } from '../components/problem/problem-language';
import CodeEditor from '../components/problem/CodeEditor';
import CodeFileUpload from '../components/problem/CodeFileUpload';
import ProblemLanguageSelect from '../components/problem/ProblemLanguageSelect';
import SubmitHint from '../components/problem/SubmitHint';
import {
  ProblemSidebar,
  type ProblemSidebarContext,
} from '../components/sidebar/ProblemSidebar';
import { usePageData } from '../context/page-data';
import { useBuildUrl } from '../hooks/use-build-url';
import { useTranslate } from '../lib/i18n';
import styles from './problem_submit.module.css';

interface Args {
  UserContext: ProblemSidebarContext['UserContext'] & { codeLang?: string };
  UiContext: Record<string, unknown>;
  pdoc: ProblemSidebarContext['pdoc'] & {
    config?: { type?: string, langs?: string[] } | string;
  };
  langRange: Record<string, string>;
  langs: Record<string, LangMeta>;
  tdoc?: ProblemSidebarContext['tdoc'];
  psdoc?: ProblemSidebarContext['psdoc'];
  discussionCount?: number;
  solutionCount?: number;
  mode?: 'normal' | 'contest' | 'view' | 'correction';
}

/** Owns the controlled `code` value so that `<form key={formKey}>` resets it
 *  on problem switch. Mounted as a child of the form so React tears it down
 *  when the form remounts; the controlled `<input type="hidden" name="code">`
 *  is rendered as a sibling inside the same form so native form submission
 *  still receives the latest value. */
function CodeEditorField({ codeLanguage, ariaLabel }: { codeLanguage: string, ariaLabel?: string }) {
  const [code, setCode] = useState('');
  return (
    <>
      <CodeEditor
        value={code}
        onChange={setCode}
        language={codeLanguage}
        height={360}
        aria-label={ariaLabel}
      />
      <input type="hidden" name="code" value={code} />
    </>
  );
}

export default function ProblemSubmitPage() {
  const { args } = usePageData() as unknown as { args: Args };
  const buildUrl = useBuildUrl();
  const t = useTranslate();
  const {
    pdoc,
    langRange,
    langs,
    tdoc,
    psdoc,
    UserContext = {},
    discussionCount = 0,
    solutionCount = 0,
    mode = 'normal',
  } = args;

  const submitAnswer = typeof pdoc.config === 'object' && pdoc.config?.type === 'submit_answer';
  const formKey = `${pdoc.docId}:${tdoc?.docId ?? ''}`;
  const codeLanguage = (UserContext.codeLang || Object.keys(langRange)[0] || '').split('.')[0] || 'plaintext';

  const sidebarContext: ProblemSidebarContext = {
    pdoc,
    tdoc,
    UserContext,
    buildUrl,
    discussionCount,
    solutionCount,
    psdoc,
  };

  return (
    <main className={styles.page}>
      <div className={styles.layout}>
        <section className={styles.content}>
          <Link to="problem_detail" params={{ pid: pdoc.pid ?? String(pdoc.docId) }}>
            {t('ProblemSubmit.BackToProblem')}
          </Link>
          <h1 className={styles.title}>
            {t('ProblemSubmit.TitlePrefix')}
            {pdoc.title}
          </h1>
          {!submitAnswer && <SubmitHint />}
          <form
            key={formKey}
            method="post"
            encType="multipart/form-data"
            className={styles.form}
          >
            <Card variant="default">
              <div className={styles.section}>
                {submitAnswer ? (
                  <input type="hidden" name="lang" value="_" />
                ) : (
                  <ProblemLanguageSelect
                    key={formKey}
                    langRange={langRange}
                    langs={langs}
                    codeLang={UserContext.codeLang}
                  />
                )}
              </div>
            </Card>
            <Card variant="default">
              <div className={styles.section}>
                <label className={styles.field}>
                  <span className={styles.label}>{t('ProblemSubmit.SourceCode')}</span>
                  <CodeEditorField codeLanguage={codeLanguage} ariaLabel={t('ProblemSubmit.SourceCode')} />
                </label>
              </div>
            </Card>
            <Card variant="default">
              <div className={styles.section}>
                <span className={styles.label}>{t('ProblemSubmit.UploadFile')}</span>
                <CodeFileUpload
                  name="file"
                  buttonLabel={t('ProblemSubmit.UploadFile')}
                  hint={t('ProblemSubmit.UploadHint')}
                />
              </div>
            </Card>
            <div className={styles.actions}>
              <Button type="submit" variant="primary">
                {t('ProblemSubmit.Submit')}
              </Button>
            </div>
          </form>
        </section>
        <aside className={styles.sidebar}>
          <ProblemSidebar context={sidebarContext} mode={mode} />
        </aside>
      </div>
    </main>
  );
}
