/* @vitest-environment happy-dom */
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { type PageData, PageDataProvider } from '../../context/page-data';
import { CommentsSection } from './CommentsSection';

const baseUdict = {
  1: { _id: 1, uname: 'alice', avatar: '' },
  2: { _id: 2, uname: 'bob', avatar: '' },
};

function buildPageData(user: PageData['args']['UserContext']): PageData {
  return {
    name: 'comments-test',
    template: 'comments.html',
    args: {
      UserContext: user,
      UiContext: {},
    },
    url: '/',
  };
}

function wrap(ui: ReactNode, user: PageData['args']['UserContext']) {
  return render(<PageDataProvider initial={buildPageData(user)}>{ui}</PageDataProvider>);
}

describe('CommentsSection', () => {
  it('renders nothing when docs is empty', () => {
    wrap(
      <CommentsSection
        docs={[]}
        udict={baseUdict}
        kind="solution"
        config={{ postOp: 'submit', editOp: 'edit_solution', deleteOp: 'delete_solution', postPerm: 1, editSelfPerm: 1, commentRef: 'psid', replyRef: 'psrid' }}
      />,
      { _id: 1, hasPerm: () => true },
    );
    expect(screen.getByText(/暂无题解/)).toBeInTheDocument();
  });

  it('renders one CommentTree per doc', () => {
    const docs = [
      { docId: 'a', owner: 1, content: 'first solution', reply: [] },
      { docId: 'b', owner: 2, content: 'second solution', reply: [] },
    ];
    wrap(
      <CommentsSection
        docs={docs as any}
        udict={baseUdict}
        kind="solution"
        config={{ postOp: 'submit', editOp: 'edit_solution', deleteOp: 'delete_solution', postPerm: 1, editSelfPerm: 1, commentRef: 'psid', replyRef: 'psrid' }}
      />,
      { _id: 1, hasPerm: () => true },
    );
    expect(screen.getByText('first solution')).toBeInTheDocument();
    expect(screen.getByText('second solution')).toBeInTheDocument();
  });

  it('hides editor when user lacks postPerm', () => {
    wrap(
      <CommentsSection
        docs={[]}
        udict={baseUdict}
        kind="discussion"
        config={{ postOp: 'reply', editOp: 'edit_reply', deleteOp: 'delete_reply', postPerm: 99, editSelfPerm: 99, commentRef: 'drid', replyRef: 'drrid' }}
      />,
      { _id: 1, hasPerm: (p: number) => p !== 99 },
    );
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('calls onSubmit with markdown content when editor submitted', () => {
    const onSubmit = vi.fn();
    wrap(
      <CommentsSection
        docs={[]}
        udict={baseUdict}
        kind="solution"
        config={{ postOp: 'submit', editOp: 'edit_solution', deleteOp: 'delete_solution', postPerm: 1, editSelfPerm: 1, commentRef: 'psid', replyRef: 'psrid' }}
        onSubmit={onSubmit}
      />,
      { _id: 1, hasPerm: () => true },
    );
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'my solution' } });
    fireEvent.click(screen.getByRole('button', { name: /发布/ }));
    expect(onSubmit).toHaveBeenCalledWith('my solution');
  });
});