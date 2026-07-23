/* @vitest-environment happy-dom */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ContestClarificationList } from './ContestClarificationList';

const items = [{
  // Contestant-authored, no reply yet → Reply button visible.
  _id: '507f1f77bcf86cd799439011', subject: 0, owner: 1, content: 'Question?',
}, {
  // Jury broadcast (owner === 0): no reply button, bold "Jury" label.
  _id: '507f1f77bcf86cd799439022', subject: 0, owner: 0, content: 'Broadcast message',
}];
const pids = [1, 2];
const pdict = {
  1: { docId: 1, title: 'Two Sum' },
  2: { docId: 2, title: 'Add' },
};
const udict = { 1: { _id: 1, uname: 'alice' }, 2: { _id: 2, uname: 'jury' } };

describe('ContestClarificationList', () => {
  it('renders content (no reply)', () => {
    render(<ContestClarificationList items={items as any} pids={pids} pdict={pdict as any} udict={udict as any} onReply={() => {}} />);
    expect(screen.getByText('Question?')).toBeInTheDocument();
    expect(screen.getByText('Broadcast message')).toBeInTheDocument();
  });
  it('Reply button invokes onReply with did', () => {
    const onReply = vi.fn();
    render(<ContestClarificationList items={items as any} pids={pids} pdict={pdict as any} udict={udict as any} onReply={onReply} />);
    // Only the contestant-authored item has a Reply button — the broadcast has
    // owner === 0 and no reply button, and the first item has a reply but
    // exposes the Reply button since it has owner !== 0.
    const first = screen.getByTestId('clar-item-507f1f77bcf86cd799439011');
    const replyButton = within(first).getByTestId('reply-button');
    fireEvent.click(replyButton);
    expect(onReply).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
  });
  it('hides Reply button on jury broadcast (owner === 0)', () => {
    const onlyBroadcast = [{ _id: '507f1f77bcf86cd799439033', subject: 0, owner: 0, content: 'Broadcast' }];
    render(<ContestClarificationList items={onlyBroadcast as any} pids={pids} pdict={pdict as any} udict={udict as any} onReply={() => {}} />);
    const item = screen.getByTestId('clar-item-507f1f77bcf86cd799439033');
    expect(within(item).queryByTestId('reply-button')).toBeNull();
  });
  it('hides Reply button on viewer-owned items (owner === currentUid)', () => {
    const ownItem = [{ _id: '507f1f77bcf86cd799439088', subject: 0, owner: 5, content: 'My own question' }];
    render(
      <ContestClarificationList
        items={ownItem as any}
        pids={pids}
        pdict={pdict as any}
        udict={{ ...udict, '5': { _id: 5, uname: 'me' } } as any}
        onReply={() => {}}
        currentUid={5}
      />,
    );
    const item = screen.getByTestId('clar-item-507f1f77bcf86cd799439088');
    expect(within(item).queryByTestId('reply-button')).toBeNull();
  });
  it('shows Reply button when owner !== currentUid (other contestant)', () => {
    const otherItem = [{ _id: '507f1f77bcf86cd799439099', subject: 0, owner: 7, content: 'Other question' }];
    render(
      <ContestClarificationList
        items={otherItem as any}
        pids={pids}
        pdict={pdict as any}
        udict={{ ...udict, '7': { _id: 7, uname: 'bob' } } as any}
        onReply={() => {}}
        currentUid={5}
      />,
    );
    const item = screen.getByTestId('clar-item-507f1f77bcf86cd799439099');
    expect(within(item).getByTestId('reply-button')).toBeInTheDocument();
  });
  it('renders bold Jury label for owner === 0', () => {
    const onlyBroadcast = [{ _id: '507f1f77bcf86cd799439044', subject: 0, owner: 0, content: 'Broadcast' }];
    render(<ContestClarificationList items={onlyBroadcast as any} pids={pids} pdict={pdict as any} udict={udict as any} onReply={() => {}} />);
    const item = screen.getByTestId('clar-item-507f1f77bcf86cd799439044');
    const jury = within(item).getByTestId('jury-badge');
    expect(jury.tagName).toBe('B');
  });
  it('does not render Jury label for non-broadcast owner even when udict misses', () => {
    // owner 5 with no udict entry should still render "#5", never "(Jury)".
    const missing = [{ _id: '507f1f77bcf86cd799439111', subject: 0, owner: 5, content: 'orphan' }];
    render(<ContestClarificationList items={missing as any} pids={pids} pdict={pdict as any} udict={udict as any} onReply={() => {}} />);
    const item = screen.getByTestId('clar-item-507f1f77bcf86cd799439111');
    expect(within(item).queryByTestId('jury-badge')).toBeNull();
    expect(item.textContent).toContain('#5');
    expect(item.textContent).not.toMatch(/jury/i);
  });
  it('renders timestamp for each item', () => {
    render(<ContestClarificationList items={items as any} pids={pids} pdict={pdict as any} udict={udict as any} onReply={() => {}} />);
    // 507f1f77 -> 2012-10-17 UTC, rendered as 2012/10/18 in zh-CN.
    const first = screen.getByTestId('clar-item-507f1f77bcf86cd799439011');
    expect(within(first).getByTestId('clar-timestamp').textContent).toMatch(/2012/);
  });
  it('renders problem subject as "A. <title>"', () => {
    const problemItem = [{ _id: '507f1f77bcf86cd799439055', subject: 1, owner: 1, content: 'About problem A' }];
    render(<ContestClarificationList items={problemItem as any} pids={pids} pdict={pdict as any} udict={udict as any} onReply={() => {}} />);
    const item = screen.getByTestId('clar-item-507f1f77bcf86cd799439055');
    expect(within(item).getByText('A. Two Sum')).toBeInTheDocument();
  });
  it('renders General Issue label for subject === 0', () => {
    const generalItem = [{ _id: '507f1f77bcf86cd799439066', subject: 0, owner: 1, content: 'Q content' }];
    render(<ContestClarificationList items={generalItem as any} pids={pids} pdict={pdict as any} udict={udict as any} onReply={() => {}} />);
    const item = screen.getByTestId('clar-item-507f1f77bcf86cd799439066');
    // The subject chip uses the i18n label; scope to the .subject span so
    // the markdown preview doesn't double-match.
    const subject = item.querySelector(`.${'subject'}` as any);
    expect(subject?.textContent).toMatch(/公告|general/i);
  });
  it('renders Technical Issue label for subject === -1', () => {
    const techItem = [{ _id: '507f1f77bcf86cd799439077', subject: -1, owner: 1, content: 'Tech content' }];
    render(<ContestClarificationList items={techItem as any} pids={pids} pdict={pdict as any} udict={udict as any} onReply={() => {}} />);
    const item = screen.getByTestId('clar-item-507f1f77bcf86cd799439077');
    const subject = item.querySelector(`.${'subject'}` as any);
    expect(subject?.textContent).toMatch(/技术答疑|technical/i);
  });
});
