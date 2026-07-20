/* @vitest-environment happy-dom */
import { describe, expect, it } from 'vitest';
import {
  getTidQuery,
  pickSidebarItems,
  type ProblemSidebarContext,
} from './ProblemSidebar';

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
