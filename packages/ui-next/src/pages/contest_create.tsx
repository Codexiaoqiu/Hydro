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
    <ContestForm
      pageName="contest_create"
      UserContext={args?.UserContext}
      languages={args?.languages}
      domainId={args?.domainId}
    />
  );
}
