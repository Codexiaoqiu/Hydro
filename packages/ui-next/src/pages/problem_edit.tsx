import { AuthShell } from '../components/auth/AuthShell';
import { Link } from '../components/link';
import { ProblemForm } from '../components/problem/ProblemForm';
import { usePageData } from '../context/page-data';
import { useTranslate } from '../lib/i18n';

interface Args {
  pdoc?: {
    docId: number;
    pid?: string;
    title?: string;
    hidden?: boolean;
    tag?: string[];
    difficulty?: number;
    content?: string | Record<string, string>;
    additional_file?: Array<{ name: string, size: number }>;
    reference?: { domainId: string, pid: string | number };
  };
  statementLangs?: string[];
  categoryTree?: Array<{ name: string, children?: Array<{ name: string }> }>;
  UserContext?: { hasPerm?: (perm: number) => boolean, own?: (p: { owner?: number }, perm: number) => boolean };
}

export default function ProblemEditPage() {
  const { args } = usePageData() as unknown as { args: Args };
  const t = useTranslate();
  const pdoc = args?.pdoc;
  // canDelete when either the user owns the problem or has PERM_EDIT_PROBLEM.
  const canDelete = !!(pdoc && args?.UserContext && (
    args.UserContext.own?.(pdoc as { owner?: number }, /* PERM_EDIT_PROBLEM_SELF */ 16)
    || args.UserContext.hasPerm?.(/* PERM_EDIT_PROBLEM */ 16)
  ));

  return (
    <>
      <AuthShell
        title={pdoc?.title || t('Problem.EditProblem')}
        subtitle={pdoc?.pid ? `${t('ProblemEdit.Editing')}${pdoc.pid}` : t('ProblemEdit.EditingGeneric')}
        hideTopNav
        footLinks={
          pdoc?.pid
            ? <Link to="problem_detail" params={{ pid: pdoc.pid }}>{t('ProblemEdit.BackToProblem')}</Link>
            : <Link to="problem_main">{t('ProblemEdit.Back')}</Link>
        }
      >
        <ProblemForm
          pageName="problem_edit"
          pdoc={pdoc}
          statementLangs={args?.statementLangs ?? ['zh_CN', 'en']}
          categoryTree={args?.categoryTree}
          additionalFile={pdoc?.additional_file}
          canDelete={canDelete}
          isReference={!!pdoc?.reference}
        />
      </AuthShell>
    </>
  );
}
