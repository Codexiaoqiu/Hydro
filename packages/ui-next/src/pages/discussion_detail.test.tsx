/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../components/primitives/Toast';
import { type PageData, PageDataProvider } from '../context/page-data';
import { RouterProvider } from '../context/router';
import { routeMapStore } from '../globals';
import { ThemeProvider } from '../theme/ThemeProvider';
import DiscussionDetail from './discussion_detail';

// `lib/i18n.ts` currently has unresolved conflict markers in the working tree
// (pre-existing baseline acknowledged in CLAUDE.md), so mock it to avoid the
// oxc parser failing the whole transform.
vi.mock('../lib/i18n', () => ({
  useTranslate: () => (key: string) => key,
}));

function build(args: Partial<PageData['args']> = {}): PageData {
  return {
    name: 'discussion_detail',
    template: 'discussion_detail.html',
    args: {
      UserContext: { _id: 1, hasPerm: () => true, own: () => true },
      UiContext: {},
      ...args,
    } as any,
    url: '/d/1',
  };
}

function Providers({ args, children }: any) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <PageDataProvider initial={build(args)}>
          <RouterProvider>{children}</RouterProvider>
        </PageDataProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

describe('discussionDetail', () => {
  beforeEach(() => {
    routeMapStore.set({ discussion_detail: '/d/:did', discussion_node: '/discuss/:type/:name' });
  });
  afterEach(() => vi.restoreAllMocks());

  it('renders the title and content', () => {
    render(<Providers args={{
      ddoc: { docId: 1, title: 'Hello', content: '# hi', owner: 1, parentType: 1, parentId: 1, views: 0, react: {} },
      dsdoc: null, drdocs: [], page: 1, pcount: 1, drcount: 0,
      udict: { 1: { _id: 1, uname: 'a' } },
      vnode: { id: '1', title: 'Node', type: 1 },
      reactions: {},
      path: [],
    }}>
      <DiscussionDetail />
    </Providers>);
    expect(screen.getByRole('heading', { name: 'Hello' })).toBeInTheDocument();
  });

  it('renders reply comments', () => {
    render(<Providers args={{
      ddoc: { docId: 1, title: 'Hello', content: '# hi', owner: 1, parentType: 1, parentId: 1, views: 0, react: {} },
      dsdoc: null,
      drdocs: [{ docId: 'r1', owner: 2, content: 'reply1', reply: [] }],
      page: 1, pcount: 1, drcount: 1,
      udict: { 1: { _id: 1, uname: 'a' }, 2: { _id: 2, uname: 'b' } },
      vnode: { id: '1', title: 'Node', type: 1 },
      reactions: {},
      path: [],
    }}>
      <DiscussionDetail />
    </Providers>);
    expect(screen.getByText('reply1')).toBeInTheDocument();
  });
});
