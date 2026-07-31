# SP4 Deferred Items Closure 设计

**日期**: 2026-07-31
**状态**: 待用户审阅
**范围**: 闭环 SP4 final review 留下的 deferred 项

## 1. 背景与目标

SP4 final review (`.claude/report/2026-07-29-sp4-reviewer-blockers-completion.md`) 列出 5 项 deferred to SP5+ 的项:

1. `record_detail.test.tsx::does not emit postMessage for non-accepted statuses`(pre-existing impl-vs-test drift)
2. 249 个 TS build errors(Type Hygiene 任务)
3. `/d/:did` 与 `/d/:did/edit` 路由失败
4. `--danger-soft` 浅色主题对比度视觉确认
5. 132+ 文件工作树 scope partition

本计划闭环其中 4 项(pre-existing + 实际可修复),scope partition 留给用户手动 commit 阶段。

## 2. 总体架构

4 个独立 Track:

- **Task 1**: `record_detail.tsx` postMessage 协议门控(对齐 record_detail 与 ProblemGenerateTestdata)
- **Task 2**: Type Hygiene(249 个 TS build errors 收敛)
- **Task 3**: `/d/:did` 与 `/d/:did/edit` 路由迁移(SP1 follow-up backlog)
- **Task 4**: `--danger-soft` 浅色 alpha 调整
- **Task 5**: 综合回归 + final review

## 3. 每个 Track 的最小边界

### 3.1 record_detail postMessage 门控
- **根因**:`record_detail.tsx:144-156` 对所有 terminal status 发 postMessage,但 `record_detail.test.tsx:91-101` 断言不发。SP4 推荐方案(record_detail 仅对 STATUS_ACCEPTED 发)与 SP5 T2+T3 设计(ProblemGenerateTestdata 收所有 terminal)有冲突。
- **决策**:**保留 record_detail 现有行为**(发所有 terminal,SP5 T2+T3 协议设计);更新 test 断言以反映实际行为。
- **改动**:`record_detail.test.tsx` line 91-101 测试改为期望 `STATUS_WRONG_ANSWER` 也触发 postMessage,加 STATUS_ACCEPTED 触发,删"不触发"断言。

### 3.2 Type Hygiene
- **范围**:`yarn workspace @hydrooj/ui-next build` 报 249 TS errors。
- **子任务**(最小化分类):
  - JSX namespace removal in React 19(`React.<>` 改 `<>`)
  - UserContext / UiContext double-spec(消除重复)
  - Url signature drift(handler 返回类型变更)
  - Pdoc / ProblemSidebarContext / SlotValue shape drift(重命名 / 对齐)
- **不做**:大范围类型重写;仅最小修改以通过 build。

### 3.3 /d/:did 与 /d/:did/edit 路由迁移
- **当前**:`/d/:did` 返回 ui-default(disussion detail 404);`/d/:did/edit` 返回 ui-default。
- **改动**:2 个 page + test:`discussion_detail` 已迁移,但 `/d/:did` 与 `/d/:did/edit` 是 `discussion_main_or_node` / `discussion_edit` 的别名路由(已迁移)。检查为何 e2e 仍失败,可能需在 manifest 加别名或修复测试。

### 3.4 --danger-soft 浅色 alpha
- **当前**:`rgba(220, 38, 38, 0.10)`
- **决定**:按 reviewer 视觉调整;fallback 值 `rgba(220, 38, 38, 0.16)`。
- **改动**:1 行 tokens.css。

## 4. 完成门禁

- record_detail test 1 → 0
- TS build 0 errors
- /d/:did 路由返回 ui-next shell
- --danger-soft light alpha 调整
- 全量 vitest 不新增 failures

## 5. 回退策略

每 Task 独立回退。

## 6. 已知限制

- TS build 收敛后可能仍残留少量难修复的 type drift,留给 SP9+ follow-up。
- scope partition 留给用户手动 commit 阶段(非本计划范围)。

---

报告:`.claude/report/2026-07-31-sp4-deferred-closure-completion.md`。