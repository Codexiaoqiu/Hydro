# F5 训练/作业完成计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 F5（训练/作业）模块从 80% 提升到 100% — 补齐 `/code` 路由入口（训练/作业的代码下载链接）+ 清理 P1-4/P1-5 留下的 Minor findings。

**Architecture:** 在 `homework_main.tsx` / `training_main.tsx`（owner 视角的管理页）加 "Download all submissions (zip)" 链接，复用 `ContestCodeHandler` 已有的路由。`homework_detail.tsx` 已经有正确的 `hasPerm` 检查（已修），所以 P1-5 finding #1 已自动解决。本次只补 P1-4 的 7 个 Minor 和 homework 的 1 个残留。F5 完成后所有 P1 域 minor follow-ups 全部消化。

**Tech Stack:** TypeScript 5.x、React 19、Vitest + happy-dom + Testing Library、`request` hook from `use-api`。

## Global Constraints

- AGPLv3 义务：本次修改后仍以 AGPLv3 发布，保留 `LICENSE` 版权。
- 不得删除 ui-default 的训练/作业模板（mail 系列、`partials/training_*` 等仍需保留）。
- `manifest.ts` / `index.ts` 是 ui-next 页面注册的真源 — 任何新增/删除 ui-next 页面必须同步这两个文件。
- 测试基线：当前 ui-next 1510 passed / 2 failed（pre-existing failures in `record_detail.test.tsx` + `ContestClarificationInlineForm.test.tsx`）。每个新 task 提交前必须保持或扩展通过数。
- 任务粒度：每步 2-5 分钟；以"commit"作为 task 收尾，禁止跨 task 的未提交改动。
- 不得用 `as any` / `as unknown as` 绕过类型（与 P3-9 一致，HUIFU-3 范围之外的 page 内 cast 需要明示 TODO）。

---

## Phase 1 — F5 `/code` 入口补齐

### Task 1.1: homework_main.tsx 加 "Download submissions (zip)" 链接

**Files:**
- Modify: `packages/ui-next/src/pages/homework_main.tsx`（在管理操作区加 owner-visible 的下载链接）
- Modify: `packages/ui-next/src/pages/homework_main.test.tsx`（新增 owner 可见性 + URL 形状的测试）

**Interfaces:**
- Consumes: `args.tsdoc` (Homework tdoc), `args.UserContext` (current user)
- Produces: `<a href="/homework/{tid}/code?all=1">Download submissions (zip)</a>` — owner-only

- [ ] **Step 1: 写失败测试**

`packages/ui-next/src/pages/homework_main.test.tsx` 追加：

```tsx
describe('homework_main download code link', () => {
  it('renders a download link to /homework/:tid/code when user is the owner', () => {
    renderPage({
      tsdoc: { docId: 'h1', owner: 7 },
      UserContext: { _id: 7, uname: 'me' },
    });
    const link = screen.getByRole('link', { name: /download.*submissions|submissions.*zip/i });
    expect(link.getAttribute('href')).toBe('/homework/h1/code?all=1');
  });

  it('hides the link when user is not the owner and lacks PERM_VIEW_HOMEWORK', () => {
    renderPage({
      tsdoc: { docId: 'h1', owner: 7 },
      UserContext: { _id: 99, uname: 'other', priv: 0 },
    });
    expect(screen.queryByRole('link', { name: /download.*submissions/i })).not.toBeInTheDocument();
  });
});
```

> 若 `homework_main.test.tsx` 已有的 `renderPage` helper 不支持 `UserContext._id`，按现有 helper 适配。`renderPage` 已在 P1-5 session 创建。

- [ ] **Step 2: 跑测试确认失败**

```bash
cd /home/xq/Hydro
yarn workspace @hydrooj/ui-next test -- homework_main
```

预期：2 个新 it 失败（找不到 link），原有用例通过。

- [ ] **Step 3: 在 `homework_main.tsx` 加链接**

定位管理操作区（owner 视角的工具栏），追加：

```tsx
{own(user, tsdoc, PERM.PERM_EDIT_HOMEWORK_SELF) && (
  <a
    href={`/homework/${tsdoc.docId}/code?all=1`}
    className={styles.sidebarMeta}
  >
    Download submissions (zip)
  </a>
)}
```

- [ ] **Step 4: 跑测试确认通过**

预期：2/2 新 it 通过。

- [ ] **Step 5: Commit**

```bash
git add packages/ui-next/src/pages/homework_main.tsx \
        packages/ui-next/src/pages/homework_main.test.tsx
git commit -m "feat(ui-next): homework_main download submissions link"
```

### Task 1.2: training_main.tsx 加同样的链接

**Files:**
- Modify: `packages/ui-next/src/pages/training_main.tsx`
- Modify: `packages/ui-next/src/pages/training_main.test.tsx`

- [ ] **Step 1-5: 与 Task 1.1 同样的模式**

差异点：
- 链接路径：`/training/{tid}/code?all=1`（`TrainingCodeHandler` 由 `homework_code` 路由别名处理，参考 `packages/hydrooj/src/handler/training.ts:313`）
- perm 检查：使用 `PERM.PERM_EDIT_TRAINING_SELF`（或等价的 owner check — 按 `training_main.tsx` 已有的权限 helper 复用）
- Commit message：`feat(ui-next): training_main download submissions link`

---

## Phase 2 — P1-4/P1-5 Minor 清理

> 来源：`.superpowers/sdd/progress.md` 中 P1-4 留下 7 个 Minor + P1-5 留下 2 个 Minor。已检查 `homework_detail.tsx:73`（finding #1）已修（`hasPerm(user, PERM.PERM_EDIT_HOMEWORK)`），故 P1-5 仅剩 #2 一个 follow-up。

### Task 2.1: training_detail.tsx 简化 `pdict` 取值（Minor P1-4 #1）

**File:**
- Modify: `packages/ui-next/src/pages/training_detail.tsx:120`

当前：

```tsx
const pdoc = pdict[String(pid)] || pdict[pid as unknown as string];
```

简化为：

```tsx
const pdoc = pdict[String(pid)];
```

测试应仍通过（`pdict[String(pid)]` 涵盖所有 pid 类型，因 `pdict` key 总是 string 化）。

Commit: `chore(ui-next): simplify pdict lookup in training_detail (P1-4 Minor #1)`

### Task 2.2: training_edit.tsx 修复 `dagValue` 静默丢弃清除值（Minor P1-4 #2）

**File:**
- Modify: `packages/ui-next/src/pages/training_edit.tsx:64`

当前 `dagValue = dag || (isEdit ? '' : DEFAULT_DAG)` 在 create 模式下用户的清除操作被静默替换为 `DEFAULT_DAG`。改为仅在 `dag === undefined` 时使用 default：

```tsx
const dagValue = dag ?? (isEdit ? '' : DEFAULT_DAG);
```

需要新增测试：dag 显式设置为 `''` 时不被替换。

Commit: `fix(ui-next): training_edit preserve empty dag (P1-4 Minor #2)`

### Task 2.3: training_main.tsx 修复测试 fixture 不对称（Minor P1-4 #3）

**File:**
- Modify: `packages/ui-next/src/pages/training_main.test.tsx:2437`

测试 fixture 第一个 node 缺少 `requireNids` 字段，对称添加。

Commit: `chore(ui-next): training_main test fixture symmetry (P1-4 Minor #3)`

### Task 2.4: training_files.tsx 测试描述 + 行为修正（Minor P1-4 #4）

**File:**
- Modify: `packages/ui-next/src/pages/training_files.tsx`（修正误导性注释）
- Modify: `packages/ui-next/src/pages/training_files.test.tsx`（增加 PERM_EDIT_TRAINING-without-ownership 的测试用例）

> 当前 "We check both gates" 注释不准确 — 只有 negative case（无权限）被测试。补充 positive case：用户有 `PERM_EDIT_TRAINING` 但不是 owner，应该仍然能编辑。

Commit: `test(ui-next): training_files ownership edge case (P1-4 Minor #4)`

### Task 2.5: training_detail.tsx 复用 lib UserContextShape（Minor P1-4 #5）

**File:**
- Modify: `packages/ui-next/src/pages/training_detail.tsx:104`

当前 page 内结构性 redeclared `UserContextShape`。改为从 `'../lib/perms'` 导入：

```tsx
import { hasPerm, own, type UserContextShape } from '../lib/perms';
// 删除本地 type 声明
```

注意：先 grep 整个文件确认本地 type 与 lib/perms 中的完全一致（结构兼容）。

Commit: `chore(ui-next): training_detail reuse lib UserContextShape (P1-4 Minor #5)`

### Task 2.6: training_files.tsx 并行多文件删除（Minor P1-4 #6）

**File:**
- Modify: `packages/ui-next/src/pages/training_files.tsx:14`

当前 `for (const file of files) { await request.postFile(...) }` 串行。改为 `Promise.all(files.map(f => request.postFile(...)))`。

Commit: `perf(ui-next): training_files parallelize file delete (P1-4 Minor #6)`

### Task 2.7: training_main.test.tsx 显式 spy teardown（Minor P1-4 #7）

**File:**
- Modify: `packages/ui-next/src/pages/training_main.test.tsx:35`

将 `vi.restoreAllMocks()` 改为 `mockRestore()` 显式恢复（按 spy 的预期模式）。

Commit: `test(ui-next): training_main explicit spy teardown (P1-4 Minor #7)`

### Task 2.8: homework_main.test.tsx 修正 `.closest('form')!`（Minor P1-5 #2）

**File:**
- Modify: `packages/ui-next/src/pages/homework_main.test.tsx:100`

将 `screen.getByLabelText('搜索作业').closest('form')!` 改为 `screen.getByRole('search')`（semantic）。

Commit: `test(ui-next): homework_main use getByRole for search (P1-5 Minor #2)`

---

## Self-Review Checklist（提交前必过）

- [ ] Phase 1 完成后 ui-next 1510+ passed / 2 pre-existing failures
- [ ] Phase 2 完成后所有 P1-4 + P1-5 carry-over Minor finding 全部消化
- [ ] 没有修改 `packages/ui-default/templates/` 或后端 handler
- [ ] 所有 task 都有独立 commit，message 以 `feat:` / `fix:` / `chore:` / `test:` / `perf:` 开头
- [ ] `yarn test`（全栈 e2e）Phase 1 完成后跑一次确认无回归

## Out of Scope

- F2 / F8 / F9 各自的 minor follow-ups（另有 plan）
- `/manage/config` 的 Playwright 路由覆盖（FU-1，单独 follow-up）
- 2 个 Phase 3 ADR（ui-next 替代策略、ui-default 模板归宿 — 单独 plan）
- 48 处 `as unknown as` cast 全局清理（FU-3，独立 session）
