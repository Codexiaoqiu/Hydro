import { usePageData } from '../context/page-data';

// Mirrors the payload injected by `DomainJoinApplicationsHandler.get` in
// packages/hydrooj/src/handler/domain.ts:275 — `joinSettings` (the active
// settings or null), `rolesWithText` (select options for role), `expirations`
// (a pre-filtered expire-select options object), and `url_prefix` (used to
// render the public join URL).
export interface JoinSettings {
  method: number;
  role: string;
  group?: string;
  code?: string;
  expire?: number | string | null;
}
export interface Args {
  joinSettings: JoinSettings | null;
  rolesWithText: Array<[string, string]>;
  expirations: Record<string, string>;
  url_prefix: string;
}

const JOIN_METHOD_NONE = 0;
const JOIN_METHOD_ALL = 1;
const JOIN_METHOD_CODE = 2;

const METHOD_LABELS: Record<number, string> = {
  [JOIN_METHOD_NONE]: 'No user is allowed to join this domain',
  [JOIN_METHOD_ALL]: 'Any user is allowed to join this domain',
  [JOIN_METHOD_CODE]: 'Any user is allowed to join this domain with an invitation code',
};

function formatExpire(value: JoinSettings['expire']): string {
  if (value === null || value === undefined) return 'Never expire';
  if (typeof value === 'number') {
    if (value === 0) return 'Keep current expiration';
    if (value === -1) return 'Never expire';
    return new Date(value * 1000).toISOString();
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toISOString();
}

export default function DomainJoinApplicationsPage() {
  const { args } = usePageData();
  const { joinSettings, rolesWithText, expirations, url_prefix } = args;
  // The original template uses `handler.args.domainId` to build the public
  // join URL. Extract it from the current page URL as a best-effort fallback
  // when the SPA is mounted at /d/{domainId}/domain/join_applications.
  const m = typeof window !== 'undefined' ? window.location.pathname.match(/^\/d\/([^/]+)/) : null;
  const domainId = m?.[1] ?? '';
  const currentMethod = joinSettings?.method ?? JOIN_METHOD_NONE;
  const currentRole = joinSettings?.role ?? '';
  const currentGroup = joinSettings?.group ?? '';
  const currentCode = joinSettings?.code ?? '';
  return (
    <div className="section">
      {joinSettings && (
        <section>
          <div className="section__header">
            <h1 className="section__title">Information</h1>
          </div>
          <div className="section__body typo">
            <p>User can join this domain by visiting the following URL:</p>
            <pre><code>{`${url_prefix}d/${domainId}/domain/join`}</code></pre>
            {joinSettings.method === JOIN_METHOD_CODE && joinSettings.code && (
              <>
                <p>Or, with automatically filled invitation code:</p>
                <pre><code>{`${url_prefix}d/${domainId}/domain/join?code=${encodeURIComponent(joinSettings.code)}`}</code></pre>
              </>
            )}
            {joinSettings.expire && (
              <blockquote className="note">
                {`The link will be expired at ${formatExpire(joinSettings.expire)}.`}
              </blockquote>
            )}
          </div>
        </section>
      )}
      <section>
        <div className="section__header">
          <h1 className="section__title">Settings</h1>
        </div>
        <div className="section__body">
          <form method="POST">
            <label className="field">
              <span>Method</span>
              <select name="method" defaultValue={String(currentMethod)}>
                {Object.entries(METHOD_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Role Assignment</span>
              <select name="role" defaultValue={currentRole}>
                {rolesWithText.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Group Assignment (Optional)</span>
              <input type="text" name="group" defaultValue={currentGroup} />
            </label>
            <label className="field">
              <span>Expire</span>
              <select name="expire" defaultValue="">
                {Object.entries(expirations).map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Invitation Code</span>
              <input type="text" name="invitationCode" defaultValue={currentCode} />
            </label>
            <button type="submit" className="primary rounded button">Update Settings</button>
          </form>
        </div>
      </section>
    </div>
  );
}
