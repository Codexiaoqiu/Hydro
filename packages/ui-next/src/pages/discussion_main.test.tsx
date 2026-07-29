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

describe('discussionMain', () => {
  beforeEach(() => {
    routeMapStore.set({
      discussion_main: '/discuss',
      discussion_node: '/discuss/:type/:name',
      discussion_detail: '/d/:did',
      discussion_create: '/discuss/:type/:name/create',
      user_login: '/login',
    });
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
});
