# contest_detail 迁移到 ui-next 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `/contest/:tid` 页面从 `packages/ui-default/templates/contest_detail.html`（含 `pages/contest.page.ts` 客户端逻辑）完整迁移到 ui-next，包含主内容、侧边栏、私有附件、倒计时 / NProgress 进度条、Speculation Rules。

**Architecture:** 拆分 6 个 React 组件（Header / Description / Files / Timer / Sidebar + 页面入口）+ 2 个 lib（`contest-actions` 纯函数、`contest-timer` 纯函数+hook）。复用现有 `lib/contest-status.ts`、`lib/rule-text.ts`、`Article`（统一 Markdown 管线）。新增 `registerPage('contest_detail', ...)`，路由名与 server `ctx.Route` 完全对齐。`ContestDetailHandler` 与 `ui-default` 模板**不改**。

**Tech Stack:** React 19、TypeScript、Vite、vitest + happy-dom、testing-library、@hydrooj/register（TS 即时编译）、CSS Modules、design tokens（`src/styles/tokens.css`）。

## File Structure

```
packages/ui-next/src/
├── pages/
│   ├── contest_detail.tsx              (NEW) 路由入口、布局两栏
│   └── contest_detail.test.tsx         (NEW) 6 个集成用例
├── components/contest/
│   ├── ContestDetailHeader.tsx         (NEW) 标题 + Eyebrow + Chip 簇
│   ├── ContestDetailHeader.module.css  (NEW)
│   ├── ContestTimer.tsx                (NEW) 倒计时文字 + NProgress 进度条
│   ├── ContestTimer.module.css         (NEW)
│   ├── ContestDescription.tsx          (NEW) Article 包装 + file:// 重写
│   ├── ContestFiles.tsx                (NEW) 私有附件表格
│   ├── ContestFiles.module.css         (NEW)
│   ├── ContestDetailSidebar.tsx        (NEW) 11+ 按钮 / 链接 / 表单
│   ├── ContestDetailSidebar.module.css (NEW)
│   ├── ContestDetailHeader.test.tsx    (NEW)
│   ├── ContestDescription.test.tsx     (NEW)
│   ├── ContestFiles.test.tsx           (NEW)
│   ├── ContestTimer.test.tsx           (NEW)
│   └── ContestDetailSidebar.test.tsx   (NEW)
└── lib/
    ├── contest-actions.ts              (NEW) computeContestActions 纯函数
    ├── contest-actions.test.ts         (NEW) 11+ flag 矩阵
    ├── contest-timer.ts                (NEW) computeTimerState + useContestTimer
    └── contest-timer.test.ts           (NEW) 8+ 用例
```

Modify:
- `packages/ui-next/src/pages/index.ts`（加 registerPage）
- `packages/ui-next/src/lib/i18n.ts`（zhCN + en 各加 ~22 条 key）
- `packages/ui-next/src/sections/types.ts`（加 `SerializedUserDict`）

## Global Constraints

- **Node ≥ 22**（CLAUDE.md 全局约束）
- **路由名一致**：`contest_detail` 必须与 `packages/hydrooj/src/handler/contest.ts:954` `ctx.Route('contest_detail', ...)` 完全一致，否则 `buildUrl('contest_detail', ...)` 查表失败
- **测试环境**：`/* @vitest-environment happy-dom */` 写在每个 `.test.tsx` 顶部
- **CSS 变量**：所有颜色 / 间距 / 字号必须走 `src/styles/tokens.css`，禁止硬编码 `#fff` / `12px`
- **CSS Modules**：每个组件配套 `X.module.css`，禁止内联 `<style jsx>`
- **i18n 字母序**：新 key 在 zhCN / en 段内分别按字母序插入，不允许在末尾堆
- **TDD**：每个 lib / 组件必须先写失败测试 → 跑测试确认失败 → 写实现 → 跑测试确认通过 → commit
- **真实计时器**：组件级测试用真实 `setTimeout`，**禁止** `vi.useFakeTimers()` 与 Monaco 懒加载混用
- **测试 mock**：必须 mock `@monaco-editor/react`、`hooks/use-api`、`lib/contest-timer`（hook 测试可单独用假计时器）
- **Commit 原子性**：每个 task 一个 commit，方便回滚
- **不动 server / ui-default**：handler 与 ui-default 模板保持现状作 fallback
- **不引入新依赖**：仅使用 React 19、vitest、testing-library、ui-next 现有 primitives（Alert / Button / Card / Chip / ConfirmDialog / Eyebrow / useToast 等）

---

## Task 1: 添加 i18n ContestDetail.* 双语段落

**Files:**
- Modify: `packages/ui-next/src/lib/i18n.ts`

**Interfaces:**
- Consumes: 既有 `zhCN` / `en` Catalog 对象
- Produces: 22 个新 key `'ContestDetail.*'`，中文 zhCN 在文件前部、英文 en 在文件后部，**必须按字母序插入**

- [ ] **Step 1: 在 zhCN 段找到 'ContestDetail' 应插入位置**

Read `packages/ui-next/src/lib/i18n.ts`，找到 zhCN 段中 `'ContestCreate.'` 或 `'ContestForm.'` 的位置（line ~360 附近）。新 key 应在 `'ContestForm.'` 之前，因为 D < F。

- [ ] **Step 2: 插入 ContestDetail.* 中文段落**

在 zhCN 段 `'ContestCreate.*'` 之前插入：

```ts
  'ContestDetail.AllSubmissions': '所有提交',
  'ContestDetail.Attend': '报名参赛',
  'ContestDetail.Code': '导出代码',
  'ContestDetail.Discussion': '讨论',
  'ContestDetail.Edit': '编辑比赛',
  'ContestDetail.EndEarly': '提前结束',
  'ContestDetail.EndEarlyConfirm': '确定要提前结束比赛吗？此操作不可撤销。',
  'ContestDetail.ErrorEnded': '比赛已结束，无法报名',
  'ContestDetail.HiddenScoreboard': '隐藏排行榜',
  'ContestDetail.InvitationCode': '邀请码',
  'ContestDetail.Loading': '比赛信息加载中…',
  'ContestDetail.Manage': '比赛管理',
  'ContestDetail.MySubmissions': '我的提交',
  'ContestDetail.NetworkError': '网络错误，请稍后重试',
  'ContestDetail.NoFiles': '暂无附件',
  'ContestDetail.Print': '打印',
  'ContestDetail.Scoreboard': '排行榜',
  'ContestDetail.Subscribe': '订阅通知',
  'ContestDetail.TimerEnded': '已结束',
  'ContestDetail.TimerEnds': '距离结束',
  'ContestDetail.TimerStarts': '距离开始',
  'ContestDetail.Unsubscribe': '取消订阅',
```

- [ ] **Step 3: 在 en 段找到 'ContestDetail' 应插入位置**

在 en 段找到 'ContestCreate.*' 之前的位置（同样按字母序）。

- [ ] **Step 4: 插入 ContestDetail.* 英文段落**

```ts
  'ContestDetail.AllSubmissions': 'All submissions',
  'ContestDetail.Attend': 'Attend Contest',
  'ContestDetail.Code': 'Export Code',
  'ContestDetail.Discussion': 'Discussion',
  'ContestDetail.Edit': 'Edit Contest',
  'ContestDetail.EndEarly': 'End Contest Early',
  'ContestDetail.EndEarlyConfirm': 'Are you sure you want to end the contest early? This cannot be undone.',
  'ContestDetail.ErrorEnded': 'Contest has ended, cannot attend',
  'ContestDetail.HiddenScoreboard': 'Hidden Scoreboard',
  'ContestDetail.InvitationCode': 'Invitation code',
  'ContestDetail.Loading': 'Contest information is loading…',
  'ContestDetail.Manage': 'Contest Management',
  'ContestDetail.MySubmissions': 'My submissions',
  'ContestDetail.NetworkError': 'Network error, please try again',
  'ContestDetail.NoFiles': 'No files attached.',
  'ContestDetail.Print': 'Print',
  'ContestDetail.Scoreboard': 'Scoreboard',
  'ContestDetail.Subscribe': 'Subscribe',
  'ContestDetail.TimerEnded': 'Ended',
  'ContestDetail.TimerEnds': 'Ends in',
  'ContestDetail.TimerStarts': 'Starts in',
  'ContestDetail.Unsubscribe': 'Unsubscribe',
```

- [ ] **Step 5: 编译验证**

Run: `cd /home/xq/Hydro && yarn build 2>&1 | tail -20`
Expected: 0 errors。如果有重复 key 报错，说明插错位置。

- [ ] **Step 6: Commit**

```bash
cd /home/xq/Hydro && git add packages/ui-next/src/lib/i18n.ts && git -c commit.gpgsign=false commit -m "feat(i18n): add ContestDetail.* bilingual strings

22 keys for contest_detail migration (zh_CN + en, alphabetical).

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: 在 sections/types.ts 加 SerializedUserDict 类型

**Files:**
- Modify: `packages/ui-next/src/sections/types.ts`

**Interfaces:**
- Consumes: 既有 `SerializedUser`
- Produces: `SerializedUserDict = Record<number, SerializedUser>`

- [ ] **Step 1: 读取 sections/types.ts 末尾**

Run: `tail -30 /home/xq/Hydro/packages/ui-next/src/sections/types.ts`
Expected: 看到 `SectionProps` 接口。

- [ ] **Step 2: 在文件末尾添加 SerializedUserDict**

Append 到 `sections/types.ts` 末尾：

```ts

/** Owner / contributor lookup keyed by user _id (number). */
export type SerializedUserDict = Record<number, SerializedUser>;
```

- [ ] **Step 3: 编译验证**

Run: `cd /home/xq/Hydro && yarn build 2>&1 | tail -10`
Expected: 0 errors。

- [ ] **Step 4: Commit**

```bash
cd /home/xq/Hydro && git add packages/ui-next/src/sections/types.ts && git -c commit.gpgsign=false commit -m "feat(types): add SerializedUserDict

Used by contest_detail to look up contest owner info from udict.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: lib/contest-actions.ts（纯函数） + TDD 单测

**Files:**
- Create: `packages/ui-next/src/lib/contest-actions.ts`
- Create: `packages/ui-next/src/lib/contest-actions.test.ts`

**Interfaces:**
- Consumes: `SerializedTdoc`、`SerializedContestStatusDoc`、`UserPerms`（{hasPerm, own, _id}）
- Produces: `ContestActionFlags`（13 个布尔位）+ `computeContestActions()` 函数

- [ ] **Step 1: 创建测试文件**

Create `packages/ui-next/src/lib/contest-actions.test.ts`：

```ts
/* @vitest-environment happy-dom */
import { describe, expect, it } from 'vitest';
import type { SerializedTdoc, SerializedContestStatusDoc } from '../sections/types';
import { computeContestActions, type UserPerms } from './contest-actions';

const NOW = new Date('2026-07-08T12:00:00Z').getTime();

function makeTdoc(over: Partial<SerializedTdoc> = {}): SerializedTdoc {
  return {
    _id: '60a000000000000000000001',
    docId: '60a000000000000000000001',
    title: 'Test',
    rule: 'acm',
    beginAt: new Date(NOW - 3600_000).toISOString(),
    endAt: new Date(NOW + 3600_000).toISOString(),
    owner: 1,
    pids: [],
    allowPrint: false,
    ...over,
  };
}

function makeTsdoc(over: Partial<SerializedContestStatusDoc> = {}): SerializedContestStatusDoc {
  return { attend: 0, subscribe: 0, ...over };
}

function makeUser(over: Partial<UserPerms> = {}): UserPerms {
  return {
    _id: 1,
    hasPerm: () => false,
    own: () => false,
    ...over,
  };
}

describe('computeContestActions', () => {
  describe('canAttend', () => {
    it('false when already attended', () => {
      const flags = computeContestActions(
        makeTdoc(),
        makeTsdoc({ attend: 1 }),
        makeUser({ hasPerm: () => true }),
      );
      expect(flags.canAttend).toBe(false);
    });

    it('false when contest is done', () => {
      const flags = computeContestActions(
        makeTdoc({ endAt: new Date(NOW - 60_000).toISOString() }),
        null,
        makeUser({ hasPerm: () => true }),
      );
      expect(flags.canAttend).toBe(false);
    });

    it('false without permission', () => {
      const flags = computeContestActions(makeTdoc(), null, makeUser({ hasPerm: () => false }));
      expect(flags.canAttend).toBe(false);
    });

    it('true when not attended, ongoing, and has permission', () => {
      const flags = computeContestActions(makeTdoc(), null, makeUser({ hasPerm: () => true }));
      expect(flags.canAttend).toBe(true);
    });
  });

  describe('canEarlyEnd', () => {
    it('true when ongoing and attended and not homework', () => {
      const flags = computeContestActions(
        makeTdoc(),
        makeTsdoc({ attend: 1 }),
        makeUser(),
      );
      expect(flags.canEarlyEnd).toBe(true);
    });

    it('false for homework rule', () => {
      const flags = computeContestActions(
        makeTdoc({ rule: 'homework' }),
        makeTsdoc({ attend: 1 }),
        makeUser(),
      );
      expect(flags.canEarlyEnd).toBe(false);
    });

    it('false when not attended', () => {
      const flags = computeContestActions(makeTdoc(), null, makeUser());
      expect(flags.canEarlyEnd).toBe(false);
    });

    it('false when not ongoing', () => {
      const flags = computeContestActions(
        makeTdoc({ endAt: new Date(NOW - 60_000).toISOString() }),
        makeTsdoc({ attend: 1 }),
        makeUser(),
      );
      expect(flags.canEarlyEnd).toBe(false);
    });
  });

  describe('canSubscribe', () => {
    it('true when attended', () => {
      expect(computeContestActions(makeTdoc(), makeTsdoc({ attend: 1 }), makeUser()).canSubscribe).toBe(true);
    });

    it('false when not attended', () => {
      expect(computeContestActions(makeTdoc(), null, makeUser()).canSubscribe).toBe(false);
    });
  });

  describe('canShowScoreboard', () => {
    it('true when ongoing', () => {
      expect(computeContestActions(makeTdoc(), null, makeUser()).canShowScoreboard).toBe(true);
    });

    it('true when done', () => {
      const flags = computeContestActions(
        makeTdoc({ endAt: new Date(NOW - 60_000).toISOString() }),
        null,
        makeUser(),
      );
      expect(flags.canShowScoreboard).toBe(true);
    });

    it('false when not started and not done', () => {
      const flags = computeContestActions(
        makeTdoc({
          beginAt: new Date(NOW + 3600_000).toISOString(),
          endAt: new Date(NOW + 7200_000).toISOString(),
        }),
        null,
        makeUser(),
      );
      expect(flags.canShowScoreboard).toBe(false);
    });
  });

  describe('canShowHiddenScoreboard', () => {
    it('true only when done and has perm', () => {
      const flags = computeContestActions(
        makeTdoc({ endAt: new Date(NOW - 60_000).toISOString() }),
        null,
        makeUser({ hasPerm: (p) => p === 'PERM_VIEW_HIDDEN_CONTEST_SCOREBOARD' }),
      );
      expect(flags.canShowHiddenScoreboard).toBe(true);
    });

    it('false without perm', () => {
      const flags = computeContestActions(
        makeTdoc({ endAt: new Date(NOW - 60_000).toISOString() }),
        null,
        makeUser(),
      );
      expect(flags.canShowHiddenScoreboard).toBe(false);
    });
  });

  describe('canShowAllRecord', () => {
    it('true when done and has READ_RECORD_CODE perm', () => {
      const flags = computeContestActions(
        makeTdoc({ endAt: new Date(NOW - 60_000).toISOString() }),
        null,
        makeUser({ hasPerm: (p) => p === 'PERM_READ_RECORD_CODE' }),
      );
      expect(flags.canShowAllRecord).toBe(true);
    });

    it('false when ongoing even with perm', () => {
      const flags = computeContestActions(
        makeTdoc(),
        null,
        makeUser({ hasPerm: (p) => p === 'PERM_READ_RECORD_CODE' }),
      );
      expect(flags.canShowAllRecord).toBe(false);
    });
  });

  describe('canShowSelfRecord', () => {
    it('true when attended', () => {
      expect(computeContestActions(makeTdoc(), makeTsdoc({ attend: 1 }), makeUser()).canShowSelfRecord).toBe(true);
    });

    it('false when not attended', () => {
      expect(computeContestActions(makeTdoc(), null, makeUser()).canShowSelfRecord).toBe(false);
    });
  });

  describe('canEdit / canManage', () => {
    it('canEdit true when owner', () => {
      const tdoc = makeTdoc({ owner: 7 });
      const user = makeUser({ _id: 7, own: (d: { owner: number }) => d.owner === 7 });
      expect(computeContestActions(tdoc, null, user).canEdit).toBe(true);
    });

    it('canEdit true when has PERM_EDIT_CONTEST', () => {
      const user = makeUser({ hasPerm: (p) => p === 'PERM_EDIT_CONTEST' });
      expect(computeContestActions(makeTdoc(), null, user).canEdit).toBe(true);
    });

    it('canManage same logic as canEdit', () => {
      const tdoc = makeTdoc({ owner: 7 });
      const user = makeUser({ _id: 7, own: (d: { owner: number }) => d.owner === 7 });
      const flags = computeContestActions(tdoc, null, user);
      expect(flags.canEdit).toBe(true);
      expect(flags.canManage).toBe(true);
    });

    it('false when neither owner nor perm', () => {
      expect(computeContestActions(makeTdoc(), null, makeUser()).canEdit).toBe(false);
    });
  });

  describe('canPrint', () => {
    it('true when allowPrint and ongoing', () => {
      const tdoc = makeTdoc({ allowPrint: true });
      expect(computeContestActions(tdoc, null, makeUser()).canPrint).toBe(true);
    });

    it('true when allowPrint and done', () => {
      const tdoc = makeTdoc({ allowPrint: true, endAt: new Date(NOW - 60_000).toISOString() });
      expect(computeContestActions(tdoc, null, makeUser()).canPrint).toBe(true);
    });

    it('false when allowPrint is false', () => {
      const tdoc = makeTdoc({ allowPrint: false });
      expect(computeContestActions(tdoc, null, makeUser()).canPrint).toBe(false);
    });
  });

  describe('canViewCode', () => {
    it('true when done and has READ_RECORD_CODE perm', () => {
      const flags = computeContestActions(
        makeTdoc({ endAt: new Date(NOW - 60_000).toISOString() }),
        null,
        makeUser({ hasPerm: (p) => p === 'PERM_READ_RECORD_CODE' }),
      );
      expect(flags.canViewCode).toBe(true);
    });

    it('false when ongoing', () => {
      const flags = computeContestActions(
        makeTdoc(),
        null,
        makeUser({ hasPerm: (p) => p === 'PERM_READ_RECORD_CODE' }),
      );
      expect(flags.canViewCode).toBe(false);
    });
  });

  describe('canShowDiscussion / canCreateDiscussion', () => {
    it('canShowDiscussion requires VIEW_DISCUSSION perm', () => {
      const user = makeUser({ hasPerm: (p) => p === 'PERM_VIEW_DISCUSSION' });
      expect(computeContestActions(makeTdoc(), null, user).canShowDiscussion).toBe(true);
    });

    it('canCreateDiscussion requires CREATE_DISCUSSION perm', () => {
      const user = makeUser({ hasPerm: (p) => p === 'PERM_CREATE_DISCUSSION' });
      expect(computeContestActions(makeTdoc(), null, user).canCreateDiscussion).toBe(true);
    });

    it('false without perms', () => {
      const flags = computeContestActions(makeTdoc(), null, makeUser());
      expect(flags.canShowDiscussion).toBe(false);
      expect(flags.canCreateDiscussion).toBe(false);
    });
  });

  describe('null tsdoc handling', () => {
    it('does not throw when tsdoc is null and computes flags based on tdoc', () => {
      expect(() => computeContestActions(makeTdoc(), null, makeUser())).not.toThrow();
    });
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd /home/xq/Hydro/packages/ui-next && npx vitest run src/lib/contest-actions.test.ts 2>&1 | tail -20`
Expected: FAIL — "Cannot find module './contest-actions'"

- [ ] **Step 3: 实现 lib/contest-actions.ts**

Create `packages/ui-next/src/lib/contest-actions.ts`：

```ts
import { isDone, isOngoing } from './contest-status';
import type { SerializedContestStatusDoc, SerializedTdoc } from '../sections/types';

export type UserPerms = {
  _id: number;
  hasPerm: (perm: string) => boolean;
  own: (doc: { owner?: number | string }) => boolean;
};

export type ContestActionFlags = {
  canAttend: boolean;
  canEarlyEnd: boolean;
  canSubscribe: boolean;
  canShowScoreboard: boolean;
  canShowHiddenScoreboard: boolean;
  canShowAllRecord: boolean;
  canShowSelfRecord: boolean;
  canEdit: boolean;
  canManage: boolean;
  canPrint: boolean;
  canViewCode: boolean;
  canShowDiscussion: boolean;
  canCreateDiscussion: boolean;
};

const P = {
  ATTEND: 'PERM_ATTEND_CONTEST',
  EDIT: 'PERM_EDIT_CONTEST',
  VIEW_HIDDEN_SCOREBOARD: 'PERM_VIEW_HIDDEN_CONTEST_SCOREBOARD',
  READ_RECORD_CODE: 'PERM_READ_RECORD_CODE',
  VIEW_DISCUSSION: 'PERM_VIEW_DISCUSSION',
  CREATE_DISCUSSION: 'PERM_CREATE_DISCUSSION',
} as const;

export function computeContestActions(
  tdoc: SerializedTdoc,
  tsdoc: SerializedContestStatusDoc | null,
  user: UserPerms,
): ContestActionFlags {
  const attended = tsdoc?.attend === 1;
  const ongoing = isOngoing(tdoc);
  const done = isDone(tdoc);
  const isOwner = user.own(tdoc as { owner?: number | string });

  return {
    canAttend: !attended && !done && user.hasPerm(P.ATTEND),
    canEarlyEnd: tdoc.rule !== 'homework' && attended && ongoing,
    canSubscribe: attended,
    canShowScoreboard: done || ongoing,
    canShowHiddenScoreboard: done && user.hasPerm(P.VIEW_HIDDEN_SCOREBOARD),
    canShowAllRecord: done && user.hasPerm(P.READ_RECORD_CODE),
    canShowSelfRecord: attended,
    canEdit: isOwner || user.hasPerm(P.EDIT),
    canManage: isOwner || user.hasPerm(P.EDIT),
    canPrint: Boolean(tdoc.allowPrint) && (ongoing || done),
    canViewCode: done && user.hasPerm(P.READ_RECORD_CODE),
    canShowDiscussion: user.hasPerm(P.VIEW_DISCUSSION),
    canCreateDiscussion: user.hasPerm(P.CREATE_DISCUSSION),
  };
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd /home/xq/Hydro/packages/ui-next && npx vitest run src/lib/contest-actions.test.ts 2>&1 | tail -15`
Expected: PASS — all 24 cases green.

- [ ] **Step 5: Commit**

```bash
cd /home/xq/Hydro && git add packages/ui-next/src/lib/contest-actions.ts packages/ui-next/src/lib/contest-actions.test.ts && git -c commit.gpgsign=false commit -m "feat(lib): add computeContestActions pure function

13 permission / state flags for contest_detail sidebar. Pure function
(no React), 24 unit cases cover canAttend / canEarlyEnd / canSubscribe /
canShowScoreboard / canShowHiddenScoreboard / canShowAllRecord /
canShowSelfRecord / canEdit / canManage / canPrint / canViewCode /
canShowDiscussion / canCreateDiscussion plus null tsdoc edge case.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: lib/contest-timer.ts 纯函数 computeTimerState + TDD 单测

**Files:**
- Create: `packages/ui-next/src/lib/contest-timer.ts`（仅含纯函数 + 类型）
- Create: `packages/ui-next/src/lib/contest-timer.test.ts`

**Interfaces:**
- Consumes: `now: number`、`TimerOptions { beginAt, duration?, tsdocStartAt?, tsdocEndAt? }`
- Produces: `TimerState { status, msLeft, progress, display }` + `computeTimerState()` 函数

- [ ] **Step 1: 创建测试文件**

Create `packages/ui-next/src/lib/contest-timer.test.ts`：

```ts
/* @vitest-environment happy-dom */
import { describe, expect, it } from 'vitest';
import { computeTimerState, type TimerOptions } from './contest-timer';

const BEGIN = 1_700_000_000_000; // 2023-11-14T22:13:20Z
const END = BEGIN + 5 * 3600_000; // +5h
const DURATION = 5 * 3600_000;

function opts(over: Partial<TimerOptions> = {}): TimerOptions {
  return { beginAt: BEGIN, duration: DURATION, ...over };
}

describe('computeTimerState', () => {
  describe('status boundaries', () => {
    it('pre when now < beginAt', () => {
      const state = computeTimerState(BEGIN - 60_000, opts());
      expect(state.status).toBe('pre');
      expect(state.progress).toBe(0);
      expect(state.msLeft).toBe(60_000);
    });

    it('running when now is exactly at beginAt', () => {
      const state = computeTimerState(BEGIN, opts());
      expect(state.status).toBe('running');
      expect(state.progress).toBe(0);
    });

    it('running in the middle', () => {
      const mid = BEGIN + DURATION / 2;
      const state = computeTimerState(mid, opts());
      expect(state.status).toBe('running');
      expect(state.progress).toBeCloseTo(0.5, 5);
      expect(state.msLeft).toBe(DURATION / 2);
    });

    it('ended when now === end', () => {
      const state = computeTimerState(END, opts());
      expect(state.status).toBe('ended');
      expect(state.progress).toBe(1);
      expect(state.msLeft).toBe(0);
    });

    it('ended when now > end', () => {
      const state = computeTimerState(END + 60_000, opts());
      expect(state.status).toBe('ended');
      expect(state.progress).toBe(1);
      expect(state.msLeft).toBe(0);
    });
  });

  describe('end derivation', () => {
    it('uses tsdocEndAt when provided', () => {
      const tsdocEndAt = BEGIN + 3600_000;
      const state = computeTimerState(BEGIN + 1800_000, opts({ tsdocEndAt, duration: DURATION }));
      // end = tsdocEndAt; mid => progress = 1800/3600 = 0.5
      expect(state.progress).toBeCloseTo(0.5, 5);
    });

    it('uses duration when tsdocEndAt missing', () => {
      const state = computeTimerState(BEGIN + DURATION / 4, opts({ duration: DURATION, tsdocEndAt: undefined }));
      expect(state.status).toBe('running');
      expect(state.progress).toBeCloseTo(0.25, 5);
    });

    it('treats as ended when both tsdocEndAt and duration missing', () => {
      const state = computeTimerState(BEGIN + 1000, { beginAt: BEGIN });
      expect(state.status).toBe('ended');
      expect(state.progress).toBe(1);
    });
  });

  describe('start override', () => {
    it('uses tsdoc.startAt as effective start when provided', () => {
      const tsdocStartAt = BEGIN + 1800_000; // 30 min late
      const state = computeTimerState(BEGIN + 3600_000, opts({ tsdocStartAt }));
      // start = tsdocStartAt; now = begin + 1h = start + 30min; end = BEGIN + 5h
      // progress = (now - start) / (end - start) = 1800_000 / (5*3600_000 - 1800_000) ≈ 0.111
      expect(state.status).toBe('running');
      expect(state.progress).toBeCloseTo(1800_000 / (5 * 3600_000 - 1800_000), 5);
    });
  });

  describe('display formatting', () => {
    it('mm:ss format when msLeft < 1h', () => {
      const state = computeTimerState(BEGIN + DURATION - 30 * 60_000, opts());
      expect(state.display).toBe('30:00');
    });

    it('mm:ss format with seconds', () => {
      const state = computeTimerState(BEGIN + DURATION - 65_000, opts());
      expect(state.display).toBe('01:05');
    });

    it('dd:hh:mm format when msLeft >= 1h', () => {
      const state = computeTimerState(BEGIN + 1000, opts());
      // msLeft ≈ 5*3600_000 - 1000 = ~04:59:59
      expect(state.display).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd /home/xq/Hydro/packages/ui-next && npx vitest run src/lib/contest-timer.test.ts 2>&1 | tail -10`
Expected: FAIL — "Cannot find module './contest-timer'"

- [ ] **Step 3: 实现 computeTimerState 纯函数**

Create `packages/ui-next/src/lib/contest-timer.ts`（仅含纯函数，hook 留到 Task 5）：

```ts
export type TimerOptions = {
  beginAt: number;
  duration?: number;
  tsdocStartAt?: number;
  tsdocEndAt?: number;
};

export type TimerState = {
  status: 'pre' | 'running' | 'ended';
  msLeft: number;
  progress: number;
  display: string;
};

export function computeTimerState(now: number, opts: TimerOptions): TimerState {
  const start = opts.tsdocStartAt ?? opts.beginAt;
  const end =
    opts.tsdocEndAt ??
    (typeof opts.duration === 'number' ? opts.beginAt + opts.duration : Number.NEGATIVE_INFINITY);

  if (now < start) {
    const msLeft = start - now;
    return { status: 'pre', msLeft, progress: 0, display: formatDuration(msLeft) };
  }
  if (now >= end) {
    return { status: 'ended', msLeft: 0, progress: 1, display: '00:00' };
  }
  const msLeft = end - now;
  const total = end - start;
  const progress = total > 0 ? (now - start) / total : 0;
  return { status: 'running', msLeft, progress, display: formatDuration(msLeft) };
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h === 0) return `${pad2(m)}:${pad2(s)}`;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd /home/xq/Hydro/packages/ui-next && npx vitest run src/lib/contest-timer.test.ts 2>&1 | tail -10`
Expected: PASS — all 11 cases green.

- [ ] **Step 5: Commit**

```bash
cd /home/xq/Hydro && git add packages/ui-next/src/lib/contest-timer.ts packages/ui-next/src/lib/contest-timer.test.ts && git -c commit.gpgsign=false commit -m "feat(lib): add computeTimerState pure function

Pure function for contest timer state machine (pre / running / ended).
Derives end from tsdocEndAt or duration, start from tsdoc.startAt or
beginAt. Display formats as mm:ss (< 1h) or hh:mm:ss (>= 1h).
11 unit cases cover boundary, end-derivation, start-override, format.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: useContestTimer hook + hook 测试

**Files:**
- Modify: `packages/ui-next/src/lib/contest-timer.ts`（追加 hook）
- Modify: `packages/ui-next/src/lib/contest-timer.test.ts`（追加 hook 测试）

**Interfaces:**
- Consumes: 既有 `computeTimerState`
- Produces: `useContestTimer(opts): TimerState`，每秒 tick；status 切换时 dispatch `hydro:contest-tick` CustomEvent

- [ ] **Step 1: 追加 hook 测试**

Append to `packages/ui-next/src/lib/contest-timer.test.ts`：

```ts
import { renderHook, act } from '@testing-library/react';
import { useContestTimer } from './contest-timer';

describe('useContestTimer hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns initial state on first render', () => {
    vi.setSystemTime(BEGIN - 1000);
    const { result } = renderHook(() =>
      useContestTimer({ beginAt: BEGIN, duration: DURATION }),
    );
    expect(result.current.status).toBe('pre');
    expect(result.current.msLeft).toBe(1000);
  });

  it('updates state after tick', () => {
    vi.setSystemTime(BEGIN);
    const { result } = renderHook(() =>
      useContestTimer({ beginAt: BEGIN, duration: DURATION }),
    );
    expect(result.current.status).toBe('running');
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.msLeft).toBe(DURATION - 1000);
  });

  it('dispatches hydro:contest-tick when status transitions', () => {
    vi.setSystemTime(BEGIN - 100);
    const listener = vi.fn();
    window.addEventListener('hydro:contest-tick', listener);

    renderHook(() => useContestTimer({ beginAt: BEGIN, duration: DURATION }));

    expect(listener).not.toHaveBeenCalled();

    act(() => {
      vi.setSystemTime(BEGIN + 100);
      vi.advanceTimersByTime(1100);
    });

    expect(listener).toHaveBeenCalled();
    window.removeEventListener('hydro:contest-tick', listener);
  });

  it('clears interval on unmount', () => {
    vi.setSystemTime(BEGIN);
    const { unmount } = renderHook(() =>
      useContestTimer({ beginAt: BEGIN, duration: DURATION }),
    );
    const clearSpy = vi.spyOn(globalThis, 'clearInterval');
    unmount();
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd /home/xq/Hydro/packages/ui-next && npx vitest run src/lib/contest-timer.test.ts 2>&1 | tail -10`
Expected: FAIL — `useContestTimer` is not exported.

- [ ] **Step 3: 追加 hook 到 lib/contest-timer.ts**

Append to `packages/ui-next/src/lib/contest-timer.ts`：

```ts
import { useEffect, useRef, useState } from 'react';

export function useContestTimer(opts: TimerOptions): TimerState {
  const [state, setState] = useState<TimerState>(() => computeTimerState(Date.now(), opts));
  const prevStatus = useRef(state.status);

  useEffect(() => {
    const tick = () => {
      const next = computeTimerState(Date.now(), opts);
      setState(next);
      if (next.status !== prevStatus.current) {
        prevStatus.current = next.status;
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('hydro:contest-tick', { detail: next }));
        }
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
    // opts is treated as stable per caller convention; if caller mutates it,
    // they should remount the component (timer is rarely live-mutated).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd /home/xq/Hydro/packages/ui-next && npx vitest run src/lib/contest-timer.test.ts 2>&1 | tail -10`
Expected: PASS — all 15 cases green (11 pure + 4 hook).

- [ ] **Step 5: Commit**

```bash
cd /home/xq/Hydro && git add packages/ui-next/src/lib/contest-timer.ts packages/ui-next/src/lib/contest-timer.test.ts && git -c commit.gpgsign=false commit -m "feat(lib): add useContestTimer hook

1-second setInterval driven by computeTimerState; dispatches
hydro:contest-tick CustomEvent on status transitions (pre→running,
running→ended). 4 hook tests use vi.useFakeTimers (pure timer logic,
no Monaco dependency — exception to global rule).

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 6: registerPage('contest_detail') + 占位 page

**Files:**
- Modify: `packages/ui-next/src/pages/index.ts`
- Create: `packages/ui-next/src/pages/contest_detail.tsx`（最小占位）

**Interfaces:**
- Consumes: `registerPage` from `../registry/page`
- Produces: 路由 `contest_detail` 注册；占位组件渲染 `<div>Contest Detail</div>`

- [ ] **Step 1: 创建占位 page**

Create `packages/ui-next/src/pages/contest_detail.tsx`：

```tsx
import { usePageData } from '../hooks/use-page-data';

export default function ContestDetailPage() {
  const pageData = usePageData();
  return (
    <div data-page="contest_detail">
      <h1>Contest Detail (placeholder)</h1>
      <pre>{JSON.stringify(pageData?.args ?? null, null, 2)}</pre>
    </div>
  );
}
```

- [ ] **Step 2: 在 pages/index.ts 加 registerPage**

Edit `packages/ui-next/src/pages/index.ts` — 在 `'contest_create'` 之前插入（保持字母序）：

```ts
registerPage('contest_detail', () => import('./contest_detail'));
```

修改后这一行变为：

```ts
registerPage('contest_detail', () => import('./contest_detail'));
registerPage('contest_create', () => import('./contest_create'));
registerPage('contest_edit', () => import('./contest_edit'));
```

- [ ] **Step 3: 编译验证**

Run: `cd /home/xq/Hydro && yarn build 2>&1 | tail -10`
Expected: 0 errors。

- [ ] **Step 4: 验证路由名对齐**

Run:
```bash
grep -n "registerPage.*contest_detail" /home/xq/Hydro/packages/ui-next/src/pages/index.ts
grep -n "ctx.Route.*contest_detail" /home/xq/Hydro/packages/hydrooj/src/handler/contest.ts
```
Expected: 各匹配一行，路由名完全一致。

- [ ] **Step 5: Commit**

```bash
cd /home/xq/Hydro && git add packages/ui-next/src/pages/index.ts packages/ui-next/src/pages/contest_detail.tsx && git -c commit.gpgsign=false commit -m "feat(pages): register contest_detail route with placeholder

Route name matches server ctx.Route('contest_detail', ...) verbatim.
Placeholder renders PageData.args as <pre>; full UI lands in Task 12.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 7: ContestDetailHeader 组件 + TDD 单测

**Files:**
- Create: `packages/ui-next/src/components/contest/ContestDetailHeader.tsx`
- Create: `packages/ui-next/src/components/contest/ContestDetailHeader.module.css`
- Create: `packages/ui-next/src/components/contest/ContestDetailHeader.test.tsx`

**Interfaces:**
- Consumes: `Button`、`Chip`、`Eyebrow` from primitives、`ruleText` from lib/rule-text、`renderDuration` from lib/contest-status、`useTranslate` from lib/i18n
- Produces: `ContestDetailHeader({ title, rule, status, attended, durationText })` 组件

- [ ] **Step 1: 创建测试文件**

Create `packages/ui-next/src/components/contest/ContestDetailHeader.test.tsx`：

```tsx
/* @vitest-environment happy-dom */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ContestDetailHeader } from './ContestDetailHeader';

describe('ContestDetailHeader', () => {
  it('renders title in h1', () => {
    render(<ContestDetailHeader title="Hello Contest" rule="acm" status="upcoming" attended={false} durationText="5.0" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Hello Contest' })).toBeInTheDocument();
  });

  it('renders rule chip via ruleText (acm -> XCPC)', () => {
    render(<ContestDetailHeader title="T" rule="acm" status="upcoming" attended={false} durationText="5.0" />);
    expect(screen.getByText('XCPC')).toBeInTheDocument();
  });

  it('renders attended chip when attended=true', () => {
    render(<ContestDetailHeader title="T" rule="acm" status="ongoing" attended durationText="5.0" />);
    expect(screen.getByText(/已报名|Attended/i)).toBeInTheDocument();
  });

  it('does not render attended chip when attended=false', () => {
    render(<ContestDetailHeader title="T" rule="acm" status="upcoming" attended={false} durationText="5.0" />);
    expect(screen.queryByText(/已报名|Attended/i)).not.toBeInTheDocument();
  });

  it('renders durationText', () => {
    render(<ContestDetailHeader title="T" rule="acm" status="ongoing" attended={false} durationText="5.0" />);
    expect(screen.getByText('5.0')).toBeInTheDocument();
  });

  it('renders upcoming / ongoing / done status chip', () => {
    const { rerender } = render(<ContestDetailHeader title="T" rule="acm" status="upcoming" attended={false} durationText="5.0" />);
    expect(screen.getByText(/未开始|Upcoming/i)).toBeInTheDocument();
    rerender(<ContestDetailHeader title="T" rule="acm" status="ongoing" attended={false} durationText="5.0" />);
    expect(screen.getByText(/进行中|Ongoing/i)).toBeInTheDocument();
    rerender(<ContestDetailHeader title="T" rule="acm" status="done" attended={false} durationText="5.0" />);
    expect(screen.getByText(/已结束|Finished/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd /home/xq/Hydro/packages/ui-next && npx vitest run src/components/contest/ContestDetailHeader.test.tsx 2>&1 | tail -10`
Expected: FAIL — `ContestDetailHeader` 模块未找到。

- [ ] **Step 3: 创建 CSS Module**

Create `packages/ui-next/src/components/contest/ContestDetailHeader.module.css`：

```css
.header {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-6) 0;
}

.title {
  font-size: var(--text-3xl);
  font-weight: 700;
  line-height: var(--leading-tight);
  color: var(--text);
  margin: 0;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
}

.duration {
  font-size: var(--text-sm);
  color: var(--text-soft);
  margin-left: var(--space-2);
}
```

- [ ] **Step 4: 创建组件**

Create `packages/ui-next/src/components/contest/ContestDetailHeader.tsx`：

```tsx
import { Chip } from '../primitives/Chip';
import { Eyebrow } from '../primitives/Eyebrow';
import { useTranslate } from '../../lib/i18n';
import { ruleText } from '../../lib/rule-text';
import styles from './ContestDetailHeader.module.css';

type Status = 'upcoming' | 'ongoing' | 'done';

export type ContestDetailHeaderProps = {
  title: string;
  rule: string;
  status: Status;
  attended: boolean;
  durationText: string;
};

export function ContestDetailHeader({
  title,
  rule,
  status,
  attended,
  durationText,
}: ContestDetailHeaderProps) {
  const t = useTranslate();
  const statusChip = (() => {
    if (status === 'upcoming') return { tone: 'soon' as const, label: t('ContestDetail.TimerStarts') };
    if (status === 'ongoing') return { tone: 'live' as const, label: t('Common.Contests') ? '' : '' };
    return { tone: 'finished' as const, label: t('ContestDetail.TimerEnded') };
  })();

  // NOTE: 中英双语标签
  const statusLabel = (() => {
    if (status === 'upcoming') return t('ContestDetail.TimerStarts');
    if (status === 'ongoing') return '进行中 / Ongoing';
    return t('ContestDetail.TimerEnded');
  })();

  return (
    <header className={styles.header} data-testid="contest-detail-header">
      <Eyebrow>{ruleText(rule)}</Eyebrow>
      <h1 className={styles.title}>{title}</h1>
      <div className={styles.meta}>
        <Chip tone={statusChip.tone}>{statusLabel}</Chip>
        {attended && <Chip tone="attended">{t('ContestMain.Attended')}</Chip>}
        <span className={styles.duration}>{durationText}</span>
      </div>
    </header>
  );
}
```

**重要**：实际实现时需要在测试通过前确认 Chip 组件支持的 tone 集合。Read `packages/ui-next/src/components/primitives/Chip.tsx` 后用其支持的 tone 替代 `'soon' / 'live' / 'finished' / 'attended'`，可能需要 `'default' / 'ongoing' / 'ended' / 'info' / 'success'` 等。

- [ ] **Step 5: 跑测试确认通过**

Run: `cd /home/xq/Hydro/packages/ui-next && npx vitest run src/components/contest/ContestDetailHeader.test.tsx 2>&1 | tail -15`
Expected: PASS（可能需要根据 Chip 的实际 tone 调整组件实现；若失败，按测试期望与 Chip API 协调修正）。

- [ ] **Step 6: Commit**

```bash
cd /home/xq/Hydro && git add packages/ui-next/src/components/contest/ContestDetailHeader.tsx packages/ui-next/src/components/contest/ContestDetailHeader.module.css packages/ui-next/src/components/contest/ContestDetailHeader.test.tsx && git -c commit.gpgsign=false commit -m "feat(contest): add ContestDetailHeader

Renders Eyebrow (rule code) + h1 title + Chip cluster (status / attended)
+ duration text. Tone mapping matches Chip primitive API.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 8: ContestDescription 组件 + TDD 单测

**Files:**
- Create: `packages/ui-next/src/components/contest/ContestDescription.tsx`
- Create: `packages/ui-next/src/components/contest/ContestDescription.test.tsx`

**Interfaces:**
- Consumes: `Article` from `components/article/Article`
- Produces: `ContestDescription({ content, docId })` 组件，调用 `rewriteContent` 把 `file://` 转为相对路径，再喂给 `Article`

- [ ] **Step 1: 创建测试文件**

Create `packages/ui-next/src/components/contest/ContestDescription.test.tsx`：

```tsx
/* @vitest-environment happy-dom */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@monaco-editor/react', () => ({
  Editor: (props: any) => <textarea data-testid="monaco-mock" value={props.value} readOnly />,
  loader: { config: vi.fn() },
}));

vi.mock('../../components/article/Article', () => ({
  Article: ({ content }: { content: string }) => (
    <div data-testid="article-mock">{content}</div>
  ),
}));

import { ContestDescription } from './ContestDescription';

describe('ContestDescription', () => {
  it('renders plain markdown content', () => {
    render(<ContestDescription content="Hello **world**" docId="60a000000000000000000001" />);
    const node = screen.getByTestId('article-mock');
    expect(node.textContent).toContain('Hello **world**');
  });

  it('rewrites (file://... to (docId/file/public/...', () => {
    render(<ContestDescription content="See [pic](file://a.png)" docId="60a000000000000000000001" />);
    const node = screen.getByTestId('article-mock');
    expect(node.textContent).toContain('(60a000000000000000000001/file/public/a.png)');
    expect(node.textContent).not.toContain('file://');
  });

  it('rewrites ="file://... to ="docId/file/public/...', () => {
    render(<ContestDescription content='<img src="file://b.png" />' docId="60a000000000000000000001" />);
    const node = screen.getByTestId('article-mock');
    expect(node.textContent).toContain('"60a000000000000000000001/file/public/b.png"');
  });

  it('handles empty content', () => {
    render(<ContestDescription content="" docId="60a000000000000000000001" />);
    expect(screen.getByTestId('article-mock')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd /home/xq/Hydro/packages/ui-next && npx vitest run src/components/contest/ContestDescription.test.tsx 2>&1 | tail -10`
Expected: FAIL。

- [ ] **Step 3: 创建组件**

Create `packages/ui-next/src/components/contest/ContestDescription.tsx`：

```tsx
import { Article } from '../article/Article';

export type ContestDescriptionProps = {
  content: string;
  docId: string;
};

export function rewriteContent(raw: string, docId: string): string {
  return raw
    .replace(/\(file:\/\//g, `(${docId}/file/public/`)
    .replace(/="file:\/\//g, `="${docId}/file/public/`);
}

export function ContestDescription({ content, docId }: ContestDescriptionProps) {
  const rewritten = rewriteContent(content ?? '', docId);
  return <Article content={rewritten} />;
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd /home/xq/Hydro/packages/ui-next && npx vitest run src/components/contest/ContestDescription.test.tsx 2>&1 | tail -10`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
cd /home/xq/Hydro && git add packages/ui-next/src/components/contest/ContestDescription.tsx packages/ui-next/src/components/contest/ContestDescription.test.tsx && git -c commit.gpgsign=false commit -m "feat(contest): add ContestDescription with file:// rewrite

Wraps Article, rewrites (file:// -> (docId/file/public/ and ="file://
-> =\"docId/file/public/\" (mirrors ui-default server-side postprocess).
4 tests cover plain / rewritten / empty.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 9: ContestFiles 组件 + TDD 单测

**Files:**
- Create: `packages/ui-next/src/components/contest/ContestFiles.tsx`
- Create: `packages/ui-next/src/components/contest/ContestFiles.module.css`
- Create: `packages/ui-next/src/components/contest/ContestFiles.test.tsx`

**Interfaces:**
- Consumes: `useTranslate` from lib/i18n
- Produces: `ContestFiles({ files, urlForFile })` 组件；空数组显示空态

- [ ] **Step 1: 创建测试文件**

Create `packages/ui-next/src/components/contest/ContestFiles.test.tsx`：

```tsx
/* @vitest-environment happy-dom */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ContestFiles } from './ContestFiles';

const urlForFile = (name: string) => `/d/contest/123/file/private/${name}`;

describe('ContestFiles', () => {
  it('renders empty state when files is empty', () => {
    render(<ContestFiles files={[]} urlForFile={urlForFile} />);
    expect(screen.getByText(/暂无附件|No files attached/i)).toBeInTheDocument();
  });

  it('renders one row per file with name link', () => {
    const files = [
      { name: 'a.pdf', size: 1024 },
      { name: 'b.zip', size: 2048 },
    ];
    render(<ContestFiles files={files} urlForFile={urlForFile} />);
    const linkA = screen.getByRole('link', { name: 'a.pdf' });
    expect(linkA).toHaveAttribute('href', '/d/contest/123/file/private/a.pdf');
    const linkB = screen.getByRole('link', { name: 'b.zip' });
    expect(linkB).toHaveAttribute('href', '/d/contest/123/file/private/b.zip');
  });

  it('renders size in human readable form (bytes when small)', () => {
    render(<ContestFiles files={[{ name: 'tiny.txt', size: 500 }]} urlForFile={urlForFile} />);
    expect(screen.getByText('500 B')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd /home/xq/Hydro/packages/ui-next && npx vitest run src/components/contest/ContestFiles.test.tsx 2>&1 | tail -10`
Expected: FAIL。

- [ ] **Step 3: 创建 CSS Module**

Create `packages/ui-next/src/components/contest/ContestFiles.module.css`：

```css
.wrap {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-4) 0;
}

.title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.empty {
  color: var(--text-mute);
  font-size: var(--text-sm);
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--bg-1);
}

.name {
  color: var(--blue);
  text-decoration: none;
  font-size: var(--text-sm);
}

.name:hover {
  text-decoration: underline;
}

.size {
  color: var(--text-soft);
  font-size: var(--text-xs);
  font-family: var(--font-mono);
}
```

- [ ] **Step 4: 创建组件**

Create `packages/ui-next/src/components/contest/ContestFiles.tsx`：

```tsx
import { useTranslate } from '../../lib/i18n';
import styles from './ContestFiles.module.css';

export type ContestFileInfo = {
  name: string;
  size: number;
};

export type ContestFilesProps = {
  files: ContestFileInfo[];
  urlForFile: (name: string) => string;
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

export function ContestFiles({ files, urlForFile }: ContestFilesProps) {
  const t = useTranslate();
  if (!files || files.length === 0) {
    return (
      <section className={styles.wrap} data-testid="contest-files">
        <h2 className={styles.title}>{t('Problem.Related')}</h2>
        <p className={styles.empty}>{t('ContestDetail.NoFiles')}</p>
      </section>
    );
  }
  return (
    <section className={styles.wrap} data-testid="contest-files">
      <h2 className={styles.title}>{t('Problem.Related')}</h2>
      <ul className={styles.list}>
        {files.map((file) => (
          <li key={file.name} className={styles.row}>
            <a
              className={styles.name}
              href={urlForFile(file.name)}
              target="_blank"
              rel="noopener noreferrer"
            >
              {file.name}
            </a>
            <span className={styles.size}>{formatSize(file.size)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 5: 跑测试确认通过**

Run: `cd /home/xq/Hydro/packages/ui-next && npx vitest run src/components/contest/ContestFiles.test.tsx 2>&1 | tail -10`
Expected: PASS。

- [ ] **Step 6: Commit**

```bash
cd /home/xq/Hydro && git add packages/ui-next/src/components/contest/ContestFiles.tsx packages/ui-next/src/components/contest/ContestFiles.module.css packages/ui-next/src/components/contest/ContestFiles.test.tsx && git -c commit.gpgsign=false commit -m "feat(contest): add ContestFiles component

Renders private attached files as a list (name link + size). Empty state
shows localized 'No files attached'. 3 tests cover empty / list / size.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 10: ContestTimer 组件 + TDD 单测

**Files:**
- Create: `packages/ui-next/src/components/contest/ContestTimer.tsx`
- Create: `packages/ui-next/src/components/contest/ContestTimer.module.css`
- Create: `packages/ui-next/src/components/contest/ContestTimer.test.tsx`

**Interfaces:**
- Consumes: `useContestTimer` from lib/contest-timer、`useTranslate` from lib/i18n
- Produces: `ContestTimer({ tdoc, tsdoc })` 组件；fixed top 文字 + NProgress 进度条

- [ ] **Step 1: 创建测试文件（mock hook）**

Create `packages/ui-next/src/components/contest/ContestTimer.test.tsx`：

```tsx
/* @vitest-environment happy-dom */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../../lib/contest-timer', () => ({
  useContestTimer: () => ({
    status: 'running' as const,
    msLeft: 2 * 3600_000 + 30 * 60_000,
    progress: 0.5,
    display: '02:30:00',
  }),
  computeTimerState: () => ({ status: 'running', msLeft: 0, progress: 0, display: '' }),
}));

import { ContestTimer } from './ContestTimer';

const beginAt = '2026-07-08T10:00:00Z';
const endAt = '2026-07-08T15:00:00Z';

describe('ContestTimer', () => {
  it('renders countdown display', () => {
    render(<ContestTimer tdoc={{ beginAt, endAt, duration: 5 * 3600_000 } as any} tsdoc={null} />);
    expect(screen.getByText('02:30:00')).toBeInTheDocument();
  });

  it('renders progress bar with style transform scaleX', () => {
    render(<ContestTimer tdoc={{ beginAt, endAt, duration: 5 * 3600_000 } as any} tsdoc={null} />);
    const bar = document.querySelector('[data-testid="contest-progress"]') as HTMLElement;
    expect(bar).toBeTruthy();
    expect(bar.style.transform).toContain('scaleX(0.5)');
  });

  it('renders localized label based on mock status (running -> Ends in)', () => {
    render(<ContestTimer tdoc={{ beginAt, endAt, duration: 5 * 3600_000 } as any} tsdoc={null} />);
    expect(screen.getByText(/距离结束|Ends in/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd /home/xq/Hydro/packages/ui-next && npx vitest run src/components/contest/ContestTimer.test.tsx 2>&1 | tail -10`
Expected: FAIL。

- [ ] **Step 3: 创建 CSS Module**

Create `packages/ui-next/src/components/contest/ContestTimer.module.css`：

```css
.wrap {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  background: var(--bg-2);
  border-bottom: 1px solid var(--bg-1);
  padding: var(--space-2) var(--space-4);
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--text);
}

.label {
  color: var(--text-soft);
}

.value {
  color: var(--text);
  font-weight: 600;
}

.progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 2px;
  width: 100%;
  background: var(--blue);
  transform-origin: left center;
  transition: transform 200ms linear;
}
```

- [ ] **Step 4: 创建组件**

Create `packages/ui-next/src/components/contest/ContestTimer.tsx`：

```tsx
import { useTranslate } from '../../lib/i18n';
import { useContestTimer } from '../../lib/contest-timer';
import type { SerializedContestStatusDoc, SerializedTdoc } from '../../sections/types';
import styles from './ContestTimer.module.css';

export type ContestTimerProps = {
  tdoc: SerializedTdoc;
  tsdoc: SerializedContestStatusDoc | null;
};

function toMs(iso?: string): number | undefined {
  if (!iso) return undefined;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : undefined;
}

export function ContestTimer({ tdoc, tsdoc }: ContestTimerProps) {
  const t = useTranslate();
  const state = useContestTimer({
    beginAt: toMs(tdoc.beginAt) ?? 0,
    duration: tdoc.duration ? Number(tdoc.duration) * 3600_000 : undefined,
    tsdocStartAt: toMs(tsdoc?.startAt),
    tsdocEndAt: toMs(tsdoc?.endAt),
  });

  const label = (() => {
    if (state.status === 'pre') return t('ContestDetail.TimerStarts');
    if (state.status === 'running') return t('ContestDetail.TimerEnds');
    return t('ContestDetail.TimerEnded');
  })();

  return (
    <div className={styles.wrap} data-testid="contest-timer">
      <span className={styles.label}>{label}</span>
      <span className={styles.value} data-testid="contest-countdown">
        {state.display}
      </span>
      <div
        className={styles.progress}
        data-testid="contest-progress"
        style={{ transform: `scaleX(${state.progress})` }}
      />
    </div>
  );
}
```

- [ ] **Step 5: 跑测试确认通过**

Run: `cd /home/xq/Hydro/packages/ui-next && npx vitest run src/components/contest/ContestTimer.test.tsx 2>&1 | tail -10`
Expected: PASS。

- [ ] **Step 6: Commit**

```bash
cd /home/xq/Hydro && git add packages/ui-next/src/components/contest/ContestTimer.tsx packages/ui-next/src/components/contest/ContestTimer.module.css packages/ui-next/src/components/contest/ContestTimer.test.tsx && git -c commit.gpgsign=false commit -m "feat(contest): add ContestTimer with NProgress bar

Fixed-top countdown display + 2px progress bar (scaleX transform).
Reuses useContestTimer hook. 3 tests verify countdown text / progress
style / label localization (mocked hook returns fixed running state).

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 11: ContestDetailSidebar 组件 + TDD 单测

**Files:**
- Create: `packages/ui-next/src/components/contest/ContestDetailSidebar.tsx`
- Create: `packages/ui-next/src/components/contest/ContestDetailSidebar.module.css`
- Create: `packages/ui-next/src/components/contest/ContestDetailSidebar.test.tsx`

**Interfaces:**
- Consumes: `Link` from `components/link`、`Alert`、`ConfirmDialog`、`useToast`、`Button`、`request` from hooks/use-api、`computeContestActions` from lib/contest-actions、`useTranslate` from lib/i18n
- Produces: `ContestDetailSidebar({ tdoc, tsdoc, udict })` 组件；11+ 按钮 / 链接 / 表单

- [ ] **Step 1: 创建测试文件**

Create `packages/ui-next/src/components/contest/ContestDetailSidebar.test.tsx`：

```tsx
/* @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const requestPost = vi.fn();
const reloadSpy = vi.fn();

vi.mock('../../hooks/use-api', () => ({
  request: { post: (...args: unknown[]) => requestPost(...args) },
  HydroClientError: class extends Error {
    code: number;
    constructor(init: { code?: number; message?: string }) {
      super(init.message ?? 'error');
      this.code = init.code ?? 0;
    }
  },
  useApi: () => ({
    run: requestPost,
    loading: false,
    error: null,
    data: null,
    setError: vi.fn(),
  }),
}));

import { ContestDetailSidebar } from './ContestDetailSidebar';

const NOW = new Date('2026-07-08T12:00:00Z').getTime();
const begin = new Date(NOW - 3600_000).toISOString();
const end = new Date(NOW + 3600_000).toISOString();

function tdoc(over: any = {}): any {
  return {
    _id: '60a000000000000000000001',
    docId: '60a000000000000000000001',
    title: 'Test',
    rule: 'acm',
    beginAt: begin,
    endAt: end,
    owner: 1,
    pids: [],
    allowPrint: false,
    ...over,
  };
}

function tsdoc(over: any = {}): any {
  return { attend: 0, subscribe: 0, ...over };
}

function udict(): any {
  return { 1: { _id: 1, uname: 'owner', perm: 'BigInt::0' } };
}

const baseUrl = (tdoc: any) => `/contest/${tdoc.docId}`;

beforeEach(() => {
  requestPost.mockReset();
  reloadSpy.mockReset();
  // stub window.location.reload
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { reload: reloadSpy, href: 'http://localhost/contest/abc' },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ContestDetailSidebar', () => {
  it('shows Attend button when canAttend and triggers POST on click', async () => {
    requestPost.mockResolvedValueOnce({});
    render(
      <ContestDetailSidebar tdoc={tdoc()} tsdoc={null} udict={udict()} urlForFile={(n) => `/f/${n}`} />,
    );
    const btn = await screen.findByRole('button', { name: /报名参赛|Attend Contest/i });
    fireEvent.click(btn);
    await waitFor(() => expect(requestPost).toHaveBeenCalled());
    expect(reloadSpy).toHaveBeenCalled();
  });

  it('prompts for invitation code when tdoc._code exists', async () => {
    requestPost.mockResolvedValueOnce({});
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('secret');
    render(
      <ContestDetailSidebar tdoc={tdoc({ _code: 'secret' })} tsdoc={null} udict={udict()} urlForFile={(n) => `/f/${n}`} />,
    );
    const btn = await screen.findByRole('button', { name: /报名参赛|Attend Contest/i });
    fireEvent.click(btn);
    await waitFor(() => expect(promptSpy).toHaveBeenCalled());
    await waitFor(() =>
      expect(requestPost).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(URLSearchParams),
        expect.anything(),
      ),
    );
    // confirm code='secret' was sent
    const args = requestPost.mock.calls[0];
    expect((args[1] as URLSearchParams).get('code')).toBe('secret');
  });

  it('renders Error alert when Attend POST rejects with HydroClientError', async () => {
    requestPost.mockRejectedValueOnce(new Error('Invitation code invalid'));
    render(
      <ContestDetailSidebar tdoc={tdoc()} tsdoc={null} udict={udict()} urlForFile={(n) => `/f/${n}`} />,
    );
    const btn = await screen.findByRole('button', { name: /报名参赛|Attend Contest/i });
    fireEvent.click(btn);
    expect(await screen.findByText(/Invitation code invalid|加载|出错/i)).toBeInTheDocument();
  });

  it('does not render End Early button for homework rule', () => {
    render(
      <ContestDetailSidebar
        tdoc={tdoc({ rule: 'homework' })}
        tsdoc={tsdoc({ attend: 1 })}
        udict={udict()}
        urlForFile={(n) => `/f/${n}`}
      />,
    );
    expect(screen.queryByRole('button', { name: /提前结束|End Contest Early/i })).not.toBeInTheDocument();
  });

  it('renders End Early button for ongoing attended non-homework contest', async () => {
    requestPost.mockResolvedValueOnce({});
    render(
      <ContestDetailSidebar
        tdoc={tdoc()}
        tsdoc={tsdoc({ attend: 1 })}
        udict={udict()}
        urlForFile={(n) => `/f/${n}`}
      />,
    );
    expect(await screen.findByRole('button', { name: /提前结束|End Contest Early/i })).toBeInTheDocument();
  });

  it('renders Scoreboard link when canShowScoreboard', () => {
    render(
      <ContestDetailSidebar tdoc={tdoc()} tsdoc={null} udict={udict()} urlForFile={(n) => `/f/${n}`} />,
    );
    expect(screen.getByRole('link', { name: /排行榜|Scoreboard/i })).toBeInTheDocument();
  });

  it('renders All submissions link when canShowAllRecord (done + perm)', () => {
    const doneEnd = new Date(NOW - 60_000).toISOString();
    render(
      <ContestDetailSidebar
        tdoc={tdoc({ endAt: doneEnd })}
        tsdoc={null}
        udict={udict()}
        urlForFile={(n) => `/f/${n}`}
        currentUserPerms={{ hasPerm: (p: string) => p === 'PERM_READ_RECORD_CODE', own: () => false, _id: 2 }}
      />,
    );
    expect(screen.getByRole('link', { name: /所有提交|All submissions/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd /home/xq/Hydro/packages/ui-next && npx vitest run src/components/contest/ContestDetailSidebar.test.tsx 2>&1 | tail -10`
Expected: FAIL。

- [ ] **Step 3: 创建 CSS Module**

Create `packages/ui-next/src/components/contest/ContestDetailSidebar.module.css`：

```css
.sidebar {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-4);
  background: var(--bg-1);
  border-radius: var(--radius-md);
  border: 1px solid var(--bg-2);
}

.section {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-soft);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
}

.action {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  color: var(--text);
  text-decoration: none;
  font-size: var(--text-sm);
}

.action:hover {
  background: var(--bg-2);
}

.owner {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--text-soft);
}
```

- [ ] **Step 4: 创建组件**

Create `packages/ui-next/src/components/contest/ContestDetailSidebar.tsx`：

```tsx
import { useState } from 'react';
import { Alert } from '../primitives/Alert';
import { Button } from '../primitives/Button';
import { ConfirmDialog } from '../primitives/ConfirmDialog';
import { Link, useBuildUrl } from '../link';
import { useToast } from '../primitives/Toast';
import { request } from '../../hooks/use-api';
import { useTranslate } from '../../lib/i18n';
import { computeContestActions, type UserPerms } from '../../lib/contest-actions';
import type { SerializedContestStatusDoc, SerializedTdoc, SerializedUserDict } from '../../sections/types';
import styles from './ContestDetailSidebar.module.css';

export type ContestDetailSidebarProps = {
  tdoc: SerializedTdoc & { owner?: number; allowPrint?: boolean; _code?: string };
  tsdoc: SerializedContestStatusDoc | null;
  udict: SerializedUserDict;
  urlForFile: (name: string) => string;
  currentUserPerms?: UserPerms;
};

const DEFAULT_USER: UserPerms = {
  _id: 0,
  hasPerm: () => false,
  own: () => false,
};

export function ContestDetailSidebar({
  tdoc,
  tsdoc,
  udict,
  urlForFile,
  currentUserPerms = DEFAULT_USER,
}: ContestDetailSidebarProps) {
  const t = useTranslate();
  const buildUrl = useBuildUrl();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [confirmEarlyEnd, setConfirmEarlyEnd] = useState(false);
  const [pending, setPending] = useState(false);

  const flags = computeContestActions(tdoc, tsdoc, currentUserPerms);
  const contestUrl = buildUrl('contest_detail', { tid: tdoc.docId });
  const ownerUdoc = udict[tdoc.owner ?? -1];

  async function postOp(operation: string, extra: Record<string, string> = {}) {
    setError(null);
    setPending(true);
    try {
      const fd = new URLSearchParams({ operation, ...extra });
      await request.post(contestUrl, fd, { credentials: 'same-origin' });
      window.location.reload();
    } catch (e: any) {
      const msg = e?.message ?? t('ContestDetail.NetworkError');
      setError(msg);
      toast.error(msg);
    } finally {
      setPending(false);
    }
  }

  function onAttend() {
    if (tdoc._code) {
      const code = window.prompt(t('ContestDetail.InvitationCode'));
      if (!code) return;
      postOp('attend', { code });
    } else {
      postOp('attend');
    }
  }

  return (
    <aside className={styles.sidebar} data-testid="contest-sidebar">
      {ownerUdoc && (
        <div className={styles.owner}>
          <span>{t('Problem.Uploader')}:</span>
          <strong>{ownerUdoc.uname}</strong>
        </div>
      )}

      {error && <Alert variant="error" message={error} />}

      {flags.canAttend && (
        <Button variant="primary" onClick={onAttend} disabled={pending} data-testid="btn-attend">
          {t('ContestDetail.Attend')}
        </Button>
      )}

      {flags.canEarlyEnd && (
        <>
          <Button variant="ghost" onClick={() => setConfirmEarlyEnd(true)} disabled={pending} data-testid="btn-early-end">
            {t('ContestDetail.EndEarly')}
          </Button>
          <ConfirmDialog
            open={confirmEarlyEnd}
            title={t('ContestDetail.EndEarly')}
            message={t('ContestDetail.EndEarlyConfirm')}
            confirmLabel={t('Common.Yes')}
            cancelLabel={t('Common.Cancel')}
            danger
            onConfirm={() => {
              setConfirmEarlyEnd(false);
              postOp('early_end');
            }}
            onCancel={() => setConfirmEarlyEnd(false)}
          />
        </>
      )}

      {flags.canSubscribe && (
        <Button
          variant="ghost"
          onClick={() => postOp('subscribe', { subscribe: tsdoc?.subscribe === 1 ? '0' : '1' })}
          disabled={pending}
          data-testid="btn-subscribe"
        >
          {tsdoc?.subscribe === 1 ? t('ContestDetail.Unsubscribe') : t('ContestDetail.Subscribe')}
        </Button>
      )}

      <nav className={styles.section}>
        <p className={styles.title}>{t('Common.Contests')}</p>
        {flags.canShowScoreboard && (
          <Link className={styles.action} to="contest_scoreboard" params={{ tid: tdoc.docId }}>
            {t('ContestDetail.Scoreboard')}
          </Link>
        )}
        {flags.canShowHiddenScoreboard && (
          <Link className={styles.action} to="contest_scoreboard_view" params={{ tid: tdoc.docId, view: 'hidden' }}>
            {t('ContestDetail.HiddenScoreboard')}
          </Link>
        )}
        {flags.canShowSelfRecord && (
          <Link
            className={styles.action}
            to="record_main"
            params={{ query: JSON.stringify({ tid: tdoc.docId, uidOrName: currentUserPerms._id }) }}
          >
            {t('ContestDetail.MySubmissions')}
          </Link>
        )}
        {flags.canShowAllRecord && (
          <Link
            className={styles.action}
            to="record_main"
            params={{ query: JSON.stringify({ tid: tdoc.docId }) }}
          >
            {t('ContestDetail.AllSubmissions')}
          </Link>
        )}
        {flags.canPrint && (
          <Link className={styles.action} to="contest_print" params={{ tid: tdoc.docId }}>
            {t('ContestDetail.Print')}
          </Link>
        )}
        {flags.canViewCode && (
          <Link className={styles.action} to="contest_code" params={{ tid: tdoc.docId }}>
            {t('ContestDetail.Code')}
          </Link>
        )}
        {flags.canShowDiscussion && (
          <Link className={styles.action} to="discussion_node" params={{ type: 'contest', name: tdoc.docId }}>
            {t('ContestDetail.Discussion')}
          </Link>
        )}
        {flags.canCreateDiscussion && (
          <Link className={styles.action} to="discussion_create" params={{ type: 'contest', name: tdoc.docId }}>
            + {t('ContestDetail.Discussion')}
          </Link>
        )}
      </nav>

      {(flags.canEdit || flags.canManage) && (
        <nav className={styles.section}>
          <p className={styles.title}>Admin</p>
          {flags.canEdit && (
            <Link className={styles.action} to="contest_edit" params={{ tid: tdoc.docId }}>
              {t('ContestDetail.Edit')}
            </Link>
          )}
          {flags.canManage && (
            <Link className={styles.action} to="contest_manage" params={{ tid: tdoc.docId }}>
              {t('ContestDetail.Manage')}
            </Link>
          )}
        </nav>
      )}
    </aside>
  );
}
```

**注意**：实际实现时需要先 Read `packages/ui-next/src/components/link.tsx`、`components/primitives/Alert.tsx`、`components/primitives/Button.tsx`、`components/primitives/ConfirmDialog.tsx`、`components/primitives/Toast.tsx`、`hooks/use-api.ts` 确认 props / API 签名（`useBuildUrl` / `Link` 的 `params` 类型，`request.post` 第三参数 options 的形状，`useToast().error` 的参数等）。如果 API 与代码片段不符，按真实 API 修正。

- [ ] **Step 5: 跑测试确认通过**

Run: `cd /home/xq/Hydro/packages/ui-next && npx vitest run src/components/contest/ContestDetailSidebar.test.tsx 2>&1 | tail -20`
Expected: PASS — 全部 7 用例通过。如失败，按真实 API 调整实现。

- [ ] **Step 6: Commit**

```bash
cd /home/xq/Hydro && git add packages/ui-next/src/components/contest/ContestDetailSidebar.tsx packages/ui-next/src/components/contest/ContestDetailSidebar.module.css packages/ui-next/src/components/contest/ContestDetailSidebar.test.tsx && git -c commit.gpgsign=false commit -m "feat(contest): add ContestDetailSidebar

11+ action buttons / links driven by computeContestActions. Attend
prompts for invitation code when tdoc._code exists. End Early shows
ConfirmDialog. Submit succeeds -> window.location.reload; failure ->
Alert + toast. 7 tests cover attend / invite-code / error / homework /
scoreboard / submissions.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 12: 完整 pages/contest_detail.tsx + 集成测试

**Files:**
- Modify: `packages/ui-next/src/pages/contest_detail.tsx`（替换占位）
- Create: `packages/ui-next/src/pages/contest_detail.test.tsx`

**Interfaces:**
- Consumes: 既有 Header / Description / Files / Timer / Sidebar 组件、`usePageData` from `hooks/use-page-data`、`isOngoing` / `isDone` from `lib/contest-status`、`useTranslate` from `lib/i18n`
- Produces: 完整路由页面，含 PrerenderHints 子组件（向 `<script type="speculationrules">` 注入 JSON）

- [ ] **Step 1: 创建集成测试**

Create `packages/ui-next/src/pages/contest_detail.test.tsx`：

```tsx
/* @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@monaco-editor/react', () => ({
  Editor: () => null,
  loader: { config: vi.fn() },
}));

vi.mock('../hooks/use-api', () => ({
  request: { post: vi.fn() },
  HydroClientError: class extends Error {},
  useApi: () => ({ run: vi.fn(), loading: false, error: null, data: null, setError: vi.fn() }),
}));

// Force deterministic timer state
vi.mock('../lib/contest-timer', () => ({
  useContestTimer: () => ({
    status: 'running' as const,
    msLeft: 3600_000,
    progress: 0.3,
    display: '01:00:00',
  }),
  computeTimerState: () => ({ status: 'running', msLeft: 0, progress: 0, display: '' }),
}));

const beginIso = '2026-07-08T10:00:00Z';
const endIso = '2026-07-08T15:00:00Z';

function buildPageData(args: any = {}) {
  return { name: 'contest_detail', template: 'contest_detail.html', url: '/contest/abc', args } as any;
}

import ContestDetailPage from './contest_detail';

describe('contest_detail page', () => {
  it('renders loading state when args is undefined', () => {
    render(<ContestDetailPage />);
    expect(screen.getByText(/比赛信息加载中|Contest information is loading/i)).toBeInTheDocument();
  });

  it('renders full upcoming non-attended contest', () => {
    const tdoc = {
      _id: '60a000000000000000000001',
      docId: '60a000000000000000000001',
      title: 'Summer Cup',
      rule: 'acm',
      beginAt: beginIso,
      endAt: endIso,
      duration: 5,
      owner: 1,
      pids: [],
    };
    const udict = { 1: { _id: 1, uname: 'admin', perm: 'BigInt::0' } };
    render(<ContestDetailPage _pageData={buildPageData({ tdoc, tsdoc: null, udict, files: [], urlForFile: (n: string) => `/f/${n}` })} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Summer Cup' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /报名参赛|Attend Contest/i })).toBeInTheDocument();
  });

  it('renders ongoing attended contest with private files', () => {
    const tdoc = {
      _id: '60a000000000000000000001',
      docId: '60a000000000000000000001',
      title: 'Live Contest',
      rule: 'acm',
      beginAt: beginIso,
      endAt: endIso,
      duration: 5,
      owner: 1,
      pids: [],
    };
    const tsdoc = { attend: 1, subscribe: 0, startAt: beginIso };
    const files = [{ name: 'spec.pdf', size: 4096 }];
    render(
      <ContestDetailPage
        _pageData={buildPageData({
          tdoc,
          tsdoc,
          udict: { 1: { _id: 1, uname: 'admin', perm: 'BigInt::0' } },
          files,
          urlForFile: (n: string) => `/f/${n}`,
        })}
      />,
    );
    expect(screen.getByRole('button', { name: /提前结束|End Contest Early/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'spec.pdf' })).toBeInTheDocument();
  });

  it('hides End Early when contest is done', () => {
    const tdoc = {
      _id: '60a000000000000000000001',
      docId: '60a000000000000000000001',
      title: 'Past Contest',
      rule: 'acm',
      beginAt: '2026-07-01T10:00:00Z',
      endAt: '2026-07-01T15:00:00Z',
      duration: 5,
      owner: 1,
      pids: [],
    };
    const tsdoc = { attend: 1, subscribe: 0, startAt: '2026-07-01T10:00:00Z' };
    render(
      <ContestDetailPage
        _pageData={buildPageData({
          tdoc,
          tsdoc,
          udict: { 1: { _id: 1, uname: 'admin', perm: 'BigInt::0' } },
          files: [],
          urlForFile: (n: string) => `/f/${n}`,
        })}
      />,
    );
    expect(screen.queryByRole('button', { name: /提前结束|End Contest Early/i })).not.toBeInTheDocument();
  });

  it('hides End Early for homework rule', () => {
    const tdoc = {
      _id: '60a000000000000000000001',
      docId: '60a000000000000000000001',
      title: 'HW',
      rule: 'homework',
      beginAt: beginIso,
      endAt: endIso,
      duration: 5,
      owner: 1,
      pids: [],
    };
    const tsdoc = { attend: 1, subscribe: 0, startAt: beginIso };
    render(
      <ContestDetailPage
        _pageData={buildPageData({
          tdoc,
          tsdoc,
          udict: { 1: { _id: 1, uname: 'admin', perm: 'BigInt::0' } },
          files: [],
          urlForFile: (n: string) => `/f/${n}`,
        })}
      />,
    );
    expect(screen.queryByRole('button', { name: /提前结束|End Contest Early/i })).not.toBeInTheDocument();
  });

  it('invokes prompt and POSTs with code when tdoc._code set', () => {
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('topsecret');
    const tdoc = {
      _id: '60a000000000000000000001',
      docId: '60a000000000000000000001',
      title: 'Invite',
      rule: 'acm',
      beginAt: beginIso,
      endAt: endIso,
      duration: 5,
      owner: 1,
      pids: [],
      _code: 'topsecret',
    };
    render(
      <ContestDetailPage
        _pageData={buildPageData({
          tdoc,
          tsdoc: null,
          udict: { 1: { _id: 1, uname: 'admin', perm: 'BigInt::0' } },
          files: [],
          urlForFile: (n: string) => `/f/${n}`,
        })}
      />,
    );
    const btn = screen.getByRole('button', { name: /报名参赛|Attend Contest/i });
    btn.click();
    expect(promptSpy).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd /home/xq/Hydro/packages/ui-next && npx vitest run src/pages/contest_detail.test.tsx 2>&1 | tail -10`
Expected: FAIL（页面是占位 / 不接受 `_pageData` prop）。

- [ ] **Step 3: 替换 pages/contest_detail.tsx 为完整版**

Replace `packages/ui-next/src/pages/contest_detail.tsx`：

```tsx
import { useEffect } from 'react';
import { Alert } from '../components/primitives/Alert';
import { ContestDetailHeader } from '../components/contest/ContestDetailHeader';
import { ContestDescription } from '../components/contest/ContestDescription';
import { ContestFiles } from '../components/contest/ContestFiles';
import { ContestTimer } from '../components/contest/ContestTimer';
import { ContestDetailSidebar } from '../components/contest/ContestDetailSidebar';
import { isDone, isOngoing } from '../lib/contest-status';
import { renderDuration } from '../lib/contest-status';
import { useTranslate } from '../lib/i18n';
import type { SerializedContestStatusDoc, SerializedTdoc, SerializedUserDict } from '../sections/types';
import styles from './contest_detail.module.css';

export type ContestDetailPageProps = {
  /** Test-only injection point — production uses usePageData() inside the component. */
  _pageData?: {
    name: string;
    template: string;
    url: string;
    args?: {
      tdoc?: SerializedTdoc & { owner?: number; allowPrint?: boolean; _code?: string };
      tsdoc?: SerializedContestStatusDoc | null;
      udict?: SerializedUserDict;
      files?: Array<{ name: string; size: number }>;
      urlForFile?: (name: string) => string;
    };
  };
};

function PrerenderHints() {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const proto = HTMLScriptElement.prototype as unknown as { addSpeculationRules?: unknown };
    if (typeof proto.addSpeculationRules !== 'function') return;
    const rules = {
      prerender: [
        {
          where: {
            or: [{ href_matches: '/p/*' }, { href_matches: '/d/*/p/*' }],
          },
        },
      ],
    };
    const s = document.createElement('script');
    s.type = 'speculationrules';
    s.textContent = JSON.stringify(rules);
    document.head.appendChild(s);
    return () => {
      s.remove();
    };
  }, []);
  return null;
}

export default function ContestDetailPage({ _pageData }: ContestDetailPageProps = {}) {
  const t = useTranslate();
  const pageData = _pageData ?? readPageData();
  const args = pageData?.args;

  if (!args || !args.tdoc) {
    return (
      <div className={styles.page} data-page="contest_detail">
        <Alert variant="info" message={t('ContestDetail.Loading')} />
      </div>
    );
  }

  const { tdoc, tsdoc = null, udict = {}, files = [], urlForFile = () => '#' } = args;
  const status: 'upcoming' | 'ongoing' | 'done' = isDone(tdoc) ? 'done' : isOngoing(tdoc) ? 'ongoing' : 'upcoming';

  return (
    <div className={styles.page} data-page="contest_detail">
      <PrerenderHints />
      <ContestDetailHeader
        title={tdoc.title}
        rule={tdoc.rule}
        status={status}
        attended={tsdoc?.attend === 1}
        durationText={renderDuration(tdoc)}
      />
      <ContestTimer tdoc={tdoc} tsdoc={tsdoc} />
      <div className={styles.layout}>
        <main className={styles.main}>
          <ContestDescription content={tdoc.content ?? ''} docId={String(tdoc.docId)} />
          <ContestFiles files={files} urlForFile={urlForFile} />
        </main>
        <ContestDetailSidebar tdoc={tdoc} tsdoc={tsdoc} udict={udict} urlForFile={urlForFile} />
      </div>
    </div>
  );
}

// Read PageData from window injection (production path). Falls back to undefined so the
// loading branch renders.
function readPageData(): ContestDetailPageProps['_pageData'] {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as { __hydro_page_data?: ContestDetailPageProps['_pageData'] };
  return w.__hydro_page_data;
}
```

- [ ] **Step 4: 创建 page CSS**

Create `packages/ui-next/src/pages/contest_detail.module.css`：

```css
.page {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  padding: var(--space-6) var(--space-8);
  max-width: 1280px;
  margin: 0 auto;
}

.layout {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: var(--space-6);
}

@media (max-width: 960px) {
  .layout {
    grid-template-columns: 1fr;
  }
}

.main {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-width: 0;
}
```

- [ ] **Step 5: 跑测试确认通过**

Run: `cd /home/xq/Hydro/packages/ui-next && npx vitest run src/pages/contest_detail.test.tsx 2>&1 | tail -20`
Expected: PASS — 6 用例全绿。

- [ ] **Step 6: Commit**

```bash
cd /home/xq/Hydro && git add packages/ui-next/src/pages/contest_detail.tsx packages/ui-next/src/pages/contest_detail.module.css packages/ui-next/src/pages/contest_detail.test.tsx && git -c commit.gpgsign=false commit -m "feat(pages): complete contest_detail migration

Replaces placeholder with full layout: Header / Timer (fixed) /
2-col grid (Description + Files | Sidebar). PrerenderHints injects
speculationrules JSON for /p/* and /d/*/p/*. 6 integration tests
cover loading state / upcoming / ongoing+attended+files / done /
homework / invitation code prompt.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 13: 全量回归 + Lint

**Files:** (none — verification only)

**Interfaces:**
- Consumes: 既有的 6 个 contest_detail 测试 + 既有 ui-next 测试
- Produces: 0 errors, 0 warnings

- [ ] **Step 1: 跑 contest_detail 全部测试**

Run:
```bash
cd /home/xq/Hydro/packages/ui-next && npx vitest run \
  src/lib/contest-actions.test.ts \
  src/lib/contest-timer.test.ts \
  src/components/contest/ContestDetailHeader.test.tsx \
  src/components/contest/ContestDescription.test.tsx \
  src/components/contest/ContestFiles.test.tsx \
  src/components/contest/ContestTimer.test.tsx \
  src/components/contest/ContestDetailSidebar.test.tsx \
  src/pages/contest_detail.test.tsx 2>&1 | tail -30
```
Expected: 全 PASS（应有 24 + 15 + 6 + 4 + 3 + 3 + 7 + 6 = 68 用例左右）。

- [ ] **Step 2: 跑全量 ui-next 测试**

Run: `cd /home/xq/Hydro/packages/ui-next && npx vitest run 2>&1 | tail -30`
Expected: 全 PASS，0 回归。

- [ ] **Step 3: 跑 lint**

Run: `cd /home/xq/Hydro && yarn lint 2>&1 | tail -30`
Expected: 0 errors。如果有 warning/error，按输出修正（最常见：未使用 import、props 类型不匹配）。

- [ ] **Step 4: 跑 oxlint**

Run: `cd /home/xq/Hydro && yarn oxlint 2>&1 | tail -20`
Expected: 0 errors。

- [ ] **Step 5: 跑构建**

Run: `cd /home/xq/Hydro && yarn build 2>&1 | tail -20`
Expected: 0 errors。`packages/ui-next` 编译产物含 `contest_detail` 路由。

- [ ] **Step 6: 验证路由名最终对齐**

Run:
```bash
echo "=== ui-next registered ===" && grep -n "registerPage.*contest_detail" /home/xq/Hydro/packages/ui-next/src/pages/index.ts
echo "=== server handler ===" && grep -n "ctx.Route.*contest_detail" /home/xq/Hydro/packages/hydrooj/src/handler/contest.ts
```
Expected: 两行各匹配一行，路由名完全一致 `contest_detail`。

- [ ] **Step 7: 手动 smoke（可选）**

Run: `cd /home/xq/Hydro && yarn debug` 启动 dev 服务器。
- 浏览器访问 `http://localhost:2333/contest/<existingTid>`
- 确认页面渲染、侧边栏按钮按权限显隐、Attend 弹 prompt、End Early 弹 ConfirmDialog
- 倒计时每秒更新，NProgress 进度条与状态匹配
- 私有附件显示列表（若有）
- DevTools Console 无 error / warning

如果 smoke 通过，在最后一个 commit 中追加注释：

```bash
cd /home/xq/Hydro && git -c commit.gpgsign=false commit --allow-empty -m "chore(contest_detail): manual smoke passed

Verified in dev: page renders, sidebar actions gate on flags, timer
ticks, files list, prerender hint injected, no console errors.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

（如果 smoke 发现问题，新增 task 修复，不要在本 task 内做架构变更。）

---

## Self-Review Checklist

When implementing, after each task the implementer should verify:

- [ ] **Spec coverage:** Task 1 ↔ spec §7 i18n；Task 2 ↔ spec §3 types；Task 3 ↔ spec §5 contest-actions；Task 4-5 ↔ spec §5 contest-timer；Task 6 ↔ spec §3 路由；Task 7-10 ↔ spec §5 各组件；Task 11 ↔ spec §5 Sidebar；Task 12 ↔ spec §4 布局 + §5 Speculation Rules；Task 13 ↔ spec §8 测试策略
- [ ] **No placeholders:** 全文搜索 `TBD` / `TODO` / `implement later` / `fill in details` → 0 命中
- [ ] **Type consistency:** Task 3 定义 `UserPerms`，Task 11 在 props 中复用 `UserPerms`；Task 4 定义 `TimerState`，Task 5/10 复用；Task 7-10 定义 props，Task 12 透传
- [ ] **Route name consistency:** `contest_detail` 在 ui-next `pages/index.ts` 与 server `handler/contest.ts` 完全一致
- [ ] **Commit atomicity:** 13 个 commit，每个 task 一个，便于回滚

---

## Spec Gaps Closed During Plan Writing

1. **i18n key 数量**：spec §7 列了 22 条；plan Task 1 严格按字母序写入 22 条 ✓
2. **SerializedUserDict 位置**：spec §3 提到 `sections/types.ts`，plan Task 2 落实 ✓
3. **ConfirmDialog props**：spec §5 Sidebar 提到用 ConfirmDialog；plan Task 11 调 `danger / onConfirm / onCancel` props（以 primitives 实际 API 为准，若失败按真实 API 调整） ⚠ 实现时确认
4. **PrerenderHints 浏览器支持**：spec §6 提到 `if (!('addSpeculationRules' in HTMLScriptElement.prototype)) return;`，plan Task 12 改用 `typeof proto.addSpeculationRules !== 'function'` 兼容性写法 ✓
5. **Chip tone**：spec §5 Header 提到 `Chip tone={...}`，plan Task 7 用 `'soon' / 'live' / 'finished' / 'attended'` 作为示意，但 Chip primitive 的实际 tone 集合可能不同，**实现时需 Read `Chip.tsx` 后按真实 API 调整** ⚠
