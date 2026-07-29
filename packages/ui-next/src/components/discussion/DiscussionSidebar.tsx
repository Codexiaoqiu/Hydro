import { Link } from '../link';
import { Button } from '../primitives/Button';
import { Card } from '../primitives/Card';
import styles from './DiscussionSidebar.module.css';

const TYPE_PROBLEM = 1;
const TYPE_CONTEST = 2;

export interface DiscussionSidebarVnode {
  _id?: string;
  id?: string | number;
  title?: string;
  type?: number;
  docId?: string | number;
  owner?: number;
  pic?: string;
}

export interface DiscussionSidebarUser {
  _id: number;
  hasPerm?: (p: number) => boolean;
  hasPriv?: (p: number) => boolean;
}

export interface DiscussionSidebarProps {
  vnode: DiscussionSidebarVnode;
  udict: Record<number, { _id: number, uname?: string, avatar?: string }>;
  user: DiscussionSidebarUser | null;
  /**
   * Route-resolver signature matching `useBuildUrl`:
   *   (name, params?, searchParams?) => string
   * where `params` fill path-to-regexp placeholders and `searchParams` become
   * the query string. Pages may pass either a wrapper that forwards all three
   * args or a simpler `(name, params?) => string` for components that never
   * emit query strings.
   */
  buildHref: (
    name: string,
    params?: Record<string, unknown>,
    searchParams?: Record<string, string>,
  ) => string;
  /** Permission id for "create discussion". Defaults to 1; pages can override. */
  createPerm?: number;
  /** Privilege id for "login required". Defaults to 1; pages can override. */
  loginPriv?: number;
}

function LoginToCreate({ buildHref }: { buildHref: DiscussionSidebarProps['buildHref'] }) {
  // Split path params from query string — previously the `redirect` value
  // was nested under a `query` key, which path-to-regexp tried to match
  // against a path placeholder, silently resolving to `#`.
  return (
    <Link
      href={buildHref(
        'user_login',
        {},
        { redirect: typeof window !== 'undefined' ? window.location.pathname : '/' },
      )}
      className={styles.createBtn}
    >
      登录后发起讨论
    </Link>
  );
}

export function DiscussionSidebar({
  vnode, udict, user, buildHref,
  createPerm = 1, loginPriv = 1,
}: DiscussionSidebarProps) {
  // problem / contest branches are handled by the caller (page-level) which renders
  // ProblemSidebar / ContestDetailSidebar instead. This primitive handles generic nodes
  // (and the empty vnode used by discussion_main).
  const isEmpty = !vnode || (!vnode._id && !vnode.id && !vnode.docId);
  if (vnode?.type === TYPE_PROBLEM || vnode?.type === TYPE_CONTEST) {
    return null;
  }
  const owner = vnode?.owner ? udict[vnode.owner] : undefined;
  return (
    <div className={styles.wrap}>
      {isEmpty ? (
        <Card>
          <p className={styles.empty}>选择一个节点以查看讨论。</p>
        </Card>
      ) : (
        <Card>
          {vnode.pic && (
            <div
              className={`${styles.bg} ${styles[`pic_${vnode.pic}`] || ''}`}
              aria-hidden="true"
            />
          )}
          <h3 className={styles.title}>{vnode.title || '发起讨论'}</h3>
          {owner?.uname && <p className={styles.owner}>由 {owner.uname} 维护</p>}
          {!user || !user._id ? (
            <LoginToCreate buildHref={buildHref} />
          ) : user.hasPerm?.(createPerm) ? (
            <Link
              href={buildHref('discussion_create', {
                type: 'node',
                name: String(vnode._id || vnode.id || vnode.docId),
              })}
              className={styles.createBtn}
            >
              发起讨论
            </Link>
          ) : user.hasPriv?.(loginPriv) ? (
            <Button variant="ghost" disabled className={styles.createBtn}>无发起讨论权限</Button>
          ) : (
            <LoginToCreate buildHref={buildHref} />
          )}
        </Card>
      )}
    </div>
  );
}
