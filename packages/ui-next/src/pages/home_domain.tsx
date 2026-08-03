import { Button } from '../components/primitives/Button';
import { usePageData } from '../context/page-data';

export interface Domain { _id: string, name: string, role: string }
export interface Args {
  domains: Domain[];
  hasCreatePriv: boolean;
  hasJoinPriv: boolean;
}

export default function HomeDomainPage() {
  const { args } = usePageData();
  return (
    <div className="section">
      <div className="section__header">
        <h1 className="section__title">My Domains</h1>
        <div className="section__tools">
          {args.hasCreatePriv && (
            <a href="/home/domain/create"><Button variant="primary">Create Domain</Button></a>
          )}
          {args.hasJoinPriv && (
            <Button variant="primary" disabled>Join Domain</Button>
          )}
        </div>
      </div>
      {args.domains.length === 0 ? (
        <p className="empty">No domains yet.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr><th>Name</th><th>ID</th><th>My Role</th><th>Action</th></tr>
          </thead>
          <tbody>
            {args.domains.map((d) => (
              <tr key={d._id}>
                <td>{d.name}</td>
                <td><code>{d._id}</code></td>
                <td>{d.role}</td>
                <td><a href={`/?domain=${encodeURIComponent(d._id)}`}>View</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
