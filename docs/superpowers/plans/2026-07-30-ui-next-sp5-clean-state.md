# Hydro ui-next SP5 Clean State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 闭环 SP4 报告里 deferred to SP5+ 的全部项(loader.ts:133 boot error、跨文件 postMessage 协议硬化、7 个新 vitest 失败、153 lint errors、zh_TW 与 tokens review 项),使 ui-next 套件全量干净、e2e harness 可启动。

**Architecture:** 6 个 Track 并行可执行,各自独立 commit、独立回退。Track 1 修复 boot error 解锁 e2e;Track 2 + 3 抽出 `iframe-protocol.ts` 共同协议、硬化两端 message handler、恢复 SP4 丢失的 8 个 Stashed 测试;Track 4 逐文件修复 7 个 vitest 失败;Track 5 按文件批量清 lint errors;Track 6 补翻译与视觉确认。

**Tech Stack:** TypeScript、React 19、CSS Modules、Vitest 4、happy-dom、`@hydrooj/register`(esbuild on-the-fly)、cordis、@hydrooj/common(`STATUS`)。

---

## Global Constraints

- Node ≥ 22、Yarn 4.6.0。
- 不修改 SP0 引入的 manifest/renderer/站点开关;`ui.next = false` 站点级回退保持不变。
- 不修改 `framework/register`、不修改 `cordis` Context contract。
- 后端协议以 handler 实读字段为真源;`postMessage` 协议双方以本计划抽出的 `lib/iframe-protocol.ts` 为真源。
- `record_detail.tsx` ↔ `ProblemGenerateTestdata.tsx` 不再用 `'*'` 通配 origin;统一用 `lib/iframe-protocol.ts::isTrustedIframeOrigin`。
- 翻译协作:已有 zh_CN 译文的翻成繁体 + 台湾术语;无 zh_CN 的直接英译中。
- 任务中所有 `git commit` 步骤是流程检查点,**仅在用户明确要求时才执行**。
- 共享运行命令:

  ```bash
  # 单元测试(happy-dom + vitest)
  yarn workspace @hydrooj/ui-next test <path>
  # 全量测试
  yarn workspace @hydrooj/ui-next test
  # 类型 + Vite 构建
  yarn workspace @hydrooj/ui-next build
  # lint
  yarn lint:ci
  # e2e harness
  yarn test
  ```

---

## File Map

### Track 1:loader.ts:133 修复

- Investigate: `packages/hydrooj/src/loader.ts:130-148`(已知失效点)
- Investigate: `packages/hydroac-client/`(emscripten bundle 导出形态)
- Modify(视 root cause):`packages/hydrooj/src/loader.ts::resolvePlugin` 或 `packages/hydroac-client/`

### Track 2 + 3:postMessage 协议 + Stashed 测试

- Create: `packages/ui-next/src/lib/iframe-protocol.ts`
- Create: `packages/ui-next/src/lib/iframe-protocol.test.ts`
- Modify: `packages/ui-next/src/components/problem/ProblemGenerateTestdata.tsx`
- Modify: `packages/ui-next/src/components/problem/ProblemGenerateTestdata.test.tsx`
- Modify: `packages/ui-next/src/pages/record_detail.tsx`(从 inline 改为 import 共享 constant)

### Track 4:7 个 vitest 失败

- Modify: `packages/ui-next/src/components/problem/MonacoEditor.test.tsx`
- Modify: `packages/ui-next/src/components/problem/ProblemAdditionalFiles.test.tsx`
- Modify: `packages/ui-next/src/pages/problem_import.test.tsx`
- Modify: `packages/ui-next/src/pages/problem_main.test.tsx`
- Modify: `packages/ui-next/src/components/problem/ProblemCreateTestdata.test.tsx`
- Modify: `packages/ui-next/src/components/problem/ProblemTestdata.test.tsx`
- Modify: `packages/ui-next/src/pages/record_detail.test.tsx`(由 Track 2+3 一并修复)

### Track 5:lint 清理

- Modify: `packages/ui-next/src/theme/ThemeProvider.tsx`(`resolveInitial` 死代码)
- Modify: 其他文件按 lint 报错定位(`react-hooks/exhaustive-deps`、`react-refresh/only-export-components`、`consistent-return`)

### Track 6:i18n + tokens

- Modify: `packages/ui-next/src/lib/i18n.ts`(zh_TW 扩到 ≥ 60 key;SP3 12 占位补 zh_CN/zh_TW;`Auth.SudoSubtitle` 半角→全角逗号)
- Modify: `packages/ui-next/src/lib/i18n.test.ts`(zh_TW 抽样断言)
- Modify: `packages/ui-next/src/styles/tokens.css`(`--danger-soft` 浅色调整如 reviewer 判定需要)

---

## Task 1:Track 1 — loader.ts:133 诊断 + 最小复现

**Files:**
- Investigate: `packages/hydrooj/src/loader.ts`
- Investigate: `packages/hydroac-client/`

**目标:** 在不修改源码前提下,捕获完整的 stack trace 与出错 module,验证 SP4 Track D 的诊断结论。

### Step 1:尝试启动 harness,捕获原始错误

```bash
cd /home/xq/Hydro
CI=true node --enable-source-maps -r @hydrooj/register test/entry.js 2>&1 | tee /tmp/sp5-loader-error.log | head -120
```

期望输出:在 `Promise.all` 阶段出现 "invalid plugin" 错误,堆栈里包含 `loader.ts:133` 附近的 `ctx.plugin(plugin, config)`。

- [ ] 把原始输出完整保留到 `/tmp/sp5-loader-error.log`,不删任何一行

### Step 2:确认 `hydroac-client` 导出形态

```bash
cd /home/xq/Hydro
ls packages/hydroac-client/
cat packages/hydroac-client/index.js 2>/dev/null | head -40
node -e "const m = require('./packages/hydroac-client'); console.log('keys:', Object.keys(m)); console.log('apply type:', typeof m.apply);" 2>&1
```

期望:`Object.keys(m)` 不含 `apply` 或 `apply` 类型为 `undefined`;`Config` 存在但非 callable。

- [ ] 把 `ls` 与 `cat` 输出贴到 `.superpowers/sdd/sp5-loader-bug.md`

### Step 3:阅读 cordis 期望的 plugin 形态

```bash
grep -RIn "ctx.plugin" /home/xq/Hydro/node_modules/cordis/dist/index.js 2>&1 | head -20
```

期望:`ctx.plugin(fn, config)` 期望第一个参数为 callable(apply 模式)或可识别的 factory。

- [ ] 记录 cordis 期望形态

### Step 4:确认 root cause

把结论写到 `.superpowers/sdd/sp5-loader-bug.md`:
- 出错 module:hydroac-client
- 错误类型:`apply` 不可调用,emscripten bundle 把 `apply` 留在闭包
- 触发条件:仅在 `CI=true` + `test/entry.js` 启动路径下(`test` npm script 设了 `CI=true`)

不修复代码;只诊断。

- [ ] 写诊断报告

---

## Task 2:Track 1 — 最小修复实施(`handler/admin-ui.ts` 加 `apply`)

**Files:**
- Modify: `packages/hydrooj/src/handler/admin-ui.ts`(末尾追加 `apply` 函数)

**目标:** 仅当 Task 1 诊断为"`admin-ui.ts` 缺 `apply`"时实施。**SP4 诊断已确认错误;SP5 Task 1 重新定位为 `admin-ui.ts`**(见 `.superpowers/sdd/sp5-loader-bug.md`)。

### Step 1:决策(Pre-Flight 已确认)

- Task 1 诊断确认 16 个 handler 都 `export async function apply(ctx)`,**只有 `admin-ui.ts` 漏了**。这是 commit `fc994f76`(SP0)引入时的疏漏,导致 cordis 在 `loader.ts:133` 抛 `invalid plugin...received object`。
- 候选 A:加 `apply` 函数(对齐其他 handler 模板)。
- 候选 B:在 `loader.ts:resolvePlugin` 后增加 fallback(超出 SP5 范围)。

**采纳候选 A**。

### Step 2:写失败 harness 启动测试

文件 `test/entry.smoke.test.ts`(新建):

```ts
import { describe, expect, it } from 'vitest';
import { execSync } from 'node:child_process';

describe('harness boot smoke', () => {
  it('starts without "invalid plugin" error', () => {
    let out = '';
    try {
      out = execSync('CI=true node --enable-source-maps -r @hydrooj/register test/entry.js 2>&1', {
        encoding: 'utf8',
        timeout: 60_000,
      });
    } catch (e: any) {
      out = e.stdout + e.stderr;
    }
    expect(out).not.toMatch(/invalid plugin/);
  }, 90_000);
});
```

- [ ] 创建 smoke 测试

### Step 3:跑测试,验证失败

```bash
yarn workspace @hydrooj/ui-next test test/entry.smoke.test.ts 2>&1 | tail -30
```

期望:FAIL(`invalid plugin` 仍出现在 stdout)。

### Step 4:实施最小修复(实际实施 = 空 `apply`)

**重要说明:** Task 2 实施时发现,**`admin_ui` 路由已在 `packages/hydrooj/src/handler/manage.ts:364` 注册**(由 SP0 commit `fc994f76` 引入,commit message 明确写 "Register the POST /admin/ui route in handler/manage.ts")。因此 **正确的修复是空的 `apply`**,只满足 cordis 的 plugin validation 要求,不要在 `admin-ui.ts` 重复 `ctx.Route(...)`。

```ts
import type { Context } from '../context';
// ... existing imports unchanged

// The POST /admin/ui route is registered by manage.ts's apply() to keep
// all "/manage"-style routes co-located. This empty apply() exists so cordis
// treats this module as a valid plugin (loader.ts calls reloadPlugin on every
// handler/*.ts file; without a callable apply it throws
// "invalid plugin, expect function or object with an 'apply' method").
export async function apply(_ctx: Context) {}
```

**Context 路径:** `../context`(与 `connection.ts` / `home.ts` 等一致,验证: `grep "export { Context" packages/hydrooj/src/context.ts` → line 41)。

- [ ] 修改 `packages/hydrooj/src/handler/admin-ui.ts`

> **Track D follow-up (NOT in this task):** SP0 commit `fc994f76` 的设计意图是"`admin-ui.ts` 提供 handler 类,`manage.ts` 提供路由注册"——这是好的关注点分离。本次保留这个分工。如果未来要把路由注册也搬到 `admin-ui.ts`,需要先从 `manage.ts:364` 删除对应行,然后在 `admin-ui.ts::apply` 中加 `ctx.Route(...)`,否则会双重注册。

### Step 5:跑 smoke 测试,验证通过

```bash
yarn workspace @hydrooj/ui-next test test/entry.smoke.test.ts 2>&1 | tail -20
```

期望:PASS。

### Step 6:跑 e2e harness 验证

```bash
cd /home/xq/Hydro
CI=true yarn test 2>&1 | tail -40
```

期望:`app/ready` 出现;SP0/SP1/SP2/SP4 共 11 条 smoke 全绿。若仍残留少数失败,记入 Task 16 综合回归,不阻塞 Task 2 完成。

- [ ] 记录 e2e 实际状态

---

## Task 3:Track 2 — 创建 `lib/iframe-protocol.ts` 共同协议

**Files:**
- Create: `packages/ui-next/src/lib/iframe-protocol.ts`
- Create: `packages/ui-next/src/lib/iframe-protocol.test.ts`

**目标:** 抽出双方 postMessage 协议真源;纯逻辑,无 DOM 依赖。

### Step 1:写失败测试

文件 `packages/ui-next/src/lib/iframe-protocol.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { STATUS } from '@hydrooj/common';
import {
  IFRAME_STATUS_MESSAGE,
  isAcceptedStatus,
  isTerminalRecordStatus,
  isTrustedIframeOrigin,
  type IframeStatusPayload,
} from './iframe-protocol';

describe('iframe-protocol', () => {
  describe('IFRAME_STATUS_MESSAGE', () => {
    it('is the literal "hydro-record-status"', () => {
      expect(IFRAME_STATUS_MESSAGE).toBe('hydro-record-status');
    });
  });

  describe('isAcceptedStatus', () => {
    it('accepts numeric STATUS_ACCEPTED', () => {
      expect(isAcceptedStatus(STATUS.STATUS_ACCEPTED)).toBe(true);
    });

    it('accepts legacy string "STATUS_ACCEPTED"', () => {
      expect(isAcceptedStatus('STATUS_ACCEPTED')).toBe(true);
    });

    it('rejects other numeric statuses', () => {
      expect(isAcceptedStatus(STATUS.STATUS_WRONG_ANSWER)).toBe(false);
    });

    it('rejects null/undefined/objects', () => {
      expect(isAcceptedStatus(null)).toBe(false);
      expect(isAcceptedStatus(undefined)).toBe(false);
      expect(isAcceptedStatus({})).toBe(false);
    });
  });

  describe('isTerminalRecordStatus', () => {
    it('accepts accepted/wrong_answer/time_limit_exceeded', () => {
      expect(isTerminalRecordStatus(STATUS.STATUS_ACCEPTED)).toBe(true);
      expect(isTerminalRecordStatus(STATUS.STATUS_WRONG_ANSWER)).toBe(true);
      expect(isTerminalRecordStatus(STATUS.STATUS_TIME_LIMIT_EXCEEDED)).toBe(true);
    });

    it('rejects in-progress statuses', () => {
      expect(isTerminalRecordStatus(STATUS.STATUS_WAITING)).toBe(false);
      expect(isTerminalRecordStatus(STATUS.STATUS_JUDGING)).toBe(false);
    });

    it('rejects non-numeric', () => {
      expect(isTerminalRecordStatus('STATUS_ACCEPTED')).toBe(false);
      expect(isTerminalRecordStatus(null)).toBe(false);
    });
  });

  describe('isTrustedIframeOrigin', () => {
    const originalWindow = globalThis.window;

    beforeEach(() => {
      // @ts-expect-error — minimal stub for happy-dom origin check
      globalThis.window = { location: { origin: 'http://localhost:8000' } };
    });
    afterEach(() => {
      globalThis.window = originalWindow;
    });

    it('accepts the same origin', () => {
      expect(isTrustedIframeOrigin('http://localhost:8000')).toBe(true);
    });

    it('rejects cross-origin', () => {
      expect(isTrustedIframeOrigin('http://evil.com')).toBe(false);
    });

    it('rejects null origin (sandboxed iframe)', () => {
      expect(isTrustedIframeOrigin('null')).toBe(false);
    });
  });
});
```

- [ ] 创建测试

### Step 2:跑测试,验证失败

```bash
yarn workspace @hydrooj/ui-next test src/lib/iframe-protocol.test.ts
```

期望:FAIL("Cannot find module")。

### Step 3:实现 `iframe-protocol.ts`

文件 `packages/ui-next/src/lib/iframe-protocol.ts`:

```ts
import { STATUS } from '@hydrooj/common';
import { isTerminalStatus } from './record-terminal';

export const IFRAME_STATUS_MESSAGE = 'hydro-record-status' as const;

export interface IframeStatusPayload {
  type: typeof IFRAME_STATUS_MESSAGE;
  status: number;
}

export function isAcceptedStatus(value: unknown): boolean {
  return value === STATUS.STATUS_ACCEPTED || value === 'STATUS_ACCEPTED';
}

export function isTerminalRecordStatus(value: unknown): value is number {
  return typeof value === 'number' && isTerminalStatus(value);
}

/**
 * Strict origin check — only accept messages whose origin matches our own.
 * Rejects cross-origin, `null` (sandboxed iframe), and empty strings.
 */
export function isTrustedIframeOrigin(origin: string): boolean {
  if (typeof window === 'undefined') return false;
  if (!origin || origin === 'null') return false;
  try {
    return origin === window.location.origin;
  } catch {
    return false;
  }
}
```

- [ ] 创建实现

### Step 4:跑测试,验证通过

```bash
yarn workspace @hydrooj/ui-next test src/lib/iframe-protocol.test.ts
```

期望:全部通过(约 11 个用例)。

---

## Task 4:Track 2 — `ProblemGenerateTestdata.tsx` 切换到共享协议

**Files:**
- Modify: `packages/ui-next/src/components/problem/ProblemGenerateTestdata.tsx:23-64`

**目标:** 把 inline `isAcceptedStatus` 改为共享模块;`onMessage` handler 增加 envelope tag 校验、origin check、终态分发。

### Step 1:写失败测试

文件 `packages/ui-next/src/components/problem/ProblemGenerateTestdata.test.tsx`(覆盖现有 3 用例,新增 8 用例):

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STATUS } from '@hydrooj/common';
import { ProblemGenerateTestdata } from './ProblemGenerateTestdata';
import { IFRAME_STATUS_MESSAGE } from '../../lib/iframe-protocol';

function fireMessage(origin: string, data: unknown) {
  const ev = new MessageEvent('message', { origin, data });
  window.dispatchEvent(ev);
}

function setup() {
  const onGenerated = vi.fn();
  render(<ProblemGenerateTestdata pid="P1" testdata={['a.in']} onGenerated={onGenerated} />);
  // open the modal
  fireEvent.click(screen.getByText(/Generate/i));
  return { onGenerated };
}

describe('ProblemGenerateTestdata postMessage', () => {
  it('closes modal and toasts success when accepted status arrives with trusted origin', () => {
    const { onGenerated } = setup();
    fireMessage(window.location.origin, { type: IFRAME_STATUS_MESSAGE, status: STATUS.STATUS_ACCEPTED });
    expect(onGenerated).toHaveBeenCalledOnce();
  });

  it('closes modal on WA (non-accepted terminal) but does not show success toast', () => {
    const { onGenerated } = setup();
    fireMessage(window.location.origin, { type: IFRAME_STATUS_MESSAGE, status: STATUS.STATUS_WRONG_ANSWER });
    expect(onGenerated).toHaveBeenCalledOnce();
  });

  it('rejects message without envelope tag', () => {
    const { onGenerated } = setup();
    fireMessage(window.location.origin, { status: STATUS.STATUS_ACCEPTED });
    expect(onGenerated).not.toHaveBeenCalled();
  });

  it('rejects message with wrong envelope type', () => {
    const { onGenerated } = setup();
    fireMessage(window.location.origin, { type: 'something-else', status: STATUS.STATUS_ACCEPTED });
    expect(onGenerated).not.toHaveBeenCalled();
  });

  it('rejects message from cross-origin', () => {
    const { onGenerated } = setup();
    fireMessage('http://evil.com', { type: IFRAME_STATUS_MESSAGE, status: STATUS.STATUS_ACCEPTED });
    expect(onGenerated).not.toHaveBeenCalled();
  });

  it('rejects message with null origin (sandboxed iframe)', () => {
    const { onGenerated } = setup();
    fireMessage('null', { type: IFRAME_STATUS_MESSAGE, status: STATUS.STATUS_ACCEPTED });
    expect(onGenerated).not.toHaveBeenCalled();
  });

  it('does not react to non-terminal status (waiting/judging)', () => {
    const { onGenerated } = setup();
    fireMessage(window.location.origin, { type: IFRAME_STATUS_MESSAGE, status: STATUS.STATUS_WAITING });
    expect(onGenerated).not.toHaveBeenCalled();
  });

  it('idempotent on duplicate accepted messages', () => {
    const { onGenerated } = setup();
    fireMessage(window.location.origin, { type: IFRAME_STATUS_MESSAGE, status: STATUS.STATUS_ACCEPTED });
    fireMessage(window.location.origin, { type: IFRAME_STATUS_MESSAGE, status: STATUS.STATUS_ACCEPTED });
    // modal already closed after first message; second one is no-op
    expect(onGenerated).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] 追加测试

### Step 2:跑测试,验证失败

```bash
yarn workspace @hydrooj/ui-next test src/components/problem/ProblemGenerateTestdata.test.tsx
```

期望:envelope tag / cross-origin / null origin 三个新用例 FAIL。

### Step 3:替换 message handler

`ProblemGenerateTestdata.tsx`:

```diff
-import { isTerminalStatus } from '../../lib/record-terminal';
+import { isTerminalStatus } from '../../lib/record-terminal';
+import {
+  IFRAME_STATUS_MESSAGE,
+  isAcceptedStatus,
+  isTerminalRecordStatus,
+  isTrustedIframeOrigin,
+  type IframeStatusPayload,
+} from '../../lib/iframe-protocol';
```

删除文件内 inline 的 `isAcceptedStatus`(line 23-28)。

替换 `useEffect` 内 message handler(line 53-64)为:

```ts
useEffect(() => {
  const onMessage = (e: MessageEvent) => {
    // Idempotency: bail if the modal is already closed (Pre-Flight Finding 1).
    // record_detail may re-stream the same terminal status over SSE reconnects;
    // we must not re-trigger onGenerated or re-toast in that case.
    if (!openRef.current) return;
    if (typeof e.data !== 'object' || e.data === null) return;
    const data = e.data as Partial<IframeStatusPayload>;
    if (data.type !== IFRAME_STATUS_MESSAGE) return;
    if (!isTrustedIframeOrigin(e.origin)) return;
    const status = data.status;
    if (!isTerminalRecordStatus(status)) return;
    setOpen(false);
    setRecordUrl(null);
    onGeneratedRef.current();
    toastRef.current.success(
      isAcceptedStatus(status)
        ? tRef.current('ProblemGenerateTestdata.Generated')
        : tRef.current('ProblemGenerateTestdata.GenerateFailed'),
    );
  };
  window.addEventListener('message', onMessage);
  return () => window.removeEventListener('message', onMessage);
}, []);
```

新增翻译 key 占位(若不存在):`ProblemGenerateTestdata.GenerateFailed` = "生成失败"(英文)。

- [ ] 修改 `ProblemGenerateTestdata.tsx`

### Step 4:跑测试,验证通过

```bash
yarn workspace @hydrooj/ui-next test src/components/problem/ProblemGenerateTestdata.test.tsx
```

期望:全部通过(至少 11 个用例)。

---

## Task 5:Track 2 — `record_detail.tsx` 切换到共享协议

**Files:**
- Modify: `packages/ui-next/src/pages/record_detail.tsx`(line 144-156)

**目标:** 把 inline `IFRAME_STATUS_MESSAGE` 常量改为 import 共享模块;保留现有行为。

### Step 1:替换 import

`record_detail.tsx` 顶部 import 区域(line 1-30 附近)加入:

```ts
import { IFRAME_STATUS_MESSAGE } from '../lib/iframe-protocol';
```

并删除文件内的 inline 声明:

```diff
-const IFRAME_STATUS_MESSAGE = 'hydro-record-status';
```

### Step 2:保留现有 postMessage 逻辑(line 144-156)

不修改 `useEffect` 内行为;只把 inline 常量替换为共享 import。`origin` 参数保持 `'*'`(由父窗口直接管控,父窗口必须同源;Task 4 的 `isTrustedIframeOrigin` 守卫在子端已经足够)。

### Step 3:跑测试,验证通过

```bash
yarn workspace @hydrooj/ui-next test src/pages/record_detail.test.tsx
```

期望:既有用例 + 任何 envelope tag 测试通过。

- [ ] 跑过上述命令

---

## Task 6:Track 3 — 恢复 8 个 Stashed 集成测试

**Files:**
- Modify: `packages/ui-next/src/components/problem/ProblemGenerateTestdata.test.tsx`

**目标:** 把 SP4 Track C 解析冲突时丢失的 Stashed 侧测试找回(从 git history: `git show HEAD~5:packages/ui-next/src/components/problem/ProblemGenerateTestdata.test.tsx`),落地为 SP5 Task 4 之外的安全硬化用例。

### Step 1:从 git history 找回 Stashed 测试

```bash
cd /home/xq/Hydro
git log --all --oneline -- packages/ui-next/src/components/problem/ProblemGenerateTestdata.test.tsx | head -10
git show <stashed-commit-sha>:packages/ui-next/src/components/problem/ProblemGenerateTestdata.test.tsx > /tmp/sp5-stashed-test.tsx
diff /tmp/sp5-stashed-test.tsx packages/ui-next/src/components/problem/ProblemGenerateTestdata.test.tsx | head -80
```

期望:看到原 Stashed 侧测试用例(原 8 个)。

- [ ] 复制原始 Stashed 侧测试代码,合并到当前 `ProblemGenerateTestdata.test.tsx`,保留 Task 4 已加的 8 个新用例,合并冲突保留所有用例

### Step 2:跑测试,验证通过

```bash
yarn workspace @hydrooj/ui-next test src/components/problem/ProblemGenerateTestdata.test.tsx
```

期望:目标 ≥ 14 用例全通过。

- [ ] 记录 passed / failed

---

## Task 7:Track 4 — 修复 `MonacoEditor.test.tsx::user.clear`

**Files:**
- Modify: `packages/ui-next/src/components/problem/MonacoEditor.test.tsx`

**目标:** user-event happy-dom 下 `user.clear()` 不稳定;改为 `fireEvent.input`。

### Step 1:定位失败用例

```bash
yarn workspace @hydrooj/ui-next test src/components/problem/MonacoEditor.test.tsx 2>&1 | grep -A 5 "FAIL\|✗"
```

期望:看到一个 `user.clear` 相关用例 FAIL。

- [ ] 记下用例名

### Step 2:替换 `user.clear` 为 `fireEvent.input`

文件 `MonacoEditor.test.tsx`,定位失败用例,替换:

```diff
- await user.clear(textarea);
+ fireEvent.input(textarea, { target: { value: '' } });
```

如未引入 `fireEvent`,在文件顶部加入:

```ts
import { fireEvent } from '@testing-library/react';
```

### Step 3:跑测试,验证通过

```bash
yarn workspace @hydrooj/ui-next test src/components/problem/MonacoEditor.test.tsx
```

期望:失败用例通过。

- [ ] 跑过上述命令

---

## Task 8:Track 4 — 修复 `ProblemAdditionalFiles.test.tsx::RTL query mismatch`

**Files:**
- Modify: `packages/ui-next/src/components/problem/ProblemAdditionalFiles.test.tsx`

**目标:** 调整 query selector 以匹配真实 DOM 结构。

### Step 1:定位失败用例

```bash
yarn workspace @hydrooj/ui-next test src/components/problem/ProblemAdditionalFiles.test.tsx 2>&1 | grep -A 5 "FAIL\|✗\|TestingLibraryElementError"
```

期望:`TestingLibraryElementError: Unable to find ...` 类错误。

### Step 2:调整 query

按错误信息调整。例如:

```diff
- screen.getByRole('button', { name: /upload/i })
+ screen.getByRole('button', { name: /上传|Upload/i })
```

或:

```diff
- screen.getByText('filename.txt')
+ screen.getByText(/filename\.txt/)
```

### Step 3:跑测试,验证通过

```bash
yarn workspace @hydrooj/ui-next test src/components/problem/ProblemAdditionalFiles.test.tsx
```

- [ ] 跑过上述命令

---

## Task 9:Track 4 — 修复 `problem_import.test.tsx`、`problem_main.test.tsx`、`ProblemCreateTestdata.test.tsx`、`ProblemTestdata.test.tsx`

**Files:**
- Modify: `packages/ui-next/src/pages/problem_import.test.tsx`
- Modify: `packages/ui-next/src/pages/problem_main.test.tsx`
- Modify: `packages/ui-next/src/components/problem/ProblemCreateTestdata.test.tsx`
- Modify: `packages/ui-next/src/components/problem/ProblemTestdata.test.tsx`

**目标:** 4 个文件各 1-3 个失败用例,逐个最小修复。

### Step 1:逐个定位失败

```bash
yarn workspace @hydrooj/ui-next test \
  src/pages/problem_import.test.tsx \
  src/pages/problem_main.test.tsx \
  src/components/problem/ProblemCreateTestdata.test.tsx \
  src/components/problem/ProblemTestdata.test.tsx 2>&1 | tee /tmp/sp5-track4.log
```

- [ ] 记录每个失败文件 + 用例名

### Step 2:逐个最小修复

按错误类型:

- `user.clear` → `fireEvent.input`(Task 7 同款);
- query mismatch → 调整 selector;
- async timeout → 增加 `await waitFor(...)`;
- data shape mismatch → 检查 mock args 与 SP5 实际 props 是否一致。

每个失败文件加 1-2 个回归测试钉死修复后行为。

### Step 3:跑测试,验证通过

```bash
yarn workspace @hydrooj/ui-next test \
  src/pages/problem_import.test.tsx \
  src/pages/problem_main.test.tsx \
  src/components/problem/ProblemCreateTestdata.test.tsx \
  src/components/problem/ProblemTestdata.test.tsx
```

期望:全部通过。

- [ ] 跑过上述命令

---

## Task 10:Track 5 — 修复 `ThemeProvider.tsx` 死代码与其他 `ts/no-unused-vars`

**Files:**
- Modify: `packages/ui-next/src/theme/ThemeProvider.tsx`
- Modify: 其他含未使用变量的文件(由 lint 报错定位)

**目标:** 消除 `ts/no-unused-vars` 类 lint errors。

### Step 1:跑 lint 找出所有 `no-unused-vars` 报错

```bash
yarn lint:ci 2>&1 | tee /tmp/sp5-lint.log
grep "no-unused-vars" /tmp/sp5-lint.log | head -30
```

- [ ] 记录文件列表

### Step 2:逐文件修复

ThemeProvider.tsx:`resolveInitial` 死代码:确认无引用后删除。

其他文件:删除未使用 import、未使用变量、未使用函数参数(若非接口要求)。

### Step 3:跑 lint 验证

```bash
yarn lint:ci 2>&1 | tail -10
```

期望:`no-unused-vars` 计数减少。

- [ ] 跑过上述命令

---

## Task 11:Track 5 — 修复 `react-hooks/exhaustive-deps` 与 `react-refresh/only-export-components`

**Files:**
- Modify: 含违规的文件(由 lint 定位)

**目标:** 补依赖或加 `// eslint-disable-next-line`;非组件 export 拆出。

### Step 1:定位

```bash
grep -E "react-hooks/exhaustive-deps|react-refresh/only-export-components" /tmp/sp5-lint.log | head -30
```

### Step 2:逐文件处理

- `react-hooks/exhaustive-deps`:若依赖确实稳定,加 `// eslint-disable-next-line react-hooks/exhaustive-deps` 并写注释;否则用 `useRef` 包裹或补依赖。
- `react-refresh/only-export-components`:非组件 export(常量、helper)拆到独立 `.ts` 文件,如 `./helpers.ts`。

### Step 3:跑 lint 验证

```bash
yarn lint:ci 2>&1 | tail -10
```

- [ ] 跑过上述命令

---

## Task 12:Track 5 — 修复 `consistent-return` 与其他 lint errors

**Files:**
- Modify: 含违规的文件(由 lint 定位)

**目标:** 补 `return undefined` 或重构显式分支。

### Step 1:定位

```bash
grep "consistent-return" /tmp/sp5-lint.log | head -30
```

### Step 2:逐文件处理

- `consistent-return` 报错处补 `return undefined` 或重构为 `if/else if/else` 全部显式 `return`。
- 其他剩余 errors(如 `no-explicit-any`、`prefer-const`)按同类方式最小修复。

### Step 3:跑 lint 验证

```bash
yarn lint:ci 2>&1 | tail -10
```

期望:errors 0(允许 warnings ≤ 138)。

- [ ] 跑过上述命令

---

## Task 13:Track 6 — zh_TW catalog 扩到 ≥ 60 key

**Files:**
- Modify: `packages/ui-next/src/lib/i18n.ts`
- Modify: `packages/ui-next/src/lib/i18n.test.ts`

**目标:** 从 SP4 16 key 扩展到 ≥ 60 key;优先覆盖 Auth/Common/Problem/ContestForm/Discussion/RecordDetail。

### Step 1:写失败测试

`i18n.test.ts` 末尾追加:

```ts
describe('zh_TW catalog coverage', () => {
  it.each([
    'Auth.SudoTitle', 'Auth.SudoSubtitle', 'Auth.UseAuthenticator', 'Auth.WebAuthnVerified', 'Auth.Confirm', 'Auth.TfaCode', 'Auth.Password',
    'Common.Submit', 'Common.Cancel', 'Common.Delete', 'Common.ConfirmDelete', 'Common.Save', 'Common.Edit', 'Common.Loading',
    'Problem.NoPermissionToSubmit', 'Problem.LoginToSubmit', 'Problem.Submit', 'Problem.Status', 'Problem.Score',
    'ContestForm.Permission', 'ContestForm.PermissionPublic', 'ContestForm.PermissionInvite', 'ContestForm.PermissionAssign', 'ContestForm.SectionPermission', 'ContestForm.InviteCode', 'ContestForm.Assign',
    'Discussion.Create', 'Discussion.Edit', 'Discussion.Title', 'Discussion.Content',
    'RecordDetail.SubmitBy', 'RecordDetail.Hacked', 'RecordDetail.Problem', 'RecordDetail.Language', 'RecordDetail.CodeLength',
    'ProblemGenerateTestdata.Title', 'ProblemGenerateTestdata.Generated', 'ProblemGenerateTestdata.GenerateFailed',
  ])('zh_TW translates %s differently from en', (key) => {
    expect(catalogs.zh_TW[key]).toBeTruthy();
    expect(catalogs.zh_TW[key]).not.toBe(catalogs.en[key]);
  });
});
```

- [ ] 追加测试

### Step 2:跑测试,验证失败

```bash
yarn workspace @hydrooj/ui-next test src/lib/i18n.test.ts
```

期望:未翻译 key 的用例 FAIL。

### Step 3:扩展 `zhTW` catalog

`packages/ui-next/src/lib/i18n.ts` 的 `export const zhTW: Catalog = { ... }` 块补齐缺失 key。每个 key 翻译风格保持与 `zhCN` 一致但用繁体 + 台湾术语:

- `Common.Delete` = "刪除"
- `Common.ConfirmDelete` = "確認刪除"
- `Common.Save` = "儲存"
- `Common.Edit` = "編輯"
- `Common.Loading` = "載入中"
- `Problem.Submit` = "提交"
- `Problem.Status` = "狀態"
- `Problem.Score` = "分數"
- `Discussion.Create` = "新增討論"
- `Discussion.Edit` = "編輯討論"
- `Discussion.Title` = "標題"
- `Discussion.Content` = "內容"
- `RecordDetail.SubmitBy` = "提交者"
- `RecordDetail.Hacked` = "被 Hack"
- `RecordDetail.Problem` = "題目"
- `RecordDetail.Language` = "語言"
- `RecordDetail.CodeLength` = "程式碼長度"
- `ProblemGenerateTestdata.Title` = "生成測試資料"
- `ProblemGenerateTestdata.Generated` = "生成成功"
- `ProblemGenerateTestdata.GenerateFailed` = "生成失敗"

其余 key 若需要,继续追加;`Auth.*` 与 `ContestForm.*` 已经在 SP4 落地,这里只补 SP4 漏的子集。

- [ ] 修改 `i18n.ts`

### Step 4:跑测试,验证通过

```bash
yarn workspace @hydrooj/ui-next test src/lib/i18n.test.ts
```

期望:全部通过(目标 ≥ 35 个新 key 抽样)。

- [ ] 跑过上述命令

---

## Task 14:Track 6 — SP3 12 个英文占位补 zh_CN/zh_TW + `Auth.SudoSubtitle` 全角逗号

**Files:**
- Modify: `packages/ui-next/src/lib/i18n.ts`

**目标:** SP3 新增的 12 个英文占位串补 zh_CN + zh_TW;`Auth.SudoSubtitle` 半角→全角逗号。

### Step 1:补 zh_CN

`packages/ui-next/src/lib/i18n.ts` 的 `export const zhCN: Catalog = { ... }` 块补:

```ts
'ContestForm.Permission': '权限',
'ContestForm.PermissionPublic': '公开',
'ContestForm.PermissionInvite': '邀请码',
'ContestForm.PermissionAssign': '指派用户',
'ContestForm.SectionPermission': '权限控制',
'ContestForm.InviteCode': '邀请码',
'ContestForm.Assign': '已指派用户',
'Auth.UseAuthenticator': '使用认证器',
'Auth.WebAuthnVerified': '认证器已验证',
'Auth.SudoTitle': '请确认密码',
// Auth.SudoSubtitle 已存在 zhCN,只改逗号
```

`Auth.SudoSubtitle` 现有值 `为了你的账号安全,请重新输入密码以继续操作。` 改为 `为了你的账号安全,请重新输入密码以继续操作。`(半角 `,` → 全角 `,`)。

- [ ] 修改 `i18n.ts`

### Step 2:补 zh_TW

在 Task 13 的 `zhTW` 块追加同样 8 个 ContestForm 与 2 个 Auth key(SP4 已加 Confirm/SudoSubtitle/SudoTitle/UseAuthenticator,这里只补 PermissionPublic/Invite/Assign/SectionPermission/InviteCode/Assign/WebAuthnVerified):

```ts
'ContestForm.Permission': '權限',
'ContestForm.PermissionPublic': '公開',
'ContestForm.PermissionInvite': '邀請碼',
'ContestForm.PermissionAssign': '指派使用者',
'ContestForm.SectionPermission': '權限控制',
'ContestForm.InviteCode': '邀請碼',
'ContestForm.Assign': '已指派使用者',
'Auth.WebAuthnVerified': '認證器已驗證',
```

- [ ] 修改 `i18n.ts`

### Step 3:跑测试,验证通过

```bash
yarn workspace @hydrooj/ui-next test src/lib/i18n.test.ts
```

期望:全角逗号与 8 个新 zh_TW key 通过。

- [ ] 跑过上述命令

---

## Task 15:Track 6 — `--danger-soft` 浅色对比度

**Files:**
- Modify: `packages/ui-next/src/styles/tokens.css`

**目标:** reviewer 视觉确认后,调整 `--danger-soft` 在浅色主题下的 alpha。

### Step 1:视觉确认当前值

```bash
grep -A 1 "danger-soft" packages/ui-next/src/styles/tokens.css
```

当前:

```css
--danger-soft: rgba(239, 68, 68, 0.12);  /* 深色 */
--danger-soft: rgba(220, 38, 38, 0.10);  /* 浅色 */
```

### Step 2:Reviewer 决策

- 若 reviewer 确认浅色对比度足够(主观阈值 WCAG AA 4.5:1 in text / 3:1 in UI),保持 `rgba(220, 38, 38, 0.10)`。
- 若不够,改为 `rgba(220, 38, 38, 0.16)` 或换 base color 为 `rgba(185, 28, 28, 0.10)`(red-700)。

### Step 3:若调整,改 tokens.css

```diff
- --danger-soft: rgba(220, 38, 38, 0.10);
+ --danger-soft: rgba(220, 38, 38, 0.16);
```

或按 reviewer 决定的值。

### Step 4:跑现有 danger 测试,验证仍通过

```bash
yarn workspace @hydrooj/ui-next test \
  src/styles/tokens.test.ts \
  src/styles/no-inline-danger-hex.test.ts
```

- [ ] 跑过上述命令

---

## Task 16:综合回归

**Files:**
- 全量
- `.claude/report/2026-07-30-sp5-clean-state-completion.md`

**目标:** 跑过现有 ui-next 套件、lint、build、e2e harness(若 Task 1/2 通过),确保未引入退化。

### Step 1:定向回归

```bash
yarn workspace @hydrooj/ui-next test \
  src/lib/iframe-protocol.test.ts \
  src/components/problem/ProblemGenerateTestdata.test.tsx \
  src/pages/record_detail.test.tsx \
  src/components/problem/MonacoEditor.test.tsx \
  src/components/problem/ProblemAdditionalFiles.test.tsx \
  src/pages/problem_import.test.tsx \
  src/pages/problem_main.test.tsx \
  src/components/problem/ProblemCreateTestdata.test.tsx \
  src/components/problem/ProblemTestdata.test.tsx \
  src/lib/i18n.test.ts \
  src/styles/tokens.test.ts \
  src/styles/no-inline-danger-hex.test.ts
```

期望:全部通过。

- [ ] 记录结果

### Step 2:全量测试

```bash
yarn workspace @hydrooj/ui-next test
```

期望:失败数 ≤ SP3 baseline(8 failed / 936 passed)。

- [ ] 记录 passed / failed

### Step 3:lint

```bash
yarn lint:ci
```

期望:errors 0,warnings ≤ 138。

- [ ] 记录结果

### Step 4:类型检查 + 构建

```bash
yarn workspace @hydrooj/ui-next build
```

期望:TS 通过;Vite build 通过。

- [ ] 记录结果

### Step 5:e2e harness(若 Task 1 修复通过)

```bash
yarn test
```

期望:SP0/SP1/SP2/SP4 共 11 条 smoke 全绿;若 Task 1/2 失败则如实记录"未实际执行"。

- [ ] 记录 e2e 实际状态

### Step 6:完成报告

完成报告保存到 `.claude/report/2026-07-30-sp5-clean-state-completion.md`,涵盖:

- 6 个 Track 的最终 commit 列表(与 Task 顺序一致)。
- 缺陷关闭矩阵:
  - T1:`loader.ts:133` boot error 消失,e2e harness 可启动。
  - T2 + T3:`iframe-protocol.ts` 共享模块上线,`record_detail.tsx` ↔ `ProblemGenerateTestdata.tsx` 协议对齐,8 个 Stashed 测试恢复。
  - T4:7 个 vitest 失败 → 0。
  - T5:153 errors → 0,warnings 不增加。
  - T6:zh_TW ≥ 60 key、SP3 12 占位补全、`--danger-soft` 视觉确认。
- 定向测试结果与全量测试结果。
- build / lint / e2e 实际状态。
- 已知限制与回退路径(每个 Track 单独可回退;站点级 `ui.next = false`)。
- Reviewer 后续决策项(`--danger-soft` 浅色视觉确认、剩余 warnings 清理等)。

- [ ] 写完成报告

---

## Self-Review

1. **Spec coverage**:
   - §3 Track 1(loader.ts:133)→ Task 1, Task 2
   - §4 Track 2+3(postMessage + Stashed)→ Task 3, Task 4, Task 5, Task 6
   - §5 Track 4(7 vitest 失败)→ Task 7, Task 8, Task 9
   - §6 Track 5(lint 清理)→ Task 10, Task 11, Task 12
   - §7 Track 6(i18n + tokens)→ Task 13, Task 14, Task 15
   - §9 综合验证 → Task 16
   - §10 完成门禁 → Task 16 Step 6
   - §11 回退策略 → Task 16 Step 6 完成报告

2. **Placeholder scan**: 全文无 `TBD`/`TODO`/`add appropriate`;`Task 2` 的"任选其一"基于 Task 1 诊断结论,有具体两条候选(A/B)。

3. **Type consistency**:
   - `IFRAME_STATUS_MESSAGE` 在 `iframe-protocol.ts` 导出为 `as const`,Task 4 与 Task 5 都从同一模块 import。
   - `isAcceptedStatus` / `isTerminalRecordStatus` / `isTrustedIframeOrigin` 在 `iframe-protocol.ts` 定义,Task 4 用,Task 6 测试用。
   - `iframe-protocol.ts::IframeStatusPayload` 类型与 `record_detail.tsx` 的 postMessage payload 字段一致(`type` + `status`)。

4. **Global constraints**:
   - 未修改 `NEXT_PAGES`、renderer、`framework/register`、cordis Context contract(T1 仅改 `loader.ts:resolvePlugin` 末尾,不改 core);
   - `record_detail.tsx` ↔ `ProblemGenerateTestdata.tsx` 协议以 `iframe-protocol.ts` 为真源,不再用 inline 常量;
   - 翻译风格与既有 `zhCN` 一致,台湾术语(`刪除` 而非 `刪去`、`認證器` 而非 `驗證器`);
   - `git commit` 步骤仅在用户授权时执行。

5. **Commit checkpoints**: 每 Task 含可选 `git commit` 检查点(Task 1–16 全部写明"仅在用户授权时执行")。

6. **Risk Tier**: T1 是 boot 修复,改 `loader.ts` 风险中等但有 SP4 root cause 锁定;T2+T3 是协议硬化,改 message handler;T4 是测试修复;T5 是 lint 修复;T6 是翻译协作。整体可分批、独立回退。