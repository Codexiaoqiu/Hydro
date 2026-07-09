import { usePageData } from '../context/page-data';
import { AuthShell } from '../components/auth/AuthShell';
import { ProblemForm } from '../components/problem/ProblemForm';
import { TopNav } from '../components/nav/TopNav';
import { NavLink } from '../components/nav/NavLink';
import { Link } from '../components/link';
import { useTranslate } from '../lib/i18n';

interface Args {
  statementLangs?: string[];
  categoryTree?: Array<{ name: string; children?: Array<{ name: string }> }>;
}

export default function ProblemCreatePage() {
  const { args } = usePageData() as unknown as { args: Args };
  const t = useTranslate();
  return (
    <>
      <TopNav brand="Hydro" currentRoute="problem_create">
        <NavLink to="homepage">{t('Common.Home')}</NavLink>
        <NavLink to="problem_main">{t('Common.Problems')}</NavLink>
      </TopNav>
      <AuthShell
        title={t('ProblemCreate.Title')}
        subtitle={t('ProblemCreate.Subtitle')}
        hideTopNav
        footLinks={<Link to="problem_main">{t('ProblemCreate.BackToList')}</Link>}
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