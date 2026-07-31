import { Button } from '../primitives/Button';

export interface Member {
  uid: number;
  uname: string;
  role: string;
  joinedAt?: number;
  email?: string;
}

interface Props {
  members: Member[];
  type: 'user' | 'group';
}

/**
 * Shared member-list table used by `domain_user` (and reusable for group
 * membership in `domain_group`). Renders one row per member with a trailing
 * Edit action. For `type="user"` the table also surfaces the role and join
 * timestamp; `type="group"` omits those columns because groups don't have
 * per-member roles/join dates in the current model.
 */
export function MemberTable({ members, type }: Props) {
  if (members.length === 0) {
    return <p className="empty">{`No ${type}s.`}</p>;
  }
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>UID</th>
          <th>Name</th>
          {type === 'user' && <><th>Role</th><th>Joined</th></>}
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {members.map((m) => (
          <tr key={m.uid}>
            <td>{m.uid}</td>
            <td>{m.uname}</td>
            {type === 'user' && (
              <>
                <td>{m.role}</td>
                <td>{m.joinedAt ? new Date(m.joinedAt * 1000).toISOString() : ''}</td>
              </>
            )}
            <td><Button>Edit</Button></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
