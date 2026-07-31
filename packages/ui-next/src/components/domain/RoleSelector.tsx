// Shared role-permission matrix. Renders a checkbox grid where rows are
// permissions (desc label) and columns are roles, with each cell checked when
// the role's `perm` bitmask includes the permission's `key`.
//
// The matrix is **informational** by default: callers can wire it into a form
// by listening to `onChange`, but `domain_role` itself only renders it for
// display (the handler issues no per-permission mutations on this page). The
// component therefore exposes a stable `data-testid` on every cell so any
// test can probe without querying the surrounding DOM shape.

import { useMemo } from 'react';
import { Checkbox } from '../primitives/Checkbox';

export interface RoleSelectorRole {
  /** Role id (also the column key in the matrix). */
  _id: string;
  /** Bitmask of permission bits assigned to this role. */
  perm: bigint | number | string;
}

export interface RoleSelectorPermission {
  /** Permission bit key, ANDed against each role's `perm`. */
  key: bigint | number;
  /** Human-readable description, rendered as the row label. */
  desc: string;
}

interface Props {
  roles: RoleSelectorRole[];
  permissions: RoleSelectorPermission[];
}

function toBig(value: bigint | number | string): bigint {
  // Perms arrive as BigInt from the server, but local fixtures may pass
  // `number` or numeric-string literals; normalize before bitwise ops.
  return typeof value === 'bigint' ? value : BigInt(value);
}

function hasPerm(rolePerm: bigint | number | string, permKey: bigint | number): boolean {
  return (toBig(rolePerm) & toBig(permKey)) !== 0n;
}

/**
 * RoleSelector — renders a `<table>` matrix of [permission × role] checkboxes.
 *
 * Test selectors:
 * - `getAllByRole('row')` — one per permission
 * - `getAllByRole('columnheader')` — one per role plus the leading label column
 * - `data-testid="cell-role-{roleId}-perm-{permIndex}"` — each checkbox cell
 */
export function RoleSelector({ roles, permissions }: Props) {
  const stableRoleIds = useMemo(() => roles.map((r) => r._id), [roles]);
  if (roles.length === 0 || permissions.length === 0) {
    return <p className="empty">No role data.</p>;
  }
  return (
    <table className="data-table role-selector" role="grid">
      <thead>
        <tr>
          <th scope="col">Permission</th>
          {stableRoleIds.map((id) => (
            <th key={id} scope="col">{id}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {permissions.map((p, pIdx) => (
          <tr key={`${pIdx}-${String(p.desc)}`}>
            <th scope="row">{p.desc}</th>
            {stableRoleIds.map((roleId) => {
              const role = roles.find((r) => r._id === roleId);
              const checked = role ? hasPerm(role.perm, p.key) : false;
              return (
                <td key={`${roleId}-${pIdx}`}>
                  <Checkbox
                    checked={checked}
                    readOnly
                    disabled
                    aria-label={`${roleId} ${p.desc}`}
                    data-testid={`cell-role-${roleId}-perm-${pIdx}`}
                  />
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
