import { ProblemForm } from '../components/problem/ProblemForm';
import { usePageData } from '../context/page-data';
import { canEditProblem } from '../lib/perms';

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
    owner?: number;
    maintainer?: number[];
  };
  statementLangs?: string[];
  categoryTree?: Array<{ name: string, children?: Array<{ name: string }> }>;
  UserContext?: Record<string, unknown>;
}

export default function ProblemEditPage() {
  const { args } = usePageData() as unknown as { args: Args };
  const pdoc = args?.pdoc;
  // canDelete when either the user owns the problem or has PERM_EDIT_PROBLEM.
  const canDelete = !!(pdoc && canEditProblem(args?.UserContext as any, pdoc));

  return (
    <ProblemForm
      pageName="problem_edit"
      pdoc={pdoc}
      statementLangs={args?.statementLangs ?? ['zh_CN', 'en']}
      categoryTree={args?.categoryTree}
      additionalFile={pdoc?.additional_file}
      canDelete={canDelete}
      isReference={!!pdoc?.reference}
    />
  );
}
