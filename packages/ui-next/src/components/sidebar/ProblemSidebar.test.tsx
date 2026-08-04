/* @vitest-environment happy-dom */
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  getTidQuery,
  pickSidebarItems,
  type ProblemSidebarContext,
} from './problem-sidebar-items';
import { Menu } from './Menu';

const t = (key: string) => key;
const buildUrl = (name: string, params?: Record<string, unknown>, query?: Record<string, string>) => (
  `${name}:${String(params?.pid ?? '')}:${new URLSearchParams(query).toString()}`
);
const base: ProblemSidebarContext = {
  pdoc: { docId: 3, pid: 'P1000', title: 'A+B' },
  UserContext: { _id: 2, perm: '0', priv: 0 },
  buildUrl,
  discussionCount: 4,
  solutionCount: 2,
};

describe('problemSidebar', () => {
  it('exposes a show-category menu item when categories are provided', () => {
    const showCategories = () => {};
    const items = pickSidebarItems({ ...base, categories: ['A', 'B'], showCategories }, 'normal', t);
    const show = items.find((it) => it.key === 'show-category');
    expect(show?.onClick).toBe(showCategories);
  });

  it('exposes a copy menu item when onCopy is provided', () => {
    const onCopy = () => {};
    const items = pickSidebarItems({ ...base, onCopy }, 'normal', t);
    const copy = items.find((it) => it.key === 'copy');
    expect(copy?.onClick).toBe(onCopy);
  });

  it('attaches a confirm prompt to the rejudge form menu item', () => {
    const items = pickSidebarItems(
      { ...base, UserContext: { _id: 2, perm: (1n << 13n).toString(), priv: 0 } },
      'normal',
      t,
    );
    const rejudge = items.find((it) => it.key === 'rejudge');
    expect(rejudge?.confirm).toBe('Confirm rejudge this problem?');
  });

  it('calls window.confirm before submitting a form row with a confirm message', () => {
    Object.defineProperty(window, 'confirm', { value: vi.fn(), writable: true, configurable: true });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { container } = render(
      <Menu items={[{ key: 'rejudge', title: 'Rejudge', form: true, action: '/x', postBody: { operation: 'rejudge' }, confirm: 'Are you sure?' }]} />,
    );
    fireEvent.click(container.querySelector('button[type="submit"]')!);
    expect(confirmSpy).toHaveBeenCalledWith('Are you sure?');
    confirmSpy.mockRestore();
  });

  it('prevents default when window.confirm returns false', () => {
    Object.defineProperty(window, 'confirm', { value: vi.fn(), writable: true, configurable: true });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { container } = render(
      <Menu items={[{ key: 'rejudge', title: 'Rejudge', form: true, action: '/x', postBody: { operation: 'rejudge' }, confirm: 'Are you sure?' }]} />,
    );
    const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
    container.querySelector('form')?.dispatchEvent(submitEvent);
    expect(confirmSpy).toHaveBeenCalledWith('Are you sure?');
    expect(submitEvent.defaultPrevented).toBe(true);
    confirmSpy.mockRestore();
  });
  it('builds no tid query outside a contest or homework', () => {
    expect(getTidQuery()).toEqual({});
  });

  it('keeps tid in every contest or homework problem link', () => {
    const ctx = { ...base, tdoc: { docId: '64f0d4a5b1c2d3e4f5a6b7c', rule: 'contest' } };
    expect(getTidQuery(ctx.tdoc)).toEqual({ tid: '64f0d4a5b1c2d3e4f5a6b7c' });
    expect(pickSidebarItems(ctx, 'contest', t).some((item) => item.href?.includes('tid='))).toBe(true);
  });

  it('selects the homework menu only for rule=homework', () => {
    const homework = pickSidebarItems(
      { ...base, tdoc: { docId: '64f0d4a5b1c2d3e4f5a6b7d', rule: 'homework' } },
      'view',
      t,
    );
    const contest = pickSidebarItems(
      { ...base, tdoc: { docId: '64f0d4a5b1c2d3e4f5a6b7c', rule: 'contest' } },
      'contest',
      t,
    );
    expect(homework.map((item) => item.title)).not.toEqual(contest.map((item) => item.title));
  });
});

describe('submit-action integration', () => {
  it('has no href="#" anywhere in the sidebar output', () => {
    const items = pickSidebarItems(base, 'normal', t);
    const ser = JSON.stringify(items);
    expect(ser).not.toContain('"#');
  });

  it('forbidden state produces no clickable submit item', () => {
    const items = pickSidebarItems(base, 'normal', t);
    const submit = items.find((item) => item.key === 'submit');
    expect(submit).toBeDefined();
    expect(submit?.href).toBeUndefined();
    expect(submit?.onClick).toBeUndefined();
    expect(submit?.disabled).toBe(true);
  });

  it('contest submit keeps tid query and is allowed for permitted user', () => {
    const ctx = {
      ...base,
      tdoc: { docId: '64f0d4a5b1c2d3e4f5a6b7c', rule: 'contest' },
      UserContext: { ...base.UserContext, perm: 'BigInt::512' },
    };
    const items = pickSidebarItems(ctx, 'contest', t);
    const submit = items.find((item) => item.key === 'submit');
    expect(submit?.href).toBe('/p/P1000/submit?tid=64f0d4a5b1c2d3e4f5a6b7c');
  });

  it('anonymous user is routed to /login?redirect', () => {
    const ctx = { ...base, UserContext: { ...base.UserContext, _id: 0, hasPerm: () => false, hasPriv: () => false } };
    const items = pickSidebarItems(ctx, 'normal', t);
    const submit = items.find((item) => item.key === 'submit');
    expect(submit?.href).toMatch(/^\/login\?redirect=/);
  });
});
