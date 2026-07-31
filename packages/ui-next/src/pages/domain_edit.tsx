import { DomainForm } from '../components/domain/DomainForm';
import { usePageData } from '../context/page-data';

interface Domain { _id: string, name: string, displayName: string, gravatar: string }
interface Args { domain: Domain }

export default function DomainEditPage() {
  const { args } = usePageData() as unknown as { args: Args };
  return (
    <div className="section">
      <h1>Edit Domain</h1>
      <DomainForm domain={args.domain} mode="edit" />
    </div>
  );
}
