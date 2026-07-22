import { ContestBackLink } from '../components/contest/ContestBackLink';
import { ContestForm } from '../components/contest/ContestForm';
import type { LanguageOption } from '../components/primitives';
import { usePageData } from '../context/page-data';

interface Args {
  tdoc?: {
    docId?: string;
    title?: string;
    content?: string;
    rule?: string;
    // After JSON serialization the renderer (`packages/ui-next/index.ts`)
    // passes Date fields as ISO strings. Accept both shapes.
    beginAt?: string | number;
    endAt?: string | number;
    pids?: number[];
    rated?: boolean;
    autoHide?: boolean;
    allowViewCode?: boolean;
    allowPrint?: boolean;
    keepScoreboardHidden?: boolean;
    langs?: string[];
    maintainer?: number[];
    lockAt?: string | number;
  };
  tid?: string;
  UserContext?: Record<string, unknown>;
  /** Available languages injected by `ContestEditHandler.get`. */
  languages?: LanguageOption[];
  domainId?: string;
}

export default function ContestEditPage() {
  const { args } = usePageData() as unknown as { args: Args };
  return (
    <>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: 'var(--space-4) var(--space-6) 0' }}>
        <ContestBackLink tdoc={args?.tdoc} block />
      </div>
      <ContestForm
        pageName="contest_edit"
        tdoc={args?.tdoc}
        tid={args?.tid ?? args?.tdoc?.docId}
        UserContext={args?.UserContext}
        languages={args?.languages}
        domainId={args?.domainId}
      />
    </>
  );
}
