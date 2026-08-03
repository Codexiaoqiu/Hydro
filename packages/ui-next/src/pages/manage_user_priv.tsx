import { useState } from 'react';
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

export interface Args {
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

/** Coerce bigint|number to a plain JS number for the bitmask input. */
function toNumber(v: number | bigint): number {
  return typeof v === 'bigint' ? Number(v) : v;
}

interface ApplyFailure {
  uid: number;
  reason: Error;
}

export default function ManageUserPrivPage() {
  const { args } = usePageData();
  const udocs = args?.udocs ?? [];
  const Priv = args?.Priv ?? {};
  const defaultPriv = args?.defaultPriv ?? 0;

  // Selection-mode state. `selectionMode` gates the MemberTable between the
  // existing Edit-button view (default) and a checkbox-driven batch-edit view.
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedUids, setSelectedUids] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  // User-visible surface for batch-apply failures. Set when at least one of
  // the per-uid POSTs throws or returns a non-2xx response; cleared when
  // the user dismisses it or re-submits. The previous implementation only
  // logged to `console.error`, which the operator running sudo never sees.
  const [applyError, setApplyError] = useState<string | null>(null);

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

  const exitSelection = () => {
    setSelectionMode(false);
    setSelectedUids(new Set());
    setBusy(false);
    setApplyError(null);
  };

  // Apply action: POST /manage/userpriv once per selected uid, then reload.
  // The handler accepts a single (uid, priv) per request, so a native HTML
  // form-per-row would explode to N sub-forms. We batch via fetch with
  // URLSearchParams (the backend reads `@param('priv', Types.UnsignedInt)`)
  // and reload once all complete.
  const applySelection = async (form: HTMLFormElement) => {
    if (selectedUids.size === 0) return;
    const priv = Number((form.elements.namedItem('priv') as HTMLInputElement)?.value ?? 0);
    if (!Number.isFinite(priv) || priv < 0) {
      setApplyError(`Invalid privilege bitmask: ${priv}`);
      return;
    }
    setBusy(true);
    setApplyError(null);
    // Capture the count up-front so the success message can mention how
    // many users were targeted (the selected set could change mid-flight
    // if a future hot-reload wired up).
    const targetCount = selectedUids.size;
    // Capture ids up-front so we can still report failures even after the
    // user has already tried to clear the selection.
    const targetIds = Array.from(selectedUids);
    try {
      const results = await Promise.allSettled(
        targetIds.map((uid) =>
          fetch('/manage/userpriv', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
            body: new URLSearchParams({ uid: String(uid), priv: String(priv), system: 'false' }).toString(),
          }).then(async (res) => {
            if (!res.ok) {
              // Surface the status + body excerpt so the admin knows whether
              // it was a permission issue (403), validation problem (400),
              // or a server-side handler crash (500).
              const text = await res.text().catch(() => '');
              throw new Error(`uid=${uid} → HTTP ${res.status}${text ? `: ${text.slice(0, 120)}` : ''}`);
            }
            return res;
          }),
        ),
      );
      const failed = results
        .map((r, i) => (r.status === 'rejected' ? { uid: targetIds[i], reason: (r as PromiseRejectedResult).reason as Error } : null))
        .filter((x): x is ApplyFailure => x !== null);
      if (failed.length === 0) {
        // Reload to pick up the server-rendered udocs / current values.
        window.location.reload();
        return;
      }
      // Partial failure: keep the selection so the admin can re-apply after
      // fixing the offending uids; surface the count + a few reasons.
      const sample = failed.slice(0, 3).map((f) => f.reason.message).join('; ');
      setApplyError(
        `Failed to update ${failed.length} of ${targetCount} users. ${sample}${failed.length > 3 ? ` (+${failed.length - 3} more)` : ''}`,
      );
      setBusy(false);
    } catch (e) {
      // Defensive fallback: `allSettled` shouldn't reject, but if a non-fetch
      // error sneaks in (e.g. URLSearchParams construction), make sure the
      // busy state resets and the user is told.
      setBusy(false);
      setApplyError(`Unexpected error: ${(e as Error)?.message ?? String(e)}`);
    }
  };

  return (
    <div className="manage-user-priv">
      <Card
        variant="default"
        header={<h1 className="manage-user-priv__title">User Privilege</h1>}
      >
        <div className="manage-user-priv__tools">
          {selectionMode ? (
            <Button variant="ghost" type="button" onClick={exitSelection} aria-label="Cancel Selection">
              Cancel
            </Button>
          ) : (
            <Button
              variant="primary"
              type="button"
              onClick={() => setSelectionMode(true)}
              aria-label="Select User"
            >
              Select User
            </Button>
          )}
        </div>
      </Card>

      <Card variant="default" header={<h2 className="manage-user-priv__subtitle">Users</h2>}>
        <div className="manage-user-priv__users">
          <MemberTable
            members={members}
            type="user"
            selection={selectionMode}
            selectedUids={selectedUids}
            onSelectionChange={setSelectedUids}
          />
        </div>
      </Card>

      {/*
        Batch-edit form. Visible only when the user is in selection mode.
        Each "Save" click issues one POST per selected uid (the handler
        signature doesn't accept multiple uids), then reloads the page so the
        server-rendered args reflect the new priv bitmasks.
      */}
      {selectionMode ? (
        <Card variant="default" header={<h2 className="manage-user-priv__subtitle">Apply Privilege</h2>}>
          {applyError ? (
            <div className="manage-user-priv__apply-error" role="alert" data-testid="apply-error">
              <span className="manage-user-priv__apply-error-text">{applyError}</span>
              <Button
                variant="ghost"
                type="button"
                onClick={() => setApplyError(null)}
                aria-label="Dismiss error"
              >
                Dismiss
              </Button>
            </div>
          ) : null}
          <form
            className="manage-user-priv__apply-form"
            onSubmit={(e) => {
              e.preventDefault();
              applySelection(e.currentTarget);
            }}
          >
            <p className="manage-user-priv__apply-hint" role="status">
              Applying to {selectedUids.size} user{selectedUids.size === 1 ? '' : 's'}.
            </p>
            <label className="manage-user-priv__apply-label" htmlFor="manage-user-priv-bitmask">
              New priv bitmask
            </label>
            <input
              id="manage-user-priv-bitmask"
              className="manage-user-priv__apply-input"
              type="number"
              name="priv"
              min={0}
              defaultValue={toNumber(defaultPriv)}
            />
            <div className="manage-user-priv__apply-actions">
              <Button
                variant="primary"
                type="submit"
                disabled={busy || selectedUids.size === 0}
                aria-label="Apply Privilege"
              >
                {busy ? 'Applying…' : `Apply to ${selectedUids.size}`}
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <Card variant="default" header={<h2 className="manage-user-priv__subtitle">Privileges</h2>}>
        <div className="manage-user-priv__matrix">
          <RoleSelector roles={roles} permissions={permissions} />
        </div>
      </Card>
    </div>
  );
}
