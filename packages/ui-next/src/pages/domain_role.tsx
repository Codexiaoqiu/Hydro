import {
  type RoleSelectorPermission,
  type RoleSelectorRole,
  RoleSelector,
} from '../components/domain/RoleSelector';
import { Button } from '../components/primitives/Button';
import { Checkbox } from '../components/primitives/Checkbox';
import { usePageData } from '../context/page-data';

// Mirrors the payload injected by `DomainRoleHandler.get` in
// packages/hydrooj/src/handler/domain.ts:240 — `roles` is the result of
// `domain.getRoles(domainId, true)`, i.e. one entry per role with its
// `perm` bitmask and (when requested) a `count` of users currently in
// the role. `domain` is the active domain doc.
interface Domain { _id: string, name: string, displayName: string }
interface Role {
  _id: string;
  perm: bigint | number | string;
  count?: number;
}
interface Args {
  domain: Domain;
  roles: Role[];
}

// Built-in roles are protected from deletion (see handler postDelete
// guard at packages/hydrooj/src/handler/domain.ts:264). Keep the
// canonical list here in sync with the server-side `BUILTIN_ROLES`
// defined in packages/hydrooj/src/model/builtin.ts.
const BUILTIN_ROLES = new Set(['default', 'guest', 'root']);

function isBuiltin(_id: string): boolean {
  return BUILTIN_ROLES.has(_id);
}

// Minimal permission matrix shared with the role list. The original
// `domain_role.html` template shows only the role list (add/delete
// operations), so we render a static subset of permissions here purely
// for the matrix preview. Callers that need the full PERMS list can
// inject one through `args.permissions` instead.
function defaultPermissions(): RoleSelectorPermission[] {
  return [
    { key: 1n << 0n, desc: 'View this domain' },
    { key: 1n << 1n, desc: 'Edit domain settings' },
    { key: 1n << 4n, desc: 'Create problems' },
    { key: 1n << 9n, desc: 'Submit problem' },
    { key: 1n << 11n, desc: "View other's records" },
    { key: 1n << 15n, desc: 'View problem solutions' },
  ];
}

export default function DomainRolePage() {
  const { args } = usePageData() as unknown as { args: Args };
  const { domain, roles } = args;
  const matrixRoles: RoleSelectorRole[] = (roles ?? []).map((r) => ({ _id: r._id, perm: r.perm }));
  const permissions = defaultPermissions();
  return (
    <div className="section">
      <div className="section__header">
        <h1 className="section__title">{`${domain.name}: Roles`}</h1>
        <div className="section__tools">
          <Button variant="primary">Create Role</Button>
        </div>
      </div>
      <div className="section__body no-padding domain-roles">
        <table className="data-table">
          <thead>
            <tr>
              <th className="col--checkbox">
                <Checkbox label="" />
              </th>
              <th className="col--id">Role</th>
              <th className="col--users">Users</th>
            </tr>
          </thead>
          <tbody>
            {(roles ?? []).map((role) => {
              const builtin = isBuiltin(role._id);
              return (
                <tr key={role._id} data-role={builtin ? undefined : role._id}>
                  <td className="col--checkbox">
                    <Checkbox
                      disabled={builtin}
                      readOnly
                      aria-label={`Select role ${role._id}`}
                    />
                  </td>
                  <td className="col--id">
                    {`${builtin ? 'Built-in' : 'User-defined role'}: ${role._id}`}
                  </td>
                  <td className="col--users">{role.count ?? '--'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="section__body">
        <Button>Delete Selected Roles</Button>
      </div>
      <div className="section__header">
        <h2 className="section__title">Permission Matrix</h2>
      </div>
      <div className="section__body no-padding">
        <RoleSelector roles={matrixRoles} permissions={permissions} />
      </div>
    </div>
  );
}
