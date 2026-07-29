/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DiscussionList } from './DiscussionList';

vi.mock('../link', () => ({
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

const buildHref = (name: string, p?: Record<string, unknown>) =>
  name === 'discussion_detail' ? `/d/${p?.did}` : name === 'discussion_node' ? `/discuss/${p?.type}/${p?.name}` : '#';

describe('DiscussionList', () => {
  it('renders empty state when ddocs is empty', () => {
    render(<DiscussionList ddocs={[]} vndict={{}} udict={{}} page={1} dpcount={1} buildHref={buildHref} />);
    expect(screen.getByText(/暂无讨论/)).toBeInTheDocument();
  });

  it('renders one DiscussionListItem per ddoc', () => {
    const ddocs = [
      { _id: 'a', docId: '1', title: 'first', nReply: 3, views: 10, owner: 1, parentType: 4, parentId: 'p1', updateAt: 0 },
      { _id: 'b', docId: '2', title: 'second', nReply: 0, views: 0, owner: 2, parentType: 4, parentId: 'p1', updateAt: 0 },
    ];
    render(<DiscussionList ddocs={ddocs as any} vndict={{}} udict={{
      1: { _id: 1, uname: 'alice' },
      2: { _id: 2, uname: 'bob' },
    }} page={1} dpcount={1} buildHref={buildHref} />);
    expect(screen.getByText('first')).toBeInTheDocument();
    expect(screen.getByText('second')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('marks highlight ddocs with data-highlight="true"', () => {
    const ddocs = [
      { _id: 'a', docId: '1', title: 'hl', nReply: 0, views: 0, owner: 1, parentType: 4, parentId: 'p1', updateAt: 0, highlight: true },
    ];
    const { container } = render(<DiscussionList ddocs={ddocs as any} vndict={{}} udict={{ 1: { _id: 1, uname: 'a' } }} page={1} dpcount={1} buildHref={buildHref} />);
    expect(container.querySelector('[data-highlight="true"]')).not.toBeNull();
  });

  it('shows Hidden tag when ddoc.hidden', () => {
    const ddocs = [
      { _id: 'a', docId: '1', title: 'hid', nReply: 0, views: 0, owner: 1, parentType: 4, parentId: 'p1', updateAt: 0, hidden: true },
    ];
    render(<DiscussionList ddocs={ddocs as any} vndict={{}} udict={{ 1: { _id: 1, uname: 'a' } }} page={1} dpcount={1} buildHref={buildHref} />);
    expect(screen.getByText(/Hidden/)).toBeInTheDocument();
  });
});
