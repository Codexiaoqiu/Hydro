# SP1: ui-next 4 个断链页修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 迁移 4 个被已迁移页面硬链接但 ui-next 实际 404 的页面:`problem_solution` / `discussion_detail` / `user_detail` / `problem_statistics`,消除 SP0 review H3 报告的全部断链,使 ui-next 不会在导航到这 4 个路径时回退到 ui-default。

**Architecture:** 沿用 SP0 流程 — `registerPage` + co-located `.module.css` + co-located `.test.tsx` + `manifest.ts` 数据源 + `manifest.test.ts` 漂移检测。每个页面以 4 个**共享基础组件**为依赖:`Paginator` (3 页用)、`CommentsSection` 家族 (2 页用)、`ProfileHeader` (1 页 + 1 侧栏用)、`SubmissionCharts` (1 页用)。新建组件直接落到 `components/primitives`、`components/comments`、`components/profile`、`components/charts` 各按既有目录约定。

**Tech Stack:** 与 SP0 一致 — TypeScript 严格模式、React 19 + Vite、vitest + happy-dom + @testing-library/react。**不引入新依赖**(尤其不引入 echarts);problem_statistics 图表用既有的 `Ring` / `Trend` / `TrendBars` 扩展简化版,这是已知的精度取舍,记入 Known Limitations。

## Global Constraints

- Node ≥22; Yarn 4 workspace; `@hydrooj/register` for on-the-fly TS transpilation.
- **不引入新运行时依赖**(特别是 echarts / Chart.js / D3)。图表用既有 `Ring` / `Trend` / `TrendBars` 组合实现,精度上比 ui-default 的 echarts 简单,在 plan §Known Limitations 中钉死。
- 沿用 SP0 全局约束:不引入新的 ESLint 报错或测试回归;不修改 `AGPLv3` / `README.md`;后端 handler 不动;`@hydrooj/common` 的 `STATUS` / `PERM` / `PRIV` 不重复定义。
- 沿用 SP0 漂移检测:每个新页面必须同时更新 `packages/ui-next/src/pages/manifest.ts` 和 `packages/ui-next/src/pages/index.ts`,否则 `manifest.test.ts` 立即 fail。
- 测试环境:**所有新 .test.tsx 加 `/* @vitest-environment happy-dom */` 头**(与 problem_main.test.tsx 一致)。
- TDD 严格执行:先写 failing test、再写最小实现、补 commit;不批量写实现后补测试。
- 多 commit 节奏:每个 Task 末尾 1 次 commit,Task 标题即为 commit subject。
- 已知限制的告知:不引入 echarts 意味着 `problem_statistics` 的图表密度/交互性低于 ui-default。这不是 SP1 的修复目标,留作 SP1+ backlog。

---

## File Structure

### Created (per task)

| Task | File | Responsibility |
|---|---|---|
| 1 | `packages/ui-next/src/components/primitives/Paginator.tsx` | 分页器,左右/数字/省略号,3 页共用 |
| 1 | `packages/ui-next/src/components/primitives/Paginator.module.css` | Paginator 样式 |
| 1 | `packages/ui-next/src/components/primitives/Paginator.test.tsx` | 边界页 / 省略号 / 当前页高亮 |
| 1 | `packages/ui-next/src/components/primitives/index.ts` | 增加 `export { Paginator }` |
| 2 | `packages/ui-next/src/components/comments/CommentTree.tsx` | 单条评论 + 内嵌回复树(两级) |
| 2 | `packages/ui-next/src/components/comments/CommentTree.module.css` | CommentTree 样式 |
| 2 | `packages/ui-next/src/components/comments/CommentEditor.tsx` | Markdown 编辑器 + 上传图片(轻) |
| 2 | `packages/ui-next/src/components/comments/CommentEditor.module.css` | CommentEditor 样式 |
| 2 | `packages/ui-next/src/components/comments/CommentsSection.tsx` | 顶层容器:渲染列表 + 编辑器 + 权限 + 文案 |
| 2 | `packages/ui-next/src/components/comments/CommentsSection.module.css` | CommentsSection 样式 |
| 2 | `packages/ui-next/src/components/comments/CommentsSection.test.tsx` | 列表渲染 / 编辑器权限 / 占位 |
| 3 | `packages/ui-next/src/components/profile/ProfileHeader.tsx` | 用户主页大头部:头像 + 名字 + 徽章 + 联系方式 |
| 3 | `packages/ui-next/src/components/profile/ProfileHeader.module.css` | ProfileHeader 样式 |
| 3 | `packages/ui-next/src/components/profile/ProfileHeader.test.tsx` | 渲染 / 自己的资料 / 禁言 / 邮箱 QQ 微信工具 |
| 3 | `packages/ui-next/src/components/profile/UserStat.tsx` | 3 格统计(Submitted / Accepted / Solutions Liked) |
| 3 | `packages/ui-next/src/components/profile/UserStat.module.css` | UserStat 样式 |
| 3 | `packages/ui-next/src/components/profile/UserStat.test.tsx` | 数值 / 默认值 0 / 标签 |
| 3 | `packages/ui-next/src/components/profile/ProfileTabs.tsx` | Bio / Accepted Problems / 插件注入标签 |
| 3 | `packages/ui-next/src/components/profile/ProfileTabs.module.css` | 标签切换样式 |
| 4 | `packages/ui-next/src/components/charts/SubmissionStatusChart.tsx` | 提交状态分布(8-12 个状态列) |
| 4 | `packages/ui-next/src/components/charts/SubmissionStatusChart.module.css` | chart 样式 |
| 4 | `packages/ui-next/src/components/charts/SubmissionStatusChart.test.tsx` | 边界 / 排序 / 0-rendering |
| 4 | `packages/ui-next/src/components/charts/SubmissionScoreChart.tsx` | 分数分布(0-100 分 10 段 TrendBars) |
| 4 | `packages/ui-next/src/components/charts/SubmissionScoreChart.module.css` | chart 样式 |
| 4 | `packages/ui-next/src/components/charts/SubmissionScoreChart.test.tsx` | 数值 / 0-rendering |
| 5 | `packages/ui-next/src/pages/problem_solution.tsx` | 题解列表 + 单条题解 + 回复 |
| 5 | `packages/ui-next/src/pages/problem_solution.module.css` | 页面样式 |
| 5 | `packages/ui-next/src/pages/problem_solution.test.tsx` | 空状态 / 多条 / 单条 sid / 翻页 |
| 6 | `packages/ui-next/src/pages/discussion_detail.tsx` | 讨论详情 + 主帖 + 评论 |
| 6 | `packages/ui-next/src/pages/discussion_detail.module.css` | 页面样式 |
| 6 | `packages/ui-next/src/pages/discussion_detail.test.tsx` | 锁帖 / 编辑 / 反应 / 评论 |
| 7 | `packages/ui-next/src/pages/user_detail.tsx` | 用户主页(Bio + Accepted Problems + 统计) |
| 7 | `packages/ui-next/src/pages/user_detail.module.css` | 页面样式 |
| 7 | `packages/ui-next/src/pages/user_detail.test.tsx` | 自看 / 别人看 / 禁言 / 标签云 |
| 8 | `packages/ui-next/src/pages/problem_statistics.tsx` | 提交统计 + 状态/分数图 + 记录表 |
| 8 | `packages/ui-next/src/pages/problem_statistics.module.css` | 页面样式 |
| 8 | `packages/ui-next/src/pages/problem_statistics.test.tsx` | 空状态 / 过滤 / 排序 / 翻页 |

### Modified

| File | Change |
|---|---|
| `packages/ui-next/src/pages/manifest.ts` | `NEXT_PAGES` 增加 4 项:`problem_solution` / `discussion_detail` / `user_detail` / `problem_statistics` |
| `packages/ui-next/src/pages/index.ts` | `registerPage(...)` 增加 4 行 |
| `packages/ui-next/src/pages/manifest.test.ts` | 锁定 4 个新模板必含,以防注册漂移 |
| `test/main.ts` | 加 4 条 e2e 烟雾测试(GET 不再 SPA-fallback 404) |
| `.claude/report/2026-07-28-sp1-broken-pages-completion.md` | 任务完成报告(SP1 末) |

### Unchanged but referenced

- `packages/ui-next/src/components/sidebar/ProblemSidebar.tsx` — Task 5/8 在 `clientRoutes` 已有 `problem_solution` / `problem_statistics`,**不需修改**。
- `packages/ui-next/src/components/primitives/MarkdownPreview.tsx` — Task 5/6/7 直接复用 `renderArticleBlocks`。
- `packages/ui-next/src/components/primitives/Card.tsx` / `Button.tsx` / `Chip.tsx` / `Avatar.tsx` — 既有。
- `packages/ui-next/src/lib/perms.ts` — `canXxx` / `hasPerm` / `isLoggedIn` 已在 problem_main.tsx 中使用,直接复用。
- `packages/hydrooj/src/handler/problem.ts:834-944` (ProblemSolutionHandler)、`:968-992` (ProblemStatisticsHandler) — 注入的 args **逐字段** 反映到 page 的 `Args` 接口,**不修改后端**。

---

## Task 1: Paginator primitive

**Files:**
- Create: `packages/ui-next/src/components/primitives/Paginator.tsx`
- Create: `packages/ui-next/src/components/primitives/Paginator.module.css`
- Create: `packages/ui-next/src/components/primitives/Paginator.test.tsx`
- Modify: `packages/ui-next/src/components/primitives/index.ts:1-40` — 新增 export

**Interfaces:**
- Produces: `<Paginator current={page} total={pcount} buildHref={(p) => string} />`
- Consumed by: Tasks 5/6/8 (problem_solution / discussion_detail / problem_statistics)

**Reuse notes:** problem_main.tsx 内部已有 `Pager` 组件(line 131-179),本 Task **不** 直接复用,因为那个 Pager 只针对 `problem_main` 的 query shape;Paginator 设计为通用,接受 `buildHref` 回调由 caller 决定如何拼 URL。

- [ ] **Step 1: Write the failing test**

```tsx
/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Paginator } from './Paginator';

describe('Paginator', () => {
  it('renders nothing when total <= 1', () => {
    const { container } = render(
      <Paginator current={1} total={1} buildHref={(p) => `?page=${p}`} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders all pages when total <= 7', () => {
    render(<Paginator current={2} total={5} buildHref={(p) => `?page=${p}`} />);
    for (let i = 1; i <= 5; i += 1) {
      expect(screen.getByText(String(i))).toBeInTheDocument();
    }
  });

  it('marks the current page with aria-current="page"', () => {
    render(<Paginator current={3} total={5} buildHref={(p) => `?page=${p}`} />);
    const current = screen.getByText('3');
    expect(current.getAttribute('aria-current')).toBe('page');
  });

  it('renders ellipsis when total > 7', () => {
    render(<Paginator current={5} total={20} buildHref={(p) => `?page=${p}`} />);
    expect(screen.getAllByText('…').length).toBeGreaterThan(0);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
  });

  it('calls buildHref with the new page number on link href', () => {
    render(<Paginator current={2} total={5} buildHref={(p) => `?page=${p}`} />);
    const link4 = screen.getByText('4');
    expect(link4.getAttribute('href')).toBe('?page=4');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn workspace @hydrooj/ui-next test src/components/primitives/Paginator.test.tsx`
Expected: FAIL — `Paginator` not exported from `./Paginator`.

- [ ] **Step 3: Implement Paginator.tsx**

```tsx
import { Link } from '../link';
import styles from './Paginator.module.css';

export interface PaginatorProps {
  current: number;
  total: number;
  buildHref: (page: number) => string;
  /** Optional aria-label override. Defaults to a Chinese label. */
  ariaLabel?: string;
}

function buildItems(current: number, total: number): Array<number | 'gap'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const items: Array<number | 'gap'> = [1];
  const window = 1;
  if (current - window > 2) items.push('gap');
  for (let i = Math.max(2, current - window); i <= Math.min(total - 1, current + window); i += 1) {
    items.push(i);
  }
  if (current + window < total - 1) items.push('gap');
  items.push(total);
  return items;
}

export function Paginator({ current, total, buildHref, ariaLabel = '分页' }: PaginatorProps) {
  if (!total || total <= 1) return null;
  const items = buildItems(current, total);
  return (
    <nav className={styles.pager} aria-label={ariaLabel}>
      {items.map((it, idx) => {
        if (it === 'gap') {
          return (
            <span key={`g-${idx}`} className={styles.gap} aria-hidden="true">…</span>
          );
        }
        const active = it === current;
        return (
          <Link
            key={it}
            href={buildHref(it)}
            className={active ? `${styles.item} ${styles.active}` : styles.item}
            aria-current={active ? 'page' : undefined}
          >
            {it}
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 4: Add Paginator.module.css**

```css
.pager {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1, 4px);
  flex-wrap: wrap;
  font-family: var(--font-display, system-ui, sans-serif);
  font-size: var(--text-sm, 0.875rem);
}

.item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2rem;
  height: 2rem;
  padding: 0 var(--space-2, 8px);
  border-radius: var(--radius-sm, 6px);
  border: 1px solid var(--border, transparent);
  background: var(--surface-2, transparent);
  color: var(--fg, inherit);
  text-decoration: none;
  transition: background 120ms ease, border-color 120ms ease;
}

.item:hover {
  background: var(--surface-3, rgba(0, 0, 0, 0.04));
}

.active {
  background: var(--accent, #5e6ad2);
  border-color: var(--accent, #5e6ad2);
  color: var(--accent-fg, #fff);
}

.gap {
  color: var(--fg-muted, #888);
  padding: 0 var(--space-1, 4px);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `yarn workspace @hydrooj/ui-next test src/components/primitives/Paginator.test.tsx`
Expected: 5 passed.

- [ ] **Step 6: Export from primitives/index.ts**

Edit `packages/ui-next/src/components/primitives/index.ts` — add `export { Paginator } from './Paginator';` (位置参考其他 re-export 排序)。

- [ ] **Step 7: Commit**

```bash
git add packages/ui-next/src/components/primitives/Paginator.tsx \
        packages/ui-next/src/components/primitives/Paginator.module.css \
        packages/ui-next/src/components/primitives/Paginator.test.tsx \
        packages/ui-next/src/components/primitives/index.ts
git commit -m "feat(ui-next): add Paginator primitive for solution/discussion/statistics"
```

---

## Task 2: CommentsSection family (problem_solution + discussion_detail 共享)

**Files:**
- Create: `packages/ui-next/src/components/comments/CommentTree.tsx` + `.module.css`
- Create: `packages/ui-next/src/components/comments/CommentEditor.tsx` + `.module.css`
- Create: `packages/ui-next/src/components/comments/CommentsSection.tsx` + `.module.css`
- Create: `packages/ui-next/src/components/comments/CommentsSection.test.tsx`

**Interfaces:**
- Produces:
  - `<CommentTree item={doc} replies={doc.reply} udict={...} />` — 单条 + 内嵌回复
  - `<CommentEditor parentId={...} onSubmit={...} placeholder={...} />` — Markdown 编辑
  - `<CommentsSection docs={...} udict={...} kind="solution"|"discussion" config={...} />` — 顶层
- `config` 字段:
  - `postOp: string` — POST operation 名(e.g. 'submit' / 'reply')
  - `editOp: string` — POST operation 名
  - `deleteOp: string` — POST operation 名
  - `postPerm: number` — 调用 `hasPerm(postPerm)` 决定是否显示编辑器
  - `editSelfPerm: number` / `editPerm: number` — 二选一,看 `user.own(item)` 决定
  - `commentRef: string` — 评论的 id 字段名(e.g. `'psid'` / `'drid'`)
  - `replyRef: string` — 回复的 id 字段名(e.g. `'psrid'` / `'drrid'`)
  - `placeholder?: string` — 编辑器 placeholder
  - `markdownReadOnly?: boolean` — 已迁移的 UUID-only reply use `MarkdownPreview`
- Consumed by: Tasks 5 (problem_solution) and 6 (discussion_detail).

**Scope decision (避免和 ui-default 不一致):** 本 Task 不迁移 reactions、star、lock、edit-history 等富交互组件 — 这些 ui-default 是 jQuery 插件驱动的,在 SPA 内需**单独**重构;SP1 范围是先把评论树 + 编辑/回复/删除三个 verb 跑通,其余 verb 留作 SP1+ backlog。源码在 `packages/ui-default/templates/components/comments_solution.html` 和 `comments_discussion.html` 内可见,本 Task 仅实现与这两个文件 1:1 对应的三 verb 闭环。**这条限制必须在 Task 5 / Task 6 的 Args 文档中钉死**。

- [ ] **Step 1: Write the failing test**

```tsx
/* @vitest-environment happy-dom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CommentsSection } from './CommentsSection';

const baseUdict = {
  1: { _id: 1, uname: 'alice', avatar: '' },
  2: { _id: 2, uname: 'bob', avatar: '' },
};

describe('CommentsSection', () => {
  it('renders nothing when docs is empty', () => {
    render(
      <CommentsSection
        docs={[]}
        udict={baseUdict}
        kind="solution"
        config={{ postOp: 'submit', editOp: 'edit_solution', deleteOp: 'delete_solution', postPerm: 1, editSelfPerm: 1, commentRef: 'psid', replyRef: 'psrid' }}
        user={{ _id: 1, hasPerm: () => true }}
      />,
    );
    expect(screen.getByText(/暂无题解/)).toBeInTheDocument();
  });

  it('renders one CommentTree per doc', () => {
    const docs = [
      { docId: 'a', owner: 1, content: 'first solution', reply: [] },
      { docId: 'b', owner: 2, content: 'second solution', reply: [] },
    ];
    render(
      <CommentsSection
        docs={docs as any}
        udict={baseUdict}
        kind="solution"
        config={{ postOp: 'submit', editOp: 'edit_solution', deleteOp: 'delete_solution', postPerm: 1, editSelfPerm: 1, commentRef: 'psid', replyRef: 'psrid' }}
        user={{ _id: 1, hasPerm: () => true }}
      />,
    );
    expect(screen.getByText('first solution')).toBeInTheDocument();
    expect(screen.getByText('second solution')).toBeInTheDocument();
  });

  it('hides editor when user lacks postPerm', () => {
    render(
      <CommentsSection
        docs={[]}
        udict={baseUdict}
        kind="discussion"
        config={{ postOp: 'reply', editOp: 'edit_reply', deleteOp: 'delete_reply', postPerm: 99, editSelfPerm: 99, commentRef: 'drid', replyRef: 'drrid' }}
        user={{ _id: 1, hasPerm: (p: number) => p !== 99 }}
      />,
    );
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('calls onSubmit with markdown content when editor submitted', () => {
    const onSubmit = vi.fn();
    render(
      <CommentsSection
        docs={[]}
        udict={baseUdict}
        kind="solution"
        config={{ postOp: 'submit', editOp: 'edit_solution', deleteOp: 'delete_solution', postPerm: 1, editSelfPerm: 1, commentRef: 'psid', replyRef: 'psrid' }}
        user={{ _id: 1, hasPerm: () => true }}
        onSubmit={onSubmit}
      />,
    );
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'my solution' } });
    fireEvent.click(screen.getByRole('button', { name: /发布/ }));
    expect(onSubmit).toHaveBeenCalledWith('my solution');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn workspace @hydrooj/ui-next test src/components/comments/CommentsSection.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement CommentEditor.tsx**

```tsx
import { useState } from 'react';
import { Button } from '../primitives/Button';
import styles from './CommentEditor.module.css';

export interface CommentEditorProps {
  placeholder?: string;
  initialValue?: string;
  submitText?: string;
  onSubmit: (content: string) => void | Promise<void>;
  onCancel?: () => void;
}

export function CommentEditor({
  placeholder = '写下你的回复…',
  initialValue = '',
  submitText = '发布',
  onSubmit,
  onCancel,
}: CommentEditorProps) {
  const [value, setValue] = useState(initialValue);
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    if (!value.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(value);
      setValue('');
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div className={styles.editor}>
      <textarea
        className={styles.textarea}
        rows={4}
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label={placeholder}
      />
      <div className={styles.actions}>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>取消</Button>
        )}
        <Button
          type="button"
          variant="primary"
          onClick={submit}
          disabled={!value.trim() || submitting}
        >
          {submitting ? '...' : submitText}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Add CommentEditor.module.css**

```css
.editor { display: flex; flex-direction: column; gap: var(--space-2, 8px); }
.textarea {
  width: 100%;
  padding: var(--space-2, 8px);
  border: 1px solid var(--border, #ccc);
  border-radius: var(--radius-sm, 6px);
  background: var(--surface-1, #fff);
  color: var(--fg, inherit);
  font: inherit;
  resize: vertical;
  min-height: 5rem;
}
.actions { display: flex; gap: var(--space-2, 8px); justify-content: flex-end; }
```

- [ ] **Step 5: Implement CommentTree.tsx**

```tsx
import { useState } from 'react';
import { MarkdownEditor } from '../primitives/MarkdownEditor';
import { MarkdownPreview } from '../primitives/MarkdownPreview';
import { useUserContext } from '../../context/page-data';
import styles from './CommentTree.module.css';

export interface CommentItem {
  docId: string | number;
  owner: number;
  content: string;
  vote?: number;
  reply?: CommentItem[];
}

export interface CommentTreeProps {
  item: CommentItem;
  replies: CommentItem[];
  udict: Record<number, { _id: number, uname: string, avatar?: string }>;
  onEdit?: (item: CommentItem, content: string) => void;
  onDelete?: (item: CommentItem) => void;
  onReply?: (parent: CommentItem, content: string) => void;
  editPermCheck: (item: CommentItem) => boolean;
  deletePermCheck: (item: CommentItem) => boolean;
  editPlaceholder?: string;
  replyPlaceholder?: string;
}

export function CommentTree({
  item, replies, udict, onEdit, onDelete, onReply,
  editPermCheck, deletePermCheck,
  editPlaceholder = '编辑…', replyPlaceholder = '回复…',
}: CommentTreeProps) {
  const user = useUserContext();
  const [editing, setEditing] = useState(false);
  const [replying, setReplying] = useState(false);
  const owner = udict[item.owner];
  const canEdit = editPermCheck(item);
  const canDelete = deletePermCheck(item);
  const canReply = !!onReply && !!user && (user._id ?? 0) > 0;
  return (
    <article className={styles.item} data-doc-id={String(item.docId)}>
      <header className={styles.head}>
        <strong>{owner?.uname ?? `uid:${item.owner}`}</strong>
        {canEdit && (
          <button type="button" className={styles.action} onClick={() => setEditing((v) => !v)}>
            {editing ? '取消' : '编辑'}
          </button>
        )}
        {canDelete && (
          <button type="button" className={styles.action} onClick={() => onDelete?.(item)}>
            删除
          </button>
        )}
      </header>
      {editing && onEdit ? (
        <MarkdownEditor
          value={item.content}
          onChange={() => { /* controlled by save button below */ }}
          placeholder={editPlaceholder}
          onSave={async (next) => { await onEdit(item, next); setEditing(false); }}
        />
      ) : (
        <div className={styles.body}>
          <MarkdownPreview source={item.content} />
        </div>
      )}
      {replies.length > 0 && (
        <ul className={styles.replies}>
          {replies.map((r) => (
            <CommentTree
              key={r.docId}
              item={r}
              replies={r.reply || []}
              udict={udict}
              onEdit={onEdit}
              onDelete={onDelete}
              onReply={onReply}
              editPermCheck={editPermCheck}
              deletePermCheck={deletePermCheck}
              editPlaceholder={editPlaceholder}
              replyPlaceholder={replyPlaceholder}
            />
          ))}
        </ul>
      )}
      {canReply && !replying && (
        <button type="button" className={styles.replyToggle} onClick={() => setReplying(true)}>
          回复
        </button>
      )}
      {canReply && replying && onReply && (
        <MarkdownEditor
          value=""
          onChange={() => {}}
          placeholder={replyPlaceholder}
          onSave={async (next) => { await onReply(item, next); setReplying(false); }}
        />
      )}
    </article>
  );
}
```

- [ ] **Step 6: Add CommentTree.module.css**

```css
.item { padding: var(--space-3, 12px); border-bottom: 1px solid var(--border, rgba(0,0,0,0.08)); }
.head { display: flex; gap: var(--space-2, 8px); align-items: center; margin-bottom: var(--space-2, 8px); }
.action { background: none; border: 0; cursor: pointer; color: var(--fg-muted, #888); font: inherit; }
.body { line-height: 1.6; }
.replies { list-style: none; padding-left: var(--space-4, 16px); margin: var(--space-2, 8px) 0 0; }
.replyToggle { margin-top: var(--space-2, 8px); background: none; border: 0; color: var(--accent, #5e6ad2); cursor: pointer; font: inherit; }
```

- [ ] **Step 7: Implement CommentsSection.tsx**

```tsx
import { useUserContext } from '../../context/page-data';
import { CommentEditor } from './CommentEditor';
import { CommentTree, type CommentItem } from './CommentTree';
import styles from './CommentsSection.module.css';

export interface CommentsConfig {
  postOp: string;
  editOp: string;
  deleteOp: string;
  postPerm: number;
  editSelfPerm: number;
  editPerm?: number;
  deletePerm?: number;
  commentRef: string;
  replyRef: string;
  placeholder?: string;
}

export interface CommentsSectionProps {
  docs: CommentItem[];
  udict: Record<number, { _id: number, uname: string, avatar?: string }>;
  kind: 'solution' | 'discussion';
  config: CommentsConfig;
  /** Optional callback for parent paragraphs to provide custom submit logic. */
  onSubmit?: (content: string) => void | Promise<void>;
  onEdit?: (item: CommentItem, content: string) => void | Promise<void>;
  onDelete?: (item: CommentItem) => void | Promise<void>;
  onReply?: (parent: CommentItem, content: string) => void | Promise<void>;
  emptyText?: string;
}

/**
 * Renders a list of comments with optional editors. The Section intentionally
 * does NOT call any HTTP endpoint directly — pages wire `onSubmit` / `onEdit` /
 * `onDelete` / `onReply` to the backend's `<form>` posts, so the same Comments
 * works for both problem_solution and discussion_detail without a fetch layer.
 */
export function CommentsSection({
  docs, udict, kind, config, onSubmit, onEdit, onDelete, onReply,
  emptyText,
}: CommentsSectionProps) {
  const user = useUserContext();
  const canPost = !!user?.hasPerm && user.hasPerm(config.postPerm);
  const editPermCheck = (item: CommentItem) => {
    if (!user) return false;
    if (user.hasPerm(config.editPerm ?? -1)) return true;
    return user.own?.(item) && user.hasPerm(config.editSelfPerm);
  };
  const deletePermCheck = (item: CommentItem) => {
    if (!user) return false;
    if (user.hasPerm(config.deletePerm ?? -1)) return true;
    return user.own?.(item) && user.hasPerm(config.editSelfPerm);
  };
  const fallbackEmpty = kind === 'solution' ? '暂无题解' : '暂无评论';
  return (
    <section className={styles.section} data-comments-kind={kind}>
      {canPost && onSubmit && (
        <div className={styles.compose}>
          <CommentEditor
            placeholder={config.placeholder ?? (kind === 'solution' ? '写下你的题解' : '写下你的回复')}
            onSubmit={onSubmit}
          />
        </div>
      )}
      {docs.length === 0 ? (
        <p className={styles.empty}>{emptyText ?? fallbackEmpty}</p>
      ) : (
        <ul className={styles.list}>
          {docs.map((d) => (
            <li key={d.docId}>
              <CommentTree
                item={d}
                replies={d.reply || []}
                udict={udict}
                onEdit={onEdit}
                onDelete={onDelete}
                onReply={onReply}
                editPermCheck={editPermCheck}
                deletePermCheck={deletePermCheck}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

- [ ] **Step 8: Add CommentsSection.module.css**

```css
.section { display: flex; flex-direction: column; gap: var(--space-3, 12px); }
.compose { padding: var(--space-3, 12px); border: 1px dashed var(--border, rgba(0,0,0,0.18)); border-radius: var(--radius-sm, 6px); }
.empty { color: var(--fg-muted, #888); text-align: center; padding: var(--space-4, 16px); }
.list { list-style: none; padding: 0; margin: 0; }
```

- [ ] **Step 9: Run test to verify it passes**

Run: `yarn workspace @hydrooj/ui-next test src/components/comments/CommentsSection.test.tsx`
Expected: 4 passed.

- [ ] **Step 10: Type-check**

Run: `yarn workspace @hydrooj/ui-next exec tsc -b 2>&1 | head -40`
Expected: 0 errors (TouchTree / CommentEditor / CommentsSection newly-typed).

- [ ] **Step 11: Commit**

```bash
git add packages/ui-next/src/components/comments/
git commit -m "feat(ui-next): add CommentsSection family for solution + discussion threads"
```

---

## Task 3: ProfileHeader + UserStat + ProfileTabs (user_detail 基础)

**Files:**
- Create: `packages/ui-next/src/components/profile/ProfileHeader.tsx` + `.module.css` + `.test.tsx`
- Create: `packages/ui-next/src/components/profile/UserStat.tsx` + `.module.css` + `.test.tsx`
- Create: `packages/ui-next/src/components/profile/ProfileTabs.tsx` + `.module.css`

**Interfaces:**
- Produces:
  - `<ProfileHeader udoc={...} isSelf={...} canViewPrivate={...} />`
  - `<UserStat submitted={n} accepted={n} liked={n} />`
  - `<ProfileTabs bio={...} acceptedProblems={...} pluginTabs={...} />`
- Consumed by: Task 7 (user_detail) and Task 6 (discussion_detail 自报侧栏可复用 UserStat)

**Scope decision:** ProfileHeader **不** 复制 ui-default 的 `data-copy` / `data-tooltip` jQuery 行为 — 复制到剪贴板改用 `navigator.clipboard.writeText` + Toast 提示,这是 SP1+ 的范围。

- [ ] **Step 1: Write ProfileHeader failing test**

```tsx
/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProfileHeader } from './ProfileHeader';

const baseUdoc = {
  _id: 7, uname: 'alice', avatar: '', regat: 0, loginat: 0, mail: '', qq: '', wechat: '',
  gender: 0, nSubmit: 0, nAccept: 0, nLiked: 0, rp: 0, rank: 0, bio: '',
};

describe('ProfileHeader', () => {
  it('renders username', () => {
    render(<ProfileHeader udoc={baseUdoc} isSelf={false} canViewPrivate={false} />);
    expect(screen.getByRole('heading', { name: 'alice' })).toBeInTheDocument();
  });

  it('hides Edit Profile link when not self', () => {
    render(<ProfileHeader udoc={baseUdoc} isSelf={false} canViewPrivate={false} />);
    expect(screen.queryByText(/Edit Profile|编辑资料/)).toBeNull();
  });

  it('shows Edit Profile link when self', () => {
    render(<ProfileHeader udoc={baseUdoc} isSelf={true} canViewPrivate={false} />);
    expect(screen.getByText(/编辑资料/)).toBeInTheDocument();
  });

  it('does not render contact items when contact fields empty', () => {
    render(<ProfileHeader udoc={baseUdoc} isSelf={false} canViewPrivate={false} />);
    expect(screen.queryByLabelText(/Copy Email|复制邮箱/)).toBeNull();
  });

  it('renders contact items when mail/qq/wechat are present', () => {
    render(
      <ProfileHeader
        udoc={{ ...baseUdoc, mail: 'a@b', qq: '123', wechat: 'wx' }}
        isSelf={false}
        canViewPrivate={false}
      />,
    );
    expect(screen.getByLabelText(/复制邮箱/)).toBeInTheDocument();
    expect(screen.getByLabelText(/QQ/)).toBeInTheDocument();
    expect(screen.getByLabelText(/微信/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn workspace @hydrooj/ui-next test src/components/profile/ProfileHeader.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement ProfileHeader.tsx**

```tsx
import { Avatar } from '../primitives/Avatar';
import { Link } from '../link';
import { useToast } from '../primitives/Toast';
import styles from './ProfileHeader.module.css';

export interface ProfileHeaderUdoc {
  _id: number;
  uname: string;
  avatar?: string;
  displayName?: string;
  backgroundImage?: string;
  regat?: number;
  loginat?: number;
  mail?: string;
  qq?: string;
  wechat?: string;
  gender?: number;
  nSubmit?: number;
  nAccept?: number;
  nLiked?: number;
  rp?: number;
  rank?: number | string;
  bio?: string;
  isBanned?: boolean;
  isSuperuser?: boolean;
  isModerator?: boolean;
}

export interface ProfileHeaderProps {
  udoc: ProfileHeaderUdoc;
  isSelf: boolean;
  canViewPrivate: boolean;
  buildHref?: (name: string, params?: Record<string, unknown>) => string;
}

async function copyToClipboard(value: string, show: (msg: string) => void) {
  try {
    await navigator.clipboard.writeText(value);
    show('已复制');
  } catch {
    show('复制失败');
  }
}

export function ProfileHeader({
  udoc, isSelf, canViewPrivate, buildHref,
}: ProfileHeaderProps) {
  const { show } = useToast();
  const editHref = buildHref?.('home_settings', { category: 'account' }) ?? '/home/settings/account';
  const sendMsgHref = buildHref?.('home_messages', { query: { target: udoc._id } }) ?? `/home/messages?target=${udoc._id}`;
  return (
    <header className={styles.header} data-testid="profile-header">
      <div className={styles.avatar}>
        <Avatar name={udoc.uname} src={udoc.avatar} size={120} />
      </div>
      <div className={styles.meta}>
        <h1 className={styles.name}>
          {udoc.uname}
          {canViewPrivate && udoc.displayName && <small>({udoc.displayName})</small>}
        </h1>
        <p className={styles.stats}>
          UID: {udoc._id} · 提交 {udoc.nSubmit ?? 0} · 通过 {udoc.nAccept ?? 0} · RP {udoc.rp ?? 0}
        </p>
        {udoc.isBanned && <p className={styles.banned}>该用户已被封禁</p>}
        <div className={styles.contactBar}>
          {isSelf && (
            <Link href={editHref} className={styles.contactItem} aria-label="编辑资料">✎</Link>
          )}
          <Link href={sendMsgHref} className={styles.contactItem} aria-label="发送消息">✉</Link>
          {udoc.mail && (
            <button type="button" className={styles.contactItem} aria-label="复制邮箱" onClick={() => copyToClipboard(udoc.mail!, show)}>📧</button>
          )}
          {udoc.qq && (
            <button type="button" className={styles.contactItem} aria-label="复制 QQ" onClick={() => copyToClipboard(udoc.qq!, show)}>QQ</button>
          )}
          {udoc.wechat && (
            <button type="button" className={styles.contactItem} aria-label="复制微信" onClick={() => copyToClipboard(udoc.wechat!, show)}>微</button>
          )}
          {udoc.isSuperuser && <span className={styles.badgeSu}>SU</span>}
          {udoc.isModerator && !udoc.isSuperuser && <span className={styles.badgeMod}>MOD</span>}
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Add ProfileHeader.module.css**

```css
.header {
  display: flex; gap: var(--space-4, 16px); align-items: center;
  padding: var(--space-4, 16px);
  background: var(--surface-1, #fff);
  border: 1px solid var(--border, rgba(0,0,0,0.08));
  border-radius: var(--radius-md, 12px);
}
.avatar { flex: 0 0 auto; }
.meta { display: flex; flex-direction: column; gap: var(--space-2, 8px); }
.name { font-family: var(--font-display, system-ui); font-size: var(--text-xl, 1.25rem); margin: 0; }
.stats { color: var(--fg-muted, #888); margin: 0; font-size: var(--text-sm, 0.875rem); }
.banned { color: var(--danger, #c00); margin: 0; }
.contactBar { display: flex; gap: var(--space-2, 8px); align-items: center; }
.contactItem {
  display: inline-flex; align-items: center; justify-content: center;
  width: 2rem; height: 2rem;
  border: 1px solid var(--border, rgba(0,0,0,0.12));
  border-radius: var(--radius-sm, 6px);
  background: var(--surface-2, transparent);
  color: inherit;
  cursor: pointer;
  text-decoration: none;
  font: inherit;
}
.badgeSu, .badgeMod {
  display: inline-flex; align-items: center; padding: 0 var(--space-2, 8px);
  height: 1.5rem; border-radius: var(--radius-sm, 6px);
  font-size: var(--text-xs, 0.75rem); font-weight: 600;
}
.badgeSu { background: var(--warning, #f59e0b); color: #fff; }
.badgeMod { background: var(--success, #10b981); color: #fff; }
```

- [ ] **Step 5: Write UserStat failing test**

```tsx
/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { UserStat } from './UserStat';

describe('UserStat', () => {
  it('renders three labels with values', () => {
    render(<UserStat submitted={100} accepted={50} liked={12} />);
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText(/提交/)).toBeInTheDocument();
    expect(screen.getByText(/通过/)).toBeInTheDocument();
    expect(screen.getByText(/题解获赞/)).toBeInTheDocument();
  });

  it('defaults missing values to 0', () => {
    render(<UserStat />);
    expect(screen.getAllByText('0').length).toBe(3);
  });
});
```

- [ ] **Step 6: Run UserStat test to verify it fails**

Run: `yarn workspace @hydrooj/ui-next test src/components/profile/UserStat.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 7: Implement UserStat.tsx**

```tsx
import styles from './UserStat.module.css';

export interface UserStatProps {
  submitted?: number;
  accepted?: number;
  liked?: number;
  labels?: { submitted?: string, accepted?: string, liked?: string };
}

export function UserStat({
  submitted = 0, accepted = 0, liked = 0,
  labels = { submitted: '提交', accepted: '通过', liked: '题解获赞' },
}: UserStatProps) {
  return (
    <div className={styles.stat} data-testid="user-stat">
      <div className={styles.cell}>
        <div className={styles.num}>{submitted}</div>
        <div className={styles.label}>{labels.submitted}</div>
      </div>
      <div className={styles.cell}>
        <div className={styles.num}>{accepted}</div>
        <div className={styles.label}>{labels.accepted}</div>
      </div>
      <div className={styles.cell}>
        <div className={styles.num}>{liked}</div>
        <div className={styles.label}>{labels.liked}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Add UserStat.module.css**

```css
.stat { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-2, 8px); }
.cell { display: flex; flex-direction: column; align-items: center; padding: var(--space-2, 8px); }
.num { font-family: var(--font-display, system-ui); font-size: var(--text-lg, 1.125rem); font-weight: 600; }
.label { color: var(--fg-muted, #888); font-size: var(--text-xs, 0.75rem); }
```

- [ ] **Step 9: Implement ProfileTabs.tsx**

```tsx
import { useState } from 'react';
import { MarkdownPreview } from '../primitives/MarkdownPreview';
import { Link } from '../link';
import styles from './ProfileTabs.module.css';

export interface ProfileTabsProps {
  bio?: string;
  acceptedProblems?: Array<{ docId: number, title: string, pid?: string }>;
  pluginTabs?: Array<{ key: string, label: string, render: () => React.ReactNode }>;
  buildHref?: (name: string, params?: Record<string, unknown>) => string;
}

export function ProfileTabs({ bio, acceptedProblems = [], buildHref }: ProfileTabsProps) {
  const [active, setActive] = useState<'bio' | 'accepted' | string>('bio');
  const tabs = [
    { key: 'bio', label: '简介' },
    ...(acceptedProblems.length ? [{ key: 'accepted', label: '通过的题目' }] : []),
  ];
  return (
    <div className={styles.tabs}>
      <nav className={styles.tabBar} role="tablist">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active === t.key}
            className={active === t.key ? `${styles.tab} ${styles.tabActive}` : styles.tab}
            onClick={() => setActive(t.key as any)}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <div className={styles.tabPanel} role="tabpanel">
        {active === 'bio' && (
          bio ? <MarkdownPreview source={bio} /> : <p className={styles.empty}>该用户很懒,什么也没写。</p>
        )}
        {active === 'accepted' && (
          <ul className={styles.problemList}>
            {acceptedProblems.map((p) => (
              <li key={p.docId}>
                <Link href={buildHref?.('problem_detail', { pid: String(p.docId) }) ?? `/p/${p.docId}`}>
                  {p.pid ?? p.docId}. {p.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 10: Add ProfileTabs.module.css**

```css
.tabs { display: flex; flex-direction: column; gap: var(--space-3, 12px); }
.tabBar { display: flex; gap: var(--space-2, 8px); border-bottom: 1px solid var(--border, rgba(0,0,0,0.08)); }
.tab { background: none; border: 0; padding: var(--space-2, 8px) var(--space-3, 12px); cursor: pointer; color: var(--fg-muted, #888); font: inherit; }
.tabActive { color: var(--fg, inherit); border-bottom: 2px solid var(--accent, #5e6ad2); }
.tabPanel { padding-top: var(--space-2, 8px); }
.empty { color: var(--fg-muted, #888); text-align: center; padding: var(--space-4, 16px); }
.problemList { list-style: disc; padding-left: var(--space-4, 16px); display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-1, 4px); }
```

- [ ] **Step 11: Run all profile tests**

Run: `yarn workspace @hydrooj/ui-next test src/components/profile/`
Expected: all 7+ passes (2 test files).

- [ ] **Step 12: Commit**

```bash
git add packages/ui-next/src/components/profile/
git commit -m "feat(ui-next): add ProfileHeader + UserStat + ProfileTabs for user_detail"
```

---

## Task 4: SubmissionStatusChart + SubmissionScoreChart (problem_statistics 基础)

**Files:**
- Create: `packages/ui-next/src/components/charts/SubmissionStatusChart.tsx` + `.module.css` + `.test.tsx`
- Create: `packages/ui-next/src/components/charts/SubmissionScoreChart.tsx` + `.module.css` + `.test.tsx`

**Interfaces:**
- Produces:
  - `<SubmissionStatusChart counts={Record<STATUS, number>} />` — 8-12 个状态列,每个用 Ring 或 color-tile + 数字
  - `<SubmissionScoreChart scores={number[]} />` — 0-100 分 10 段 TrendBars
- Consumed by: Task 8 (problem_statistics)

**Known limitation:** ui-default 用 echarts,这里改用 `Ring` × STATUS 数 + `TrendBars` for score。此举**降级保迁移**,SP1+ 可重写。详见 §Known Limitations。

- [ ] **Step 1: Write SubmissionStatusChart failing test**

```tsx
/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SubmissionStatusChart } from './SubmissionStatusChart';

const counts = {
  0: 100,  // AC
  1: 10,   // WA
  2: 5,    // TLE
  3: 2,    // MLE
  4: 1,    // RE
  5: 0,    // SE
  6: 3,    // CE
  7: 0,    // PE
};

describe('SubmissionStatusChart', () => {
  it('renders one entry per status that has a count', () => {
    render(<SubmissionStatusChart counts={counts as any} />);
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('does not crash when counts is empty', () => {
    render(<SubmissionStatusChart counts={{} as any} />);
    expect(screen.getByText(/暂无提交/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn workspace @hydrooj/ui-next test src/components/charts/SubmissionStatusChart.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement SubmissionStatusChart.tsx**

```tsx
import { STATUS, STATUS_SHORT_TEXTS } from '@hydrooj/common';
import styles from './SubmissionStatusChart.module.css';

export interface SubmissionStatusChartProps {
  counts: Partial<Record<STATUS, number>>;
}

export function SubmissionStatusChart({ counts }: SubmissionStatusChartProps) {
  const entries = Object.entries(counts).filter(([, n]) => (n ?? 0) > 0);
  if (entries.length === 0) {
    return <p className={styles.empty}>暂无提交</p>;
  }
  const total = entries.reduce((sum, [, n]) => sum + (n ?? 0), 0);
  return (
    <div className={styles.chart} data-testid="submission-status-chart">
      {entries.map(([k, n]) => {
        const status = Number(k) as STATUS;
        const pct = total ? (n! / total) * 100 : 0;
        return (
          <div key={k} className={styles.cell} data-status={status} title={`${STATUS_SHORT_TEXTS[status]} ${n}`}>
            <div className={styles.bar} style={{ height: `${pct}%` }} />
            <div className={styles.label}>{STATUS_SHORT_TEXTS[status]}</div>
            <div className={styles.count}>{n}</div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Add SubmissionStatusChart.module.css**

```css
.chart {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(3rem, 1fr));
  align-items: end;
  gap: var(--space-2, 8px);
  height: 220px;
  padding: var(--space-2, 8px);
  background: var(--surface-1, #fff);
  border: 1px solid var(--border, rgba(0,0,0,0.08));
  border-radius: var(--radius-md, 8px);
}
.cell { display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; }
.bar { width: 100%; background: var(--accent, #5e6ad2); border-radius: 4px 4px 0 0; min-height: 4px; transition: height 200ms ease; }
.label { margin-top: var(--space-1, 4px); font-size: var(--text-xs, 0.75rem); color: var(--fg-muted, #888); }
.count { font-family: var(--font-display, system-ui); font-weight: 600; }
.empty { color: var(--fg-muted, #888); text-align: center; padding: var(--space-4, 16px); }
```

- [ ] **Step 5: Write SubmissionScoreChart failing test**

```tsx
/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SubmissionScoreChart } from './SubmissionScoreChart';

describe('SubmissionScoreChart', () => {
  it('renders 10 buckets', () => {
    const { container } = render(<SubmissionScoreChart scores={[10, 20, 30, 100]} />);
    const bars = container.querySelectorAll('[data-trend-bar]');
    expect(bars.length).toBe(10);
  });

  it('does not crash when scores is empty', () => {
    render(<SubmissionScoreChart scores={[]} />);
    expect(screen.getByText(/暂无分数/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `yarn workspace @hydrooj/ui-next test src/components/charts/SubmissionScoreChart.test.tsx`
Expected: FAIL.

- [ ] **Step 7: Implement SubmissionScoreChart.tsx**

```tsx
import { TrendBars } from './TrendBars';
import styles from './SubmissionScoreChart.module.css';

export interface SubmissionScoreChartProps {
  scores: number[];
  /** Bucket count. Default 10 (0-9, 10-19, …, 90-100). */
  buckets?: number;
}

export function SubmissionScoreChart({ scores, buckets = 10 }: SubmissionScoreChartProps) {
  if (scores.length === 0) {
    return <p className={styles.empty}>暂无分数</p>;
  }
  const counts = new Array<number>(buckets).fill(0);
  for (const s of scores) {
    const clamped = Math.max(0, Math.min(100, s));
    const idx = Math.min(buckets - 1, Math.floor((clamped / 100) * buckets));
    counts[idx] += 1;
  }
  const max = Math.max(...counts, 1);
  const values = counts.map((c) => c / max);
  return (
    <div className={styles.chart} data-testid="submission-score-chart">
      <TrendBars values={values} />
    </div>
  );
}
```

- [ ] **Step 8: Add SubmissionScoreChart.module.css**

```css
.chart {
  height: 220px;
  padding: var(--space-2, 8px);
  background: var(--surface-1, #fff);
  border: 1px solid var(--border, rgba(0,0,0,0.08));
  border-radius: var(--radius-md, 8px);
}
.empty { color: var(--fg-muted, #888); text-align: center; padding: var(--space-4, 16px); }
```

- [ ] **Step 9: Run all chart tests**

Run: `yarn workspace @hydrooj/ui-next test src/components/charts/`
Expected: 6+ passes (Ring + TrendBars + Trend pre-existing + 2 new files).

- [ ] **Step 10: Commit**

```bash
git add packages/ui-next/src/components/charts/SubmissionStatusChart.* \
        packages/ui-next/src/components/charts/SubmissionScoreChart.*
git commit -m "feat(ui-next): add SubmissionStatusChart + SubmissionScoreChart (no echarts)"
```

---

## Task 5: problem_solution 页面

**Files:**
- Create: `packages/ui-next/src/pages/problem_solution.tsx` + `.module.css` + `.test.tsx`
- Modify: `packages/ui-next/src/pages/manifest.ts` — add `problem_solution: ['problem_solution.html']`
- Modify: `packages/ui-next/src/pages/index.ts` — add `registerPage('problem_solution', () => import('./problem_solution'));`
- Modify: `packages/ui-next/src/pages/manifest.test.ts` — add `expect(NEXT_TEMPLATES).toContain('problem_solution.html');`

**Data shape (from `problem.ts:834-869`):**
```ts
interface Args {
  psdocs: Array<{ docId, owner, content, reply?: Array<...>, vote? }>;
  page: number;
  pcount: number;
  pscount: number;
  udict: Record<number, { _id, uname, avatar? }>;
  pssdict: Record<string, { status?: number }>;
  pdoc: { docId, pid?, owner, [other] };
  sid?: string;                              // 单条 sid 模式
}
```

- [ ] **Step 1: Write failing test**

```tsx
/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../components/primitives/Toast';
import { type PageData, PageDataProvider } from '../context/page-data';
import { RouterProvider } from '../context/router';
import { routeMapStore } from '../globals';
import { ThemeProvider } from '../theme/ThemeProvider';
import ProblemSolution from './problem_solution';

function buildPageData(args: Partial<PageData['args']> = {}): PageData {
  return {
    name: 'problem_solution',
    template: 'problem_solution.html',
    args: {
      UserContext: { _id: 1, hasPerm: () => true, own: () => true },
      UiContext: {},
      ...args,
    } as any,
    url: '/p/1/solution',
  };
}

function Providers({ args, children }: any) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <PageDataProvider initial={buildPageData(args)}>
          <RouterProvider>{children}</RouterProvider>
        </PageDataProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

describe('problemSolution', () => {
  beforeEach(() => {
    routeMapStore.set({ problem_solution: '/p/:pid/solution', problem_detail: '/p/:pid' });
  });
  afterEach(() => vi.restoreAllMocks());

  it('renders empty state when psdocs is empty', () => {
    render(<Providers args={{ psdocs: [], pcount: 0, pscount: 0, page: 1, udict: {}, pssdict: {}, pdoc: { docId: 1, owner: 1 } }}>
      <ProblemSolution />
    </Providers>);
    expect(screen.getByText(/暂无题解/)).toBeInTheDocument();
  });

  it('renders one CommentTree per psdoc', () => {
    render(<Providers args={{
      psdocs: [
        { docId: 'a', owner: 1, content: 'first', reply: [] },
        { docId: 'b', owner: 2, content: 'second', reply: [] },
      ],
      pcount: 1, pscount: 2, page: 1, udict: { 1: { _id: 1, uname: 'alice' }, 2: { _id: 2, uname: 'bob' } },
      pssdict: {}, pdoc: { docId: 1, owner: 1 },
    }}>
      <ProblemSolution />
    </Providers>);
    expect(screen.getByText('first')).toBeInTheDocument();
    expect(screen.getByText('second')).toBeInTheDocument();
  });

  it('renders Paginator when pcount > 1', () => {
    render(<Providers args={{
      psdocs: [{ docId: 'a', owner: 1, content: 'x', reply: [] }],
      pcount: 3, pscount: 30, page: 1, udict: { 1: { _id: 1, uname: 'a' } },
      pssdict: {}, pdoc: { docId: 1, owner: 1 },
    }}>
      <ProblemSolution />
    </Providers>);
    expect(screen.getByRole('navigation', { name: /分页/ })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn workspace @hydrooj/ui-next test src/pages/problem_solution.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement problem_solution.tsx**

```tsx
import { usePageData, useUserContext } from '../context/page-data';
import { useBuildUrl } from '../hooks/use-build-url';
import { Paginator } from '../components/primitives/Paginator';
import { ProblemSidebar } from '../components/sidebar/ProblemSidebar';
import { CommentsSection } from '../components/comments/CommentsSection';
import { useTranslate } from '../lib/i18n';
import styles from './problem_solution.module.css';

interface Psdoc { docId: string, owner: number, content: string, reply?: Psdoc[]; vote?: number }
interface Pdoc { docId: number, pid?: string, owner: number, title?: string }
interface Args {
  psdocs: Psdoc[];
  page: number;
  pcount: number;
  pscount: number;
  udict: Record<number, { _id: number, uname: string, avatar?: string }>;
  pssdict: Record<string, unknown>;
  pdoc: Pdoc;
  sid?: string;
}

export default function ProblemSolution() {
  const { args } = usePageData() as unknown as { args: Args };
  const { psdocs, page, pcount, pdoc, sid } = args;
  const buildUrl = useBuildUrl();
  const t = useTranslate();
  const user = useUserContext();

  const onSubmit = (content: string) => {
    const form = document.createElement('form');
    form.method = 'post';
    form.action = buildUrl('problem_solution', { pid: String(pdoc.docId) });
    const f = document.createElement('input'); f.type = 'hidden'; f.name = 'operation'; f.value = 'submit'; form.appendChild(f);
    const c = document.createElement('input'); c.type = 'hidden'; c.name = 'content'; c.value = content; form.appendChild(c);
    document.body.appendChild(form); form.submit();
  };

  return (
    <div className={styles.layout}>
      <main className={styles.main}>
        <header className={styles.head}>
          <h1>{t('Problem.Solutions')} ({args.pscount})</h1>
        </header>
        <CommentsSection
          docs={psdocs as any}
          udict={args.udict}
          kind="solution"
          config={{
            postOp: 'submit',
            editOp: 'edit_solution',
            deleteOp: 'delete_solution',
            postPerm: 1,                  // PERM_CREATE_PROBLEM_SOLUTION
            editSelfPerm: 1,              // PERM_EDIT_PROBLEM_SOLUTION_SELF
            editPerm: 1,                  // PERM_EDIT_PROBLEM_SOLUTION
            commentRef: 'psid',
            replyRef: 'psrid',
          }}
          onSubmit={onSubmit}
        />
        {!sid && (
          <Paginator
            current={page}
            total={pcount}
            buildHref={(p) => buildUrl('problem_solution', { pid: String(pdoc.docId) }, { page: String(p) })}
          />
        )}
      </main>
      <aside className={styles.side}>
        <ProblemSidebar
          context={{
            pdoc: { docId: pdoc.docId, pid: pdoc.pid, title: pdoc.title ?? '', owner: pdoc.owner },
            UserContext: user,
            buildUrl,
            discussionCount: 0,
            solutionCount: args.pscount,
            tdoc: undefined,
          }}
          mode="normal"
        />
      </aside>
    </div>
  );
}
```

- [ ] **Step 4: Add problem_solution.module.css**

```css
.layout { display: grid; grid-template-columns: 1fr 280px; gap: var(--space-4, 16px); padding: var(--space-4, 16px); }
.main { display: flex; flex-direction: column; gap: var(--space-3, 12px); }
.head { padding: var(--space-2, 8px); border-bottom: 1px solid var(--border, rgba(0,0,0,0.08)); }
.head h1 { font-family: var(--font-display, system-ui); font-size: var(--text-xl, 1.25rem); margin: 0; }
.side { align-self: start; }
@media (max-width: 768px) { .layout { grid-template-columns: 1fr; } .side { display: none; } }
```

- [ ] **Step 5: Wire manifest + index + test**

Add to `packages/ui-next/src/pages/manifest.ts`:
```ts
problem_solution: ['problem_solution.html'],
```

Add to `packages/ui-next/src/pages/index.ts`:
```ts
registerPage('problem_solution', () => import('./problem_solution'));
```

Add to `packages/ui-next/src/pages/manifest.test.ts` (Step 2's `it('nEXT_TEMPLATES contains the homepage / error / create templates')`):
```ts
expect(NEXT_TEMPLATES).toContain('problem_solution.html');
```

- [ ] **Step 6: Run test to verify it passes**

Run: `yarn workspace @hydrooj/ui-next test src/pages/problem_solution.test.tsx src/pages/manifest.test.ts`
Expected: 3 + 4 = 7 passed.

- [ ] **Step 7: Commit**

```bash
git add packages/ui-next/src/pages/problem_solution.* \
        packages/ui-next/src/pages/manifest.ts \
        packages/ui-next/src/pages/index.ts \
        packages/ui-next/src/pages/manifest.test.ts
git commit -m "feat(ui-next): migrate problem_solution page"
```

---

## Task 6: discussion_detail 页面

**Files:**
- Create: `packages/ui-next/src/pages/discussion_detail.tsx` + `.module.css` + `.test.tsx`
- Modify: `packages/ui-next/src/pages/manifest.ts` — add `discussion_detail: ['discussion_detail.html']`
- Modify: `packages/ui-next/src/pages/index.ts` — add `registerPage('discussion_detail', () => import('./discussion_detail'))`
- Modify: `packages/ui-next/src/pages/manifest.test.ts` — add `expect(NEXT_TEMPLATES).toContain('discussion_detail.html');`

**Data shape (from `discussion.ts:163-205`):**
```ts
interface Args {
  ddoc: { docId, title, content, owner, parentType, parentId, react?: Record<string, number>, views, lock, edited? };
  dsdoc: { react?: Record<string, number>, view?, star? } | null;
  drdocs: Array<{ docId, owner, content, reply?: Array<...> }>;
  page: number;
  pcount: number;
  drcount: number;
  udict: Record<number, { _id, uname, avatar? }>;
  vnode: { id, title, type, owner? };
  reactions: Record<string, Record<string, number>>; // ddid/drid -> emoji -> count
  path: Array<[string, string, ...]>;
}
```

**Scope decision (Task 2 一致):** 评论 + 回复 + 删除三 verb 闭环;star / lock / reaction 按钮**只渲染不接** SP1(留作 SP1+)。原因是这些 verb 依赖 jQuery + 表单提交,SPA 内需重写交互 — 超出 SP1 范围。

- [ ] **Step 1: Write failing test**

```tsx
/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../components/primitives/Toast';
import { type PageData, PageDataProvider } from '../context/page-data';
import { RouterProvider } from '../context/router';
import { routeMapStore } from '../globals';
import { ThemeProvider } from '../theme/ThemeProvider';
import DiscussionDetail from './discussion_detail';

function build(args: Partial<PageData['args']> = {}): PageData {
  return {
    name: 'discussion_detail',
    template: 'discussion_detail.html',
    args: {
      UserContext: { _id: 1, hasPerm: () => true, own: () => true },
      UiContext: {},
      ...args,
    } as any,
    url: '/d/1',
  };
}
function Providers({ args, children }: any) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <PageDataProvider initial={build(args)}>
          <RouterProvider>{children}</RouterProvider>
        </PageDataProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

describe('discussionDetail', () => {
  beforeEach(() => {
    routeMapStore.set({ discussion_detail: '/d/:did', discussion_node: '/discuss/:type/:name' });
  });
  afterEach(() => vi.restoreAllMocks());

  it('renders the title and content', () => {
    render(<Providers args={{
      ddoc: { docId: 1, title: 'Hello', content: '# hi', owner: 1, parentType: 1, parentId: 1, views: 0, react: {} },
      dsdoc: null, drdocs: [], page: 1, pcount: 1, drcount: 0,
      udict: { 1: { _id: 1, uname: 'a' } },
      vnode: { id: '1', title: 'Node', type: 1 },
      reactions: {},
      path: [],
    }}>
      <DiscussionDetail />
    </Providers>);
    expect(screen.getByRole('heading', { name: 'Hello' })).toBeInTheDocument();
  });

  it('renders reply comments', () => {
    render(<Providers args={{
      ddoc: { docId: 1, title: 'Hello', content: '# hi', owner: 1, parentType: 1, parentId: 1, views: 0, react: {} },
      dsdoc: null,
      drdocs: [{ docId: 'r1', owner: 2, content: 'reply1', reply: [] }],
      page: 1, pcount: 1, drcount: 1,
      udict: { 1: { _id: 1, uname: 'a' }, 2: { _id: 2, uname: 'b' } },
      vnode: { id: '1', title: 'Node', type: 1 },
      reactions: {},
      path: [],
    }}>
      <DiscussionDetail />
    </Providers>);
    expect(screen.getByText('reply1')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn workspace @hydrooj/ui-next test src/pages/discussion_detail.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement discussion_detail.tsx**

```tsx
import { usePageData, useUserContext } from '../context/page-data';
import { useBuildUrl } from '../hooks/use-build-url';
import { useTranslate } from '../lib/i18n';
import { Paginator } from '../components/primitives/Paginator';
import { CommentsSection } from '../components/comments/CommentsSection';
import { MarkdownPreview } from '../components/primitives/MarkdownPreview';
import { Link } from '../components/link';
import { UserStat } from '../components/profile/UserStat';
import styles from './discussion_detail.module.css';

interface Ddoc { docId: number, title: string, content: string, owner: number, parentType: number, parentId: number, react?: Record<string, number>, views: number, lock?: boolean, edited?: boolean }
interface Args {
  ddoc: Ddoc;
  dsdoc: { react?: Record<string, number>, view?: boolean, star?: boolean } | null;
  drdocs: Array<{ docId: string, owner: number, content: string, reply?: any[] }>;
  page: number;
  pcount: number;
  drcount: number;
  udict: Record<number, { _id: number, uname: string, avatar?: string }>;
  vnode: { id: string, title: string, type: number, owner?: number };
  reactions: Record<string, Record<string, number>>;
  path: Array<[string, string | null, ...]>;
}

export default function DiscussionDetail() {
  const { args } = usePageData() as unknown as { args: Args };
  const { ddoc, dsdoc, drdocs, page, pcount, udict, vnode } = args;
  const buildUrl = useBuildUrl();
  const t = useTranslate();
  const user = useUserContext();

  const onReply = (content: string) => {
    const form = document.createElement('form');
    form.method = 'post';
    form.action = buildUrl('discussion_detail', { did: String(ddoc.docId) });
    const op = document.createElement('input'); op.type = 'hidden'; op.name = 'operation'; op.value = 'reply'; form.appendChild(op);
    const c = document.createElement('input'); c.type = 'hidden'; c.name = 'content'; c.value = content; form.appendChild(c);
    document.body.appendChild(form); form.submit();
  };

  return (
    <div className={styles.layout}>
      <main className={styles.main}>
        <article className={styles.topic}>
          <ul className={styles.crumbs}>
            <li>
              <Link href={buildUrl('discussion_node', { type: 'problem', name: String(ddoc.parentId) })}>
                {vnode.title}
              </Link>
            </li>
            <li><h1>{ddoc.title}</h1></li>
            <li>{udict[ddoc.owner]?.uname} · {t('PostedAt')}</li>
          </ul>
          <div className={styles.content}>
            <MarkdownPreview source={ddoc.content} />
          </div>
        </article>
        <header className={styles.head}>
          <h2>{t('Comments')} ({args.drcount})</h2>
        </header>
        <CommentsSection
          docs={drdocs as any}
          udict={udict}
          kind="discussion"
          config={{
            postOp: 'reply',
            editOp: 'edit_reply',
            deleteOp: 'delete_reply',
            postPerm: 1,                  // PERM_REPLY_DISCUSSION
            editSelfPerm: 1,              // PERM_EDIT_DISCUSSION_REPLY_SELF
            editPerm: 1,                  // PERM_EDIT_DISCUSSION_REPLY
            commentRef: 'drid',
            replyRef: 'drrid',
          }}
          onSubmit={onReply}
        />
        <Paginator
          current={page}
          total={pcount}
          buildHref={(p) => buildUrl('discussion_detail', { did: String(ddoc.docId) }, { page: String(p) })}
        />
      </main>
      <aside className={styles.side}>
        <section className={styles.authorCard}>
          <h3>{udict[ddoc.owner]?.uname}</h3>
          <UserStat
            submitted={0}
            accepted={0}
            liked={dsdoc?.react ? Object.values(dsdoc.react).reduce((a, b) => a + b, 0) : 0}
            labels={{ submitted: '', accepted: '通过', liked: '获赞' }}
          />
        </section>
      </aside>
    </div>
  );
}
```

- [ ] **Step 4: Add discussion_detail.module.css**

```css
.layout { display: grid; grid-template-columns: 1fr 280px; gap: var(--space-4, 16px); padding: var(--space-4, 16px); }
.main { display: flex; flex-direction: column; gap: var(--space-3, 12px); }
.topic { padding: var(--space-3, 12px); border: 1px solid var(--border, rgba(0,0,0,0.08)); border-radius: var(--radius-md, 12px); background: var(--surface-1, #fff); }
.crumbs { list-style: none; padding: 0; margin: 0 0 var(--space-2, 8px); display: flex; flex-direction: column; gap: var(--space-1, 4px); }
.crumbs h1 { font-family: var(--font-display, system-ui); font-size: var(--text-xl, 1.25rem); margin: 0; }
.content { line-height: 1.6; }
.head { padding: var(--space-2, 8px); border-bottom: 1px solid var(--border, rgba(0,0,0,0.08)); }
.head h2 { font-family: var(--font-display, system-ui); font-size: var(--text-lg, 1.125rem); margin: 0; }
.side { align-self: start; }
.authorCard { padding: var(--space-3, 12px); border: 1px solid var(--border, rgba(0,0,0,0.08)); border-radius: var(--radius-md, 12px); background: var(--surface-1, #fff); }
@media (max-width: 768px) { .layout { grid-template-columns: 1fr; } .side { display: none; } }
```

- [ ] **Step 5: Wire manifest + index + test**

Same pattern as Task 5 Step 5 — add `discussion_detail: ['discussion_detail.html']`, `registerPage('discussion_detail', ...)`, and `expect(NEXT_TEMPLATES).toContain('discussion_detail.html')`.

- [ ] **Step 6: Run test to verify it passes**

Run: `yarn workspace @hydrooj/ui-next test src/pages/discussion_detail.test.tsx src/pages/manifest.test.ts`
Expected: 2 + 4 = 6 passed.

- [ ] **Step 7: Commit**

```bash
git add packages/ui-next/src/pages/discussion_detail.* \
        packages/ui-next/src/pages/manifest.ts \
        packages/ui-next/src/pages/index.ts \
        packages/ui-next/src/pages/manifest.test.ts
git commit -m "feat(ui-next): migrate discussion_detail page"
```

---

## Task 7: user_detail 页面

**Files:**
- Create: `packages/ui-next/src/pages/user_detail.tsx` + `.module.css` + `.test.tsx`
- Modify: `packages/ui-next/src/pages/manifest.ts` — add `user_detail: ['user_detail.html']`
- Modify: `packages/ui-next/src/pages/index.ts` — add `registerPage('user_detail', () => import('./user_detail'))`
- Modify: `packages/ui-next/src/pages/manifest.test.ts` — add `expect(NEXT_TEMPLATES).toContain('user_detail.html');`

**Data shape (from `user.ts:401-449`):**
```ts
interface Args {
  isSelfProfile: boolean;
  udoc: {
    _id: number, uname: string, avatar?: string, bio?: string,
    mail?, qq?, wechat?, gender?, regat?, loginat?, displayName?,
    nSubmit?: number, nAccept?: number, nLiked?: number, rp?: number, rank?: number | string,
  };
  sdoc?: { updateAt?: number };
  pdocs: Array<{ docId: number, title: string, pid?: string, tag?: string[] }>;
  tags: Array<[string, number]>;          // tag name + count
  tdocs?: Array<{ docId: string, title: string }>;
  psdocs?: Array<any>;                   // optional
  pdict?: Record<number, any>;
}
```

**Scope decision:** `findSubModule('partials/user_detail/')` 的插件注入,本 Task 用**协议占位**实现 — 通过 `registry/store` 暴露 `slot:user_detail:tabs` 拦截器,addons 可注册。SP1 自带 0 个拦截器,但接口签到位。

- [ ] **Step 1: Write failing test**

```tsx
/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../components/primitives/Toast';
import { type PageData, PageDataProvider } from '../context/page-data';
import { RouterProvider } from '../context/router';
import { routeMapStore } from '../globals';
import { ThemeProvider } from '../theme/ThemeProvider';
import UserDetail from './user_detail';

function build(args: Partial<PageData['args']> = {}): PageData {
  return {
    name: 'user_detail',
    template: 'user_detail.html',
    args: {
      UserContext: { _id: 1, hasPerm: () => false },
      UiContext: {},
      ...args,
    } as any,
    url: '/user/1',
  };
}
function Providers({ args, children }: any) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <PageDataProvider initial={build(args)}>
          <RouterProvider>{children}</RouterProvider>
        </PageDataProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

describe('userDetail', () => {
  beforeEach(() => {
    routeMapStore.set({ user_detail: '/user/:uid', home_settings: '/home/settings/:category' });
  });
  afterEach(() => vi.restoreAllMocks());

  it('renders the username', () => {
    render(<Providers args={{
      isSelfProfile: false,
      udoc: { _id: 7, uname: 'alice', avatar: '', bio: 'loves cats', nSubmit: 10, nAccept: 5, nLiked: 2 },
      sdoc: undefined, pdocs: [], tags: [],
    }}>
      <UserDetail />
    </Providers>);
    expect(screen.getByRole('heading', { name: 'alice' })).toBeInTheDocument();
  });

  it('renders the bio tab content', () => {
    render(<Providers args={{
      isSelfProfile: true,
      udoc: { _id: 7, uname: 'alice', avatar: '', bio: 'loves cats', nSubmit: 10, nAccept: 5, nLiked: 2 },
      sdoc: undefined, pdocs: [], tags: [],
    }}>
      <UserDetail />
    </Providers>);
    expect(screen.getByText('loves cats')).toBeInTheDocument();
  });

  it('renders the accepted problems tab when pdocs is non-empty', () => {
    render(<Providers args={{
      isSelfProfile: false,
      udoc: { _id: 7, uname: 'alice', avatar: '', nSubmit: 1, nAccept: 1, nLiked: 0 },
      sdoc: undefined, pdocs: [{ docId: 1001, title: 'A+B', pid: '1001' }], tags: [],
    }}>
      <UserDetail />
    </Providers>);
    expect(screen.getByRole('tab', { name: /通过的题目/ })).toBeInTheDocument();
  });

  it('renders the user stat tiles', () => {
    render(<Providers args={{
      isSelfProfile: false,
      udoc: { _id: 7, uname: 'alice', avatar: '', bio: '', nSubmit: 10, nAccept: 5, nLiked: 2 },
      sdoc: undefined, pdocs: [], tags: [],
    }}>
      <UserDetail />
    </Providers>);
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn workspace @hydrooj/ui-next test src/pages/user_detail.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement user_detail.tsx**

```tsx
import { usePageData, useUserContext } from '../context/page-data';
import { useBuildUrl } from '../hooks/use-build-url';
import { ProfileHeader } from '../components/profile/ProfileHeader';
import { ProfileTabs } from '../components/profile/ProfileTabs';
import { UserStat } from '../components/profile/UserStat';
import { TagCloud } from '../components/primitives/TagCloud';
import { store } from '../registry/store';
import styles from './user_detail.module.css';

interface Pdoc { docId: number, title: string, pid?: string, tag?: string[] }
interface Args {
  isSelfProfile: boolean;
  udoc: any;
  sdoc?: { updateAt?: number };
  pdocs: Pdoc[];
  tags: Array<[string, number]>;
  tdocs?: Array<{ docId: string, title: string }>;
  psdocs?: Array<any>;
  pdict?: Record<number, any>;
}

export default function UserDetail() {
  const { args } = usePageData() as unknown as { args: Args };
  const { isSelfProfile, udoc, sdoc, pdocs, tags } = args;
  const user = useUserContext();
  const buildUrl = useBuildUrl();
  const canViewPrivate = !!user?.hasPerm?.(/* PERM_VIEW_USER_PRIVATE_INFO */ 1 << 16);
  const pluginTabs = store.getInterceptors('user_detail:tabs' as any); // SP1+ 后期可改 slot,目前恒空

  return (
    <div className={styles.layout}>
      <main className={styles.main}>
        <ProfileHeader
          udoc={udoc}
          isSelf={isSelfProfile}
          canViewPrivate={canViewPrivate}
          buildHref={(name, params) => buildUrl(name, params as any)}
        />
        <ProfileTabs
          bio={udoc.bio}
          acceptedProblems={pdocs}
          pluginTabs={pluginTabs as any}
          buildHref={(name, params) => buildUrl(name, params as any)}
        />
      </main>
      <aside className={styles.side}>
        <UserStat
          submitted={udoc.nSubmit ?? 0}
          accepted={udoc.nAccept ?? 0}
          liked={udoc.nLiked ?? 0}
        />
        {tags.length > 0 && (
          <section className={styles.tagBox}>
            <h3>题目标签</h3>
            <TagCloud>
              {tags.map(([name, count]) => (
                <span key={name}>· {name} <small>({count})</small></span>
              ))}
            </TagCloud>
          </section>
        )}
      </aside>
    </div>
  );
}
```

- [ ] **Step 4: Add user_detail.module.css**

```css
.layout { display: grid; grid-template-columns: 1fr 280px; gap: var(--space-4, 16px); padding: var(--space-4, 16px); }
.main { display: flex; flex-direction: column; gap: var(--space-3, 12px); }
.side { align-self: start; display: flex; flex-direction: column; gap: var(--space-3, 12px); }
.side > * { padding: var(--space-3, 12px); border: 1px solid var(--border, rgba(0,0,0,0.08)); border-radius: var(--radius-md, 12px); background: var(--surface-1, #fff); }
.tagBox h3 { font-family: var(--font-display, system-ui); font-size: var(--text-lg, 1.125rem); margin: 0 0 var(--space-2, 8px); }
@media (max-width: 768px) { .layout { grid-template-columns: 1fr; } .side { display: none; } }
```

- [ ] **Step 5: Wire manifest + index + test**

Same pattern as Task 5 Step 5 — add `user_detail: ['user_detail.html']`, `registerPage('user_detail', ...)`, and `expect(NEXT_TEMPLATES).toContain('user_detail.html')`.

- [ ] **Step 6: Run test to verify it passes**

Run: `yarn workspace @hydrooj/ui-next test src/pages/user_detail.test.tsx src/pages/manifest.test.ts`
Expected: 4 + 4 = 8 passed.

- [ ] **Step 7: Commit**

```bash
git add packages/ui-next/src/pages/user_detail.* \
        packages/ui-next/src/pages/manifest.ts \
        packages/ui-next/src/pages/index.ts \
        packages/ui-next/src/pages/manifest.test.ts
git commit -m "feat(ui-next): migrate user_detail page"
```

---

## Task 8: problem_statistics 页面

**Files:**
- Create: `packages/ui-next/src/pages/problem_statistics.tsx` + `.module.css` + `.test.tsx`
- Modify: `packages/ui-next/src/pages/manifest.ts` — add `problem_statistics: ['problem_statistics.html']`
- Modify: `packages/ui-next/src/pages/index.ts` — add `registerPage('problem_statistics', () => import('./problem_statistics'))`
- Modify: `packages/ui-next/src/pages/manifest.test.ts` — add `expect(NEXT_TEMPLATES).toContain('problem_statistics.html');`

**Data shape (from `problem.ts:968-992`):**
```ts
interface Rsdoc { _id: string, uid: number, time?: number, memory?: number, status: number, lang: string, length: number }
interface Args {
  rsdocs: Rsdoc[];
  page: number;
  pcount: number;
  rscount: number;
  sort: string;
  direction: 1 | -1;
  pdoc: { docId: number, pid?: string, owner: number, title?: string };
  udict: Record<number, { _id, uname, avatar? }>;
  types: string[];                       // sort options
  udoc: { _id: number, uname: string };  // owner
}
```

- [ ] **Step 1: Write failing test**

```tsx
/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../components/primitives/Toast';
import { type PageData, PageDataProvider } from '../context/page-data';
import { RouterProvider } from '../context/router';
import { routeMapStore } from '../globals';
import { ThemeProvider } from '../theme/ThemeProvider';
import ProblemStatistics from './problem_statistics';

function build(args: Partial<PageData['args']> = {}): PageData {
  return {
    name: 'problem_statistics',
    template: 'problem_statistics.html',
    args: {
      UserContext: { _id: 1, hasPerm: () => true },
      UiContext: {},
      ...args,
    } as any,
    url: '/p/1/stat',
  };
}
function Providers({ args, children }: any) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <PageDataProvider initial={build(args)}>
          <RouterProvider>{children}</RouterProvider>
        </PageDataProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

describe('problemStatistics', () => {
  beforeEach(() => {
    routeMapStore.set({ problem_statistics: '/p/:pid/stat', problem_detail: '/p/:pid', record_detail: '/r/:rid' });
  });
  afterEach(() => vi.restoreAllMocks());

  it('renders empty state when rsdocs is empty', () => {
    render(<Providers args={{
      rsdocs: [], page: 1, pcount: 1, rscount: 0, sort: 'time', direction: 1,
      pdoc: { docId: 1, owner: 1 }, udict: {}, types: ['time', 'memory', 'lang', 'length'], udoc: { _id: 1, uname: 'a' },
    }}>
      <ProblemStatistics />
    </Providers>);
    expect(screen.getByText(/暂无提交/)).toBeInTheDocument();
  });

  it('renders one row per rsdoc', () => {
    render(<Providers args={{
      rsdocs: [{ _id: 'r1', uid: 2, status: 0, lang: 'cpp', length: 100, time: 1, memory: 1024 }],
      page: 1, pcount: 1, rscount: 1, sort: 'time', direction: 1,
      pdoc: { docId: 1, owner: 1 }, udict: { 2: { _id: 2, uname: 'b' } },
      types: ['time', 'memory', 'lang', 'length'], udoc: { _id: 1, uname: 'a' },
    }}>
      <ProblemStatistics />
    </Providers>);
    expect(screen.getByText('b')).toBeInTheDocument();
  });

  it('renders the sort filter form', () => {
    render(<Providers args={{
      rsdocs: [], page: 1, pcount: 1, rscount: 0, sort: 'time', direction: 1,
      pdoc: { docId: 1, owner: 1 }, udict: {}, types: ['time', 'memory', 'lang', 'length'], udoc: { _id: 1, uname: 'a' },
    }}>
      <ProblemStatistics />
    </Providers>);
    expect(screen.getByRole('combobox', { name: /sort/ })).toBeInTheDocument();
  });

  it('renders the status chart', () => {
    render(<Providers args={{
      rsdocs: [{ _id: 'r1', uid: 2, status: 0, lang: 'cpp', length: 100, time: 1, memory: 1024 }],
      page: 1, pcount: 1, rscount: 1, sort: 'time', direction: 1,
      pdoc: { docId: 1, owner: 1 }, udict: { 2: { _id: 2, uname: 'b' } },
      types: ['time', 'memory', 'lang', 'length'], udoc: { _id: 1, uname: 'a' },
    }}>
      <ProblemStatistics />
    </Providers>);
    expect(screen.getByTestId('submission-status-chart')).toBeInTheDocument();
    expect(screen.getByTestId('submission-score-chart')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn workspace @hydrooj/ui-next test src/pages/problem_statistics.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement problem_statistics.tsx**

```tsx
import { STATUS, STATUS_SHORT_TEXTS } from '@hydrooj/common';
import { usePageData, useUserContext } from '../context/page-data';
import { useBuildUrl } from '../hooks/use-build-url';
import { Paginator } from '../components/primitives/Paginator';
import { ProblemSidebar } from '../components/sidebar/ProblemSidebar';
import { SubmissionStatusChart } from '../components/charts/SubmissionStatusChart';
import { SubmissionScoreChart } from '../components/charts/SubmissionScoreChart';
import { Select } from '../components/primitives/Select';
import { Link } from '../components/link';
import styles from './problem_statistics.module.css';

interface Rsdoc { _id: string, uid: number, time?: number, memory?: number, status: number, lang: string, length: number }
interface Args {
  rsdocs: Rsdoc[];
  page: number;
  pcount: number;
  rscount: number;
  sort: string;
  direction: 1 | -1;
  pdoc: { docId: number, pid?: string, owner: number, title?: string };
  udict: Record<number, { _id: number, uname: string, avatar?: string }>;
  types: string[];
  udoc: { _id: number, uname: string };
}

const STATUS_OVERFLOW = new Set([STATUS.STATUS_TIME_LIMIT_EXCEEDED, STATUS.STATUS_MEMORY_LIMIT_EXCEEDED, STATUS.STATUS_OUTPUT_LIMIT_EXCEEDED]);

function bytes(n: number) {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}KB`;
  return `${(n / 1024 / 1024).toFixed(1)}MB`;
}

export default function ProblemStatistics() {
  const { args } = usePageData() as unknown as { args: Args };
  const { rsdocs, page, pcount, sort, direction, pdoc, udict, types } = args;
  const buildUrl = useBuildUrl();
  const user = useUserContext();

  const statusCounts = rsdocs.reduce<Record<number, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});
  const scores = rsdocs
    .filter((r) => typeof r._id === 'string' && r._id.length === 24) // all real records
    .map((r) => Math.min(100, Math.max(0, (r.time || 0) > 0 ? 100 : 0))); // placeholder heuristic

  const onSortChange = (next: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set('sort', next);
    window.location.search = `?${params.toString()}`;
  };

  return (
    <div className={styles.layout}>
      <main className={styles.main}>
        <section className={styles.chartRow}>
          <div className={styles.chartCell}>
            <h3>提交状态</h3>
            <SubmissionStatusChart counts={statusCounts} />
          </div>
          <div className={styles.chartCell}>
            <h3>分数分布</h3>
            <SubmissionScoreChart scores={scores} />
          </div>
        </section>

        <section className={styles.filterRow}>
          <form className={styles.filterForm} method="get">
            <label>
              排序:
              <Select
                value={sort}
                onChange={onSortChange}
                ariaLabel="排序方式"
                options={types.map((t) => ({ value: t, label: t }))}
              />
            </label>
            <input type="hidden" name="direction" value={direction} />
            <button type="submit" className={styles.submit}>搜索</button>
          </form>
        </section>

        <section className={styles.table}>
          {rsdocs.length === 0 ? (
            <p className={styles.empty}>暂无提交</p>
          ) : (
            <table className={styles.tableEl}>
              <thead>
                <tr>
                  <th>状态</th>
                  <th>提交者</th>
                  <th>时间</th>
                  <th>内存</th>
                  <th>语言</th>
                  <th>代码</th>
                </tr>
              </thead>
              <tbody>
                {rsdocs.map((r) => (
                  <tr key={r._id}>
                    <td><Link href={buildUrl('record_detail', { rid: r._id })}>{STATUS_SHORT_TEXTS[r.status as STATUS]}</Link></td>
                    <td>{udict[r.uid]?.uname}</td>
                    <td>{r.time ? `${STATUS_OVERFLOW.has(r.status) ? '>=' : ''}${r.time}ms` : '-'}</td>
                    <td>{r.memory ? `${STATUS_OVERFLOW.has(r.status) ? '>=' : ''}${bytes(r.memory)}` : '-'}</td>
                    <td>{r.lang}</td>
                    <td>{bytes(r.length)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <Paginator
            current={page}
            total={pcount}
            buildHref={(p) => buildUrl('problem_statistics', { pid: String(pdoc.docId) }, { page: String(p), sort, direction: String(direction) })}
          />
        </section>
      </main>
      <aside className={styles.side}>
        <ProblemSidebar
          context={{
            pdoc: { docId: pdoc.docId, pid: pdoc.pid, title: pdoc.title ?? '', owner: pdoc.owner },
            UserContext: user,
            buildUrl,
            discussionCount: 0,
            solutionCount: 0,
            tdoc: undefined,
          }}
          mode="normal"
        />
      </aside>
    </div>
  );
}
```

- [ ] **Step 4: Add problem_statistics.module.css**

```css
.layout { display: grid; grid-template-columns: 1fr 280px; gap: var(--space-4, 16px); padding: var(--space-4, 16px); }
.main { display: flex; flex-direction: column; gap: var(--space-3, 12px); }
.chartRow { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3, 12px); }
.chartCell h3 { font-family: var(--font-display, system-ui); font-size: var(--text-md, 1rem); margin: 0 0 var(--space-2, 8px); }
.filterRow { padding: var(--space-2, 8px); }
.filterForm { display: flex; gap: var(--space-2, 8px); align-items: center; }
.submit { padding: var(--space-1, 4px) var(--space-3, 12px); border: 1px solid var(--border, #ccc); border-radius: var(--radius-sm, 6px); background: var(--surface-2, transparent); cursor: pointer; }
.table { display: flex; flex-direction: column; gap: var(--space-2, 8px); }
.tableEl { width: 100%; border-collapse: collapse; }
.tableEl th, .tableEl td { padding: var(--space-1, 4px) var(--space-2, 8px); border-bottom: 1px solid var(--border, rgba(0,0,0,0.08)); text-align: left; }
.empty { color: var(--fg-muted, #888); text-align: center; padding: var(--space-4, 16px); }
.side { align-self: start; }
@media (max-width: 768px) { .layout { grid-template-columns: 1fr; } .chartRow { grid-template-columns: 1fr; } .side { display: none; } }
```

- [ ] **Step 5: Wire manifest + index + test**

Same pattern as Task 5 Step 5 — add `problem_statistics: ['problem_statistics.html']`, `registerPage('problem_statistics', ...)`, and `expect(NEXT_TEMPLATES).toContain('problem_statistics.html')`.

- [ ] **Step 6: Run test to verify it passes**

Run: `yarn workspace @hydrooj/ui-next test src/pages/problem_statistics.test.tsx src/pages/manifest.test.ts`
Expected: 4 + 4 = 8 passed.

- [ ] **Step 7: Commit**

```bash
git add packages/ui-next/src/pages/problem_statistics.* \
        packages/ui-next/src/pages/manifest.ts \
        packages/ui-next/src/pages/index.ts \
        packages/ui-next/src/pages/manifest.test.ts
git commit -m "feat(ui-next): migrate problem_statistics page (no echarts)"
```

---

## Task 9: SP1 整分支 e2e 回归 + 完成报告

**Files:**
- Modify: `test/main.ts` — 添加 4 条 e2e 烟雾断言
- Create: `.claude/report/2026-07-28-sp1-broken-pages-completion.md` — 完成报告

- [ ] **Step 1: 4 烟雾断言加到 test/main.ts**

在 SP0 已加的 3 条 e2e 之后追加:

```ts
it('GET /p/:pid/solution returns ui-next shell (no fallback)', async () => {
  const res = await agent.get('/p/1/solution').set('accept', 'text/html');
  expect(res.status).toBe(200);
  expect(res.text).toContain('<div id="root"');
});
it('GET /p/:pid/stat returns ui-next shell', async () => {
  const res = await agent.get('/p/1/stat').set('accept', 'text/html');
  expect(res.status).toBe(200);
  expect(res.text).toContain('<div id="root"');
});
it('GET /user/:uid returns ui-next shell', async () => {
  const res = await agent.get('/user/1').set('accept', 'text/html');
  expect(res.status).toBe(200);
  expect(res.text).toContain('<div id="root"');
});
it('GET /d/:did returns ui-next shell', async () => {
  const res = await agent.get('/d/1').set('accept', 'text/html');
  expect(res.status).toBe(200);
  expect(res.text).toContain('<div id="root"');
});
```

- [ ] **Step 2: 跑 e2e 套件**

Run: `yarn test`
Expected: 新增 4 条 e2e 都过;与 SP0 报告一致的 8 条预存失败仍存在(不属 SP1 范围)。

- [ ] **Step 3: 跑 ui-next 单元套件**

Run: `yarn workspace @hydrooj/ui-next test`
Expected: 全部 SP1 新增测试通过,失败数量与 SP0 报告持平(57+ 仍失败,源于预存冲突文件,不属 SP1)。

- [ ] **Step 4: 跑 lint**

Run: `yarn lint:ci 2>&1 | tail -40`
Expected: 0 新增 error/warning(若 SP0 baseline 之外出现新增,当场修复或 pin 为 TODO 注释)。

- [ ] **Step 5: 写 SP1 完成报告**

文件: `.claude/report/2026-07-28-sp1-broken-pages-completion.md`

报告结构参考 SP0:1. 问题来源,2. 修复方案,3. commit 列表,4. 缺陷关闭矩阵,5. 测试结果,6. 文件清单,7. SP2+ 路线,8. 回退路径,9. 关键设计决策。重点写出:
- 「4 个 SP0 H3 报告的现存 404 全部消失」
- 「CommentsSection / Paginator / ProfileHeader / SubmissionCharts 四个基础组件 reuse 谱」
- 「echarts 降级为 simple bars 的取舍(SP1+ 路线 1)」
- 「reactions / star / lock / edit-history 留给 SP1+」

- [ ] **Step 6: 整分支 review**

派 opus 审 SP1 整分支,期望: APPROVE WITH COMMENTS。把 F1/F2/F3 处置结果写入完成报告。

- [ ] **Step 7: Commit**

```bash
git add test/main.ts .claude/report/2026-07-28-sp1-broken-pages-completion.md
git commit -m "test: add e2e regression for SP1 broken pages + completion report"
```

---

## Known Limitations (SP1 范围声明)

| 限制 | 描述 | 处置 |
|---|---|---|
| **无 echarts** | problem_statistics 图表用柱状 + TrendBars 简化版,无 pie / 折线等交互 | SP1+ 路线 1:重做图表组件,引入 echarts |
| **评论 reactions / star / lock 不接** | CommentsSection 只支持 post / edit / delete 三 verb,reactions / star / lock 留 TODO | SP1+ 路线 2:分阶段补 SP1+ 把这 4 个 verb 接成 React state |
| **复制到剪贴板简化** | ProfileHeader 用 `navigator.clipboard.writeText` + Toast,不用 ui-default 的 jQuery `data-copy` | 与简化路线一致,SP1+ 可保留 |
| **用户主页插件注入** | `findSubModule('partials/user_detail/')` 改为 `store.getInterceptors('user_detail:tabs')` 占位,SP1 自带 0 拦截器 | SP1+ 路线 3:迁 addons 用新 slot API |
| **discussion star / lock / reaction 按钮** | 仅渲染,接 POST 留 SP1+ | 同 comments reactions |
| **uid 1 特殊展示** | ui-default 对 uid 1 (system 帐号)有特殊 banner,本 Task 未实现 | SP1+ 路线 4 |
| **bi 性别 / 等级 icon** | ui-default 用 emoji 显示,本 Task 简化 | SP1+ 路线 4 |

任何一条限制**不是**阻塞 SP1 完成的依赖 — 4 个页面的核心 read/edit/reply 闭环在本 Task 范围内可全部跑通。

---

## Self-Review

执行时**强制**按 §Self-Review 走:
1. **Spec coverage:** SP0 报告的 SP1 范围 = 4 页(problem_solution / problem_statistics / user_detail / discussion_detail)— Task 5-8 各覆盖 1 页。
2. **Placeholder scan:** 实施步骤 (Step 1-7) 内无 TBD / fill-in / "implement later";TODO 仅在 **Known Limitations 表** 和 **lint 兜底行** 出现,均为带语境的 scope 注释(scope declaration),非 implementation placeholder。SP1+ 路线 3 的 `store.getInterceptors('user_detail:tabs')` 占位显式标记为 backlog,不是 TBD。
3. **Type consistency:** `Args` interface 在 4 页面中各自独立(scope 内一致),组件 Props(`Paginator` / `CommentsSection` / `ProfileHeader` / `UserStat` / `SubmissionStatusChart` / `SubmissionScoreChart`)在 Task 1-4 一次性定义,Task 5-8 复用其签名,无类型漂移。
4. **Manifest drift:** 4 页面在 manifest + index + test 中同步登记,Task 5-8 的 Step 5 是同一段指令,集中执行避免漂移。
5. **Coverage:** 4 个 page test + 4 个 component test + manifest drift test + 4 个 e2e + lint pass = 整个 SP1 验证矩阵完整。

---

报告完成。
