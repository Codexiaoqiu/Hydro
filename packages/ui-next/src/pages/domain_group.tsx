import { type Member, MemberTable } from '../components/domain/MemberTable';
import { Button } from '../components/primitives/Button';
import { usePageData } from '../context/page-data';

// Mirrors the payload injected by `DomainUserGroupHandler.get` in
// packages/hydrooj/src/handler/domain.ts:318 — `groups` is the result of
// `user.listGroup(domainId)` (one GDoc per group with `name` + `uids`),
// and `domain` is the active domain doc.
interface Domain { _id: string, name: string, displayName: string }
interface GroupDoc { _id?: string, name: string, uids: number[] }
interface Args {
  domain: Domain;
  groups: GroupDoc[];
}

export default function DomainGroupPage() {
  const { args } = usePageData() as unknown as { args: Args };
  const { domain, groups } = args;
  // Map each group doc to the Member shape expected by the shared
  // MemberTable. Groups don't carry a numeric uid, so we use the array index
  // as a stable row key; role stays at the constant 'default' because the
  // group table omits Role/Joined columns for type="group" (see
  // components/domain/MemberTable.tsx).
  const members: Member[] = (groups ?? []).map((g, idx) => ({
    uid: idx,
    uname: g.name,
    role: 'default',
  }));
  return (
    <div className="section">
      <div className="section__header">
        <h1 className="section__title">{`${domain.name}: Groups`}</h1>
        <div className="section__tools">
          <Button>Import Groups</Button>
          <Button>Export Groups</Button>
          <Button variant="primary">Create Group</Button>
        </div>
      </div>
      <div className="section__body no-padding">
        <MemberTable members={members} type="group" />
      </div>
      <div className="section__body">
        <Button>Remove Selected Group</Button>
        <Button>Save All Changes</Button>
      </div>
    </div>
  );
}
