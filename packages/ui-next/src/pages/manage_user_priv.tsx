import { type Member, MemberTable } from '../components/domain/MemberTable';
import {
  RoleSelector,
  type RoleSelectorPermission,
  type RoleSelectorRole,
} from '../components/domain/RoleSelector';
import { Button } from '../components/primitives/Button';
import { Card } from '../components/primitives/Card';
import { usePageData } from '../context/page-data';

// Mirrors the payload injected by `SystemUserPrivHandler.get` in
// packages/hydrooj/src/handler/manage.ts:317 — `udocs` is up to 1000 user
// documents (with `_id`, `uname`, `priv`, ...), `Priv` is the PRIV map
// produced by `omit(PRIV, ['PRIV_DEFAULT', 'PRIV_NEVER', 'PRIV_NONE', 'PRIV_ALL'])`,
// and `defaultPriv` is the system default priv bitmask.

interface UserDoc {
  _id: number;
  uname?: string;
  priv: number | bigint;
  [key: string]: unknown;
}

interface Args {
  UserContext?: Record<string, unknown>;
  UiContext?: Record<string, unknown>;
  udocs?: UserDoc[];
  // The PRIV map from the handler: name -> bit value. Values arrive as
  // `number` for priv (the handler stores them as plain ints), but tests
  // may pass `bigint` literals, so we accept both.
  Priv?: Record<string, number | bigint>;
  defaultPriv?: number | bigint;
}

const DEFAULT_ROLE_ID = 'default';

export default function ManageUserPrivPage() {
  const { args } = usePageData() as unknown as { args: Args };
  const udocs = args?.udocs ?? [];
  const Priv = args?.Priv ?? {};
  const defaultPriv = args?.defaultPriv ?? 0;

  // Map user docs to MemberTable rows. The MemberTable "role" column is the
  // natural place to surface the per-user priv bitmask, since the Priv column
  // in the original template is essentially a free-form privilege string.
  const members: Member[] = udocs.map((u) => ({
    uid: u._id,
    uname: u.uname ?? String(u._id),
    role: String(u.priv),
  }));

  // Build the permission matrix from the PRIV map. Each Priv key becomes a
  // matrix row label; the bit value drives the cell's checked state.
  const permissions: RoleSelectorPermission[] = Object.entries(Priv).map(
    ([name, key]) => ({ key, desc: name }),
  );

  // The matrix is rendered with a single "default" role column whose bitmask
  // is the system defaultPriv. This mirrors the leading "Default Privilege"
  // row of the original partial: it shows which bits are granted by default.
  const roles: RoleSelectorRole[] = [{ _id: DEFAULT_ROLE_ID, perm: defaultPriv }];

  return (
    <div className="manage-user-priv">
      <Card
        variant="default"
        header={<h1 className="manage-user-priv__title">User Privilege</h1>}
      >
        <div className="manage-user-priv__tools">
          <Button variant="primary" type="button" aria-label="Select User">
            Select User
          </Button>
        </div>
      </Card>

      <Card variant="default" header={<h2 className="manage-user-priv__subtitle">Users</h2>}>
        <div className="manage-user-priv__users">
          <MemberTable members={members} type="user" />
        </div>
      </Card>

      <Card variant="default" header={<h2 className="manage-user-priv__subtitle">Privileges</h2>}>
        <div className="manage-user-priv__matrix">
          <RoleSelector roles={roles} permissions={permissions} />
        </div>
      </Card>
    </div>
  );
}
