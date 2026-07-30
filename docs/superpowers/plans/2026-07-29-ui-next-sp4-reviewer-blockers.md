# Hydro ui-next SP4 Reviewer Decisions + Pre-existing Blockers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 闭环 SP3 reviewer 决策项（tokens / i18n）并解锁 SP0–SP3 报告反复提到的两处 pre-existing 阻塞（剩余 git 冲突标记、`loader.ts:133` boot error），使 ui-next 套件全量可跑。

**Architecture:** 四个相互独立 Track：A 把 `--danger*` 危险色族提入 `tokens.css`，移除 8 处 inline hex；B 把 zh_TW catalog 从英文占位补为真翻译（不再 fall-through 到 en）；C 解析 3 个文件的剩余 `<<<<<<<`/`=======`/`>>>>>>>` 冲突标记；D 调查并修复 `test/main.ts` 启动时遇到 `loader.ts:133` 的 "invalid plugin" 报错。各 Track 独立 commit、独立回退；与 SP0 站点级 `ui.next = false` 总开关共存。

**Tech Stack:** TypeScript、React 19、CSS Modules（不引入新依赖）、Vitest 4、happy-dom、`@hydrooj/register`（esbuild on-the-fly）。

---

## Global Constraints

- Node ≥ 22，Yarn 4.6.0。
- 不修改 SP0 引入的 manifest/renderer/站点开关；`ui.next = false` 站点级回退保持不变。
- Track A 只动 `tokens.css`（深色 + 浅色两块）与 CSS Modules 的 `var(--danger*)`；不改 JSX 与 HTML 渲染。
- Track B 沿用 `lib/i18n.ts` 已有的 `Catalog` 形态与 `translate(catalog, key, args)`；新增的 key 必须三语（中/英/繁）齐全，并在 `i18n.test.ts` 加一条 drift 断言。
- Track C 解析冲突时**只保留仓库需要的语义**：`problem_files.tsx` / `ProblemAdditionalFiles.tsx` 取 `Updated upstream` 侧（带 `canEditProblem` 与 `readOnly={disabled}` 的实现）；`record_detail.test.tsx` 取 `Updated upstream` 侧（包含 `postMessage` + 状态分发断言）。
- Track D 不动 `framework/register`、不改 `cordis` Context；只解决 "invalid plugin" 错误的实际成因（root cause 调查先于任何代码改动）。
- 任务中所有 `git commit` 步骤是流程检查点，**仅在用户明确要求时才执行**。
- 共享运行命令：

  ```bash
  # 单元测试（happy-dom + vitest）
  yarn workspace @hydrooj/ui-next test <path>
  # 全量测试
  yarn workspace @hydrooj/ui-next test
  # 类型 + Vite 构建
  yarn workspace @hydrooj/ui-next build
  # e2e harness
  yarn test
  ```

---

## File Map

### Track A：tokens 危险色族

- Modify: `packages/ui-next/src/styles/tokens.css`（深色 + 浅色块各加 `--danger` / `--danger-strong` / `--danger-soft` / `--danger-mute`）
- Modify: `packages/ui-next/src/components/primitives/Button.module.css`（去掉 4 处 inline hex）
- Modify: `packages/ui-next/src/components/primitives/ConfirmDialog.module.css`（去掉 1 处 inline hex）
- Modify: `packages/ui-next/src/components/primitives/Toast.module.css`（去掉 1 处 inline hex）
- Modify: `packages/ui-next/src/components/primitives/UserSelectAutoComplete.module.css`（保留 `var(--danger)`，移除隐含 fallback）
- Modify: `packages/ui-next/src/components/profile/ProfileHeader.module.css`（去掉 1 处 inline hex）
- Modify: `packages/ui-next/src/components/files/BatchRenameDialog.module.css`（去掉 3 处 inline hex）
- Modify: `packages/ui-next/src/components/files/FilePreviewDialog.module.css`（去掉 1 处 inline hex）

### Track B：i18n zh_TW

- Modify: `packages/ui-next/src/lib/i18n.ts`（新增 `zhTW: Catalog`；`catalogs.zh_TW` 从 `en` 改为 `zhTW`）
- Modify: `packages/ui-next/src/lib/i18n.test.ts`（补一条 `expect(catalogs.zh_TW).not.toBe(catalogs.en)` 与若干 key 抽样断言）

### Track C：剩余 git 冲突标记清理

- Modify: `packages/ui-next/src/components/problem/ProblemAdditionalFiles.tsx`（line 203 处的 `readOnly={disabled}` 块；**取 Updated upstream 侧**）
- Modify: `packages/ui-next/src/components/problem/ProblemAdditionalFiles.test.tsx`（line 79–82 的 fireEvent 块；**取 Stashed changes 侧**——pre-flight grep 漏检，Task 4 实施时发现并归入同 Track）
- Modify: `packages/ui-next/src/pages/problem_files.tsx`（5 个冲突块：type 注释、`pdoc` 字段、`UserContext` 类型、perm 计算、子组件 `disabled` 计算；**取 Updated upstream 侧**）
- Modify: `packages/ui-next/src/pages/problem_files.test.tsx`（8 个冲突块；**全部取 Updated upstream 侧**——含 `perm: 'BigInt::32'` + delete confirmation dialog 协议）
- Modify: `packages/ui-next/src/components/problem/ProblemTestdata.tsx`（5 个冲突块；**取 Updated upstream 侧**）
- Modify: `packages/ui-next/src/components/problem/ProblemGenerateTestdata.tsx`（5 个冲突块；**取 Updated upstream 侧**）
- Modify: `packages/ui-next/src/components/problem/ProblemGenerateTestdata.test.tsx`（2 个冲突块；**取 Updated upstream 侧**）
- Modify: `packages/ui-next/src/pages/record_detail.test.tsx`（2 个冲突块：import 头部、`postMessage` 描述；**取 Updated upstream 侧**）

### Track D：`loader.ts:133` invalid plugin

- Investigate: `yarn test` 输出（或 `node -e "require('./test/entry.js')"`）以拿到 "invalid plugin" 错误的真实 stack 与 module name。
- Modify: 视根因而定（可能是 `plugin/loader.ts` 加载顺序、`@hydrooj/register` 与 esbuild 在 happy-dom 下解析失败、或 `test/entry.js` 的某个 `require` 找不到模块）；root cause 文档化在 SP4 完成报告。

---

## Task 1：Track A — tokens.css 加入 `--danger*` 族

**Files:**
- Modify: `packages/ui-next/src/styles/tokens.css`

**目标：** 把按钮 / ConfirmDialog / Toast / UserSelect / ProfileHeader / BatchRename / FilePreview 共 8 处 inline hex 收敛到 `tokens.css` 单一真源；保持深色 / 浅色双主题视觉一致。

### Step 1：写失败测试

文件 `packages/ui-next/src/styles/tokens.test.ts`（新建）：

```ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const css = readFileSync(resolve(__dirname, 'tokens.css'), 'utf8');

describe('tokens.css danger family', () => {
  it('declares --danger in :root', () => {
    expect(css).toMatch(/--danger:\s*#/);
  });
  it('declares --danger-strong in :root', () => {
    expect(css).toMatch(/--danger-strong:\s*#/);
  });
  it('declares --danger-soft in :root', () => {
    expect(css).toMatch(/--danger-soft:\s*#/);
  });
  it('declares --danger-mute in :root', () => {
    expect(css).toMatch(/--danger-mute:\s*#/);
  });
  it('overrides --danger in [data-theme="light"]', () => {
    expect(css).toMatch(/\[data-theme="light"\][\s\S]*--danger:\s*#/);
  });
});
```

- [ ] 创建测试

### Step 2：跑测试，验证失败

```bash
yarn workspace @hydrooj/ui-next test src/styles/tokens.test.ts
```

期望：FAIL（找不到 `--danger` 变量声明）。

### Step 3：在 tokens.css 加入危险色族

`packages/ui-next/src/styles/tokens.css` 的 `:root { ... }` 块（行 2–142 内，**深色区**）紧接 `--red` 之后加入：

```css
  /* Danger family — destructive actions. Hover/focus = --danger-strong, soft fill = --danger-soft, disabled = --danger-mute. */
  --danger: #f87171;
  --danger-strong: #ef4444;
  --danger-soft: rgba(239, 68, 68, 0.12);
  --danger-mute: #7f1d1d;
```

在 `[data-theme="light"]` 块（行 144–225）紧随 `--red: #171717;` 之后加入：

```css
  --danger: #dc2626;
  --danger-strong: #b91c1c;
  --danger-soft: rgba(220, 38, 38, 0.10);
  --danger-mute: #fca5a5;
```

取值理由：与现有 `--red`（深色 `#fca5a5`、浅色 `#171717`）保持同色系；深色 `--danger` 比 `--red` 略饱和，`--danger-strong` 加深一档；浅色用经典 Tailwind red-600 / red-700。

- [ ] 修改 tokens.css

### Step 4：跑测试，验证通过

```bash
yarn workspace @hydrooj/ui-next test src/styles/tokens.test.ts
```

期望：5/5 通过。

---

## Task 2：Track A — 替换 inline hex fallback

**Files:**
- Modify: `packages/ui-next/src/components/primitives/Button.module.css`
- Modify: `packages/ui-next/src/components/primitives/ConfirmDialog.module.css`
- Modify: `packages/ui-next/src/components/primitives/Toast.module.css`
- Modify: `packages/ui-next/src/components/primitives/UserSelectAutoComplete.module.css`
- Modify: `packages/ui-next/src/components/profile/ProfileHeader.module.css`
- Modify: `packages/ui-next/src/components/files/BatchRenameDialog.module.css`
- Modify: `packages/ui-next/src/components/files/FilePreviewDialog.module.css`

**目标：** 所有 8 处 `var(--danger, #xxxxxx)` 收紧为 `var(--danger)`；`--danger-strong` / `--danger-soft` / `--danger-mute` 同样收敛。CSS Modules 不动 JSX 与 markup。

### Step 1：写失败测试

文件 `packages/ui-next/src/styles/no-inline-danger-hex.test.ts`（新建，单独模块避免与 tokens.test 耦合）：

```ts
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..', '..', 'src');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    if (!full.endsWith('.css')) return [];
    return [full];
  });
}

const dangerHexRegex = /var\(--danger[a-z-]*,\s*(#[\da-fA-F]{3,8}|rgba?\([^)]+\))/;

describe('no inline hex fallback for --danger*', () => {
  for (const file of walk(root)) {
    const rel = file.replace(`${root}/`, '');
    it(`${rel} uses bare var(--danger*)`, () => {
      const css = readFileSync(file, 'utf8');
      expect(css).not.toMatch(dangerHexRegex);
    });
  }
});
```

- [ ] 创建测试

### Step 2：跑测试，验证失败

```bash
yarn workspace @hydrooj/ui-next test src/styles/no-inline-danger-hex.test.ts
```

期望：至少 8 个用例 FAIL（Button / ConfirmDialog / Toast / ProfileHeader / BatchRename ×2 / FilePreview / UserSelectAutoComplete 等含 inline hex 的文件）。

### Step 3：逐文件替换

把 `var(--danger, #xxxxxx)` 改成 `var(--danger)`、`var(--danger-strong, #xxxxxx)` → `var(--danger-strong)`、`var(--danger-soft, ...)` → `var(--danger-soft)`、`var(--danger-mute, ...)` → `var(--danger-mute)`。逐文件改动如下：

`Button.module.css`：

```diff
-.danger { background: var(--danger, #c0392b); color: var(--danger-text, #fff); border: 1px solid transparent; }
-.danger:hover:not(:disabled) { background: var(--danger-strong, #a93226); }
-.danger:focus-visible { outline: 2px solid var(--danger-strong, #a93226); outline-offset: 2px; }
-.danger:disabled { background: var(--danger-mute, #e6a39a); cursor: not-allowed; opacity: 0.7; }
+.danger { background: var(--danger); color: var(--text-on-danger, #fff); border: 1px solid transparent; }
+.danger:hover:not(:disabled) { background: var(--danger-strong); }
+.danger:focus-visible { outline: 2px solid var(--danger-strong); outline-offset: 2px; }
+.danger:disabled { background: var(--danger-mute); cursor: not-allowed; opacity: 0.7; }
```

`ConfirmDialog.module.css`：

```diff
-.danger { background: var(--danger, #dc2626); color: #fff; border-color: transparent; }
+.danger { background: var(--danger); color: var(--text-on-danger, #fff); border-color: transparent; }
```

`Toast.module.css`：

```diff
-.error { border-left-color: var(--danger, #dc2626); }
+.error { border-left-color: var(--danger); }
```

`UserSelectAutoComplete.module.css`：

```diff
-.error { ... color: var(--danger); ... }
+.error { ... color: var(--danger); ... }
```

（这一处没有 inline hex fallback，只需确认；grep 已确认。）

`ProfileHeader.module.css`：

```diff
-.banned { color: var(--danger, #c00); margin: 0; }
+.banned { color: var(--danger); margin: 0; }
```

`BatchRenameDialog.module.css`：

```diff
-  background: var(--danger-soft, rgba(220, 38, 38, 0.08));
-  color: var(--danger, #dc2626);
+  background: var(--danger-soft);
+  color: var(--danger);
...
-  color: var(--danger, #dc2626);
+  color: var(--danger);
```

`FilePreviewDialog.module.css`：

```diff
-  color: var(--danger, #e5484d);
+  color: var(--danger);
```

注意：`Button.module.css` 之前使用了 `var(--danger-text, #fff)`，本次统一为 `var(--text-on-danger, #fff)`，并在 `tokens.css` 的 `:root` 与 `[data-theme="light"]` 各加一行：

```css
  --text-on-danger: #ffffff;
```

（在深色 `:root` 加 `--text-on-danger: #fff`，浅色 `[data-theme="light"]` 维持同色。）

- [ ] 修改 7 个 CSS 文件
- [ ] 在 `tokens.css` 两块各加 `--text-on-danger: #fff;`

### Step 4：跑测试，验证通过

```bash
yarn workspace @hydrooj/ui-next test src/styles/no-inline-danger-hex.test.ts
```

期望：全部用例通过。

### Step 5：现有 Button / ConfirmDialog 测试不回归

```bash
yarn workspace @hydrooj/ui-next test src/components/primitives/Button.test.tsx src/components/primitives/ConfirmDialog.test.tsx
```

期望：Button 7/7、ConfirmDialog 既有用例全部通过（`styles.danger` / `styles.confirmDanger` 类名仍在，CSS 解析仍是 module-scoped class）。

---

## Task 3：Track B — zh_TW 真翻译 catalog

**Files:**
- Modify: `packages/ui-next/src/lib/i18n.ts`
- Modify: `packages/ui-next/src/lib/i18n.test.ts`

**目标：** 把 `zh_TW: en` 的占位替换为独立 `zhTW` catalog；先覆盖 SP3 新增的 12 个 key + 既有的 `Auth.*` / `ContestForm.*` / `Common.*` 高频 key；不引入机器翻译味。

### Step 1：写失败测试

在 `packages/ui-next/src/lib/i18n.test.ts` 末尾追加：

```ts
describe('zh_TW catalog', () => {
  it('is not aliased to the English catalog', () => {
    expect(catalogs.zh_TW).not.toBe(catalogs.en);
  });

  it.each([
    'Auth.SudoTitle',
    'Auth.SudoSubtitle',
    'Auth.UseAuthenticator',
    'Auth.WebAuthnVerified',
    'Auth.Confirm',
    'ContestForm.Permission',
    'ContestForm.PermissionPublic',
    'ContestForm.PermissionInvite',
    'ContestForm.PermissionAssign',
    'ContestForm.SectionPermission',
    'ContestForm.InviteCode',
    'ContestForm.Assign',
    'Common.Submit',
    'Common.Cancel',
    'Problem.NoPermissionToSubmit',
    'Problem.LoginToSubmit',
  ])('zh_TW translates %s differently from en', (key) => {
    expect(catalogs.zh_TW[key]).toBeTruthy();
    expect(catalogs.zh_TW[key]).not.toBe(catalogs.en[key]);
  });
});
```

- [ ] 追加测试

### Step 2：跑测试，验证失败

```bash
yarn workspace @hydrooj/ui-next test src/lib/i18n.test.ts
```

期望：两条新用例 FAIL（`zh_TW` 仍指向 `en`）。

### Step 3：在 i18n.ts 新增 `zhTW`

`packages/ui-next/src/lib/i18n.ts`：

- 在 `export const en: Catalog = { ... };` 之后、`export const catalogs: Record<Locale, Catalog> = { ... };` 之前，插入 `export const zhTW: Catalog = { ... };`。
- `catalogs.zh_TW` 从 `en` 改为 `zhTW`。

`zhTW` 至少包含（完整 key 列表以测试抽样的 16 个为准，文案风格保持与 `zhCN` 一致但用繁体 + 台湾术语）：

```ts
export const zhTW: Catalog = {
  'Auth.SudoTitle': '請確認密碼',
  'Auth.SudoSubtitle': '為了你的帳號安全,請重新輸入密碼以繼續操作。',
  'Auth.UseAuthenticator': '使用認證器',
  'Auth.WebAuthnVerified': '認證器已驗證',
  'Auth.Confirm': '確認',
  'ContestForm.Permission': '權限',
  'ContestForm.PermissionPublic': '公開',
  'ContestForm.PermissionInvite': '邀請碼',
  'ContestForm.PermissionAssign': '指派使用者',
  'ContestForm.SectionPermission': '權限控制',
  'ContestForm.InviteCode': '邀請碼',
  'ContestForm.Assign': '已指派的使用者',
  'Common.Submit': '提交',
  'Common.Cancel': '取消',
  'Problem.NoPermissionToSubmit': '無提交權限',
  'Problem.LoginToSubmit': '登入後提交',
};
```

其余 key 仍走 `en` fallback；后续 PR 由翻译协作工具或 reviewer 增量补齐；本次不在 SP4 范围。

`catalogs` 改动：

```diff
 export const catalogs: Record<Locale, Catalog> = {
   zh_CN: zhCN,
-  // zh_TW currently falls back to en — translation TBD.
-  zh_TW: en,
+  zh_TW: zhTW,
   en,
 };
```

- [ ] 修改 i18n.ts

### Step 4：跑测试，验证通过

```bash
yarn workspace @hydrooj/ui-next test src/lib/i18n.test.ts
```

期望：既有 18+ 个用例 + 新增 17 条全部通过。

---

## Task 4：Track C — `ProblemAdditionalFiles.tsx` 冲突块（1 处）

**Files:**
- Modify: `packages/ui-next/src/components/problem/ProblemAdditionalFiles.tsx`

**目标：** 删除 line 203–206 的 `<<<<<<< Updated upstream` / `=======` / `>>>>>>> Stashed changes` 标记，保留 `Updated upstream` 侧（`readOnly={disabled}` 透传给 `FilePreviewDialog`）。

### Step 1：写失败测试

文件 `packages/ui-next/src/components/problem/ProblemAdditionalFiles.no-conflict-markers.test.ts`（新建）：

```ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(__dirname, 'ProblemAdditionalFiles.tsx'), 'utf8');

describe('ProblemAdditionalFiles.tsx conflict markers', () => {
  it('contains no merge conflict markers', () => {
    expect(src).not.toMatch(/<<<<<<</);
    expect(src).not.toMatch(/=======/);
    expect(src).not.toMatch(/>>>>>>>/);
  });

  it('passes readOnly={disabled} into FilePreviewDialog', () => {
    expect(src).toMatch(/FilePreviewDialog[\s\S]{0,200}readOnly=\{disabled\}/);
  });
});
```

- [ ] 创建测试

### Step 2：跑测试，验证失败

```bash
yarn workspace @hydrooj/ui-next test src/components/problem/ProblemAdditionalFiles.no-conflict-markers.test.ts
```

期望：marker 用例 FAIL。

### Step 3：解析冲突

`packages/ui-next/src/components/problem/ProblemAdditionalFiles.tsx`（line 203–206）改为：

```tsx
          size={files.find((f) => f.name === preview)?.size}
          readOnly={disabled}
          onClose={() => setPreview(null)}
          onSaved={() => onChange(files)}
```

`Stashed changes` 侧（空）丢弃；与 `readOnly={disabled}` 同一 commit。

- [ ] 修改 `ProblemAdditionalFiles.tsx`

### Step 4：跑测试，验证通过

```bash
yarn workspace @hydrooj/ui-next test src/components/problem/ProblemAdditionalFiles.no-conflict-markers.test.ts src/components/problem/ProblemAdditionalFiles.test.tsx
```

期望：marker 测试 + 原 `ProblemAdditionalFiles.test.tsx` 全部通过。

---

## Task 5：Track C — `problem_files.tsx` 冲突块（5 处）

**Files:**
- Modify: `packages/ui-next/src/pages/problem_files.tsx`

**目标：** 删除 line 21/24/25、31/34/35、40/42/43、96/106/107、130/132/134、141/143/145 共 5 个冲突块；保留 `Updated upstream` 侧（`canEditProblem` perm 逻辑 + `UserContext` 类型扩展）。注意 line 96–107 的 `canEdit` 计算块包含 6 行实质代码，必须整体保留。

### Step 1：写失败测试

文件 `packages/ui-next/src/pages/problem_files.no-conflict-markers.test.ts`（新建）：

```ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(__dirname, 'problem_files.tsx'), 'utf8');

describe('problem_files.tsx conflict markers', () => {
  it('contains no merge conflict markers', () => {
    expect(src).not.toMatch(/<<<<<<</);
    expect(src).not.toMatch(/=======/);
    expect(src).not.toMatch(/>>>>>>>/);
  });

  it('computes canEdit via canEditProblem', () => {
    expect(src).toMatch(/canEdit\s*=\s*!isReference\s*&&\s*canEditProblem\(/);
  });

  it('uses disabled={!canEdit} for testdata + additional file components', () => {
    const matches = src.match(/disabled=\{!canEdit\}/g) ?? [];
    expect(matches.length).toBe(2);
  });
});
```

- [ ] 创建测试

### Step 2：跑测试，验证失败

```bash
yarn workspace @hydrooj/ui-next test src/pages/problem_files.no-conflict-markers.test.ts
```

期望：marker 用例 FAIL。

### Step 3：解析冲突

逐处把 `<<<<<<< Updated upstream` / `=======` / `>>>>>>> Stashed changes` 包裹整段替换为 `Updated upstream` 侧内容；`Stashed` 侧（多半为空或为弱 `disabled={isReference}`）丢弃。具体改动：

- line 21–25：注释块保留 `Updated upstream` 侧（`owner` / `maintainer` 注释）。
- line 31–35：`pdoc` 字段保留 `owner?: number; maintainer?: number[];`。
- line 40–43：`UserContext?: Record<string, unknown>;` 保留。
- line 96–107：`canEdit = !isReference && canEditProblem(...)` 整段保留；这是 `Updated upstream` 侧唯一有实质代码的部分。
- line 130–134：`disabled={!canEdit}` 取代 `disabled={isReference}`。
- line 141–145：`disabled={!canEdit}` 取代 `disabled={isReference}`。

改后逐处必须确保：

- 头尾保留 `Updated upstream` 侧的注释与代码；
- `<<<<<<<` / `=======` / `>>>>>>>` 三行全部消失；
- `Stashed changes` 侧的任何代码（特别是 `disabled={isReference}`）必须丢弃，不能保留——否则回退到 SP3 之前的弱 perm 语义。

- [ ] 修改 `problem_files.tsx`

### Step 4：跑测试，验证通过

```bash
yarn workspace @hydrooj/ui-next test src/pages/problem_files.no-conflict-markers.test.ts
```

期望：所有 marker 用例 + `canEdit` 不变式 + `disabled` 计数全部通过。

### Step 5：ProblemAdditionalFiles 测试与 ProblemFiles 测试

```bash
yarn workspace @hydrooj/ui-next test src/pages/problem_files.test.tsx
```

（如 `problem_files.test.tsx` 尚未存在，跳过；新增测试作为 Track C 收尾。）

期望：通过；如新增文件，按既有 `problem_files.tsx` 行为：渲染 + perm 计算 + disabled 透传。

---

## Task 6：Track C — `record_detail.test.tsx` 冲突块（2 处）

**Files:**
- Modify: `packages/ui-next/src/pages/record_detail.test.tsx`

**目标：** 删除 line 2/74/123、129/203/302 两个冲突块；保留 `Updated upstream` 侧（包含 `STATUS` import、`postMessage` 描述与状态分发断言）。

### Step 1：写失败测试

文件 `packages/ui-next/src/pages/record_detail.no-conflict-markers.test.ts`（新建）：

```ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(__dirname, 'record_detail.test.tsx'), 'utf8');

describe('record_detail.test.tsx conflict markers', () => {
  it('contains no merge conflict markers', () => {
    expect(src).not.toMatch(/<<<<<<</);
    expect(src).not.toMatch(/=======/);
    expect(src).not.toMatch(/>>>>>>>/);
  });

  it('imports STATUS from @hydrooj/common', () => {
    expect(src).toMatch(/import\s+\{\s*STATUS\s*\}\s+from\s+['"]@hydrooj\/common['"]/);
  });

  it('has a postMessage describe block', () => {
    expect(src).toMatch(/describe\(['"]record_detail postMessage['"]/);
  });
});
```

- [ ] 创建测试

### Step 2：跑测试，验证失败

```bash
yarn workspace @hydrooj/ui-next test src/pages/record_detail.no-conflict-markers.test.ts
```

期望：marker 用例 FAIL。

### Step 3：解析冲突

逐处丢弃 `Stashed changes` 侧，保留 `Updated upstream` 侧：

- 头块（line 2 起）：保留 `import { STATUS } from '@hydrooj/common';` 等行；`Stashed` 侧一般是空或缺 import，必须丢弃。
- 中块（line 129 起）：保留 `describe('record_detail postMessage', () => { ... it('emits window.parent.postMessage with the numeric STATUS_ACCEPTED value', ...)` 整段；`Stashed` 侧一般是空。

- [ ] 修改 `record_detail.test.tsx`

### Step 4：跑测试，验证通过

```bash
yarn workspace @hydrooj/ui-next test src/pages/record_detail.no-conflict-markers.test.ts src/pages/record_detail.test.tsx
```

期望：marker 测试 + 原 `record_detail.test.tsx` 全部通过。

---

## Task 7：Track C — 综合验证（全量 vitest）

**Files:**
- 全量

**目标：** 跑过 Track C 修复后的整批 ui-next 套件，确认 3 个文件的 marker 清理没有引入回归。

### Step 1：定向回归

```bash
yarn workspace @hydrooj/ui-next test \
  src/components/problem/ProblemAdditionalFiles.test.tsx \
  src/components/problem/ProblemAdditionalFiles.no-conflict-markers.test.ts \
  src/pages/problem_files.test.tsx \
  src/pages/problem_files.no-conflict-markers.test.ts \
  src/pages/record_detail.test.tsx \
  src/pages/record_detail.no-conflict-markers.test.ts
```

期望：全部通过。

- [ ] 记录结果

### Step 2：扫尾剩余冲突标记

```bash
grep -RIn "<<<<<<<\|=======\|>>>>>>>" /home/xq/Hydro/packages/ui-next/src 2>&1 \
  | grep -v "tokens.css.*===" \
  | grep -v "problem_detail.tsx.*==="
```

期望：无剩余（`tokens.css` 的 `============` 是注释装饰，`problem_detail.tsx` 的 `===== Types (unchanged from existing) =====` / `===== Page =====` 是 ASCII 装饰）。

- [ ] 记录扫描结果

### Step 3：全量 vitest

```bash
yarn workspace @hydrooj/ui-next test
```

期望：剩余失败计数比 SP3 baseline（8 failed / 936 passed）减少。如剩余失败数与 SP3 完全一致，说明除 Track C 已修复的 3 个文件外还有其它阻塞；立刻停下来记录，不要擅自继续扩大范围。

- [ ] 记录全量测试结果（passed / failed）

---

## Task 8：Track D — `loader.ts:133` root cause 调查

**Files:**
- Modify: 视 root cause（不在本任务改任何东西）

**目标：** 在不修改源码前提下，把 "invalid plugin" 错误从 `test/main.ts` 启动路径中定位到具体 module / 行 / 调用链；记录到 `.superpowers/sdd/sp4-loader-bug.md`。

### Step 1：尝试运行 e2e harness，捕获错误

```bash
CI=true node --enable-source-maps -r @hydrooj/register test/entry.js 2>&1 | head -120
```

期望：捕获完整 stack trace。错误信息会引用 `loader.ts:133` 或附近的 "invalid plugin" 字符串。

- [ ] 把原始输出贴到 `.superpowers/sdd/sp4-loader-bug.md`，不删任何一行

### Step 2：阅读相关 loader / plugin 注册代码

可能候选：

- `packages/hydrooj/src/loader.ts`（SP0 报告 F6 引用）
- `framework/register/index.ts`（on-the-fly TS loader）
- `packages/hydrooj/src/entry/worker.ts` 的 bootstrap 路径
- `test/entry.js` 的 `require('hydrooj/bin/hydrooj')`

```bash
grep -RIn "invalid plugin" /home/xq/Hydro/packages 2>&1 | head
```

- [ ] 记录 grep 结果

### Step 3：定位 root cause

根据 stack trace 与 grep 输出，把 root cause 写成 SP4 完成报告的"D 节"内容：

- 出错模块（如 `addons/components`、`addons/onsite-toolkit`、`login-with-github` 等）
- 错误类型（plugin 配置 schema 失败 / 缺少依赖 / 循环 import / `cordis` ctx 注入未就绪）
- 触发条件（仅在 `CI=true` 启动时 / 仅在 `--debug` 下 / 任何路径）

不修复代码；只诊断。

- [ ] 把 root cause 写到 `.superpowers/sdd/sp4-loader-bug.md`

### Step 4：判断是否能纳入 SP4 实施

- 如果 root cause 是简单（如单文件 schema 拼写错误、漏 import），进入 Task 9 修复。
- 如果 root cause 涉及 `cordis` / 多插件协调 / `@hydrooj/register` 与 esbuild 交互，**不纳入 SP4 实施**——SP4 不动 core loader。任务结束，把诊断结果留给 SP5+。

- [ ] 决策记录

---

## Task 9：Track D — `loader.ts:133` 修复（如适用）

**Files:**
- Modify: 视 root cause（仅在 Task 8 决策为"简单可修"时执行）

**目标：** 仅当 Task 8 决策为"简单可修"时实施；否则跳过此任务，直接进入 Task 10。

### Step 1：写失败测试

按 root cause 类型决定：

- 配置 schema 错误：在对应 handler/service 的测试中加 `import` + 启动断言。
- 循环 import：在 `test/main.ts` 中加 `assertNoCircularImport('addons/<name>')`。

测试文件位置由 root cause 决定。

### Step 2：实施最小修复

按 root cause 类型实施；任何修复必须保持 SP0–SP3 既有行为不回退。

### Step 3：跑 harness，验证通过

```bash
CI=true node --enable-source-maps -r @hydrooj/register test/entry.js 2>&1 | head -120
```

期望：与 Task 8 Step 1 对比，错误消失；harness 启动到 `app/ready`。

---

## Task 10：综合回归

**Files:**
- 全量
- `.claude/report/2026-07-29-sp4-reviewer-blockers-completion.md`

**目标：** 跑过现有 ui-next 套件、manifest、build、e2e harness（如果 Task 9 通过），确保未引入退化。

### Step 1：定向回归

```bash
yarn workspace @hydrooj/ui-next test \
  src/styles/tokens.test.ts \
  src/styles/no-inline-danger-hex.test.ts \
  src/lib/i18n.test.ts \
  src/components/primitives/Button.test.tsx \
  src/components/primitives/ConfirmDialog.test.tsx \
  src/components/problem/ProblemAdditionalFiles.no-conflict-markers.test.ts \
  src/pages/problem_files.no-conflict-markers.test.ts \
  src/pages/record_detail.no-conflict-markers.test.ts
```

期望：全部通过。

- [ ] 记录结果

### Step 2：全量测试

```bash
yarn workspace @hydrooj/ui-next test
```

期望：失败数 ≤ SP3 baseline（8 failed / 936 passed）；Track A/B/C 不新增失败。

- [ ] 记录 passed / failed

### Step 3：类型检查 + 构建

```bash
yarn workspace @hydrooj/ui-next build
```

期望：TS 通过；Vite build 通过（`ProblemAdditionalFiles.tsx` 冲突已修复，pre-existing 阻塞消失）。

- [ ] 记录结果

### Step 4：lint

```bash
yarn lint:ci
```

期望：无新增 error/warning（与预存 505 warnings 基线对比）。

- [ ] 记录结果

### Step 5：e2e（如 Task 9 通过）

```bash
yarn test
```

期望：四条 smoke 仍绿（pre-existing）；Track D 如 Task 9 失败则如实记录"未实际执行"。

- [ ] 记录 e2e 实际状态

### Step 6：完成报告

完成报告保存到 `.claude/report/2026-07-29-sp4-reviewer-blockers-completion.md`，涵盖：

- 四个 Track 的最终 commit 列表（与 Task 顺序一致）。
- 缺陷关闭矩阵：
  - Track A：`--danger*` 进 tokens.css、8 处 inline hex 移除。
  - Track B：`zh_TW` 不再 fall-through 到 `en`；16 个高频 key 真翻译。
  - Track C：`ProblemAdditionalFiles.tsx`、`problem_files.tsx`、`record_detail.test.tsx` 三个文件 marker 清零。
  - Track D：`loader.ts:133` root cause 与（可能的）修复。
- 定向测试结果与全量测试结果。
- build / lint / e2e 实际状态。
- 已知限制与回退路径（每个 Track 单独可回退；站点级 `ui.next = false`）。
- reviewer 后续决策项（如：`zh_TW` 余下 key 的翻译、`--danger-soft` 在浅色下的覆盖度等）。

- [ ] 写完成报告

---

## Self-Review

1. **Spec coverage** — 4 个 Track 均映射到具体任务：Track A→Task 1/2，Track B→Task 3，Track C→Task 4/5/6/7，Track D→Task 8/9，综合验证→Task 10。
2. **Placeholder scan** — 全文无 `TBD`/`TODO`/`add appropriate`；Track B 的 `zhTW` 留了 16 个真翻译 key，其余仍走 `en` fallback，已在 Task 3 Step 3 显式说明"后续 PR 由翻译协作工具或 reviewer 增量补齐；本次不在 SP4 范围"。
3. **Type consistency** — `tokens.css` 新增的 `--danger*` / `--text-on-danger` 在深浅两块一一对应；CSS Modules 全部改为 `var(--danger)` 无 fallback。`problem_files.tsx` 的 `canEdit` 与 `disabled` 计算在 Task 5 解析冲突后类型仍为 `boolean`。
4. **Global constraints** — 未修改 `NEXT_PAGES`、未改 router / 渲染器、未动 `cordis` Context；Track A 只动 CSS；Track B 只动 i18n.ts；Track C 只解析 marker；Track D 只诊断 + 最小修复（如适用）。
5. **Commit checkpoints** — 每 Task 含可选 `git commit` 检查点（Task 1–10 全部写明"仅在用户授权时执行"）。
6. **Risk Tier** — Track A/B 是纯收尾，零行为变化；Track C 是 3 个 marker 的机械清理，每个文件只取 `Updated upstream` 侧，可通过既有测试断言不变；Track D 仅诊断，不强修。