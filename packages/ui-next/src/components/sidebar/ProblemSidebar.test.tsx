/* @vitest-environment happy-dom */
import { describe, expect, it } from 'vitest';
import {
  getTidQuery,
  pickSidebarItems,
  type ProblemSidebarContext,
} from './problem-sidebar-items';

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
