/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../components/primitives/Toast';
import { type PageData, PageDataProvider } from '../context/page-data';
import { RouterProvider } from '../context/router';
import { routeMapStore } from '../globals';
import { ThemeProvider } from '../theme/ThemeProvider';
import DiscussionMain from './discussion_main';

// `lib/i18n.ts` has unresolved conflict markers in this working tree
// (pre-existing baseline acknowledged in CLAUDE.md), so mock it.
vi.mock('../lib/i18n', () => ({
  useTranslate: () => (key: string) => key,
}));

function build(name: 'discussion_main' | 'discussion_node', args: any): PageData {
  return {
    name,
    template: 'discussion_main_or_node.html',
    args: {
      UserContext: { _id: 1, hasPerm: () => true, hasPriv: () => true },
      UiContext: {},
      ...args,
    } as any,
    url: '/discuss',
  };
}
function Providers({ name, args, children }: any) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <PageDataProvider initial={build(name, args)}>
          <RouterProvider>{children}</RouterProvider>
        </PageDataProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

const baseRouteMap = {
  homepage: '/',
  discussion_main: '/discuss',
  discussion_node: '/discuss/:type/:name',
  discussion_detail: '/d/:did',
  discussion_create: '/discuss/:type/:name/create',
  user_login: '/login',
} as const;

describe('discussionMain', () => {
  beforeEach(() => {
    routeMapStore.set(baseRouteMap as any);
  });
  afterEach(() => vi.restoreAllMocks());

  it('renders empty state when ddocs is empty (main)', () => {
    render(
      <Providers name="discussion_main" args={{
        page_name: 'discussion_main',
        ddocs: [], dpcount: 1, page: 1, udict: {}, vndict: {}, vnode: {}, vnodes: [],
      }}
      >
        <DiscussionMain />
      </Providers>,
    );
    expect(screen.getByText(/暂无讨论/)).toBeInTheDocument();
  });

  it('renders list items and node sidebar when vnode present (node)', () => {
    render(
      <Providers name="discussion_node" args={{
        page_name: 'discussion_node',
        ddocs: [
          { _id: '1', docId: '1', title: 'topic', nReply: 1, views: 5, owner: 1, parentType: 4, parentId: 'n1', updateAt: 0 },
        ],
        dpcount: 1, page: 1, udict: { 1: { _id: 1, uname: 'a' } },
        vndict: { '4': { n1: { title: 'Help', type: 4 } } },
        vnode: { _id: 'n1', title: 'Help', type: 4 },
        vnodes: [{ docId: 'n1', title: 'Help', content: 'Help' }],
      }}
      >
        <DiscussionMain />
      </Providers>,
    );
    expect(screen.getByText('topic')).toBeInTheDocument();
    expect(screen.getAllByText('Help').length).toBeGreaterThan(0);
  });

  it('renders discussion_nodes widget for main', () => {
    render(
      <Providers name="discussion_main" args={{
        page_name: 'discussion_main',
        ddocs: [], dpcount: 1, page: 1, udict: {}, vndict: {}, vnode: {}, vnodes: [
          { docId: 'n1', title: 'Help', content: 'Help' },
          { docId: 'n2', title: 'General', content: 'General' },
        ],
      }}
      >
        <DiscussionMain />
      </Providers>,
    );
    expect(screen.getByText('Help')).toBeInTheDocument();
    expect(screen.getByText('General')).toBeInTheDocument();
  });

  it('renders ProblemSidebar for problem-node pages and pagination uses logical docId', () => {
    // Problem nodes: vnode.id is the numeric docId; _id is the Mongo ObjectId.
    // Pagination must use `discuss/problem/<docId>`, not /discuss/node/<mongoId>.
    routeMapStore.set({
      ...baseRouteMap,
      problem_detail: '/p/:pid',
      problem_submit: '/p/:pid/submit',
      problem_edit: '/p/:pid/edit',
      problem_files: '/p/:pid/files',
      problem_config: '/p/:pid/config',
      problem_statistics: '/p/:pid/statistics',
    } as any);
    render(
      <Providers name="discussion_node" args={{
        page_name: 'discussion_node',
        ddocs: [
          { _id: 'a', docId: 'a', title: 'topic-A', nReply: 0, views: 0, owner: 1, parentType: 1, parentId: 42, updateAt: 0 },
        ],
        dpcount: 3, page: 1, udict: { 1: { _id: 1, uname: 'a' } },
        vndict: { '1': { '42': { title: 'P-42', type: 1, docId: 42 } } },
        vnode: { _id: 'mongoobjid42', id: 42, docId: 42, pid: 'P42', title: 'P-42', type: 1 },
        vnodes: [],
      }}
      >
        <DiscussionMain />
      </Providers>,
    );
    // ProblemSidebar is rendered in the right aside. The mocked i18n returns
    // the key, so we can probe for a key unique to ProblemSidebar — its menu
    // labels (Problem.Files / Statistics / OpenScratchpad). The paginator's
    // first anchor encodes the page-1 URL.
    expect(screen.getAllByText('Problem.Files').length).toBeGreaterThan(0);
    const anchors = document.querySelectorAll('a');
    const pageLinks = Array.from(anchors).filter(
      (a) => (a.getAttribute('href') || '').startsWith('/discuss/problem/42'),
    );
    expect(pageLinks.length).toBeGreaterThan(0);
  });

  it('renders a (non-null) sidebar for contest-node pages', () => {
    // I3 fix: contest-node branch should render a sidebar, not the generic
    // DiscussionSidebar (which returns null for TYPE_CONTEST).
    render(
      <Providers name="discussion_node" args={{
        page_name: 'discussion_node',
        ddocs: [
          { _id: 'c', docId: 'c', title: 'topic-C', nReply: 0, views: 0, owner: 1, parentType: 2, parentId: '64f0d4a5b1c2d3e4f5a6b7c9', updateAt: 0 },
        ],
        dpcount: 1, page: 1, udict: { 1: { _id: 1, uname: 'a' } },
        vndict: { '2': { '64f0d4a5b1c2d3e4f5a6b7c9': { title: 'Contest-X', type: 2 } } },
        vnode: { _id: '64f0d4a5b1c2d3e4f5a6b7c9', id: '64f0d4a5b1c2d3e4f5a6b7c9', title: 'Contest-X', type: 2 },
        vnodes: [],
      }}
      >
        <DiscussionMain />
      </Providers>,
    );
    // The minimal contest sidebar lives in <aside>; its "CreateDiscussion"
    // link is the unique CTA. The title "Contest-X" also appears in the
    // breadcrumb, so probe the create link specifically.
    const aside = document.querySelector('aside');
    expect(aside).toBeTruthy();
    const createLink = aside?.querySelector('a.createBtn, a[href*="/discuss/contest/"][href*="/create"]');
    expect(createLink).toBeTruthy();
  });

  it('renders a creation entry point when discussion_main is empty', () => {
    render(
      <Providers name="discussion_main" args={{
        page_name: 'discussion_main',
        ddocs: [], dpcount: 1, page: 1, udict: {}, vndict: {}, vnode: {}, vnodes: [
          { docId: 'nhelp', title: 'Help', content: 'Help' },
        ],
      }}
      >
        <DiscussionMain />
      </Providers>,
    );
    // Empty-state CTA: a CreateDiscussion link is rendered in the empty body,
    // pointing at the first available node.
    const createLink = screen.getAllByText('CreateDiscussion').find(
      (el) => el.closest('a') !== null,
    );
    expect(createLink).toBeDefined();
  });

  it('pagination link uses logical id for a problem node (not _id)', () => {
    // I1 fix: pagination URL must use discuss/problem/<docId>, not the Mongo _id.
    routeMapStore.set({
      ...baseRouteMap,
      problem_detail: '/p/:pid',
      problem_submit: '/p/:pid/submit',
      problem_edit: '/p/:pid/edit',
      problem_files: '/p/:pid/files',
      problem_config: '/p/:pid/config',
      problem_statistics: '/p/:pid/statistics',
    } as any);
    // Multiple pages so Paginator emits a `?page=` href.
    render(
      <Providers name="discussion_node" args={{
        page_name: 'discussion_node',
        ddocs: [
          { _id: 'a', docId: 'a', title: 't1', nReply: 0, views: 0, owner: 1, parentType: 1, parentId: 42, updateAt: 0 },
          { _id: 'b', docId: 'b', title: 't2', nReply: 0, views: 0, owner: 1, parentType: 1, parentId: 42, updateAt: 0 },
          { _id: 'c', docId: 'c', title: 't3', nReply: 0, views: 0, owner: 1, parentType: 1, parentId: 42, updateAt: 0 },
        ],
        dpcount: 5, page: 1, udict: { 1: { _id: 1, uname: 'a' } },
        vndict: { '1': { '42': { title: 'P-42', type: 1, docId: 42 } } },
        vnode: { _id: 'mongoobjid42', id: 42, docId: 42, pid: 'P42', title: 'P-42', type: 1 },
        vnodes: [],
      }}
      >
        <DiscussionMain />
      </Providers>,
    );
    // Paginator renders an anchor for "next page" with the pagination URL.
    // We grab its href via DOM querySelector to assert the route shape.
    const anchors = document.querySelectorAll('a');
    const pageLink = Array.from(anchors).find(
      (a) => a.getAttribute('href')?.includes('discuss/problem/42'),
    );
    expect(pageLink).toBeTruthy();
    const allProblemLinks = Array.from(anchors).filter(
      (a) => (a.getAttribute('href') || '').includes('/discuss/'),
    );
    // The Mongo _id must NEVER be used in the pagination URL for problem nodes.
    expect(
      allProblemLinks.some((a) => a.getAttribute('href')?.includes('mongoobjid42')),
    ).toBe(false);
  });

  it('pagination link uses logical id for a generic node', () => {
    // I1 fix: generic nodes use `node/<id>` (which is _id for TYPE_DISCUSSION_NODE).
    // The link must not contain the literal field name "_id" parsed as a key.
    render(
      <Providers name="discussion_node" args={{
        page_name: 'discussion_node',
        ddocs: [
          { _id: 'g', docId: 'g', title: 'g1', nReply: 0, views: 0, owner: 1, parentType: 4, parentId: 'help', updateAt: 0 },
          { _id: 'h', docId: 'h', title: 'g2', nReply: 0, views: 0, owner: 1, parentType: 4, parentId: 'help', updateAt: 0 },
          { _id: 'i', docId: 'i', title: 'g3', nReply: 0, views: 0, owner: 1, parentType: 4, parentId: 'help', updateAt: 0 },
        ],
        dpcount: 5, page: 1, udict: { 1: { _id: 1, uname: 'a' } },
        vndict: { '4': { help: { title: 'Help', type: 4 } } },
        vnode: { _id: 'help', title: 'Help', type: 4 },
        vnodes: [],
      }}
      >
        <DiscussionMain />
      </Providers>,
    );
    const anchors = document.querySelectorAll('a');
    const pageLink = Array.from(anchors).find(
      (a) => a.getAttribute('href')?.includes('discuss/node/help'),
    );
    expect(pageLink).toBeTruthy();
  });
});
