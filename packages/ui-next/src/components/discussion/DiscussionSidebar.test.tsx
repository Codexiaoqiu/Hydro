/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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
