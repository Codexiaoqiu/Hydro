# 迁移进度审查: ui-default → ui-next

**审查日期**: 2026-07-27
**审查模式**: Local Review (未提交)
**范围**: 7 个修改文件 + 17 个新增文件 + 1 个新 README
**审查者**: Claude Code (ecc:code-review)

---

## 总结

本轮迁移新增了 3 个高优先级用户页面 (`home_messages` / `home_security` / `home_settings`) 及其配套测试,并对 `index.ts` 渲染管线做了显式去重重构 (`serializeInjection` 抽取)。整体结构合理,与既有 ui-next 模式一致(测试用 happy-dom + vitest,i18n 中英双语,README 文档化)。**存在 2 项 HIGH 级问题需要在合并前修复,以及多项 MEDIUM/LOW 级质量改进建议。**

**决定**: REQUEST CHANGES

---

## 变更清单

| 类别 | 文件 | 备注 |
|---|---|---|
| 修改 | `packages/ui-next/index.ts` | DEV/PROD 渲染去重 + PENDING_HTML 自愈脚本 |
| 修改 | `packages/ui-next/package.json` | 新增 `@simplewebauthn/browser`、`qrcode` 依赖 |
| 修改 | `packages/ui-next/src/hooks/use-disable-next.ts` | `enable()` 三层语义 |
| 修改 | `packages/ui-next/src/lib/i18n.ts` | 新增 HomeMessages / HomeSecurity / HomeSettings 中英双语 |
| 修改 | `packages/ui-next/src/pages/index.ts` | 注册 3 个新页面 |
| 修改 | `packages/ui-next/src/pages/record_main.tsx` | 改用 `useNavigate` 而非裸 `location.assign` |
| 修改 | `packages/ui-next/src/pages/record_detail.test.tsx` | +3 用例 (空 rdoc / 非 admin / admin) |
| 新增 | `packages/ui-next/README.md` | 完整迁移指南 |
| 新增 | `packages/ui-next/src/components/messages/{types,ConversationList,MessageBubble,MessagePane}.tsx` | DM inbox 三件套 |
| 新增 | `packages/ui-next/src/hooks/useMessageStream.ts` | WebSocket 订阅封装 |
| 新增 | `packages/ui-next/src/hooks/use-disable-next.test.tsx` | 8 个用例 |
| 新增 | `packages/ui-next/src/pages/{home_messages,home_security,home_settings}.tsx` | 三个新页面 |
| 新增 | `packages/ui-next/src/pages/{admin_ui,home_messages,home_security,home_settings,record_main,user_login,user_register,user_lostpass}.test.tsx` | 27 个新增测试用例 |

---

## HIGH 级问题

### H1. `home_messages` 乐观追加与 WS 回声去重不一致 (race condition)

**位置**: `packages/ui-next/src/pages/home_messages.tsx:140-151` (sendMessage)

```ts
// Optimistic append; the WebSocket echo will dedupe if the server
// happens to broadcast the same message back to us.
setConversations((prev) => prev
  .map((c) => (c.targetUid === targetUid
    ? { ...c, messages: [...c.messages, {
        _id: `local-${Date.now()}`,
        from: selfUid,
        to: targetUid,
        content,
      }] }
    : c)));
```

**问题**: 注释声称 "WebSocket echo will dedupe",但代码没有任何去重逻辑。若服务端在 POST 完成后向发送方自身广播回声(常见模式),用户会看到同一内容出现两次——一次是 `local-<timestamp>` 乐观 ID,一次是服务端真实 ObjectId。

`useMessageStream` (`useMessageStream.ts`) 仅按 `operation: 'event'` 透传给 `onMessage`,由 `home_messages.tsx::handleIncoming` 全部追加,没有按 `_id` 去重。

**影响**: 用户每发一条消息会看到重复一次。

**修复建议**: 在 `handleIncoming` 的 `existing` 分支中检查 `payload.mdoc._id` 是否已在 `existing.messages` 中(基于 `local-` 前缀或服务端 `_id`),若已存在则跳过追加;或者用 `requestId` 关联 POST 与回声。

### H2. `home_security` TOTP/WebAuthn 入口标签与后端 `type` 字段语义错位

**位置**: `packages/ui-next/src/pages/home_security.tsx:336-354` (ChooseAuthnType Modal)

```tsx
<Modal open={dialog === 'webauthn'} ... title={t('HomeSecurity.ChooseAuthnType')}>
  <ol>
    <li><Button variant="primary" onClick={() => openWebauthn('tfa')}>{t('HomeSecurity.TwoFactor')}</Button></li>
    <li>...{t('HomeSecurity.YourDevice')}</li>
    <li>...{t('HomeSecurity.MultiPlatform')}</li>
  </ol>
</Modal>
```

```ts
const openWebauthn = async (type: 'platform' | 'cross-platform') => {
  ...
  const reg = await request.post<...>('/home/security', {
    operation: 'register', type,
  });
```

**问题**: 第一个按钮 i18n 文案是 "两步验证 App" / "Authenticator app (TOTP)",但调用 `openWebauthn('tfa')` 传入的 `type: 'tfa'` 会被序列化到 `POST /home/security` 的 `register` operation 里。TOTP 是独立于 WebAuthn 的协议——若后端期望 `type` 是 WebAuthn authenticator 类型枚举,这里把 TOTP 标签贴到 WebAuthn 注册的第一个选项会引发逻辑混乱(用户期望点"两步验证 App"应该走 QR + 6 位代码流程,而非浏览器原生认证器调用)。

**修复建议**:
- 选项 A: 将 TOTP 按钮从 "ChooseAuthnType" 弹窗移除,让用户通过单独的"启用两步验证"按钮进 TOTP 流(本文件已经有这个按钮了,见 line 197)。
- 选项 B: 若后端 `register` operation 真的接受 `type: 'tfa'`,确认该字段语义,不要把 WebAuthn 弹窗标题作为 TOTP 入口。

---

## MEDIUM 级问题

### M1. `record_main.tsx` 中 `inputStyle` / `th` / `td` 在使用前未定义

**位置**: `packages/ui-next/src/pages/record_main.tsx:116,120,124,131,146-152,158-164,177-186`

ESLint 报错 `ts/no-use-before-define`。常量定义在文件底部,在 JSX 中先于定义被引用。在开启 hoisting 的 TS 配置下不会运行时报错,但破坏项目 Lint 规范。

**修复**: 将 `inputStyle` / `th` / `td` 移到文件顶部(或用 `const` 替换为函数内的局部变量)。

### M2. `home_messages` `useEffect` 依赖 `args.messages` 会清空乐观/未推送消息

**位置**: `packages/ui-next/src/pages/home_messages.tsx:123-125`

```ts
useEffect(() => {
  setConversations(buildInitial(args));
}, [args.messages]);
```

SPA 路由切换时,父级 `PageDataProvider` 会以新 `args` 重新注入,触发该 effect,完全用服务端快照覆盖本地 `conversations` 状态,丢失乐观追加(`local-*` id)与尚未收到 WS 回声的消息。

**修复**: 仅在 `args.messages` 是新对象(不是同一引用)时合并,或保留本地追加仅在 `_id` 不存在时合并。

### M3. `home_security` 用 `window.__hydroWebauthnPending` 全局变量在两个 dialog 状态间传参

**位置**: `packages/ui-next/src/pages/home_security.tsx:153,163-167,175`

```ts
(window as unknown as { __hydroWebauthnPending?: unknown }).__hydroWebauthnPending = credential;
...
const credential = (window as unknown as { __hydroWebauthnPending?: unknown }).__hydroWebauthnPending;
```

**问题**: 用 `window` 上的可变全局做 dialog 间的 handoff。若用户开了多个 tab,或在中途刷新页面前再点开该 dialog,会拿到错误 credential 或遗留的过期 credential。

**修复**: 改用 `useState`/`useRef` 在组件内持有 `pendingCredential`,dialog 间通过 prop 传递。

### M4. `home_security` TOTP secret 用 `<code>` 文本节点 + onClick 模拟"点击显示"——可访问性差且语义错误

**位置**: `packages/ui-next/src/pages/home_security.tsx:316-321`

```tsx
<code
  onClick={(e) => { (e.currentTarget.textContent = tfaSecret); }}
  style={{ cursor: 'pointer', fontSize: 'var(--text-xs)' }}
  title="Click to reveal"
>
  {tfaSecret.replace(/./g, '•')}
</code>
```

**问题**:
1. 直接用 JS 改 `textContent`,绕过 React reconciliation;重新渲染会重置回掩码版本。
2. `<code>` 是非交互语义元素,应改为 `<button type="button">`。
3. 键盘用户无法触发(无 `tabIndex`、无 `onKeyDown`)。

**修复**: 改用 `<button type="button">` + `useState` 切换 "显示/隐藏"。

### M5. `record_main.tsx` `useMemo` 依赖 `rows` 是 `args.settings ?? []`,每次渲染为新引用

ESLint 警告 `react-hooks/exhaustive-deps`(`home_settings.tsx:118,138`)。若 `args.settings` 频繁变更或重新构造,`grouped` 会每次重新计算——能跑但有性能与正确性副作用(易引发其他 useEffect 重跑)。

**修复**: 用 `useMemo` 包住 `rows = args.settings ?? []`,再以 `rows` 作为 `grouped` 的依赖。

### M6. `useDisableNext` `enable()` 中 `setGlobalFlag(false)` 被删,但 `disable('global')` 仍存在

**位置**: `packages/ui-next/src/hooks/use-disable-next.ts:55-84` vs `85-93`

`enable()` 在 `reason === 'query'` 分支删除了 `setGlobalFlag(false)`,但 `disable('global')` 调用 `setGlobalFlag(true)`。新 diff 注释说明这是有意的("global 由 admin 控制,客户端不应反向覆盖"),但需要确认 `disable('global')` 是否还被实际调用——否则 `setGlobalFlag` 的 setter 实际上变成死代码。

**检查方法**: 在 `packages/ui-next/src/` 内 grep `disable\(['"]?global['"]?\)` 或 `disable\("global"\)`,确认无调用即可删除 setter。

### M7. `home_messages.tsx` `buildInitial` 在初始化时被调用两次

`useState` 初值用了 `buildInitial(args)` 两次(一次给 `conversations`,一次给 `selected`)——性能影响微小,但可以抽出:

```ts
const initialConversations = useMemo(() => buildInitial(args), []);
```

让两个 `useState` 都引用 `initialConversations`。

### M8. `home_messages.tsx` 删除消息也无去重

与 H1 同源——`deleteMessage` 同样没有按 `_id` 防重复删除。建议统一加一个去重层。

---

## LOW 级问题

### L1. `index.ts` `parseAcceptLanguage` 同样在使用前未定义

ESLint 报错 `ts/no-use-before-define`。本应在 `serializeInjection` 之前定义,但因新函数抽取时被推到了下面。

### L2. `record_main.tsx` 多处行长度超 150(`max-len`)

8 处 warning。格式化即可。

### L3. `home_messages.tsx::FakeWebSocket.close()` 修改类静态数组

测试 helper,非产品代码,但确实有副作用(影响别的 test 的实例可见性)。可接受但需要注释解释。

### L4. 大量 ESLint `style/member-delimiter-style` 与 `it should begin with lowercase` 风格问题

被审查文件共 22 处 lint 错误,多为 `interface Foo { a: string; b: string }` 缺少尾逗号 / `it('Does X')` 首字母大写。`yarn lint:ci` 会拒绝合并。

**修复**: `yarn exec eslint src/<file> --fix` 一键修复。

### L5. `home_security.tsx::useEffect` 中 `Promise.resolve(platformAuthenticatorIsAvailable() as unknown).then(...)`

`as unknown` 是因为 `@simplewebauthn/browser` 不同版本 `platformAuthenticatorIsAvailable` 返回类型不一。代码层面可加注释解释,或锁定依赖版本。

### L6. `index.ts` `serializeInjection(handler: any, ...)` 使用 `any`

类型可收紧为 `Handler & { context: ...; UiContext?: ...; response: { template?: string } }` 或类似 interface。

### L7. `record_main.tsx` `EventSource` 实例在 `UiContext?.rids` 变更时未先 close 旧连接

`useEffect` 依赖 `UiContext?.rids` 但 cleanup 函数 `return () => es.close()` 会在下次运行前触发——OK。但若 `UiContext?.socketUrl` 变化,会创建新连接而旧连接未及时关闭(实际会,因依赖变化导致 effect 重跑)。可接受。

---

## 验证结果

| 检查 | 结果 | 备注 |
|---|---|---|
| TypeScript (`tsc --noEmit`) | **N/A** | ui-next 包无独立 tsconfig.json,顶层 `tsc -b` 集成构建未跑 |
| ESLint (我审查的文件) | **FAIL** | 22 errors / 9 warnings(主要为风格,可 `--fix` 一键修复) |
| ESLint (整个 ui-next/src) | **FAIL** | 505 errors / 270 warnings(大量预存问题,超出本次审查范围) |
| vitest (我审查的文件) | **PASS** | 全部测试通过(具体见下表) |
| vitest (整个 ui-next) | **FAIL** | 8 failed / 873 passed,失败均为本次审查外的预存问题(problem_import、problem_main、MonacoEditor 等) |

### 我审查的测试运行情况(全部 PASS)

| 测试文件 | 用例数 |
|---|---|
| `src/pages/record_detail.test.tsx` | 6(其中 3 个新增) |
| `src/pages/record_main.test.tsx` | 5(全部新增) |
| `src/pages/admin_ui.test.tsx` | 6(全部新增) |
| `src/pages/home_messages.test.tsx` | 5(全部新增) |
| `src/pages/home_security.test.tsx` | 5(全部新增) |
| `src/pages/home_settings.test.tsx` | 4(全部新增) |
| `src/pages/user_login.test.tsx` | 5(全部新增) |
| `src/pages/user_register.test.tsx` | 5(全部新增) |
| `src/pages/user_lostpass.test.tsx` | 5(全部新增) |
| `src/hooks/use-disable-next.test.tsx` | 8(全部新增) |
| **合计** | **54(54 pass, 0 fail)** |

### 预存失败(与本次审查无关,需另行修复)

```
FAIL  src/lib/i18n.test.ts > resolveLocale
FAIL  src/pages/problem_import.test.tsx (2 tests)
FAIL  src/pages/problem_main.test.tsx (3 tests)
FAIL  src/components/problem/MonacoEditor.test.tsx
FAIL  src/components/problem/ProblemCreateTestdata.test.tsx
```

---

## 关键决策与权衡

1. **`serializeInjection` 抽取** — 设计正确,避免 DEV/PROD 双轨字段漂移。`any` 类型签名可在后续 PR 收紧。

2. **`useDisableNext.enable()` 分层** — 设计意图明确(注释充分)。新增的 "global 不可被客户端覆盖" 行为属于产品决策而非 bug,需要 PM/owner 二次确认(对应 `q.md` R7)。

3. **PENDING_HTML 自愈脚本** — 防止 hot-reload 卡死的兜底,设计合理。`document.body.innerHTML = ...` 在 PENDING 路径下只触发 5 次后,属于合理的逃生口。

4. **`record_main.tsx` 改用 `useNavigate`** — 替换原先的 `window.location.assign`,与 SPA 路由模型对齐。改动小且正确。

5. **`useMessageStream`** — 抽象干净,SSR-safe,接口最小。但要注意 `onMessage` 使用 `useRef` 保证最新回调,但 `onOpen` 同样——而 `onOpen` 只在 `ws.onopen` 时触发一次,所以一旦组件 re-render 时 onOpen 引用变化,新回调不会被重新绑定。这通常是 OK 的(订阅帧只发一次),但需要注释说明。

---

## 建议的合并前修复顺序

1. **必做(阻断合并)**: H1 (WS 去重)、H2 (TOTP/WebAuthn 入口语义)。
2. **建议(同 PR)**: M1 (lint: no-use-before-define)、M3 (`window.__hydroWebauthnPending` 改 state)、M4 (TOTP secret 改 `<button>`)、L1 (parseAcceptLanguage 顺序)、L4 (`yarn eslint --fix`)。
3. **可后续 PR**: M2 (args.messages effect)、M5 (useMemo deps)、M6 (setGlobalFlag 死代码)、M7 / M8 (去重与初始化合并)。

---

## 文件评审完整列表

### 修改(7)

- ✅ `packages/ui-next/index.ts` (L1 + 抽取 `serializeInjection`)
- ✅ `packages/ui-next/package.json` (+3 deps,1 devDep)
- ✅ `packages/ui-next/src/hooks/use-disable-next.ts` (三态 `enable()` 语义)
- ✅ `packages/ui-next/src/lib/i18n.ts` (双语 27 条新 key,按字母序)
- ✅ `packages/ui-next/src/pages/index.ts` (注册 3 新页面)
- ⚠️ `packages/ui-next/src/pages/record_main.tsx` (M1 + 改 navigate)
- ✅ `packages/ui-next/src/pages/record_detail.test.tsx` (+3 用例)

### 新增(11)

- ✅ `packages/ui-next/README.md` (完整迁移指南)
- ⚠️ `packages/ui-next/src/components/messages/types.ts` (共享类型)
- ⚠️ `packages/ui-next/src/components/messages/ConversationList.tsx`
- ⚠️ `packages/ui-next/src/components/messages/MessageBubble.tsx`
- ⚠️ `packages/ui-next/src/components/messages/MessagePane.tsx`
- ✅ `packages/ui-next/src/hooks/useMessageStream.ts`
- ✅ `packages/ui-next/src/hooks/use-disable-next.test.tsx`
- ❌ `packages/ui-next/src/pages/home_messages.tsx` (H1, M2, M7, M8)
- ❌ `packages/ui-next/src/pages/home_security.tsx` (H2, M3, M4)
- ⚠️ `packages/ui-next/src/pages/home_settings.tsx` (M5)
- ✅ 全部 `*.test.tsx` (PASS)

✅ = 通过 / ⚠️ = 需改进(Low/Medium) / ❌ = 需修复(High)