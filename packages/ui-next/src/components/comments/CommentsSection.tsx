import { useUserContext } from '../../context/page-data';
import { CommentEditor } from './CommentEditor';
import { CommentTree, type CommentItem } from './CommentTree';
import styles from './CommentsSection.module.css';

export interface CommentsConfig {
  postOp: string;
  editOp: string;
  deleteOp: string;
  postPerm: number;
  editSelfPerm: number;
  editPerm?: number;
  deletePerm?: number;
  commentRef: string;
  replyRef: string;
  placeholder?: string;
}

export interface CommentsSectionProps {
  docs: CommentItem[];
  udict: Record<number, { _id: number, uname: string, avatar?: string }>;
  kind: 'solution' | 'discussion';
  config: CommentsConfig;
  /** Optional user injection for testing or when user context is unavailable. */
  user?: ReturnType<typeof useUserContext>;
  /** Optional callback for parent paragraphs to provide custom submit logic. */
  onSubmit?: (content: string) => void | Promise<void>;
  onEdit?: (item: CommentItem, content: string) => void | Promise<void>;
  onDelete?: (item: CommentItem) => void | Promise<void>;
  onReply?: (parent: CommentItem, content: string) => void | Promise<void>;
  emptyText?: string;
}

/**
 * Renders a list of comments with optional editors. The Section intentionally
 * does NOT call any HTTP endpoint directly — pages wire `onSubmit` / `onEdit` /
 * `onDelete` / `onReply` to the backend's `<form>` posts, so the same Comments
 * works for both problem_solution and discussion_detail without a fetch layer.
 */
export function CommentsSection({
  docs, udict, kind, config, user: userProp, onSubmit, onEdit, onDelete, onReply,
  emptyText,
}: CommentsSectionProps) {
  // Use injected user if provided (testing / direct prop), otherwise fall back to context.
  // Try context; if no PageDataProvider (e.g. in tests), fall back to undefined.
  let userContext: ReturnType<typeof useUserContext> | undefined;
  try { userContext = useUserContext(); } catch { /* no provider */ }
  const user = userProp ?? userContext;
  const canPost = !!user?.hasPerm && user.hasPerm(config.postPerm);
  const editPermCheck = (item: CommentItem) => {
    if (!user) return false;
    if (user.hasPerm(config.editPerm ?? -1)) return true;
    return user.own?.(item) && user.hasPerm(config.editSelfPerm);
  };
  const deletePermCheck = (item: CommentItem) => {
    if (!user) return false;
    if (user.hasPerm(config.deletePerm ?? -1)) return true;
    return user.own?.(item) && user.hasPerm(config.editSelfPerm);
  };
  const fallbackEmpty = kind === 'solution' ? '暂无题解' : '暂无评论';
  return (
    <section className={styles.section} data-comments-kind={kind}>
      {canPost && onSubmit && (
        <div className={styles.compose}>
          <CommentEditor
            placeholder={config.placeholder ?? (kind === 'solution' ? '写下你的题解' : '写下你的回复')}
            onSubmit={onSubmit}
          />
        </div>
      )}
      {docs.length === 0 ? (
        <p className={styles.empty}>{emptyText ?? fallbackEmpty}</p>
      ) : (
        <ul className={styles.list}>
          {docs.map((d) => (
            <li key={d.docId}>
              <CommentTree
                item={d}
                replies={d.reply || []}
                udict={udict}
                onEdit={onEdit}
                onDelete={onDelete}
                onReply={onReply}
                editPermCheck={editPermCheck}
                deletePermCheck={deletePermCheck}
                user={user}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
