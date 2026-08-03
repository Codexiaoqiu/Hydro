import { DomainForm } from '../components/domain/DomainForm';
import { usePageData } from '../context/page-data';

export interface Domain { name?: string, displayName?: string, gravatar?: string }
export interface Args { domain?: Domain }

export default function DomainCreatePage() {
  const { args } = usePageData();
  return (
    <div className="section">
      <h1>Create Domain</h1>
      <DomainForm domain={args.domain ?? {}} mode="create" />
    </div>
  );
}
