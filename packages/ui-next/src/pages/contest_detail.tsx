import { usePageData } from '../context/page-data';

export default function ContestDetailPage() {
  const pageData = usePageData();
  return (
    <div data-page="contest_detail">
      <h1>Contest Detail (placeholder)</h1>
      <pre>{JSON.stringify(pageData?.args ?? null, null, 2)}</pre>
    </div>
  );
}
