# SDD Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 恢复 2026-07-23 中断的 SDD 流程，串行完成 Task 8 重审与 Task 9/10/12 修复（仅 Critical + Important），使 ui-next 三页面（problem_config / problem_files / contest_clarification）达到 ui-default 功能对等度。

**Architecture:** 4 个串行 SDD 任务 + 1 个收尾任务。每个 SDD 任务走 SDD skill 标准 4 阶段：fix-brief → fix subagent（实现 + 测试）→ review subagent（spec 对齐 + 代码质量）→ re-review（如需）。本计划文件描述编排与跨任务约束；每个 SDD 任务的详细步骤写到各自的 `task-N-fix-brief.md`。

**Tech Stack:** React 19 + TypeScript + Vite；vitest + happy-dom + testing-library；AJV（已有）；@monaco-editor/react（已有）；react-dnd（仅 Task 9 需要，按需加）；js-yaml（已有）。

**Spec:** `docs/superpowers/specs/2026-07-24-sdd-recovery-tasks-8-9-10-12-design.md`
**Parity reviews:** `.superpowers/sdd/task-9-report.md`、`task-10-report.md`、`task-11-report.md`、`task-12-report.md`、`task-8-fix-report.md`

---

## 全局约束

- **Node ≥ 22**、Yarn 4.6.0、AGPLv3（per CLAUDE.md）。
- **不在 master commit/push**（per q.md）：所有改动保持 uncommitted 形式，最终由用户决定。
- **保护文件不可改**：`.claude/reviews/ui-next-migration-gap-2026-07-21.md`（仅追加第七节调整 + 第八节）、`packages/ui-next/src/lib/i18n.ts`、`.superpowers/sdd/task-7.patch`。
- **不修改 ui-default**：所有改动限于 `packages/ui-next/src/**`、`.superpowers/sdd/**`、`docs/superpowers/specs/**`、`docs/superpowers/plans/**`、`.claude/reviews/**`。
- **不修改后端**：除非 Critical 明确指向后端契约错误；本计划覆盖范围内无后端修改。
- **i18n**：如需新 key，需绕过 `lib/i18n.ts` 直接走 `i18n(key)` 兜底；或暂用 English 字面量 + TODO。
- **TDD**：每个 fix subagent 必须先写 FAILING 测试，验证 RED，再实现，验证 GREEN；不可直接动手写代码。
- **Medium/Low 不修**：每 Task 仅修 Critical + Important；Medium/Low 进入 final whole-branch review。
- **commit 范围**：每个 SDD 任务完成时把 `task-N-fix-brief.md`、`task-N-fix-report.md`、`task-N-re-review.md` 与所有源代码改动 add，但不 commit（per q.md）。

---

## 文件结构

### 新增文件（4 个 SDD 任务各 3 个 + 计划末尾 1 个收尾）

**Task 8**:
- `.superpowers/sdd/task-8-re-review.md`

**Task 12**:
- `.superpowers/sdd/task-12-fix-brief.md`
- `.superpowers/sdd/task-12-fix-report.md`
- `.superpowers/sdd/task-12-re-review.md`

**Task 10**:
- `.superpowers/sdd/task-10-fix-brief.md`
- `.superpowers/sdd/task-10-fix-report.md`
- `.superpowers/sdd/task-10-re-review.md`

**Task 9**:
- `.superpowers/sdd/task-9-fix-brief.md`
- `.superpowers/sdd/task-9-fix-report.md`
- `.superpowers/sdd/task-9-re-review.md`

**报告追加**:
- `.claude/reviews/ui-next-migration-gap-2026-07-21.md` 第七节（修订 SDD 真实结论）+ 第八节（执行日志）

### 修改文件（任务执行过程中由 fix subagent 决定，本计划不穷举；详见各 task-N-fix-brief.md）

- `packages/ui-next/src/pages/contest_clarification.tsx`
- `packages/ui-next/src/components/contest/ContestClarificationList.tsx`
- `packages/ui-next/src/components/contest/ContestClarificationForm.tsx`
- `packages/ui-next/src/pages/problem_files.tsx`
- `packages/ui-next/src/components/problem/ProblemTestdata.tsx`
- `packages/ui-next/src/components/problem/ProblemGenerateTestdata.tsx`
- `packages/ui-next/src/components/problem/ProblemCreateTestdata.tsx`
- `packages/ui-next/src/components/problem/FilePreviewDialog.tsx` (如存在)
- `packages/ui-next/src/lib/download-zip.ts`
- `packages/ui-next/src/pages/problem_config.tsx`
- `packages/ui-next/src/components/problem/ProblemConfigEditor.tsx`
- `packages/ui-next/src/components/problem/ProblemConfigBasicForm.tsx`
- `packages/ui-next/src/components/problem/ProblemConfigTree.tsx`
- `packages/ui-next/src/components/problem/MonacoEditorHost.tsx`
- `packages/ui-next/src/lib/yaml-config.ts`
- `packages/ui-next/src/lib/testdata-detect.ts`
- `packages/ui-next/src/pages/record_detail.tsx`（Task 10 C-2 需要）
- 上述各文件对应的 `*.test.tsx` 单测

### 不修改的文件

- `packages/ui-default/**`
- `packages/hydrooj/src/**`、`packages/hydrojudge/src/**`、`packages/common/src/**`
- `packages/ui-next/src/lib/i18n.ts`
- `packages/ui-next/src/sections/**`（已审查完毕）
- `.claude/reviews/ui-next-migration-gap-2026-07-21.md` 原 1–6 章节
- `.superpowers/sdd/task-7.patch`

---

## Task 1: Task 8 Re-review

**Files:**
- Create: `.superpowers/sdd/task-8-re-review.md`
- Read: `.superpowers/sdd/task-8-brief.md`, `.superpowers/sdd/task-8-fix-report.md`, `.superpowers/sdd/task-8-review-package.md`

**Interfaces:**
- Consumes: Task 8 的 brief、fix-report、review-package；fix subagent `a1f17a865bd5dd1c1`（如可用）
- Produces: `task-8-re-review.md` 包含 verdict + findings 列表

**Why this task:** `progress.md` 显示 re-review subagent `a1f17a865bd5dd1c1` 在 2026-07-23 被中断。需要恢复或重派，确保 Task 8 4 项 Important fix 真正生效，再进入 Task 12。

- [ ] **Step 1: 尝试 SendMessage 续接 subagent `a1f17a865bd5dd1c1`**

如果该 subagent 仍存活（agent ID 格式 `a...-...`），发送：
```
context: Task 8 re-review was interrupted. Please continue from where you stopped.
attach: .superpowers/sdd/task-8-fix-report.md (the 4 Important fixes already applied)
request: Provide final verdict (PASSED / NEEDS-FIX / FAILED) with findings list.
```
Expected: subagent 返回 verdict。

- [ ] **Step 2: 如果 Step 1 失败，新派 re-review subagent**

使用 `Agent` 工具派一个新 subagent，subagent_type `general-purpose`，附：
- `.superpowers/sdd/task-8-brief.md`（完整 brief）
- `.superpowers/sdd/task-8-fix-report.md`（4 项 Important fix 内容）
- `.superpowers/sdd/task-8-review-package.md`（已存在的 review package）

Prompt:
```
You are a reviewer for SDD Task 8 (contest_user parity migration).

The implementer applied 4 Important fixes (see task-8-fix-report.md) addressing
issues raised in the original review (see task-8-review-package.md).

Your job: verify each fix actually addresses the original finding AND no new
issues are introduced. Provide final verdict (PASSED / NEEDS-FIX / FAILED)
with structured findings.

Output to stdout only. Do not write any files.
```

- [ ] **Step 3: 写 re-review 文件**

Create `.superpowers/sdd/task-8-re-review.md` with the verdict + findings.

Format:
```markdown
# Task 8 Re-review

**Verdict:** [PASSED | NEEDS-FIX | FAILED]

**Findings:**
- [list each finding with file:line and severity]

**Test results:**
`yarn workspace @hydrooj/ui-next test --run --reporter=verbose ContestUser`
→ 40/40 PASSED

**Sign-off:** [reviewer name / agent ID]
```

- [ ] **Step 4: 验证测试通过**

Run: `cd /home/xq/Hydro && yarn workspace @hydrooj/ui-next test --run --reporter=verbose ContestUser`
Expected: 40/40 PASSED.

- [ ] **Step 5: 验证 PASSED 才能继续**

如果 verdict 是 NEEDS-FIX 或 FAILED，回到 Step 1 重派；不要跳到 Task 12。

- [ ] **Step 6: 写阶段日志到 `.claude/reviews/ui-next-migration-gap-2026-07-21.md` 第八节**

新增 `## 八、SDD 恢复执行日志` 章节，记录 Task 8 完成时间、verdict、修复后测试结果。

---

## Task 2: Task 12 Fix (contest_clarification)

**Files:**
- Create: `.superpowers/sdd/task-12-fix-brief.md`
- Create: `.superpowers/sdd/task-12-fix-report.md`
- Create: `.superpowers/sdd/task-12-re-review.md`
- Modify: `packages/ui-next/src/pages/contest_clarification.tsx`
- Modify: `packages/ui-next/src/components/contest/ContestClarificationList.tsx`
- Modify: `packages/ui-next/src/components/contest/ContestClarificationForm.tsx`
- Modify: 上述文件的 `*.test.tsx`

**Interfaces:**
- Consumes: Task 11 的 fixes 模板 + `.superpowers/sdd/task-12-report.md` 的 6 项 findings
- Produces: contest_clarification page 与子组件修复 + 单测覆盖

**Why this task:** Task 12 是 SDD parity review 结论"NEEDS FIXES"且最小（2 Critical + 4 Medium）。按 progress.md 推荐顺序最先做。

- [ ] **Step 1: 写 fix-brief 文件**

Create `.superpowers/sdd/task-12-fix-brief.md` 包含：

1. **范围声明**：仅修 2 Critical + 4 Medium；不碰 6 Low。
2. **Critical 修复目标**（来自 spec §4.2）:
   - C-1: 增加 "Ask" 模式（无 `did` 提交新提问）
   - C-2: 移除 `window.location.reload()`，改本地 setItems
3. **Medium 修复目标**:
   - M-1: 显示 ObjectId timestamp
   - M-2: 选手拥有的 item 不显示 Reply 按钮
   - M-3: Jury badge 用 `owner === 0` 判断
   - M-4: Subject label 用 `getAlphabeticId(pids.indexOf(subject))`
4. **文件清单**：列出每个 fix 涉及的具体文件路径与大致行号
5. **TDD 要求**：每个 fix 必须先写 FAILING 测试，RED 后再实现
6. **约束**：不可改 `lib/i18n.ts`；如需新 key 走兜底
7. **验证清单**：每项 fix 对应的 vitest 期望行为
8. **完成定义**：所有 6 项 fix 应用 + 单测通过 + 不引入回归

- [ ] **Step 2: 派 fix subagent**

使用 `Agent` 工具，subagent_type `general-purpose`，附 task-12-fix-brief.md + task-12-report.md。

Prompt:
```
You are a SDD fix implementer for Task 12 (contest_clarification parity).

Read .superpowers/sdd/task-12-fix-brief.md as your complete spec.
Apply only the 6 listed fixes (2 Critical + 4 Medium). Do NOT touch Low items.

Follow TDD strictly: each fix = failing test FIRST → run RED → implement →
run GREEN. Show test output in your report.

After all fixes, run the full ui-next test suite:
  yarn workspace @hydrooj/ui-next test --run
Report test counts.

Write .superpowers/sdd/task-12-fix-report.md with:
- Status (DONE / DONE_WITH_CONCERNS)
- Per-fix summary (file:line + what changed)
- Test results (RED → GREEN transitions)
- Concerns list

Do NOT commit. Do NOT push.
```

- [ ] **Step 3: 验证 fix-report + 跑测试**

```bash
yarn workspace @hydrooj/ui-next test --run --reporter=verbose ContestClarification
```
Expected: 全部 PASSED（含 fix-report 中列出的新增测试）。

- [ ] **Step 4: 派 review subagent**

使用 `Agent` 工具，subagent_type `general-purpose`，附 task-12-fix-brief.md + task-12-fix-report.md + 全部 git diff。

Prompt:
```
You are a SDD reviewer for Task 12 fixes.

Read .superpowers/sdd/task-12-fix-brief.md for spec,
.superpowers/sdd/task-12-fix-report.md for what was implemented,
and run `cd /home/xq/Hydro && git diff -- packages/ui-next/src` for diff.

Verify:
1. All 2 Critical + 4 Medium fixes correctly implemented per spec
2. No regression on existing tests
3. No `window.location.reload()` introduced
4. No `lib/i18n.ts` modified
5. No Low items touched

Provide verdict (PASSED / NEEDS-FIX / FAILED) with findings list.
Output to stdout only.
```

- [ ] **Step 5: 写 re-review 文件**

Create `.superpowers/sdd/task-12-re-review.md` 类似 Task 8 re-review 格式。

- [ ] **Step 6: 如果 NEEDS-FFIX，回到 Step 2 派第二轮 fix**

最多 3 轮 fix-review 循环；若仍 NEEDS-FIX，上报用户决定。

- [ ] **Step 7: 追加第八节执行日志**

记录 Task 12 完成时间、verdict、测试结果。

---

## Task 3: Task 10 Fix (problem_files testdata)

**Files:**
- Create: `.superpowers/sdd/task-10-fix-brief.md`
- Create: `.superpowers/sdd/task-10-fix-report.md`
- Create: `.superpowers/sdd/task-10-re-review.md`
- Modify: `packages/ui-next/src/pages/problem_files.tsx`
- Modify: `packages/ui-next/src/components/problem/ProblemTestdata.tsx`
- Modify: `packages/ui-next/src/components/problem/ProblemGenerateTestdata.tsx`
- Modify: `packages/ui-next/src/components/problem/ProblemCreateTestdata.tsx`
- Modify: `packages/ui-next/src/lib/download-zip.ts`
- Modify: `packages/ui-next/src/pages/record_detail.tsx`（Task 10 C-2 需要 postMessage）
- Modify: 上述文件的 `*.test.tsx`
- 可能新增: `packages/ui-next/src/components/problem/ConfirmDialog.tsx`（如不存在）

**Interfaces:**
- Consumes: `.superpowers/sdd/task-10-report.md` 的 3 Critical + 4 High findings；参考 ui-default `pages/files.page.tsx:272-303` 与 `components/zipDownloader/index.ts:28-83`
- Produces: problem_files 页 + testdata 组件链修复 + 流式 ZIP + record_detail postMessage

**Why this task:** Task 10 是 3 Critical + 4 High，包含明显的 bug（endpoint 错、状态比较字符串 vs 数字、TS 类型错误），先做 Task 12 后做 Task 10。

- [ ] **Step 1: 写 fix-brief 文件**

Create `.superpowers/sdd/task-10-fix-brief.md` 包含：

1. **范围声明**：仅修 3 Critical + 4 High；不碰 Medium/Low。
2. **Critical 修复目标**（来自 spec §4.3）:
   - C-1: `ProblemGenerateTestdata.tsx:42-47` endpoint 改为 `/p/:pid/files`
   - C-2: 状态比较字符串 → 数字；`record_detail.tsx` 加 `window.parent.postMessage`
   - C-3: `ProblemGenerateTestdata` Props 补 `disabled?: boolean`
3. **High 修复目标**:
   - H-1: 删除前 confirm 对话框
   - H-2: `disabled={isReference}` → 真实权限门控
   - H-3: `FilePreviewDialog` 增加 `readOnly` prop
   - H-4: ZIP 流式化（参考 ui-default zipDownloader）
4. **每个 fix 的 TDD 测试设计**（用具体代码示例）
5. **ui-default 参考文件路径**
6. **约束**：不可改后端 handler；不可改 `lib/i18n.ts`
7. **验证清单**：vitest 期望行为 + 集成测试场景

- [ ] **Step 2: 派 fix subagent（与 Task 12 类似的 prompt 结构）**

Prompt 模板复用 Task 12 Step 2；仅替换 brief/report 路径与范围描述。

- [ ] **Step 3: 验证 fix-report + 跑测试**

```bash
yarn workspace @hydrooj/ui-next test --run --reporter=verbose ProblemTestdata ProblemGenerateTestdata ProblemCreateTestdata problem_files
```
Expected: 全部 PASSED。

- [ ] **Step 4: 派 review subagent**

复用 Task 12 Step 4 prompt 模板；额外要求 reviewer 验证：
- record_detail.tsx 的 `postMessage` 协议与 ProblemGenerateTestdata 的 listener 字段一致（type='pretest-finished', data.status === 数字 1）
- ZIP 流式实现确实有并发限制（不是简单全量并发）

- [ ] **Step 5: 写 re-review 文件**

- [ ] **Step 6: NEEDS-FIX 循环（最多 3 轮）**

- [ ] **Step 7: 追加第八节执行日志**

---

## Task 4: Task 9 Fix (problem_config)

**Files:**
- Create: `.superpowers/sdd/task-9-fix-brief.md`
- Create: `.superpowers/sdd/task-9-fix-report.md`
- Create: `.superpowers/sdd/task-9-re-review.md`
- Modify: `packages/ui-next/src/pages/problem_config.tsx`
- Modify: `packages/ui-next/src/components/problem/ProblemConfigEditor.tsx`
- Modify: `packages/ui-next/src/components/problem/ProblemConfigBasicForm.tsx`
- Modify: `packages/ui-next/src/components/problem/ProblemConfigTree.tsx`
- Modify: `packages/ui-next/src/components/problem/MonacoEditorHost.tsx`
- Modify: `packages/ui-next/src/lib/yaml-config.ts`
- Modify: `packages/ui-next/src/lib/testdata-detect.ts`
- Modify: `packages/ui-next/package.json`（如需 react-dnd）
- Modify: 上述文件的 `*.test.tsx`

**Interfaces:**
- Consumes: `.superpowers/sdd/task-9-report.md` 的 5 Critical + 7 Important findings；ui-default `ProblemConfigForm.tsx` + `BasicForm.tsx` + `monaco/schema/problemconfig` + `pages/problem_config.page.tsx:122-133`
- Produces: problem_config 完整 editor + form + tree + AJV 严格化 + cases→subtasks 迁移

**Why this task:** Task 9 是 5 Critical + 7 Important，最大工作量；放到最后做（前面 Task 12/10 完成后已建立 fix subagent 节奏与模板）。

- [ ] **Step 1: 写 fix-brief 文件**

Create `.superpowers/sdd/task-9-fix-brief.md` 包含：

1. **范围声明**：仅修 5 Critical + 7 Important；不碰 Medium/Low。
2. **Critical 修复目标**（来自 spec §4.4）:
   - C-1: Monaco YAML editor 真加载 + debounce + schema validation
   - C-2: BasicForm 补 12 字段；移除 count/subLimit
   - C-3: SubtaskTree 增完整交互
   - C-4: AJV schema 严格化
   - C-5: cases → subtasks 迁移
3. **Important 修复目标**（I-1 到 I-7）:
   - I-1: `configYamlFormat()` 丢弃无效键
   - I-2: Save 不刷新
   - I-3: Schema 失败可保存
   - I-4: AJV 完整 patterns
   - I-5: I18n key namespace（受 i18n.ts 保护限制，需 partial 改）
   - I-6: testdata-detect 与 server 对齐
   - I-7: cases→subtasks 注入（同 C-5）
4. **每个 fix 的 TDD 测试设计**
5. **ui-default 参考文件路径**：
   - `components/problemconfig/ProblemConfigForm.tsx`
   - `components/problemconfig/BasicForm.tsx`
   - `components/problemconfig/ProblemType.tsx`
   - `components/problemconfig/monaco/schema/problemconfig.{ts,json}`
   - `pages/problem_config.page.tsx:122-133`（cases→subtasks）
   - `pages/files.page.tsx:272-303`（删除 confirm）
6. **依赖检查**：如需 react-dnd，先确认 `package.json` 加依赖
7. **i18n.ts 限制**：仅改 ProblemConfig.* 命名空间下缺失 key；如需新 page-level key 走 fallback
8. **验证清单**

- [ ] **Step 2: 派 fix subagent**

Prompt 模板：参考 Task 12/10，加任务特定指令：
- Monaco 真加载必须用 dynamic import + Suspense
- 测试用 mockMonacoEditor（避免 happy-dom 加载 monaco）
- react-dnd 需新加依赖，必须走 yarn install + 同步 package.json

- [ ] **Step 3: 验证 fix-report + 跑测试**

```bash
yarn workspace @hydrooj/ui-next test --run --reporter=verbose ProblemConfig
```
Expected: 全部 PASSED；新增 test 数量 ≥ 12（每 Critical 至少 2 个测试）。

- [ ] **Step 4: 派 review subagent**

Prompt 模板：复用 Task 12 Step 4 + Task 10 Step 4 附加要求。

额外要求 reviewer 验证：
- AJV schema 与 ui-default `monaco/schema/problemconfig` patterns 一致
- Monaco 真加载（非仅 textarea fallback）
- SubtaskTree 支持 expand/collapse + per-subtask delete + 拖拽
- cases→subtasks 迁移函数被 `parseProblemConfigYaml` 调用于初始 load

- [ ] **Step 5: 写 re-review 文件**

- [ ] **Step 6: NEEDS-FIX 循环（最多 3 轮）**

- [ ] **Step 7: 追加第八节执行日志**

---

## Task 5: 收尾 — 更新报告第七节 + 写 whole-branch summary

**Files:**
- Modify: `.claude/reviews/ui-next-migration-gap-2026-07-21.md` 第七节
- Create: `.claude/reviews/ui-next-migration-gap-2026-07-21.md` 第八节（在收尾时合并为最终执行日志）
- Modify: `.superpowers/sdd/progress.md`（追加 Tasks 8/9/10/12 状态更新）
- Modify: `.claude/q.md`（标记当前 task 完成）

**Why this task:** 把 SDD 真实结论写回报告附录；让 progress.md 反映本轮恢复；让 q.md 与下一个任务对齐。

- [ ] **Step 1: 修订报告附录第七节**

替换原第七节"修复计划"为 SDD parity review 真实结论表 + 指向新 spec/plan：

```markdown
## 七、HIGH 区块实际缺口（SDD Parity Review 真实结论）

**注**：本节替代 2026-07-24 初版"修复计划"，改用 SDD parity review 的真实发现（`.superpowers/sdd/task-{9,10,11,12}-report.md`）：

| 页面 | SDD 结论 | 关键问题 |
|---|---|---|
| problem_config | Needs Fixes | 5 Critical + 7 Important（Monaco 仅 textarea / BasicForm 缺 12 字段 / SubtaskTree 缺交互 / AJV schema 宽松 / 无 cases→subtasks 迁移）|
| problem_files testdata | Needs Fixes | 3 Critical + 4 High（Generate endpoint 错 / 状态比较字符串 / disabled prop 缺失）+ ~9 Medium |
| contest_balloon | Approved | 仅 cosmetic gap |
| contest_clarification | Needs Fixes | 2 Critical（无 Ask 模式 / window.location.reload）+ 4 Medium |

**修复计划见**: `docs/superpowers/specs/2026-07-24-sdd-recovery-tasks-8-9-10-12-design.md`
**实施计划见**: `docs/superpowers/plans/2026-07-24-sdd-recovery-plan.md`
```

- [ ] **Step 2: 写第八节执行日志**

新增 `## 八、SDD 恢复执行日志`，包含每个 Task 8/9/10/12 的完成时间、verdict、测试结果、新增文件列表。

- [ ] **Step 3: 更新 progress.md**

在 `.superpowers/sdd/progress.md` 末尾追加：
```markdown
---

# SDD Recovery: Task 8 Re-review + Tasks 9/10/12 Fixes

[此处粘贴 Task 1–5 完成后的最终状态、verdict 汇总、commit 列表]
```

- [ ] **Step 4: 标记 q.md**

在 `.claude/q.md` 末尾追加（保留 q.md 原有内容）：
```markdown
---

# SDD Recovery Round 完成

- Task 8 re-review: [PASSED / verdict]
- Task 12 fix: [PASSED / verdict]
- Task 10 fix: [PASSED / verdict]
- Task 9 fix: [PASSED / verdict]

下一步：[待用户指示]
```

---

## Self-Review

**1. Spec coverage**:
- §4.1 Task 8 re-review → Task 1 ✓
- §4.2 Task 12 fix (2 Critical + 4 Medium) → Task 2 ✓
- §4.3 Task 10 fix (3 Critical + 4 High) → Task 3 ✓
- §4.4 Task 9 fix (5 Critical + 7 Important) → Task 4 ✓
- §8 报告追加 + progress.md + q.md → Task 5 ✓

**2. Placeholder scan**: 无 TBD/TODO/占位。每个 fix-brief 的内容由 fix subagent 在 Step 1/2 内产出，主体在本计划中通过 spec 引用固化。

**3. Type consistency**: 计划无类型/方法名引用（实际代码在 fix-brief 中）；TDD 步骤描述一致（"failing test → RED → implement → GREEN → verify"）。

**4. 风险检查**:
- Task 9 含 react-dnd 依赖新增 → Step 2 prompt 明确要求 `yarn install` + package.json 同步
- i18n.ts 保护限制 → Step 1 fix-brief 模板明确要求绕开
- Medium/Low 范围不修 → 所有 Step 明确强调

---

## 执行交接

Plan complete and saved to `docs/superpowers/plans/2026-07-24-sdd-recovery-plan.md`. Two execution options:

**1. Subagent-Driven (recommended)** — 我对每个 SDD 任务（Task 8 / Task 12 / Task 10 / Task 9 / Task 5）派独立 subagent；每个 fix-brief 与 fix-report 都是 subagent 输出；review subagent 与 fix subagent 并行（fix 完成后立即 review）。

**2. Inline Execution** — 在当前会话内串行执行 5 个 Task；每个 Task 内人工写 fix-brief + 派 fix subagent + 派 review subagent；checkpoint 在 Task 边界。

推荐 Subagent-Driven，因为每个 SDD 任务内部已经涉及 subagent 派发；外层再用 subagent-driven 是嵌套一致。