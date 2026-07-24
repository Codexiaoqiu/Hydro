import { useMemo, useState } from 'react';
import { flushSync } from 'react-dom';
import { Link } from '../components/link';
import { Button, Card } from '../components/primitives';
import type { LangMeta } from '../components/problem/problem-language';
import CodeEditor from '../components/problem/CodeEditor';
import CodeFileUpload from '../components/problem/CodeFileUpload';
import {
  ObjectiveForm,
  type ObjectiveAnswers,
  type ObjectiveQuestion,
} from '../components/problem/ObjectiveForm';
import ProblemLanguageSelect from '../components/problem/ProblemLanguageSelect';
import SubmitHint from '../components/problem/SubmitHint';
import {
  ProblemSidebar,
  type ProblemSidebarContext,
} from '../components/sidebar/ProblemSidebar';
import { usePageData } from '../context/page-data';
import { useBuildUrl } from '../hooks/use-build-url';
import { useObjectiveDraft } from '../hooks/use-objective-draft';
import { useTranslate } from '../lib/i18n';
import * as yaml from 'js-yaml';
import styles from './problem_submit.module.css';

type ObjectiveConfig = {
  type: 'objective';
  subType?: 'text' | 'single' | 'multiple' | string;
  choices?: ObjectiveQuestion[];
  [k: string]: unknown;
};

function isObjectiveConfig(
  cfg: Args['pdoc']['config'],
): cfg is ObjectiveConfig {
  return !!cfg && typeof cfg === 'object' && cfg.type === 'objective';
}

interface Args {
  UserContext: ProblemSidebarContext['UserContext'] & { codeLang?: string };
  UiContext: Record<string, unknown>;
  pdoc: ProblemSidebarContext['pdoc'] & {
    config?:
      | (ObjectiveConfig | { type?: string, langs?: string[] } | string)
      | string;
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

  const cfg = typeof pdoc.config === 'object' && pdoc.config !== null
    ? pdoc.config
    : undefined;
  const submitAnswer = cfg?.type === 'submit_answer';
  const isObjective = isObjectiveConfig(cfg);
  const objectiveQuestions = useMemo<ObjectiveQuestion[]>(() => {
    if (!isObjective) return [];
    const choices = (cfg as ObjectiveConfig).choices ?? [];
    return choices.map((q) => ({ ...q, required: q.required ?? true }));
  }, [isObjective, cfg]);

  const formKey = `${pdoc.docId}:${tdoc?.docId ?? ''}`;
  const codeLanguage = (UserContext.codeLang || Object.keys(langRange)[0] || '').split('.')[0] || 'plaintext';

  const [objectiveAnswers, setObjectiveAnswers] = useState<ObjectiveAnswers>(() => {
    const seed: ObjectiveAnswers = {};
    for (const q of objectiveQuestions) {
      if (q.type === 'multiple') seed[q.id] = [];
      else seed[q.id] = '';
    }
    return seed;
  });

  const [objectiveYaml, setObjectiveYaml] = useState('');
  const [objectiveAnswersVersion, setObjectiveAnswersVersion] = useState(0);

  const { clear: clearObjectiveDraft } = useObjectiveDraft({
    uid: UserContext._id,
    docId: pdoc.docId,
    tid: tdoc?.docId,
    answers: objectiveAnswers,
    onLoaded: (draft) => {
      // Merge the persisted draft into current answers so any newly-added
      // questions still show up as blank.
      setObjectiveAnswers((prev) => ({ ...prev, ...draft }));
    },
  });

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
          {!submitAnswer && !isObjective && <SubmitHint />}
          <form
            key={formKey}
            method="post"
            encType="multipart/form-data"
            className={styles.form}
            onSubmit={(e) => {
              if (!isObjective) return;
              // Read from the React state; the ObjectiveForm's onSubmit
              // callback above has already committed via setObjectiveAnswers
              // before the native form submit fires. We still guard against
              // the case where a user submits via the Enter key (which
              // bypasses the ObjectiveForm button handler) by serializing
              // whatever is in the current state.
              setObjectiveYaml(yaml.dump(objectiveAnswers));
              // Prevent native submission when validation has failed —
              // the ObjectiveForm's button handler always pre-validates.
              void e;
            }}
          >
            {isObjective ? (
              <>
                {/* Objective problems always submit lang=`_`, just like
                    submit_answer; the server uses YAML content instead of a
                    code blob. */}
                <input type="hidden" name="lang" value="_" />
                <Card variant="default">
                  <div className={styles.section}>
                    <ObjectiveForm
                      key={formKey}
                      questions={objectiveQuestions}
                      initialAnswers={objectiveAnswers}
                      onSubmit={(next) => {
                        // Commit the new answers synchronously so the parent
                        // <form>'s submit handler (which fires next in the
                        // same tick) reads the freshly-updated values.
                        flushSync(() => {
                          setObjectiveAnswers(next);
                          setObjectiveYaml(yaml.dump(next));
                        });
                        // Drop the persisted draft on successful submit.
                        void clearObjectiveDraft();
                      }}
                      submitLabel={t('ProblemSubmit.Submit')}
                    />
                    {/* Bind the YAML content so it ships in the native form
                        submission alongside lang=`_`. */}
                    <input
                      type="hidden"
                      name="content"
                      value={objectiveYaml}
                      readOnly
                    />
                  </div>
                </Card>
              </>
            ) : (
              <>
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
              </>
            )}
          </form>
        </section>
        <aside className={styles.sidebar}>
          <ProblemSidebar context={sidebarContext} mode={mode} />
        </aside>
      </div>
    </main>
  );
}