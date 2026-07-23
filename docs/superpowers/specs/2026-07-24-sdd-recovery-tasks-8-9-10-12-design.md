# SDD Recovery: Task 8 Re-review + Tasks 9/10/12 Fixes

**Date**: 2026-07-24
**Author**: brainstorming session
**Status**: design approved (待用户最终 spec review)
**Branch**: master (per q.md "当前直接在 master 工作")

## 1. 背景与动机

`.superpowers/sdd/progress.md` 显示 SDD 流程在 2026-07-23 中断：
- Task 8 (contest_user) 已 apply 4 项 Important fixes，但 re-review subagent `a1f17a865bd5dd1c1` 被中断
- Tasks 9–12 是 4 个迁移页面的 parity review（不是新实现），结论：
  - **Task 9** (problem_config): 5 Critical + 7 Important — "near-empty shell"
  - **Task 10** (problem_files testdata): 3 Critical + 4 High + ~9 Medium
  - **Task 11** (contest_balloon): Approved ✓（无需动作）
  - **Task 12** (contest_clarification): 2 Critical + 4 Medium

而 `.claude/reviews/ui-next-migration-gap-2026-07-21.md` 第七节（修复计划）把上述三个页面都标为"已完成"，与 parity review 结论矛盾——本 spec 同时把第七节调整为 SDD 真实结论。

## 2. 目标

按 SDD 流程串行完成：
1. **Task 8 re-review**：恢复中断的重审，确认 4 项 Important fixes 通过
2. **Task 12 fix**：修复 contest_clarification 的 2 Critical + 4 Medium
3. **Task 10 fix**：修复 problem_files testdata 的 3 Critical + 4 High
4. **Task 9 fix**：修复 problem_config 的 5 Critical + 7 Important

仅修 Critical + Important；Medium/Low 进入 final whole-branch review。

## 3. 非目标

- 不修改 `packages/ui-default/**` 运行时行为
- 不修改后端 handler / lib（除非 Critical 明确指向后端契约错误）
- 不修改 `packages/ui-next/src/lib/i18n.ts`（用户/linter 保护）
- 不动 `.claude/reviews/ui-next-migration-gap-2026-07-21.md` 原 1–5 章节（只追加第七节调整 + 第八节执行日志）
- 不 commit、不 push

## 4. 工作分解

### 4.1 Task 8 Re-review

**Inputs**: `.superpowers/sdd/task-8-brief.md`, `task-8-fix-report.md`, `task-8-review-package.md`, current master state

**Steps**:
1. 检查 `a1f17a865bd5dd1c1` subagent 是否仍可用（`SendMessage` 试一次）
2. 若可用 → 续传 review package + 4 项 Important fixes summary，请求 verdict
3. 若不可用 → 新派 re-review subagent，附 brief + fix-report + 完整修复差异
4. 收 verdict：若 PASSED → 标 Task 8 完成；若发现新问题 → 写 `task-8-fix2-report.md`，派第二轮 fix

**Output**: `task-8-re-review.md`（PASSED 或 PASSED-WITH-MINOR）

**Verification**:
- `cd packages/ui-next && yarn test -- ContestUser` → 40/40 GREEN
- `git diff --check` → EXIT=0

### 4.2 Task 12 Fix (contest_clarification)

**Inputs**: `task-12-report.md` 的 6 项 findings（2 Critical + 4 Medium）；fix 仅做 Critical 2 项 + Medium 4 项

**Critical 修复目标**:
1. C-1: 增加 "Ask" 模式（无 `did`）让选手能发新提问；与 `Reply`（有 `did`）、`Broadcast`（broadcast=1）并列
2. C-2: 移除 `contest_clarification.tsx:47, 49` 的 `window.location.reload()`，改为本地 `setItems` 追加；参考 `contest_balloon.tsx` 模式

**Medium 修复目标**:
3. M-1: 给每个 item 显示 ObjectId timestamp（`new Date(parseInt(_id.substring(0,8), 16)*1000).toLocaleString()` 或 `datetimeSpan` 风格）
4. M-2: 选手拥有的 item 不显示 Reply 按钮（`owner !== currentUid` 才显示）
5. M-3: Jury badge 改用 `owner === 0` 判断，不用 udict lookup 失败作为 fallback
6. M-4: Subject label 改用字母题号（A/B/C）+ `getAlphabeticId(pids.indexOf(subject))` + problem title

**Brief 文件**: `.superpowers/sdd/task-12-fix-brief.md`
**Report 文件**: `.superpowers/sdd/task-12-fix-report.md`
**Re-review**: `.superpowers/sdd/task-12-re-review.md`

### 4.3 Task 10 Fix (problem_files testdata)

**Inputs**: `task-10-report.md` 的 3 Critical + 4 High

**Critical 修复目标**:
1. C-1: `ProblemGenerateTestdata.tsx:42-47` endpoint 从 `/p/:pid` 改为 `/p/:pid/files`
2. C-2: 状态比较从字符串 `'STATUS_ACCEPTED'` 改为数字 `STATUS.STATUS_ACCEPTED = 1`；补 `record_detail.tsx` 的 `window.parent.postMessage` 调用
3. C-3: `ProblemGenerateTestdata.tsx` 的 `Props` 补 `disabled?: boolean`

**High 修复目标**:
4. H-1: `ProblemTestdata.tsx` 单文件/批量删除前加 confirm 对话框（参考 ui-default `pages/files.page.tsx:272-303`）
5. H-2: `pages/problem_files.tsx` 把 `disabled={isReference}` 替换为 `canEditProblem(UserContext, pdoc) && canReadProblemData(UserContext)`；reference 仍只读
6. H-3: `FilePreviewDialog.tsx` 增加 `readOnly` prop，外部 section disabled 时为 true；filename clickable 跟随
7. H-4: `lib/download-zip.ts` 改为流式 + 并发限制 + 磁盘暂存（参考 ui-default `components/zipDownloader/index.ts:28-83`）

### 4.4 Task 9 Fix (problem_config)

**Inputs**: `task-9-report.md` 的 5 Critical + 7 Important

**Critical 修复目标**:
1. C-1: `ProblemConfigEditor.tsx` 的 `MonacoImpl` 真正加载 Monaco（参考 `MonacoEditorHost.tsx` + `useMonaco` opt-in）；加 250ms debounce onChange；YAML schema validation 挂在 editor 上
2. C-2: `ProblemConfigBasicForm.tsx` 补 12 个缺失字段：checker_type、checker、interactor、manager、num_processes、subType/filename（submit_answer）、filename（default FileIO）、multi_pass、user_extra_files、judge_extra_files、langs；移除 `count` 与 `subLimit`（不在 canonical schema）
3. C-3: `ProblemConfigTree.tsx` 增 expand/collapse、per-subtask delete + confirm、SubtaskSettings modal、GlobalSettings、AddTestcase modal、Add new subtask、`__cases` pool；react-dnd 拖拽 cases between subtasks
4. C-4: `yaml-config.ts` 的 AJV schema 严格化：`time` regex、`memory` regex、`score: 1-100`、`multi_pass: 2-20`、`num_processes: 1-5`；与 ui-default `monaco/schema/problemconfig` 对齐
5. C-5: 加 `cases → subtasks` 自动迁移（参考 ui-default `problem_config.page.tsx:122-133`）

**Important 修复目标**:
6. I-1: YAML 序列化用 `configYamlFormat(config)` 丢弃无效键（而非 dump all）
7. I-2: Save 后保留 react state 不刷新；用 mutate → JSON-calibrate
8. I-3: 严格 schema 失败时 Save 仍可用（confirm 后保存原 YAML），与 ui-default 一致
9. I-4: AJV schema 复制 ui-default 完整 patterns
10. I-5: I18n key namespace 改回 bare keys（参考 ui-default）
11. I-6: `testdata-detect.ts:42-55` 启发式与 server-side rules 对齐
12. I-7: `cases → subtasks` 注入（同 C-5）

## 5. 执行序列

```
Day 0.5: A. Task 8 re-review
   ↓ PASSED
Day 1: B. Task 12 fix (1 fix subagent + 1 review subagent)
   ↓ PASSED
Day 2-3.5: C. Task 10 fix (1 fix subagent + 1 review subagent)
   ↓ PASSED
Day 4-6: D. Task 9 fix (1 fix subagent + 1 review subagent)
   ↓ PASSED
Day 6.5: 收尾 — 更新报告第七节 + 写最终 whole-branch summary
```

总估时 **6 天**（基于 Task 12 最小 1 天 → Task 10 中等 1.5 天 → Task 9 最大 3 天）。

## 6. 风险与缓解

| 风险 | 缓解 |
|---|---|
| a1f17a865bd5dd1c1 subagent 上下文过期 | SendMessage 试一次；不可用则新派并附完整 brief |
| Task 9 fix 改动过大引入回归 | 严格按 brief 实现 + Critical-only；Medium/Low 留待 final whole-branch |
| 多 subagent 改同一文件 | 每个 Task 串行；同 Task 内只用 1 个 fix subagent |
| Task 10 C-2 依赖 record_detail.tsx 修改 | record_detail 修改需先单独 review；纳入 Task 10 subagent 范围 |
| Monaco 真加载可能与现有 happy-dom 测试冲突 | 加 dynamic import + `<Suspense>` + 测试用 mockMonacoEditor |
| `cases → subtasks` 迁移会破坏现有用户配置 | 默认开启 + 不可关闭 + 测试覆盖 fixture |

## 7. 完成定义（DoD）

- [ ] Task 8 re-review 文件存在并标 PASSED
- [ ] Task 9/10/12 各自有 fix-brief、fix-report、re-review 三个文件
- [ ] 每个 Task fix 后 `yarn workspace @hydrooj/ui-next test` 全绿
- [ ] `git diff --check` EXIT=0
- [ ] 所有改动保留在 master 工作树（未 commit、未 push）
- [ ] 报告第七节更新为 SDD 真实结论；新增第八节执行日志
- [ ] q.md 中 Task 8/9/10/12 状态更新到 progress.md

## 8. 关键文件索引

**新文件**（每个 Task 3 个）:
- `.superpowers/sdd/task-{N}-fix-brief.md`
- `.superpowers/sdd/task-{N}-fix-report.md`
- `.superpowers/sdd/task-{N}-re-review.md`

**修改文件**:
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

**报告追加**:
- `.claude/reviews/ui-next-migration-gap-2026-07-21.md` 第八节

## 9. 依赖与接口

- **SDD skill 流程**: 每 Task 走 brief → implementer → review → re-review 标准 4 阶段
- **TDD 工具**: vitest + happy-dom + testing-library；新组件测试在 `*.test.tsx` 同目录
- **i18n**: 保持 `lib/i18n.ts` 不动；新 key 通过别的途径注入（Task 12 等关键改动的 key 已有）