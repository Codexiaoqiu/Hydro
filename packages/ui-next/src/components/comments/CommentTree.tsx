import { useState } from 'react';
import { MarkdownEditor } from '../primitives/MarkdownEditor';
import { MarkdownPreview } from '../primitives/MarkdownPreview';
import { useUserContext } from '../../context/page-data';
import styles from './CommentTree.module.css';

export interface CommentItem {
  docId: string | number;
  owner: number;
  content: string;
  vote?: number;
  reply?: CommentItem[];
}

export interface CommentTreeProps {
  item: CommentItem;
  replies: CommentItem[];
  udict: Record<number, { _id: number, uname: string, avatar?: string }>;
  onEdit?: (item: CommentItem, content: string) => void;
  onDelete?: (item: CommentItem) => void;
  onReply?: (parent: CommentItem, content: string) => void;
  editPermCheck: (item: CommentItem) => boolean;
  deletePermCheck: (item: CommentItem) => boolean;
  editPlaceholder?: string;
  replyPlaceholder?: string;
  /** Optional user injection for testing or when user context is unavailable. */
  user?: ReturnType<typeof useUserContext>;
}

export function CommentTree({
  item, replies, udict, onEdit, onDelete, onReply,
  editPermCheck, deletePermCheck,
  editPlaceholder = '编辑…', replyPlaceholder = '回复…',
  user: userProp,
}: CommentTreeProps) {
  let userContext: ReturnType<typeof useUserContext> | undefined;
  try { userContext = useUserContext(); } catch { /* no provider */ }
  const user = userProp ?? userContext;
  const [editing, setEditing] = useState(false);
  const [replying, setReplying] = useState(false);
  const owner = udict[item.owner];
  const canEdit = editPermCheck(item);
  const canDelete = deletePermCheck(item);
  const canReply = !!onReply && !!user && (user._id ?? 0) > 0;
  return (
    <article className={styles.item} data-doc-id={String(item.docId)}>
      <header className={styles.head}>
        <strong>{owner?.uname ?? `uid:${item.owner}`}</strong>
        {canEdit && (
          <button type="button" className={styles.action} onClick={() => setEditing((v) => !v)}>
            {editing ? '取消' : '编辑'}
          </button>
        )}
        {canDelete && (
          <button type="button" className={styles.action} onClick={() => onDelete?.(item)}>
            删除
          </button>
        )}
      </header>
      {editing && onEdit ? (
        <MarkdownEditor
          value={item.content}
          onChange={() => { /* controlled by save button below */ }}
          placeholder={editPlaceholder}
          onSave={async (next) => { await onEdit(item, next); setEditing(false); }}
        />
      ) : (
        <div className={styles.body}>
          <MarkdownPreview source={item.content} />
        </div>
      )}
      {replies.length > 0 && (
        <ul className={styles.replies}>
          {replies.map((r) => (
            <CommentTree
              key={r.docId}
              item={r}
              replies={r.reply || []}
              udict={udict}
              onEdit={onEdit}
              onDelete={onDelete}
              onReply={onReply}
              editPermCheck={editPermCheck}
              deletePermCheck={deletePermCheck}
              editPlaceholder={editPlaceholder}
              replyPlaceholder={replyPlaceholder}
              user={user}
            />
          ))}
        </ul>
      )}
      {canReply && !replying && (
        <button type="button" className={styles.replyToggle} onClick={() => setReplying(true)}>
          回复
        </button>
      )}
      {canReply && replying && onReply && (
        <MarkdownEditor
          value=""
          onChange={() => {}}
          placeholder={replyPlaceholder}
          onSave={async (next) => { await onReply(item, next); setReplying(false); }}
        />
      )}
    </article>
  );
}
