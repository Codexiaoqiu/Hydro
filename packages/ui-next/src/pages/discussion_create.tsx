import { DiscussionForm } from '../components/discussion/DiscussionForm';
import { Card } from '../components/primitives/Card';
import { usePageData } from '../context/page-data';
import { useBuildUrl } from '../hooks/use-build-url';
import { useTranslate } from '../lib/i18n';
import styles from './discussion_create.module.css';

interface VnodeLite {
  _id?: string;
  id?: string | number;
  title?: string;
  type?: number;
  docId?: number | string;
}
interface Args {
  path: Array<[string, string, Record<string, unknown>?, boolean?]>;
  vnode: VnodeLite;
}

const TYPE_PROBLEM = 1;
const TYPE_CONTEST = 2;

export default function DiscussionCreate() {
  const { args } = usePageData() as unknown as { args: Args };
  const { vnode } = args;
  const buildUrl = useBuildUrl();
  const t = useTranslate();

  // Derive the target route params from the vnode — matches the backend
  // DiscussionCreateHandler registered on `/discuss/:type/:name/create`
  // (packages/hydrooj/src/handler/discussion.ts:434).
  // - problem nodes (TYPE_PROBLEM = 1): name is the numeric docId
  // - contest nodes (TYPE_CONTEST = 2): name is the stringified ObjectId
  // - generic / discussion nodes (TYPE_DISCUSSION_NODE = 4 etc.): name is _id/id
  let createType: string;
  let createName: string;
  if (vnode?.type === TYPE_PROBLEM) {
    const docId = vnode.docId ?? Number(vnode.id);
    createType = 'problem';
    createName = String(docId);
  } else if (vnode?.type === TYPE_CONTEST) {
    createType = 'contest';
    createName = String(vnode.id ?? vnode._id ?? '');
  } else {
    createType = 'node';
    createName = String(vnode?._id || vnode?.id || '');
  }

  const submit = async ({
    title, content, highlight, pin,
  }: { title: string, content: string, highlight: boolean, pin: boolean }) => {
    const form = document.createElement('form');
    form.method = 'post';
    form.action = buildUrl('discussion_create', { type: createType, name: createName });
    const append = (name: string, value: string | boolean) => {
      const i = document.createElement('input');
      i.type = 'hidden';
      i.name = name;
      i.value = String(value);
      form.appendChild(i);
    };
    append('title', title);
    append('content', content);
    if (highlight) append('highlight', 'on');
    if (pin) append('pin', 'on');
    document.body.appendChild(form);
    form.submit();
  };

  return (
    <div className={styles.layout}>
      <main className={styles.main}>
        <header className={styles.head}>
          <h1>{t('Create Discussion in {0}', { 0: vnode.title || '' })}</h1>
        </header>
        <DiscussionForm
          showHighlightPin={true}
          onSubmit={submit}
          submitText="发布 (Ctrl+Enter)"
        />
      </main>
      <aside className={styles.side}>
        <Card variant="side">
          <p>支持 Markdown 语法。(Ctrl+Enter 提交)</p>
        </Card>
      </aside>
    </div>
  );
}
