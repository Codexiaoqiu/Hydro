import { ContestForm } from '../components/contest/ContestForm';
import { usePageData } from '../context/page-data';

export default function ContestCreatePage() {
  return <ContestForm pageName="contest_create" UserContext={(usePageData() as any)?.args?.UserContext} />;
}
