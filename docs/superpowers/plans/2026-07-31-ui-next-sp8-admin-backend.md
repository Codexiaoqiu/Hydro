# SP8 Admin Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development

**Goal:** 迁移 7 个 manage_* 页面到 ui-next。

**Architecture:** 7 个独立 Track,manage_base 先。每 Track:1 个 .tsx + 1 个 .test.tsx + manifest +1 行 + index +1 行。

---

## File Map

每 Task 创建 2 文件(.tsx + .test.tsx),修改 2 文件(manifest.ts + index.ts)。

## Task 1: manage_base

**Files:**
- Create: `pages/manage_base.tsx` + `pages/manage_base.test.tsx`
- Modify: `manifest.ts` + `index.ts`

**测试:** 顶部 banner 渲染 + 7 个 sidebar 链接

**实现:** `<header>` + `<nav>` 含 7 链接(Config / Dashboard / Script / Setting / User Import / User Priv / Disabled)+ `<main>` slot

- [ ] 创建 + manifest + index
- [ ] `yarn workspace @hydrooj/ui-next test src/pages/manage_base.test.tsx src/pages/manifest.test.ts`

## Task 2: manage_config

**Files:** 同 Task 1

**测试:** 表单字段 + 空态

**实现:** `<Input>` 列表 + Save 按钮占位

- [ ] 创建 + 跑测试

## Task 3: manage_dashboard

**Files:** 同 Task 1

**测试:** stats cards + 链接列表

**实现:** 4 cards(Users / Domains / Problems / Submissions)+ recent activities

- [ ] 创建 + 跑测试

## Task 4: manage_script

**Files:** 同 Task 1

**测试:** script list 渲染 + 空态

**实现:** data-table(name + modify time + Run 按钮)

- [ ] 创建 + 跑测试

## Task 5: manage_setting

**Files:** 同 Task 1

**测试:** setting rows 渲染 + 空态

**实现:** table(key + value + edit button)

- [ ] 创建 + 跑测试

## Task 6: manage_user_import

**Files:** 同 Task 1

**测试:** upload form + user count preview

**实现:** form + progress placeholder

- [ ] 创建 + 跑测试

## Task 7: manage_user_priv(复用 SP7 MemberTable)

**Files:** 同 Task 1

**测试:** user list 渲染 + 权限 matrix

**实现:** MemberTable + 权限 matrix(类似 SP7 RoleSelector)

- [ ] 创建 + 跑测试

## Task 8: 综合回归

**步骤:**
1. 定向跑 7 个新页面 + manifest drift
2. 全量 vitest
3. lint
4. e2e harness(可选)
5. 完成报告

```bash
yarn workspace @hydrooj/ui-next test \
  src/pages/manage_base.test.tsx \
  src/pages/manage_config.test.tsx \
  src/pages/manage_dashboard.test.tsx \
  src/pages/manage_script.test.tsx \
  src/pages/manage_setting.test.tsx \
  src/pages/manage_user_import.test.tsx \
  src/pages/manage_user_priv.test.tsx \
  src/pages/manifest.test.ts 2>&1 | tail -5
```

---

## Self-Review

1. **Spec coverage**:7 个 manage 页 + final review 全部映射。
2. **Placeholder scan**:无 TBD/TODO。
3. **Type consistency**:每页独立 Args。
4. **Global constraints**:仅加 7 行 manifest + 7 行 index。
5. **Commit checkpoints**:每 Task 含可选 commit。
6. **Risk Tier**:Task 7 最大,其余中等。