import {
  type RoleSelectorPermission,
  type RoleSelectorRole,
  RoleSelector,
} from '../components/domain/RoleSelector';
import { Button } from '../components/primitives/Button';
import { usePageData } from '../context/page-data';

// Mirrors the payload injected by `DomainPermissionHandler.get` in
// packages/hydrooj/src/handler/domain.ts:208 — `roles` is the result of
// `domain.getRoles(domainId)`, i.e. one entry per role with its `perm`
// bitmask. `PERMS_BY_FAMILY` mirrors the server-side grouping in
// packages/hydrooj/src/model/builtin.ts:80, keyed by family with each
// permission's `key` (bit) and `desc` (label). `domain` is the active
// domain doc.
interface Domain { _id: string, name: string }
interface Role {
  _id: string;
  perm: bigint | number | string;
  count?: number;
}
interface Permission {
  key: bigint | number;
  desc: string;
}
interface Args {
  domain: Domain;
  roles: Role[];
  PERMS_BY_FAMILY?: Record<string, Permission[]>;
}

interface IndexedFamily {
  family: string;
  perms: readonly Permission[];
  startIdx: number;
}

function toBig(value: bigint | number | string): bigint {
  return typeof value === 'bigint' ? value : BigInt(value);
}

function hasPerm(rolePerm: bigint | number | string, permKey: bigint | number): boolean {
  return (toBig(rolePerm) & toBig(permKey)) !== 0n;
}

function MatrixRow({ roles, permission, pIdx }: {
  roles: RoleSelectorRole[];
  permission: RoleSelectorPermission;
  pIdx: number;
}) {
  return (
    <tr>
      <th scope="row">{permission.desc}</th>
      {roles.map((role) => (
        <td key={role._id} className="col--p">
          <label className="compact checkbox">
            <input
              type="checkbox"
              checked={hasPerm(role.perm, permission.key)}
              disabled={role._id === 'root'}
              readOnly
              data-testid={`cell-role-${role._id}-perm-${pIdx}`}
            />
          </label>
        </td>
      ))}
    </tr>
  );
}

// Family-grouped matrix that mirrors the original Nunjucks layout
// (`domain_permission.html`): a span per family above the rows of that family,
// plus row labels taken from each permission's `desc`. Falls back to the plain
// `RoleSelector` grid when there is nothing to render.
function PermissionMatrix({ roles, families }: {
  roles: RoleSelectorRole[];
  families: ReadonlyArray<readonly [string, readonly Permission[]]>;
}) {
  // Pre-compute each family's start index in the flattened permission list
  // using a non-mutating reduce so we don't reassign a variable during render.
  const indexedFamilies = families.reduce<IndexedFamily[]>(
    (acc, [family, perms]) => {
      const startIdx = acc.length === 0
        ? 0
        : acc[acc.length - 1].startIdx + acc[acc.length - 1].perms.length;
      return [...acc, { family, perms, startIdx }];
    },
    [],
  );
  return (
    <table className="data-table role-selector" role="grid">
      <thead>
        <tr>
          <th scope="col">Permissions</th>
          {roles.map((r) => (
            <th key={r._id} scope="col">{r._id}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {indexedFamilies.flatMap(({ family, perms, startIdx }) => {
          const familyHeaderRows = perms.length > 0 ? [
            <tr key={`family-${family}`}>
              <td className="col--family" colSpan={roles.length + 1}>{family}</td>
            </tr>,
          ] : [];
          const permRows = perms.map((p, i) => (
            <MatrixRow
              key={`perm-${family}-${startIdx + i}`}
              roles={roles}
              permission={p}
              pIdx={startIdx + i}
            />
          ));
          return [...familyHeaderRows, ...permRows];
        })}
      </tbody>
    </table>
  );
}

export default function DomainPermissionPage() {
  const { args } = usePageData() as unknown as { args: Args };
  const { domain, roles, PERMS_BY_FAMILY = {} } = args;
  const matrixRoles: RoleSelectorRole[] = (roles ?? []).map((r) => ({ _id: r._id, perm: r.perm }));
  // Flatten the family-grouped permissions into a single ordered list so the
  // matrix row indices are stable. The server preserves insertion order, so
  // iterating Object.entries is deterministic across renders.
  const familyEntries = Object.entries(PERMS_BY_FAMILY) as Array<[string, Permission[]]>;
  const flatPermissions: RoleSelectorPermission[] = familyEntries.flatMap(([, family]) => family);
  const hasPermissions = flatPermissions.length > 0 && matrixRoles.length > 0;
  return (
    <form method="post">
      <div className="section">
        <div className="section__header">
          <h1 className="section__title">{`${domain.name}: Permissions`}</h1>
        </div>
        <div className="section__body no-padding domain-users">
          {hasPermissions ? (
            <PermissionMatrix roles={matrixRoles} families={familyEntries} />
          ) : (
            <RoleSelector roles={matrixRoles} permissions={flatPermissions} />
          )}
        </div>
        <div className="section__body">
          <Button variant="primary" type="submit">Update Permission</Button>
          <Button
            onClick={() => {
              if (typeof window !== 'undefined') window.history.go(-1);
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    </form>
  );
}
