import { DomainForm } from '../components/domain/DomainForm';
import { usePageData } from '../context/page-data';

interface Domain { name?: string, displayName?: string, gravatar?: string }
interface Args { domain?: Domain }

export default function DomainCreatePage() {
  const { args } = usePageData() as unknown as { args: Args };
  return (
    <div className="section">
      <h1>Create Domain</h1>
      <DomainForm domain={args.domain ?? {}} mode="create" />
    </div>
  );
}
