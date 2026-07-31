import { usePageData } from '../context/page-data';

// Mirrors the payload injected by `DomainJoinHandler.get` in
// packages/hydrooj/src/handler/domain.ts:367 — namely `joinSettings` (may be
// null when the inviter is already a privileged member), `code`, `target`,
// `redirect`, and the `domainInfo` block (name, owner, avatar, bulletin).
interface OwnerLite { _id: number, uname: string, displayName?: string }
interface DomainInfo { name: string, owner: OwnerLite, avatar: string, bulletin: string }
interface JoinSettings { method: number, role: string, group?: string, code?: string, expire?: number | null }
interface Args {
  joinSettings: JoinSettings | null;
  code: string;
  target: string;
  redirect: string;
  domainInfo: DomainInfo;
}

// Mirrors DomainModel.JOIN_METHOD_CODE in packages/hydrooj/src/model/domain.ts:41.
const JOIN_METHOD_CODE = 2;

export default function DomainJoinPage() {
  const { args } = usePageData() as unknown as { args: Args };
  const { domainInfo, joinSettings, code, target, redirect } = args;
  const requireCode = joinSettings?.method === JOIN_METHOD_CODE;
  return (
    <div className="section">
      <div className="section__header">
        <h1 className="section__title">
          {joinSettings
            ? `Join ${domainInfo.name}`
            : `You are invited to join ${domainInfo.name}`}
        </h1>
      </div>
      <div className="section__body typo">
        <p>{`By clicking the button, you will become a member of the domain ${domainInfo.name}.`}</p>
      </div>
      <div className="section__body typo">
        <p>
          The domain owner:
          {' '}
          {domainInfo.owner?.displayName || domainInfo.owner?.uname || 'unknown'}
        </p>
      </div>
      {domainInfo.bulletin && (
        <div
          className="section__body typo"
          // Server pre-renders bulletin as HTML; render as a string. Real
          // production uses a sanitised markdown pipe, but for the SPA shell
          // we surface the raw text body to keep the page self-contained.
          dangerouslySetInnerHTML={{ __html: domainInfo.bulletin }}
        />
      )}
      <div className="section__body typo">
        <form method="post">
          {requireCode && (
            <label className="field">
              <span>Invitation Code</span>
              <input
                type="text"
                name="code"
                required
                autoFocus
                defaultValue={code}
              />
            </label>
          )}
          <input type="hidden" name="target" value={target} />
          <input type="hidden" name="redirect" value={redirect} />
          <button type="submit" className="primary rounded button">Join</button>
        </form>
      </div>
    </div>
  );
}
