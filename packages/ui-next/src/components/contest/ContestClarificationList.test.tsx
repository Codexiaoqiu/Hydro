/* @vitest-environment happy-dom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ContestClarificationList } from './ContestClarificationList';

const items = [{
  _id: 'CL1', subject: 0, owner: 1, content: 'Question?', reply: [{ owner: 2, content: 'Answer.' }],
}];
const pdict = {};
const udict = { 1: { _id: 1, uname: 'alice' }, 2: { _id: 2, uname: 'jury' } };

describe('ContestClarificationList', () => {
  it('renders content and reply', () => {
    render(<ContestClarificationList items={items as any} pdict={pdict as any} udict={udict as any} onReply={() => {}} />);
    expect(screen.getByText('Question?')).toBeInTheDocument();
    expect(screen.getByText('Answer.')).toBeInTheDocument();
  });
  it('Reply button invokes onReply with did', () => {
    const onReply = vi.fn();
    render(<ContestClarificationList items={items as any} pdict={pdict as any} udict={udict as any} onReply={onReply} />);
    fireEvent.click(screen.getByRole('button', { name: /reply/i }));
    expect(onReply).toHaveBeenCalledWith('CL1');
  });
});
