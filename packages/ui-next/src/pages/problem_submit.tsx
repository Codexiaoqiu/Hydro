import { Link } from '../components/link';
import { Button } from '../components/primitives';
import type { LangMeta } from '../components/problem/problem-language';
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
          <h1 className={styles.title}>{t('ProblemSubmit.TitlePrefix')}{pdoc.title}</h1>
          {!submitAnswer && <SubmitHint />}
          <form
            key={formKey}
            method="post"
            encType="multipart/form-data"
            className={styles.form}
          >
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
            <label className={styles.field}>
              <span>{t('ProblemSubmit.SourceCode')}</span>
              <textarea
                name="code"
                spellCheck={false}
                autoFocus
                className={styles.codearea}
                placeholder={t('ProblemSubmit.SourcePlaceholder')}
              />
            </label>
            <label className={styles.field}>
              <span>{t('ProblemSubmit.UploadFile')}</span>
              <input type="file" name="file" />
              <small>{t('ProblemSubmit.UploadHint')}</small>
            </label>
            <Button type="submit" variant="primary">{t('ProblemSubmit.Submit')}</Button>
          </form>
        </section>
        <aside className={styles.sidebar}>
          <ProblemSidebar context={sidebarContext} mode={mode} />
        </aside>
      </div>
    </main>
  );
}
