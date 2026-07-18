import { ContestForm } from '../components/contest/ContestForm';
import { usePageData } from '../context/page-data';

interface Args {
  tdoc?: {
    docId?: string;
    title?: string;
    content?: string;
    rule?: string;
    beginAt?: number;
    endAt?: number;
    pids?: number[];
    rated?: boolean;
    autoHide?: boolean;
    allowViewCode?: boolean;
    allowPrint?: boolean;
    keepScoreboardHidden?: boolean;
    langs?: string[];
    maintainer?: number[];
    lockAt?: number;
  };
  tid?: string;
  UserContext?: Record<string, unknown>;
}

export default function ContestEditPage() {
  const { args } = usePageData() as unknown as { args: Args };
  return (
    <ContestForm
      pageName="contest_edit"
      tdoc={args?.tdoc}
      tid={args?.tid ?? args?.tdoc?.docId}
      UserContext={args?.UserContext}
    />
  );
}