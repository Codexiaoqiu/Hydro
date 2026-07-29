/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TYPE_CONTEST, TYPE_PROBLEM } from '../../lib/document-types';
import { DiscussionSidebar } from './DiscussionSidebar';

vi.mock('../link', () => ({
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

const buildHref = (
  name: string,
  p?: Record<string, unknown>,
  search?: Record<string, string>,
) => {
  if (name === 'discussion_create') return `/discuss/${p?.type}/${p?.name}/create`;
  if (name === 'user_login') {
    const qs = search?.redirect ? `?redirect=${encodeURIComponent(search.redirect)}` : '';
    return `/login${qs}`;
  }
  return '#';
};

describe('discussionSidebar', () => {
  it('renders title card for generic vnode (type not problem/contest)', () => {
    const vnode = { _id: 'n1', id: 'n1', title: 'Node X', type: 4 };
    render(<DiscussionSidebar vnode={vnode as any} udict={{}} user={null} buildHref={buildHref} />);
    expect(screen.getByRole('heading', { name: 'Node X' })).toBeInTheDocument();
  });

  it('hides Create button when vnode is empty (discussion_main)', () => {
    render(<DiscussionSidebar vnode={{} as any} udict={{}} user={null} buildHref={buildHref} />);
    expect(screen.queryByText(/Create a Discussion|发起讨论/)).toBeNull();
  });

  it('shows Create link for logged-in user on generic vnode', () => {
    const vnode = { _id: 'n1', id: 'n1', title: 'Node', type: 4 };
    const user = { _id: 1, hasPriv: () => true, hasPerm: (p: number) => p === 1 };
    render(<DiscussionSidebar vnode={vnode as any} udict={{}} user={user as any} buildHref={buildHref} />);
    expect(screen.getByText(/发起讨论|Create a Discussion/)).toBeInTheDocument();
  });

  it('returns null for vnode with TYPE_PROBLEM (canonical 10)', () => {
    // C2 fix: The primitive owns the generic-node branch only. Real problem/
    // contest vnodes are handled by the page-level caller (ProblemSidebar /
    // minimal contest card). When the type-guard matches, render nothing.
    expect(TYPE_PROBLEM).toBe(10);
    const vnode = { _id: 'n1', id: 42, docId: 42, title: 'P-42', type: TYPE_PROBLEM };
    const { container } = render(
      <DiscussionSidebar vnode={vnode as any} udict={{}} user={null} buildHref={buildHref} />,
    );
    expect(container.firstChild).toBeNull();
    expect(screen.queryByText('P-42')).toBeNull();
  });

  it('returns null for vnode with TYPE_CONTEST (canonical 30)', () => {
    // Same guarantee as above but for contests. Both branches MUST use the
    // canonical constant — a literal `1` / `2` regression would silently
    // re-render the generic card and the test would catch it.
    expect(TYPE_CONTEST).toBe(30);
    const vnode = { _id: 'cid', id: 'cid', title: 'Contest-X', type: TYPE_CONTEST };
    const { container } = render(
      <DiscussionSidebar vnode={vnode as any} udict={{}} user={null} buildHref={buildHref} />,
    );
    expect(container.firstChild).toBeNull();
    expect(screen.queryByText('Contest-X')).toBeNull();
  });

  it('LoginToCreate places redirect on the query string, not as a path param', () => {
    // I1 fix: previously `{ query: { redirect } }` was passed as `params`,
    // which path-to-regexp tried to match as a placeholder, silently
    // resolving to `#`. Now `redirect` lives in `searchParams`.
    const vnode = { _id: 'n1', id: 'n1', title: 'Node', type: 4 };
    // jsdom doesn't set window.location.pathname reliably for empty history,
    // so stub it explicitly.
    const origPath = Object.getOwnPropertyDescriptor(window.location, 'pathname');
    Object.defineProperty(window.location, 'pathname', { value: '/discuss/node/n1', configurable: true });
    try {
      const { container } = render(
        <DiscussionSidebar vnode={vnode as any} udict={{}} user={null} buildHref={buildHref} />,
      );
      const loginLink = container.querySelector('a[href*="/login"]') as HTMLAnchorElement | null;
      expect(loginLink).toBeTruthy();
      expect(loginLink!.getAttribute('href')).toMatch(/^\/login\?redirect=/);
      expect(loginLink!.getAttribute('href')).not.toBe('#');
    } finally {
      if (origPath) Object.defineProperty(window.location, 'pathname', origPath);
    }
  });
});
