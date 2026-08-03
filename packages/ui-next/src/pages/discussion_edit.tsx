import { useState } from 'react';
import { DiscussionForm } from '../components/discussion/DiscussionForm';
import { Button } from '../components/primitives/Button';
import { Card } from '../components/primitives/Card';
import { usePageData } from '../context/page-data';
import { useBuildUrl } from '../hooks/use-build-url';
import { PERM } from '../lib/perm-constants';
import styles from './discussion_edit.module.css';

export interface Ddoc {
  _id: string;
  docId: number;
  title: string;
  content: string;
  highlight?: boolean;
  pin?: boolean;
}
export interface Args {
  ddoc: Ddoc;
  UserContext?: { hasPerm?: (p: bigint) => boolean, own?: (doc: any) => boolean };
}

export default function DiscussionEdit() {
  const { args } = usePageData();
  const { ddoc } = args;
  const user = args?.UserContext;
  const buildUrl = useBuildUrl();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Mirror the server's gate in `packages/hydrooj/src/handler/discussion.ts:402-405`:
  //   own delete requires `PERM.PERM_DELETE_DISCUSSION_SELF`, admin delete
  //   requires `PERM.PERM_DELETE_DISCUSSION`. Using only the admin bit for
  //   owners hid the control for self-delete and over-granted it to admins.
  const isOwner = !!user?.own?.(ddoc);
  const canDelete = isOwner
    ? !!user?.hasPerm?.(PERM.PERM_DELETE_DISCUSSION_SELF)
    : !!user?.hasPerm?.(PERM.PERM_DELETE_DISCUSSION);

  const submitUpdate = async ({
    title, content, highlight, pin,
  }: { title: string, content: string, highlight: boolean, pin: boolean }) => {
    const form = document.createElement('form');
    form.method = 'post';
    form.action = buildUrl('discussion_edit', { did: String(ddoc.docId) });
    const append = (name: string, value: string) => {
      const i = document.createElement('input');
      i.type = 'hidden';
      i.name = name;
      i.value = value;
      form.appendChild(i);
    };
    append('operation', 'update');
    append('title', title);
    append('content', content);
    if (highlight) append('highlight', 'on');
    if (pin) append('pin', 'on');
    document.body.appendChild(form);
    form.submit();
  };

  const submitDelete = () => {
    const form = document.createElement('form');
    form.method = 'post';
    form.action = buildUrl('discussion_edit', { did: String(ddoc.docId) });
    const op = document.createElement('input');
    op.type = 'hidden';
    op.name = 'operation';
    op.value = 'delete';
    form.appendChild(op);
    document.body.appendChild(form);
    form.submit();
  };

  return (
    <div className={styles.layout}>
      <main className={styles.main}>
        <DiscussionForm
          initial={{
            title: ddoc.title,
            content: ddoc.content,
            highlight: ddoc.highlight ?? false,
            pin: ddoc.pin ?? false,
          }}
          showHighlightPin
          onSubmit={submitUpdate}
          submitText="更新 (Ctrl+Enter)"
        />
        {canDelete && (
          <div className={styles.deleteRow}>
            {!showDeleteConfirm ? (
              <Button type="button" variant="danger" onClick={() => setShowDeleteConfirm(true)}>删除</Button>
            ) : (
              <div className={styles.confirmRow}>
                <span>确认删除?</span>
                <Button type="button" variant="danger" onClick={submitDelete}>确认删除</Button>
                <Button type="button" variant="ghost" onClick={() => setShowDeleteConfirm(false)}>取消</Button>
              </div>
            )}
          </div>
        )}
      </main>
      <aside className={styles.side}>
        <Card variant="side">
          <p>支持 Markdown 语法。(Ctrl+Enter 提交)</p>
        </Card>
      </aside>
    </div>
  );
}
