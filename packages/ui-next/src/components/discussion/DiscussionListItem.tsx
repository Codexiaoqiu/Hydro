import { timeAgo } from '../../lib/datetime';
import { Link } from '../link';
import styles from './DiscussionListItem.module.css';

export interface DiscussionItemOwner {
  _id: number;
  uname: string;
  avatar?: string;
}

export interface DiscussionDdoc {
  _id: string;
  docId: string;
  title: string;
  nReply: number;
  views: number;
  owner: number;
  parentType: number;
  parentId: string;
  updateAt: number | string;
  highlight?: boolean;
  pin?: boolean;
  hidden?: boolean;
}

export interface VnodeLite {
  _id?: string;
  id?: string;
  title?: string;
  type?: number;
  docId?: string;
}

export interface DiscussionListItemProps {
  ddoc: DiscussionDdoc;
  vnode?: VnodeLite;
  owner?: DiscussionItemOwner;
  buildHref: (name: string, params?: Record<string, unknown>) => string;
}

function parentTypeDisplay(parentType: number): string {
  switch (parentType) {
    case 1: return 'problem';
    case 2: return 'contest';
    case 4: return 'node';
    case 16: return 'training';
    case 32: return 'homework';
    default: return 'node';
  }
}

export function DiscussionListItem({ ddoc, vnode, owner, buildHref }: DiscussionListItemProps) {
  const detailHref = buildHref('discussion_detail', { did: ddoc.docId });
  const nodeHref = vnode
    ? buildHref('discussion_node', { type: parentTypeDisplay(ddoc.parentType), name: String(ddoc.parentId) })
    : '#';
  const updateAt = typeof ddoc.updateAt === 'number'
    ? new Date(ddoc.updateAt).toISOString()
    : ddoc.updateAt;
  return (
    <li
      className={`${styles.item} ${ddoc.highlight ? styles.highlight : ''}`}
      data-highlight={ddoc.highlight ? 'true' : 'false'}
      data-doc-id={ddoc.docId}
    >
      <div className={styles.replies}>
        <div className={styles.repliesNum}>{ddoc.nReply}</div>
        <div className={styles.repliesLabel}>回复</div>
      </div>
      <div className={styles.body}>
        <h1 className={styles.title}>
          <Link href={detailHref}>{ddoc.title}</Link>
        </h1>
        <ul className={styles.meta}>
          {vnode && (
            <li>
              <Link href={nodeHref} className={styles.nodeTag}>
                {vnode.title || '(missing)'}
              </Link>
            </li>
          )}
          <li>{ddoc.views} 浏览</li>
          <li>
            {owner ? (
              <Link href={buildHref('user_detail', { uid: owner._id })}>{owner.uname}</Link>
            ) : (
              <span>#{ddoc.owner}</span>
            )}
            {' @ '}
            {timeAgo(updateAt)}
          </li>
          {ddoc.hidden && <li className={styles.hidden}>(Hidden)</li>}
        </ul>
      </div>
    </li>
  );
}
