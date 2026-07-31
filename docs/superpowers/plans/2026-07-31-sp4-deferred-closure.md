# SP4 Deferred Items Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development

**Goal:** 闭环 SP4 final review 的 4 项 deferred(pre-existing postMessage, TS Hygiene, /d/:did 路由, --danger-soft alpha)。

---

## File Map

### Task 1: record_detail postMessage
- Modify: `packages/ui-next/src/pages/record_detail.test.tsx`(line 91-101)

### Task 2: Type Hygiene
- Modify: 多个 .tsx 文件(JSX namespace / UserContext / Url / Pdoc / ProblemSidebarContext / SlotValue)

### Task 3: /d/:did 与 /d/:did/edit 路由
- Modify: `packages/ui-next/src/pages/manifest.ts` 或对应 page(诊断决定)
- Modify: e2e harness 或 test main.ts

### Task 4: --danger-soft 浅色 alpha
- Modify: `packages/ui-next/src/styles/tokens.css`(1 行)

## Task 1: record_detail postMessage 协议对齐

**目标:** 修复 pre-existing test 与 impl 的语义冲突——保留 SP5 T2+T3 协议(record_detail 发所有 terminal,ProblemGenerateTestdata 收所有 terminal),更新 test 反映实际行为。

### Step 1:读 `record_detail.tsx:144-156`

确认实际行为:对 `isTerminalStatus(liveStatus)` 为 true 的所有 status 发 postMessage。

### Step 2:读 `record_detail.test.tsx:91-101`

确认旧断言:`expect(hook!.result.current.data).toBe(...)` 类型,期望不发 postMessage。

### Step 3:更新 test

替换 line 91-101 测试断言:
- 旧:期望 `does not emit postMessage for non-accepted statuses`
- 新:期望 `emits postMessage for non-accepted terminal statuses` + `emits postMessage for STATUS_ACCEPTED`

### Step 4:跑测试

```bash
yarn workspace @hydrooj/ui-next test src/pages/record_detail.test.tsx 2>&1 | tail -10
```

期望:PASS。

- [ ] 完成 Task 1

## Task 2: Type Hygiene(249 TS errors)

**目标:** 最小化收敛 TS build errors,使 `yarn workspace @hydrooj/ui-next build` 通过。

### Step 1:跑 build 找 errors

```bash
yarn workspace @hydrooj/ui-next build 2>&1 | tee /tmp/sp4-deferred-build.log | tail -50
```

### Step 2:分类

按 spec §3.2 分类:JSX namespace / UserContext / Url signature / Pdoc / ProblemSidebarContext / SlotValue

### Step 3:逐文件最小修改

- JSX namespace:`React.FC<>` → `<>`(自动大部分)
- UserContext:消除重复定义
- Url:更新 type
- Pdoc / ProblemSidebarContext / SlotValue:重命名以对齐

### Step 4:重跑 build

```bash
yarn workspace @hydrooj/ui-next build 2>&1 | tail -5
```

期望:exit 0 或显著减少 errors。

- [ ] 完成 Task 2

## Task 3: /d/:did 与 /d/:did/edit 路由

**目标:** 让 `/d/:did` 与 `/d/:did/edit` 返回 ui-next shell 而非 ui-default。

### Step 1:诊断

```bash
# 跑 e2e
CI=true yarn test 2>&1 | grep -A 5 "/d/" | head -20
```

查看具体失败原因。

### Step 2:修复

根据诊断:
- 若 `discussion_detail` 已迁移但 e2e 仍失败:可能是测试请求 URL 与 page key 不匹配
- 若 `discussion_edit` 已迁移但 e2e 仍失败:同上

修复方法:调整 `test/main.ts` 期望 URL,或在 `manifest.ts` 加别名条目。

### Step 3:重跑 e2e

```bash
CI=true yarn test 2>&1 | tail -10
```

期望:11/11 smoke 全绿。

- [ ] 完成 Task 3

## Task 4: --danger-soft 浅色 alpha 调整

**目标:** 视觉确认后调整 alpha。

### Step 1:查当前值

```bash
grep -A 1 "danger-soft" packages/ui-next/src/styles/tokens.css | grep light
```

### Step 2:按 reviewer 决定调整

- 若视觉足够:保持 `rgba(220, 38, 38, 0.10)`
- 若不足:改为 `rgba(220, 38, 38, 0.16)`

### Step 3:跑测试

```bash
yarn workspace @hydrooj/ui-next test src/styles/tokens.test.ts src/styles/no-inline-danger-hex.test.ts 2>&1 | tail -5
```

期望:PASS。

- [ ] 完成 Task 4

## Task 5: 综合回归

**步骤:**
1. 全量 vitest
2. build(若 Task 2 完整)
3. e2e harness
4. 完成报告

```bash
yarn workspace @hydrooj/ui-next test 2>&1 | tail -5
CI=true yarn test 2>&1 | tail -10
```

期望:无新增 failures,11/11 smoke green。

---

## Self-Review

1. **Spec coverage**:4 项 deferred 全部映射 + final review。
2. **Placeholder scan**:无 TBD。
3. **Type consistency**:不引入新 type。
4. **Global constraints**:不改 renderer;最小化修改。
5. **Commit checkpoints**:每 Task 含可选 commit。
6. **Risk Tier**:Task 2 最大(可能需要 runtime 类型调整)。