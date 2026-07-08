import { usePageData } from '../context/page-data';
import { AuthShell } from '../components/auth/AuthShell';
import { ProblemForm } from '../components/problem/ProblemForm';
import { TopNav } from '../components/nav/TopNav';
import { NavLink } from '../components/nav/NavLink';
import { Link } from '../components/link';

interface Args {
  pdoc?: {
    docId: number;
    pid?: string;
    title?: string;
    hidden?: boolean;
    tag?: string[];
    difficulty?: number;
    content?: string | Record<string, string>;
    additional_file?: Array<{ name: string; size: number }>;
    reference?: { domainId: string; pid: string | number };
  };
  statementLangs?: string[];
  categoryTree?: Array<{ name: string; children?: Array<{ name: string }> }>;
  UserContext?: { hasPerm?: (perm: number) => boolean; own?: (p: { owner?: number }, perm: number) => boolean };
}

export default function ProblemEditPage() {
  const { args } = usePageData() as unknown as { args: Args };
  const pdoc = args?.pdoc;
  // canDelete when either the user owns the problem or has PERM_EDIT_PROBLEM.
  const canDelete = !!(pdoc && args?.UserContext && (
    args.UserContext.own?.(pdoc as { owner?: number }, /* PERM_EDIT_PROBLEM_SELF */ 16) ||
    args.UserContext.hasPerm?.(/* PERM_EDIT_PROBLEM */ 16)
  ));

  return (
    <>
      <TopNav brand="Hydro" currentRoute="problem_edit">
        <NavLink to="homepage">Home</NavLink>
        <NavLink to="problem_main">Problems</NavLink>
      </TopNav>
      <AuthShell
        title={pdoc?.title || 'Edit problem'}
        subtitle={pdoc?.pid ? `Editing ${pdoc.pid}` : 'Editing problem'}
        hideTopNav
        footLinks={
          pdoc?.pid ? <Link to="problem_detail" params={{ pid: pdoc.pid }}>← Back to problem</Link> : <Link to="problem_main">← Back</Link>
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