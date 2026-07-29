/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DiscussionNodesWidget } from './DiscussionNodesWidget';

vi.mock('../link', () => ({
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

const buildHref = (name: string, p?: Record<string, unknown>) =>
  name === 'discussion_node' ? `/discuss/${p?.type}/${p?.name}` : '#';

describe('DiscussionNodesWidget', () => {
  it('groups nodes by content and renders one link per node', () => {
    const vnodes = [
      { docId: '1', title: 'General A', content: 'General' },
      { docId: '2', title: 'General B', content: 'General' },
      { docId: '3', title: 'Help C', content: 'Help' },
    ];
    render(<DiscussionNodesWidget vnodes={vnodes as any} buildHref={buildHref} />);
    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('Help')).toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(3);
  });

  it('renders empty state when vnodes is empty', () => {
    render(<DiscussionNodesWidget vnodes={[]} buildHref={buildHref} />);
    expect(screen.getByText(/暂无节点/)).toBeInTheDocument();
  });

  it('links each node to discussion_node', () => {
    const vnodes = [
      { docId: '42', title: 'Node X', content: 'Cat' },
    ];
    render(<DiscussionNodesWidget vnodes={vnodes as any} buildHref={buildHref} />);
    const link = screen.getByText('42');
    expect(link.getAttribute('href')).toBe('/discuss/node/42');
  });
});