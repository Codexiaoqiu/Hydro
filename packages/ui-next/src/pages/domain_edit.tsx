import { DomainForm } from '../components/domain/DomainForm';
import { usePageData } from '../context/page-data';

export interface Domain { _id: string, name: string, displayName: string, gravatar: string }
export interface Args { domain: Domain }

export default function DomainEditPage() {
  const { args } = usePageData();
  return (
    <div className="section">
      <h1>Edit Domain</h1>
      <DomainForm domain={args.domain} mode="edit" />
    </div>
  );
}
