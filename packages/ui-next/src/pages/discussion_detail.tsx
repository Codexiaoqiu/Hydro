/* eslint-disable max-len */
import { CommentsSection } from '../components/comments/CommentsSection';
import { Link } from '../components/link';
import { MarkdownPreview } from '../components/primitives/MarkdownPreview';
import { Paginator } from '../components/primitives/Paginator';
import { UserStat } from '../components/profile/UserStat';
import { usePageData } from '../context/page-data';
import { useBuildUrl } from '../hooks/use-build-url';
import { useTranslate } from '../lib/i18n';
import styles from './discussion_detail.module.css';

export interface Ddoc { docId: number, title: string, content: string, owner: number, parentType: number, parentId: number, react?: Record<string, number>, views: number, lock?: boolean, edited?: boolean }
export interface Args {
  ddoc: Ddoc;
  dsdoc: { react?: Record<string, number>, view?: boolean, star?: boolean } | null;
  drdocs: Array<{ docId: string, owner: number, content: string, reply?: any[] }>;
  page: number;
  pcount: number;
  drcount: number;
  udict: Record<number, { _id: number, uname: string, avatar?: string }>;
  vnode: { id: string, title: string, type: number, owner?: number };
  reactions: Record<string, Record<string, number>>;
  path: Array<Array<string | null>>;
}

export default function DiscussionDetail() {
  const { args } = usePageData();
  const { ddoc, dsdoc, drdocs, page, pcount, udict, vnode } = args;
  const buildUrl = useBuildUrl();
  const t = useTranslate();

  const onReply = (content: string) => {
    const form = document.createElement('form');
    form.method = 'post';
    form.action = buildUrl('discussion_detail', { did: String(ddoc.docId) });
    const op = document.createElement('input');
    op.type = 'hidden';
    op.name = 'operation';
    op.value = 'reply';
    form.appendChild(op);
    const c = document.createElement('input');
    c.type = 'hidden';
    c.name = 'content';
    c.value = content;
    form.appendChild(c);
    document.body.appendChild(form);
    form.submit();
  };

  return (
    <div className={styles.layout}>
      <main className={styles.main}>
        <article className={styles.topic}>
          <ul className={styles.crumbs}>
            <li>
              <Link href={buildUrl('discussion_node', { type: 'problem', name: String(ddoc.parentId) })}>
                {vnode.title}
              </Link>
            </li>
            <li><h1>{ddoc.title}</h1></li>
            <li>{udict[ddoc.owner]?.uname} · {t('PostedAt')}</li>
          </ul>
          <div className={styles.content}>
            <MarkdownPreview source={ddoc.content} />
          </div>
        </article>
        <header className={styles.head}>
          <h2>{t('Comments')} ({args.drcount})</h2>
        </header>
        <CommentsSection
          docs={drdocs as any}
          udict={udict}
          kind="discussion"
          config={{
            postOp: 'reply',
            editOp: 'edit_reply',
            deleteOp: 'delete_reply',
            postPerm: 1, // PERM_REPLY_DISCUSSION
            editSelfPerm: 1, // PERM_EDIT_DISCUSSION_REPLY_SELF
            editPerm: 1, // PERM_EDIT_DISCUSSION_REPLY
            commentRef: 'drid',
            replyRef: 'drrid',
          }}
          onSubmit={onReply}
        />
        <Paginator
          current={page}
          total={pcount}
          buildHref={(p) => buildUrl('discussion_detail', { did: String(ddoc.docId) }, { page: String(p) })}
        />
      </main>
      <aside className={styles.side}>
        <section className={styles.authorCard}>
          <h3>{udict[ddoc.owner]?.uname}</h3>
          <UserStat
            submitted={0}
            accepted={0}
            liked={dsdoc?.react ? Object.values(dsdoc.react).reduce((a, b) => a + b, 0) : 0}
            labels={{ submitted: '', accepted: '通过', liked: '获赞' }}
          />
        </section>
      </aside>
    </div>
  );
}
