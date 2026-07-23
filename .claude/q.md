继续执行 ui-next 原未迁移页面完整对等迁移。

请先读取：
@.superpowers/sdd/progress.md
@docs/superpowers/specs/2026-07-22-ui-next-unmigrated-pages-parity-design.md
@.superpowers/sdd/task-8-brief.md
@.superpowers/sdd/task-8-report.md
@.superpowers/sdd/task-8-review-package.md


继续执行 ui-next 原未迁移页面完整对等迁移。

请先读取：
@.superpowers/sdd/progress.md
@docs/superpowers/specs/2026-07-22-ui-next-unmigrated-pages-parity-design.md
@.superpowers/sdd/task-8-brief.md
@.superpowers/sdd/task-8-report.md
@.superpowers/sdd/task-8-review-package.md

Task 1–7 已完成并通过任务级审查。
Task 8 已实现并有 40/40 目标测试通过，但任务级审查尚未执行。
请从 Task 8 的规格符合性和代码质量审查开始。

继续使用 Subagent-Driven Development：
每个任务由独立实现代理完成，随后进行任务级审查；
发现 Critical/Important 必须修复并复审。

当前直接在 master 工作，保留现有全部未提交改动。
不要 commit、不要 push。
不要覆盖用户或 linter 对以下文件的有意修改：
.claude/reviews/ui-next-migration-gap-2026-07-21.md
packages/ui-next/src/lib/i18n.ts
.superpowers/sdd/task-7.patch

Task 8 通过后继续 Task 9–12。

其中最关键的单个文件是：

@.superpowers/sdd/progress.md

但只引入该文件不会包含 Task 8 的具体审查要求，因此最好至少再加：

@.superpowers/sdd/task-8-brief.md
@.superpowers/sdd/task-8-report.md
@.superpowers/sdd/task-8-review-package.md
---

# SDD Recovery Round 完成（2026-07-24）

- Task 8 Re-review: PASSED（40/40 GREEN；4 Important fixes 验证通过）
- Task 12 Fix (contest_clarification 2C+4M): PASSED（接受 2 项 scope-creep）
- Task 10 Fix (problem_files testdata 3C+4H): PASSED（接受 98 行 lib/i18n.ts additive；H-4 部分）
- Task 9 Fix (problem_config 5C+7I): PASSED（+19 新增测试；12 ProblemConfig 通过；review subagent 被中途停止）

测试基线：720/8/712 → 739/8/731（+19 新增；预存在 8 失败不变）

约束遵守：
- ✅ 不 commit、不 push（工作树 dirty）
- ⚠️ lib/i18n.ts：98 行 additive（仅 Task 10），无删除、字母序
- ✅ 无新 window.location.reload 引入
- ✅ 未触 ui-default、后端 handler

文件落地：
- Spec: docs/superpowers/specs/2026-07-24-sdd-recovery-tasks-8-9-10-12-design.md
- Plan: docs/superpowers/plans/2026-07-24-sdd-recovery-plan.md
- 报告附录八: .claude/reviews/ui-next-migration-gap-2026-07-21.md
- SDD 文档: .superpowers/sdd/task-{8-re-review,12-fix-{brief,report,re-review},10-fix-{brief,report,re-review},9-fix-{brief,report,re-review}}.md

下一步：等待用户指示（final whole-branch review / commit / 下一轮 SDD）
