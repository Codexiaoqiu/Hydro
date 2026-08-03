import { CommentsSection } from '../components/comments/CommentsSection';
import { Paginator } from '../components/primitives/Paginator';
import { ProblemSidebar } from '../components/sidebar/ProblemSidebar';
import { usePageData, useUserContext } from '../context/page-data';
import { useBuildUrl } from '../hooks/use-build-url';
import { useTranslate } from '../lib/i18n';
import styles from './problem_solution.module.css';

export interface Psdoc { docId: string, owner: number, content: string, reply?: Psdoc[], vote?: number }
export interface Pdoc { docId: number, pid?: string, owner: number, title?: string }
export interface Args {
  psdocs: Psdoc[];
  page: number;
  pcount: number;
  pscount: number;
  udict: Record<number, { _id: number, uname: string, avatar?: string }>;
  pssdict: Record<string, unknown>;
  pdoc: Pdoc;
  sid?: string;
}

export default function ProblemSolution() {
  const { args } = usePageData();
  const { psdocs, page, pcount, pdoc, sid } = args;
  const buildUrl = useBuildUrl();
  const t = useTranslate();
  const user = useUserContext();

  const onSubmit = (content: string) => {
    const form = document.createElement('form');
    form.method = 'post';
    form.action = buildUrl('problem_solution', { pid: String(pdoc.docId) });
    const f = document.createElement('input');
    f.type = 'hidden';
    f.name = 'operation';
    f.value = 'submit';
    form.appendChild(f);
    const c = document.createElement('input');
    c.type = 'hidden';
    c.name = 'content';
    c.value = content;
    form.appendChild(c);
    document.body.appendChild(form);
    form.submit();
  };

  return (
    <div className={styles.layout}>
      <main className={styles.main}>
        <header className={styles.head}>
          <h1>{t('Problem.Solutions')} ({args.pscount})</h1>
        </header>
        <CommentsSection
          docs={psdocs as any}
          udict={args.udict}
          kind="solution"
          config={{
            postOp: 'submit',
            editOp: 'edit_solution',
            deleteOp: 'delete_solution',
            postPerm: 1, // PERM_CREATE_PROBLEM_SOLUTION
            editSelfPerm: 1, // PERM_EDIT_PROBLEM_SOLUTION_SELF
            editPerm: 1, // PERM_EDIT_PROBLEM_SOLUTION
            commentRef: 'psid',
            replyRef: 'psrid',
          }}
          onSubmit={onSubmit}
        />
        {!sid && (
          <Paginator
            current={page}
            total={pcount}
            buildHref={(p) => buildUrl('problem_solution', { pid: String(pdoc.docId) }, { page: String(p) })}
          />
        )}
      </main>
      <aside className={styles.side}>
        <ProblemSidebar
          context={{
            pdoc: { docId: pdoc.docId, pid: pdoc.pid, title: pdoc.title ?? '', owner: pdoc.owner },
            UserContext: user,
            buildUrl,
            discussionCount: 0,
            solutionCount: args.pscount,
            tdoc: undefined,
          }}
          mode="normal"
        />
      </aside>
    </div>
  );
}
