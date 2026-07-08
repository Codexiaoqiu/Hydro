import { usePageData } from '../context/page-data';
import { AuthShell } from '../components/auth/AuthShell';
import { ProblemForm } from '../components/problem/ProblemForm';
import { TopNav } from '../components/nav/TopNav';
import { NavLink } from '../components/nav/NavLink';
import { Link } from '../components/link';

interface Args {
  statementLangs?: string[];
  categoryTree?: Array<{ name: string; children?: Array<{ name: string }> }>;
}

export default function ProblemCreatePage() {
  const { args } = usePageData() as unknown as { args: Args };
  return (
    <>
      <TopNav brand="Hydro" currentRoute="problem_create">
        <NavLink to="homepage">Home</NavLink>
        <NavLink to="problem_main">Problems</NavLink>
      </TopNav>
      <AuthShell
        title="Create problem"
        subtitle="Set the basics — you'll add testdata and judge config next."
        hideTopNav
        footLinks={<Link to="problem_main">← Back to problem list</Link>}
      >
        <ProblemForm
          pageName="problem_create"
          statementLangs={args?.statementLangs ?? ['zh_CN', 'en']}
          categoryTree={args?.categoryTree}
          additionalFile={[]}
        />
      </AuthShell>
    </>
  );
}