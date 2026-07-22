import { ContestBackLink } from '../components/contest/ContestBackLink';
import { ContestForm } from '../components/contest/ContestForm';
import type { LanguageOption } from '../components/primitives';
import { usePageData } from '../context/page-data';

interface Args {
  UserContext?: Record<string, unknown>;
  languages?: LanguageOption[];
  domainId?: string;
}

export default function ContestCreatePage() {
  const { args } = usePageData() as unknown as { args: Args };
  return (
    <>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: 'var(--space-4) var(--space-6) 0' }}>
        <ContestBackLink to="contest_main" labelKey="Common.Back" tdoc={null} block />
      </div>
      <ContestForm
        pageName="contest_create"
        UserContext={args?.UserContext}
        languages={args?.languages}
        domainId={args?.domainId}
      />
    </>
  );
}
