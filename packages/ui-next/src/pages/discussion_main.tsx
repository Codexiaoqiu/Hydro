import {
  DiscussionList,
  DiscussionNodesWidget,
  DiscussionSidebar,
} from '../components/discussion';
import { Link } from '../components/link';
import { Card } from '../components/primitives/Card';
import { ProblemSidebar } from '../components/sidebar/ProblemSidebar';
import { usePageData, useUserContext } from '../context/page-data';
import { useBuildUrl } from '../hooks/use-build-url';
import { TYPE_CONTEST, TYPE_PROBLEM } from '../lib/document-types';
import { useTranslate } from '../lib/i18n';
import styles from './discussion_main.module.css';

export interface Ddoc {
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
  hidden?: boolean;
}
export interface VnodeLite {
  _id?: string;
  id?: string | number;
  title?: string;
  type?: number;
  docId?: number;
  pid?: string;
  owner?: number;
}
export interface Vnode {
  docId: string;
  title: string;
  content?: string;
  type?: number;
}
export interface Args {
  ddocs: Ddoc[];
  dpcount: number;
  udict: Record<number, { _id: number, uname: string, avatar?: string }>;
  page: number;
  vndict: Record<string, Record<string, VnodeLite>>;
  vnode: VnodeLite;
  page_name: 'discussion_main' | 'discussion_node';
  vnodes: Vnode[];
}

export default function DiscussionMain() {
  const { args } = usePageData();
  const {
    ddocs, dpcount, udict, page, vndict, vnode, page_name, vnodes,
  } = args;
  const user = useUserContext();
  const buildUrl = useBuildUrl();
  const t = useTranslate();

  const isMain = page_name === 'discussion_main' || !vnode._id;
  const title = isMain ? t('Discussion') : (vnode.title || t('Discussion'));

  // Build pagination URL using the LOGICAL route identifier for the vnode type.
  // Constants mirror `packages/hydrooj/src/model/document.ts:22-31`
  // (TYPE_PROBLEM=10, TYPE_CONTEST=30, TYPE_DISCUSSION_NODE=20).
  // - problem nodes use `docId` (numeric, also exposed as `pid`)
  // - contest nodes use `id` (an ObjectId) as a string
  // - generic nodes use `_id` / `id` as a string
  const buildPageHref = (p: number) => {
    if (isMain) return buildUrl('discussion_main', {}, { page: String(p) });
    if (vnode?.type === TYPE_PROBLEM) {
      const docId = vnode.docId ?? Number(vnode.id);
      return buildUrl(
        'discussion_node',
        { type: 'problem', name: String(docId) },
        { page: String(p) },
      );
    }
    if (vnode?.type === TYPE_CONTEST) {
      return buildUrl(
        'discussion_node',
        { type: 'contest', name: String(vnode.id ?? vnode._id) },
        { page: String(p) },
      );
    }
    return buildUrl(
      'discussion_node',
      { type: 'node', name: String(vnode._id || vnode.id) },
      { page: String(p) },
    );
  };

  // Right column: pick sidebar by vnode.type (literal integers — see handler/discussion.ts typeMapper).
  let sidebar: React.ReactNode;
  if (!isMain && vnode?.type === TYPE_PROBLEM) {
    const docId = vnode.docId ?? Number(vnode.id);
    const pid = vnode.pid ?? String(vnode.id);
    sidebar = (
      <ProblemSidebar
        context={{
          pdoc: {
            docId,
            pid,
            title: vnode.title || '',
            owner: vnode.owner || 0,
          },
          UserContext: user as any,
          buildUrl,
          discussionCount: dpcount,
          solutionCount: 0,
          tdoc: undefined,
        }}
        mode="normal"
      />
    );
  } else if (!isMain && vnode?.type === TYPE_CONTEST) {
    // Contest-node pages need a minimal contextual sidebar. The shared
    // `DiscussionSidebar` only handles generic nodes; render a custom
    // Card mirroring its shape so contest discussions still surface a
    // "create" entry point that links to `discussion_create`.
    const createHref = buildUrl('discussion_create', {
      type: 'contest',
      name: String(vnode.id ?? vnode._id),
    });
    sidebar = (
      <Card>
        <h3 className={styles.sideTitle}>{vnode.title || t('Discussion')}</h3>
        {/*
          I2 fix: the previous `<Link to="discussion_detail">` resolved to `#`
          because no `did` param was supplied. The minimal contest sidebar has
          no per-discussion anchor to point at without a `did`, so we omit it
          and only surface the create entry point.
        */}
        <Link href={createHref} className={styles.createBtn}>
          {t('CreateDiscussion')}
        </Link>
      </Card>
    );
  } else {
    // Generic / empty (discussion_main) — handled by DiscussionSidebar.
    sidebar = (
      <DiscussionSidebar
        vnode={vnode as any}
        udict={udict}
        user={user as any}
        buildHref={(name, params, search) => buildUrl(name, params as any, search as any)}
      />
    );
  }

  // Header actions + breadcrumb. The create entry point is always surfaced;
  // its target reflects whichever vnode we're rendering for.
  const createHref = (() => {
    if (isMain) return buildUrl('discussion_main');
    if (vnode?.type === TYPE_PROBLEM) {
      const docId = vnode.docId ?? Number(vnode.id);
      return buildUrl('discussion_create', { type: 'problem', name: String(docId) });
    }
    if (vnode?.type === TYPE_CONTEST) {
      return buildUrl('discussion_create', {
        type: 'contest',
        name: String(vnode.id ?? vnode._id),
      });
    }
    return buildUrl('discussion_create', {
      type: 'node',
      name: String(vnode._id || vnode.id),
    });
  })();

  const showBreadcrumb = !isMain;
  const headerCreateEnabled = Boolean(user?._id);

  return (
    <div className={styles.layout}>
      <main className={styles.main}>
        <header className={styles.head}>
          <div className={styles.headRow}>
            <div>
              {showBreadcrumb && (
                <nav className={styles.crumbs} aria-label="breadcrumb">
                  <ol className={styles.crumbList}>
                    <li>
                      <Link to="homepage">{t('Home')}</Link>
                    </li>
                    <li>
                      <Link to="discussion_main">{t('Discussion')}</Link>
                    </li>
                    <li aria-current="page">{vnode.title || t('Discussion')}</li>
                  </ol>
                </nav>
              )}
              <h1>{title}</h1>
            </div>
            {!isMain && headerCreateEnabled && (
              <Link href={createHref} className={styles.headCreate}>
                {t('CreateDiscussion')}
              </Link>
            )}
            {!isMain && !headerCreateEnabled && (
              <Link
                to="user_login"
                searchParams={{ redirect: typeof window !== 'undefined' ? window.location.pathname : '/' }}
                className={styles.headCreate}
              >
                {t('LoginToCreateDiscussion')}
              </Link>
            )}
          </div>
        </header>
        <DiscussionList
          ddocs={ddocs as any}
          vndict={vndict as any}
          udict={udict}
          page={page}
          dpcount={dpcount}
          buildHref={(name, params, search) => buildUrl(name, params as any, search as any)}
          buildPageHref={buildPageHref}
        />
        {isMain && ddocs.length === 0 && vnodes[0] && (
          <p className={styles.emptyCreate}>
            <Link
              to="discussion_create"
              params={{ type: 'node', name: String(vnodes[0].docId) }}
              className={styles.createBtn}
            >
              {t('CreateDiscussion')}
            </Link>
          </p>
        )}
      </main>
      <aside className={styles.side}>
        {sidebar}
        <DiscussionNodesWidget
          vnodes={vnodes}
          buildHref={(name, params, search) => buildUrl(name, params as any, search as any)}
        />
      </aside>
    </div>
  );
}
