/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DiscussionSidebar } from './DiscussionSidebar';

vi.mock('../link', () => ({
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

const buildHref = (name: string, p?: Record<string, unknown>) =>
  name === 'discussion_create' ? `/discuss/${p?.type}/${p?.name}/create` : '#';

describe('DiscussionSidebar', () => {
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
});
