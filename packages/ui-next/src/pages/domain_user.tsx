import { type Member, MemberTable } from '../components/domain/MemberTable';
import { Button } from '../components/primitives/Button';
import { usePageData } from '../context/page-data';

// Mirrors the payload injected by `DomainUserHandler.get` in
// packages/hydrooj/src/handler/domain.ts:152 — `rudocs` is a role -> members
// map (the handler groups users by their assigned role), `roles` is the
// ordered list of role definitions, and `domain` is the active domain doc.
interface DomainUser { uid: number, uname: string, role: string, join?: number }
interface Domain { _id: string, name: string, displayName: string }
interface Args {
  domain: Domain;
  rudocs: Record<string, DomainUser[]>;
  roles: Array<{ _id: string }>;
}

export default function DomainUserPage() {
  const { args } = usePageData() as unknown as { args: Args };
  const { domain, rudocs } = args;
  // Flatten the role-grouped map into a single ordered list. The original
  // template rendered each role as its own tbody with the role name as a
  // leading column; for the SPA we keep role on the row, which gives every
  // member a single uniform row layout the tests can target.
  const members: Member[] = Object.values(rudocs ?? {})
    .flat()
    .map((u) => ({
      uid: u.uid,
      uname: u.uname,
      role: u.role,
      joinedAt: u.join,
    }));
  return (
    <div className="section">
      <div className="section__header">
        <h1 className="section__title">{`${domain.name}: Users`}</h1>
        <div className="section__tools">
          <Button>Add User</Button>
        </div>
      </div>
      <div className="section__body no-padding">
        <MemberTable members={members} type="user" />
      </div>
      <div className="section__body">
        <Button>Remove Selected User</Button>
        <Button>Set Roles for Selected User</Button>
      </div>
    </div>
  );
}
