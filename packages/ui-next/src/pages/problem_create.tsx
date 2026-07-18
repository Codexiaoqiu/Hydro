import { ProblemForm } from '../components/problem/ProblemForm';
import { usePageData } from '../context/page-data';

interface Args {
  statementLangs?: string[];
  categoryTree?: Array<{ name: string, children?: Array<{ name: string }> }>;
}

export default function ProblemCreatePage() {
  const { args } = usePageData() as unknown as { args: Args };
  return (
    <ProblemForm
      pageName="problem_create"
      statementLangs={args?.statementLangs ?? ['zh_CN', 'en']}
      categoryTree={args?.categoryTree}
      additionalFile={[]}
    />
  );
}
