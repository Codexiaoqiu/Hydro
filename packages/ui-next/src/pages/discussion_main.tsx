import {
    DiscussionList,
    DiscussionNodesWidget,
    DiscussionSidebar,
} from '../components/discussion';
import { ProblemSidebar } from '../components/sidebar/ProblemSidebar';
import { usePageData, useUserContext } from '../context/page-data';
import { useBuildUrl } from '../hooks/use-build-url';
import { useTranslate } from '../lib/i18n';
import styles from './discussion_main.module.css';

interface Ddoc {
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
interface VnodeLite {
    _id?: string;
    id?: string;
    title?: string;
    type?: number;
    docId?: string;
    owner?: number;
}
interface Vnode {
    docId: string;
    title: string;
    content?: string;
    type?: number;
}
interface Args {
    ddocs: Ddoc[];
    dpcount: number;
    udict: Record<number, { _id: number; uname: string; avatar?: string }>;
    page: number;
    vndict: Record<string, Record<string, VnodeLite>>;
    vnode: VnodeLite;
    page_name: 'discussion_main' | 'discussion_node';
    vnodes: Vnode[];
}

const TYPE_PROBLEM = 1;
const TYPE_CONTEST = 2;

export default function DiscussionMain() {
    const { args } = usePageData() as unknown as { args: Args };
    const {
        ddocs, dpcount, udict, page, vndict, vnode, page_name, vnodes,
    } = args;
    const user = useUserContext();
    const buildUrl = useBuildUrl();
    const t = useTranslate();

    const isMain = page_name === 'discussion_main' || !vnode._id;
    const title = isMain ? t('Discussion') : (vnode.title || t('Discussion'));
    const buildPageHref = (p: number) => (isMain
        ? buildUrl('discussion_main', {}, { page: String(p) })
        : buildUrl('discussion_node', { type: 'node', name: String(vnode._id || vnode.id) }, { page: String(p) }));

    // Right column: pick sidebar by vnode.type (literal integers — see handler/discussion.ts typeMapper).
    let sidebar: React.ReactNode;
    if (!isMain && vnode?.type === TYPE_PROBLEM) {
        sidebar = (
            <ProblemSidebar
                context={{
                    pdoc: {
                        docId: Number(vnode._id),
                        pid: String(vnode._id),
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
    } else {
        // Generic / contest branches: DiscussionSidebar handles the empty-vnode
        // (discussion_main) and non-problem/contest nodes. Contest-node parity
        // with ContestDetailSidebar is out of scope for this task.
        sidebar = (
            <DiscussionSidebar
                vnode={vnode as any}
                udict={udict}
                user={user as any}
                buildHref={(name, params) => buildUrl(name, params as any)}
            />
        );
    }

    return (
        <div className={styles.layout}>
            <main className={styles.main}>
                <header className={styles.head}>
                    <h1>{title}</h1>
                </header>
                <DiscussionList
                    ddocs={ddocs as any}
                    vndict={vndict as any}
                    udict={udict}
                    page={page}
                    dpcount={dpcount}
                    buildHref={(name, params) => buildUrl(name, params as any)}
                    buildPageHref={buildPageHref}
                />
            </main>
            <aside className={styles.side}>
                {sidebar}
                <DiscussionNodesWidget
                    vnodes={vnodes}
                    buildHref={(name, params) => buildUrl(name, params as any)}
                />
            </aside>
        </div>
    );
}
