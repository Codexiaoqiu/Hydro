# Hydro ui-next SP5 Clean State 设计

**日期**: 2026-07-30
**状态**: 待用户审阅
**范围**: 闭环 SP4 报告里 deferred to SP5+ 的全部项,使 ui-next 测试基线干净、解锁 e2e harness、修复 lint 与翻译 review 项

## 1. 背景与目标

SP0–SP4 完成报告累计的已知限制在 SP5 之前堆积成 4 类硬阻塞:

- `loader.ts:133` 预存 boot error 阻塞 `yarn test` harness 启动(SP0 F6 / SP1 / SP2 / SP3 / SP4 全部报告都提及)。
- `record_detail.tsx` ↔ `ProblemGenerateTestdata.tsx` 跨文件 postMessage 协议不对称(SP4 reviewer Important #1、#2、#3)。
- 7 个与 SP4 无关的 vitest 失败(SP4 known limitation #2)。
- 153 个 lint errors + 138 个 lint warnings(SP4 step 4)。

此外 SP3 review 项里 12 个英文占位串、`Auth.SudoSubtitle` 半角逗号、`--danger-soft` 浅色对比度都未闭环。

SP5 目标是闭环以上所有项,把 ui-next 测试基线抬到"全量 vitest 通过、e2e harness 可启动、lint 零新增问题",从而为 SP6(站点页面 11 页)、SP7(域管理 8 页)、SP8(后台 6 页)等后续 backlog 奠定干净地基。

SP5 不接管新页面、不动 renderer 门禁、不改 manifest。

## 2. 总体架构

6 个 Track 互不强依赖,各自独立 commit、独立回退:

1. **T1: loader.ts:133 修复** — 解锁 e2e harness
2. **T2 + T3: postMessage 协议硬化 + Stashed 测试恢复** — 安全硬化 + 测试恢复(强耦合,同 subagent)
3. **T4: 7 个新 vitest 失败修复** — 测试基线干净
4. **T5: lint 清理** — 153 errors 收敛,warnings 分批
5. **T6: i18n + tokens review 项** — 翻译协作闭环

Track 之间的依赖:

- T2 与 T3 必须配套(同协议、同测试套件),建议同一 subagent 串行。
- T1 解锁后,T4/T5/T6 才能跑全量 vitest 与 e2e 来端到端验证。
- T5 跨多文件,适合单 subagent 串行扫多个文件。
- T6 翻译协作性强,建议在 T1–T5 跑过验证后再增量,避免翻译 PR 与代码 PR 互相阻塞。

## 3. Track 1: loader.ts:133 修复

### 3.1 目标

修复 `cordis` plugin validation failure 在 `Promise.all` 阶段(SP4 Track D 诊断:`hydroac-client` emscripten-bundled addon 的 `ctx.plugin()` 收到不含 callable `apply` 的对象),使 `yarn test` 能 boot 到 `app/ready` 阶段。

### 3.2 设计边界

SP5 不修改 `framework/register`、不修改 `cordis` Context contract,只解决 `hydroac-client` 的具体导出形态问题。

### 3.3 修复方向(待 Task 1 实施前通过最小复现确认)

- 候选 A:`hydroac-client/index.js` 当前 `module.exports = { apply, Config }`,emscripten bundle 可能因为 `__commonJS` 包装把 `apply` 留在闭包中、`require()` 后 `apply` 不可枚举。解决:`unwrapExports` 之后,在 `loader.ts:resolvePlugin` 中若 `apply` 不可调用,把 module 对象本身传入 `ctx.plugin`,让 cordis 自己判定。
- 候选 B:`hydroac-client` 提供 ESM 入口,让 esbuild 走静态分析,产出纯 callable plugin。

任何修复必须保持 SP0–SP4 既有行为不回退;若候选都不成立,降级为 Task 8 仅诊断、修复留给 SP6。

### 3.4 验证

```bash
CI=true node --enable-source-maps -r @hydrooj/register test/entry.js 2>&1 | head -120
```

期望:无 "invalid plugin" 错误,harness 启动到 `app/ready`。

## 4. Track 2 + 3: postMessage 协议硬化与 Stashed 测试恢复

### 4.1 目标

让 `record_detail.tsx` ↔ `ProblemGenerateTestdata.tsx` 跨文件 postMessage 协议:

- 拥有统一 envelope:`{ type: 'hydro-record-status', status: number }`
- 拥有 origin check:拒绝外源 `{ status: 1 }` 直接关闭 modal
- 拥有终态分发:不再只响应 `STATUS_ACCEPTED`,而是所有 `isTerminalStatus` 都关闭 modal

同时恢复 SP4 Track C 解析冲突时丢失的 8 个 Stashed 集成测试。

### 4.2 当前协议回顾

`record_detail.tsx:144-156`(SP4 后)已使用 envelope:

```ts
window.parent.postMessage({ type: IFRAME_STATUS_MESSAGE, status: liveStatus }, '*');
```

`ProblemGenerateTestdata.tsx:53-64`(SP4 后)只响应 `STATUS_ACCEPTED`:

```ts
const onMessage = (e: MessageEvent) => {
  if (isAcceptedStatus(e.data?.status)) {
    setOpen(false); setRecordUrl(null); onGenerated();
    toast.success(t('ProblemGenerateTestdata.Generated'));
  }
};
```

不一致:

- record_detail 发 envelope,ProblemGenerateTestdata 只看 `e.data?.status`,不识别 envelope。
- ProblemGenerateTestdata 只响应 `STATUS_ACCEPTED`,但 record_detail 会发所有终态。
- 双方都用 `'*'` 通配 origin,允许外源伪造关闭。

### 4.3 协议设计

共同协议文件 `packages/ui-next/src/lib/iframe-protocol.ts`:

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

export function isTerminalRecordStatus(value: unknown): boolean {
  return typeof value === 'number' && isTerminalStatus(value);
}

/** Strict origin check — only accept messages whose origin matches our own. */
export function isTrustedIframeOrigin(origin: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return origin === window.location.origin;
  } catch {
    return false;
  }
}
```

### 4.4 协议变更

**`record_detail.tsx`** 已正确使用 `IFRAME_STATUS_MESSAGE` envelope(SP4 添加),无需变更;只需复用 4.3 模块的 origin 判断。

**`ProblemGenerateTestdata.tsx`** 改为:

```ts
const onMessage = (e: MessageEvent) => {
  if (typeof e.data !== 'object' || e.data === null) return;
  if (e.data.type !== IFRAME_STATUS_MESSAGE) return;
  if (!isTrustedIframeOrigin(e.origin)) return;
  const status = (e.data as IframeStatusPayload).status;
  if (!isTerminalRecordStatus(status)) return;
  setOpen(false); setRecordUrl(null); onGenerated();
  toast.success(
    isAcceptedStatus(status)
      ? t('ProblemGenerateTestdata.Generated')
      : t('ProblemGenerateTestdata.GenerateFailed'),
  );
};
```

### 4.5 测试恢复(从 SP4 git history 找回 Stashed 侧)

落地点:`packages/ui-next/src/components/problem/ProblemGenerateTestdata.test.tsx`。至少 14 用例:

- origin check:外源 origin 不关闭 modal
- envelope tag 缺失:无 `type` 字段不响应
- envelope tag 类型错误:`type !== IFRAME_STATUS_MESSAGE` 不响应
- 终态分发:`STATUS_WRONG_ANSWER` / `STATUS_TIME_LIMIT_EXCEEDED` 也关闭 modal
- 已接受状态保留 success 文案
- 拒绝非 terminal status
- recordUrl 已 null 时不重复 toast
- onGenerated 多次调用幂等
- iframe 卸载后 message 仍然触发清理(无 listener leak)

## 5. Track 4: 7 个 vitest 失败修复

### 5.1 失败清单(SP4 step 2)

| 文件 | 失败用例数 | 类别 |
|---|---|---|
| `src/pages/problem_import.test.tsx` | 2 | pre-existing |
| `src/pages/problem_main.test.tsx` | 3 | pre-existing |
| `src/pages/record_detail.test.tsx` | 1 | 由 T2 同时修复 |
| `src/components/problem/MonacoEditor.test.tsx` | 1 | pre-existing `user.clear` |
| `src/components/problem/ProblemAdditionalFiles.test.tsx` | 1 | pre-existing RTL query |
| `src/components/problem/ProblemCreateTestdata.test.tsx` | 1 | pre-existing |
| `src/components/problem/ProblemTestdata.test.tsx` | 2 | pre-existing |

### 5.2 分类处置

- `record_detail.test.tsx`:由 T2 解决(postMessage envelope 测试与 line 91-100 行为对齐)。
- `MonacoEditor.test.tsx::user.clear`:user-event happy-dom 下 `user.clear()` 不稳定;改为 `fireEvent.input(el, { target: { value: '' } })`。
- `ProblemAdditionalFiles.test.tsx::RTL query mismatch`:调整 query selector 以匹配真实 DOM 结构。
- `problem_import.test.tsx` / `problem_main.test.tsx` / `ProblemCreateTestdata.test.tsx` / `ProblemTestdata.test.tsx`:逐个 case 修复(最小改动);每个加 1-2 个回归测试钉死。

### 5.3 验证

```bash
yarn workspace @hydrooj/ui-next test
```

期望:7 failed → 0 failed(若 SP3 baseline 8 failed 仍存在,SP5 兜底降低到 ≤ SP3 baseline)。

## 6. Track 5: lint 清理

### 6.1 当前状态

```bash
yarn lint:ci
# 291 problems (153 errors, 138 warnings)
```

- 153 errors:`ts/no-unused-vars`(ThemeProvider.tsx `resolveInitial`)、`react-hooks/exhaustive-deps`、`react-refresh/only-export-components`、`consistent-return`。
- 138 warnings:`max-len`、`simple-import-sort/imports`、`ts/naming-convention`(zh_CN object property)。

### 6.2 清理原则

- 本次清 errors,warnings 分批(留 SP6 follow-up)。
- 不改既有行为:`ts/no-unused-vars` 删除死代码前确认无副作用;`react-hooks/exhaustive-deps` 必须补依赖或加 `// eslint-disable-next-line` 注释并说明原因。
- ThemeProvider.tsx `resolveInitial` 死代码:确认无引用后删除。
- `consistent-return`:补充缺失的 `return undefined` 或重构为显式分支。
- `react-refresh/only-export-components`:拆出非组件 export。

### 6.3 验证

```bash
yarn lint:ci
```

期望:errors 0,warnings 不增加(允许 ≤ 138)。

## 7. Track 6: i18n + tokens review 项

### 7.1 zh_TW 余下 key

从 SP4 的 16 个高频 key 扩展到 ≥ 60 个 catalog key。覆盖范围:

- `Auth.*`:SudoTitle / SudoSubtitle / UseAuthenticator / WebAuthnVerified / Confirm / TfaCode / Password
- `Common.*`:Submit / Cancel / Delete / ConfirmDelete / Save / Edit / Loading
- `Problem.*`:NoPermissionToSubmit / LoginToSubmit / Submit / Status / Score
- `ContestForm.*`:Permission / PermissionPublic / PermissionInvite / PermissionAssign / SectionPermission / InviteCode / Assign
- `Discussion.*`:Create / Edit / Title / Content
- `RecordDetail.*`:SubmitBy / Hacked / Problem / Language / CodeLength

补齐方式:已有 zh_CN 译文的翻成繁体 + 台湾术语;无 zh_CN 的直接英译中(本地化 reviewer 后续迭代)。

### 7.2 SP3 12 个英文占位

`lib/i18n.ts` 新增的 12 个英文占位串补 zh_CN + zh_TW:

- ContestForm.Permission / PermissionPublic / PermissionInvite / PermissionAssign / SectionPermission / InviteCode / Assign (8 个)
- Auth.UseAuthenticator / WebAuthnVerified / SudoTitle / SudoSubtitle (4 个)

### 7.3 `Auth.SudoSubtitle` 半角逗号

`zhCN['Auth.SudoSubtitle']` 当前含半角逗号 `,`,改为全角 `,`。

### 7.4 `--danger-soft` 浅色对比度

`tokens.css` 当前 `--danger-soft: rgba(220, 38, 38, 0.10)`(light theme)。Reviewer 需视觉确认对比度;若不够,改为 `rgba(220, 38, 38, 0.16)` 或换更深的 red-700 base。

### 7.5 验证

`i18n.test.ts` 加 zh_TW 余下 key 抽样断言(目标 ≥ 60 个 key);`tokens.css` 视觉确认由 reviewer 标记完成。

## 8. 测试策略

### 8.1 T1(loader.ts:133)

- 不加新单元测试(boot 行为靠 e2e harness 验证)。
- 加 smoke:`yarn test` 启动到 `app/ready` 退出码 0。
- 加 e2e 断言:若 Task 1 修复后仍残留少数失败,把失败列入 SP6 follow-up,不阻塞 SP5 完成门禁。

### 8.2 T2 + T3(postMessage)

- `iframe-protocol.test.ts`:6+ 用例覆盖 envelope tag / origin check / terminal status 分发。
- `ProblemGenerateTestdata.test.tsx`:恢复 8 个 Stashed 用例 + 新增 origin check 用例,目标 ≥ 14 用例全通过。

### 8.3 T4(vitest 失败)

每个失败文件加 1-2 个最小回归测试钉死修复后的行为。

### 8.4 T5(lint)

不加新测试;靠 `yarn lint:ci` 退出码 0 验证。

### 8.5 T6(i18n + tokens)

`i18n.test.ts` 加 zh_TW 余下 key 抽样断言;`--danger-soft` 视觉确认由 reviewer 标记完成,不在 vitest 范围。

## 9. 综合验证顺序

按成本从低到高:

1. 各 Track 定向 Vitest;
2. 全量 vitest;
3. `yarn lint:ci`;
4. `yarn workspace @hydrooj/ui-next build`;
5. `yarn test`(T1 修复后才能跑);
6. 完成报告。

## 10. 完成门禁

仅当以下条件全部满足时才可发布 SP5 完成报告:

- T1 harness 启动到 `app/ready`,无 "invalid plugin" 错误;
- T2 + T3 postMessage 协议双端对齐,8 个 Stashed 测试恢复;
- T4 7 个失败 → 0;
- T5 153 errors → 0,warnings ≤ 138;
- T6 zh_TW ≥ 60 key、SP3 12 占位补全、`--danger-soft` 视觉确认;
- 全量 vitest 通过(除 SP3 baseline 已知 pre-existing 之外);
- manifest 无新增漂移;
- e2e harness 实际执行,4 条 smoke 全绿;
- 每个 Track 独立回退路径有记录。

## 11. 回退策略

- T1:revert `hydroac-client` 改动或 cordis shim;`yarn test` 仍可启动但 boot error 恢复。
- T2 + T3:revert `ProblemGenerateTestdata.tsx` 与 `record_detail.tsx` 的 postMessage 改动;`iframe-protocol.ts` 保留为死代码。
- T4:revert 每个失败的 test 文件。
- T5:revert lint commit。
- T6:revert `lib/i18n.ts` 与 `tokens.css`。
- 站点级 `ui.next = false` 继承 SP0,任何环节出问题可一键回退整站。

---

报告与 progress ledger:`.claude/report/2026-07-30-sp5-clean-state-completion.md`、`.superpowers/sdd/progress.md`。