import { useState } from 'react';
import { useUserContext } from '../../context/page-data';
import { MarkdownPreview } from '../primitives/MarkdownPreview';
import { CommentEditor } from './CommentEditor';
import styles from './CommentTree.module.css';

export interface CommentItem {
  docId: string | number;
  owner: number;
  content: string;
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
  submitText?: string;
}

export function CommentTree({
  item, replies, udict, onEdit, onDelete, onReply,
  editPermCheck, deletePermCheck,
  editPlaceholder = '编辑…', replyPlaceholder = '回复…',
  submitText = '保存',
}: CommentTreeProps) {
  const user = useUserContext();
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
        <CommentEditor
          placeholder={editPlaceholder}
          initialValue={item.content}
          submitText={submitText}
          onSubmit={async (next) => { await onEdit(item, next); setEditing(false); }}
          onCancel={() => setEditing(false)}
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
              submitText={submitText}
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
        <CommentEditor
          placeholder={replyPlaceholder}
          submitText="回复"
          onSubmit={async (next) => { await onReply(item, next); setReplying(false); }}
          onCancel={() => setReplying(false)}
        />
      )}
    </article>
  );
}