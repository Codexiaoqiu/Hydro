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
  /**
   * When `true`, the trailing Action cell is replaced by a selection
   * checkbox and the table grows an initial `<th>` for select-all. Selection
   * state lives in the parent component — `onSelectionChange` fires with
   * the **full** set of selected uids on every toggle.
   */
  selection?: boolean;
  selectedUids?: ReadonlySet<number>;
  onSelectionChange?: (uids: Set<number>) => void;
}

/**
 * Shared member-list table used by `domain_user` (and reusable for group
 * membership in `domain_group`). Renders one row per member with a trailing
 * Edit action. For `type="user"` the table also surfaces the role and join
 * timestamp; `type="group"` omits those columns because groups don't have
 * per-member roles/join dates in the current model.
 */
export function MemberTable({ members, type, selection = false, selectedUids, onSelectionChange }: Props) {
  if (members.length === 0) {
    return <p className="empty">{`No ${type}s.`}</p>;
  }

  const toggle = (uid: number, next: boolean) => {
    if (!onSelectionChange) return;
    const set = new Set(selectedUids ?? []);
    if (next) set.add(uid);
    else set.delete(uid);
    onSelectionChange(set);
  };

  const toggleAll = (next: boolean) => {
    if (!onSelectionChange) return;
    onSelectionChange(next ? new Set(members.map((m) => m.uid)) : new Set());
  };

  const allSelected = selection && members.every((m) => (selectedUids ?? new Set()).has(m.uid));

  return (
    <table className="data-table">
      <thead>
        <tr>
          {selection && (
            <th>
              <input
                type="checkbox"
                aria-label="Select all"
                checked={allSelected}
                onChange={(e) => toggleAll(e.target.checked)}
              />
            </th>
          )}
          <th>UID</th>
          <th>Name</th>
          {type === 'user' && <><th>Role</th><th>Joined</th></>}
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {members.map((m) => {
          const isSelected = selection && (selectedUids ?? new Set()).has(m.uid);
          return (
            <tr key={m.uid}>
              {selection && (
                <td>
                  <input
                    type="checkbox"
                    aria-label={`Select ${m.uname ?? m.uid}`}
                    checked={!!isSelected}
                    onChange={(e) => toggle(m.uid, e.target.checked)}
                  />
                </td>
              )}
              <td>{m.uid}</td>
              <td>{m.uname}</td>
              {type === 'user' && (
                <>
                  <td>{m.role}</td>
                  <td>{m.joinedAt ? new Date(m.joinedAt * 1000).toISOString() : ''}</td>
                </>
              )}
              <td>{!selection ? <Button>Edit</Button> : null}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
