import { usePageData } from '../context/page-data';

export interface Domain { _id: string, name: string, displayName: string, owner: number }
export interface Args { domain: Domain, userPerm: string }

export default function DomainBasePage() {
  const { args } = usePageData();
  return (
    <div className="domain-layout">
      <header className="domain-banner">
        <h1>{args.domain.displayName}</h1>
        <code>{args.domain.name}</code>
      </header>
      <nav className="domain-sidebar">
        <ul>
          <li><a href="/domain/dashboard">Dashboard</a></li>
          <li><a href="/domain/user">User</a></li>
          <li><a href="/domain/group">Group</a></li>
          <li><a href="/domain/role">Role</a></li>
          <li><a href="/domain/permission">Permission</a></li>
        </ul>
      </nav>
      <main className="domain-content" />
    </div>
  );
}
