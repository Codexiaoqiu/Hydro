# contest_detail 迁移到 ui-next 设计

> 日期：2026-07-20
> 范围：完整迁移（含主内容、侧边栏、私有附件、倒计时 / NProgress、Speculation Rules）
> 目标文件：`packages/ui-next/src/pages/contest_detail.tsx` 等

## 1. 背景与目标

`/contest/:tid` 当前由 `packages/ui-default/templates/contest_detail.html` 渲染（带 `pages/contest.page.ts` 客户端计时器 / NProgress / 预渲染）。这次把它迁到 `ui-next`：

- 用户体验统一：与已迁移的 `contest_main` / `contest_create` / `contest_edit` 一致
- 复用 `lib/contest-status.ts`、`Article`（统一 Markdown 管线）、`lib/rule-text.ts` 等已有 lib
- `contest_main` 与 `ContestSection` 已生成 `contest_detail` 链接，仅路由名一致即可跳转

服务端的 `ContestDetailHandler`（`packages/hydrooj/src/handler/contest.ts:153-203`）**不改**。`ui-default` 模板**保留**（作为 fallback，`next` renderer `asFallback: true`）。

## 2. 范围与非目标

### 范围内

- 标题、规则、状态、Markdown 描述
- 私有附件列表（基于 `partials/files.html`）
- 侧边栏所有 action（Attend / End Early / Subscribe / Scoreboard / Edit / Manage / Print / Code / Discussion / All submissions / My submissions）
- 倒计时 + NProgress 进度条（每秒 tick）
- Speculation Rules 预渲染 `/p/*` 与 `/d/*/p/*`
- `file://` URL 重写（从 server 渲染阶段移到前端 `ContestDescription` 内）

### 非目标

- 不迁移 `contest_problemlist` / `contest_print` / `contest_manage` / `contest_clarification` / `contest_code` / `contest_scoreboard` 等其他 contest_* 路由
- 不修改 server handler
- 不修改 `ui-default/templates/contest_detail.html`（保留为 fallback）
- 不实现订阅按钮 toggle UI 的细节（沿用 server `postSubscribe` 简单 boolean 提交）
- 不引入 React Router 等新依赖

## 3. 文件清单

```
packages/ui-next/src/
├── pages/
│   ├── contest_detail.tsx              ← 新增
│   └── contest_detail.test.tsx         ← 新增（4+ 用例）
├── components/contest/
│   ├── ContestDetailHeader.tsx         ← 新增
│   ├── ContestDetailHeader.module.css  ← 新增
│   ├── ContestTimer.tsx                ← 新增（展示组件）
│   ├── ContestTimer.module.css         ← 新增
│   ├── ContestDescription.tsx          ← 新增
│   ├── ContestFiles.tsx                ← 新增
│   ├── ContestFiles.module.css         ← 新增
│   ├── ContestDetailSidebar.tsx        ← 新增
│   └── ContestDetailSidebar.module.css ← 新增
└── lib/
    ├── contest-actions.ts              ← 新增（纯函数：权限 / 状态判断）
    ├── contest-actions.test.ts         ← 新增
    ├── contest-timer.ts                ← 新增（useContestTimer hook + 纯函数 computeTimerState）
    └── contest-timer.test.ts           ← 新增
```

变更（已有文件）：
- `packages/ui-next/src/pages/index.ts` 加 `registerPage('contest_detail', () => import('./contest_detail'))`
- `packages/ui-next/src/lib/i18n.ts` 加 `ContestDetail.*` 双语段落（zh_CN + en，字母序）
- `packages/ui-next/src/sections/types.ts` 加 `SerializedUserDict = Record<string, SerializedUser>`（如不存在）

## 4. 架构与数据流

### 路由

`registerPage('contest_detail', () => import('./contest_detail'))`，路由名必须与 server `ctx.Route('contest_detail', ...)` 完全一致。

### 数据契约

`ContestDetailHandler.get()` 注入到 `response.body`，再由 next renderer 注入到 `PageData.args`：

| 字段 | 类型 | 来源 |
|------|------|------|
| `tdoc` | `SerializedTdoc` | `contest.get(domainId, tid)` |
| `tsdoc` | `SerializedContestStatusDoc \| null` | `tsdocAsPublic()` 过滤 |
| `udict` | `Record<string, SerializedUser>` | `user.getList(domainId, [tdoc.owner])` |
| `files` | `FileInfo[]` | 已报名且已开始才返回 |
| `urlForFile` | `(name: string) => string` | handler 内联构造 |

### 页面布局

```
<ContestDetailHeader />
<ContestTimer />            ← fixed top
<div className="layout-2col">
  <main>
    <ContestDescription content={tdoc.content} docId={tdoc.docId} />
    <ContestFiles files={files} urlForFile={urlForFile} />
  </main>
  <ContestDetailSidebar tdoc tsdoc udict />
</div>
<PrerenderHints />
```

### `file://` 重写

ui-default 模板在 server 渲染时做：
```ts
tdoc.content
  .replace(/\(file:\/\//g, `(./${tdoc.docId}/file/public/`)
  .replace(/="file:\/\//g, `="./${tdoc.docId}/file/public/`);
```

ui-next 端在 `ContestDescription` 内同步做：
```ts
function rewriteContent(raw: string, docId: string): string {
  return raw
    .replace(/\(file:\/\//g, `(${docId}/file/public/`)
    .replace(/="file:\/\//g, `="${docId}/file/public/`);
}
```

放在 `ContestDescription` 内的原因：
- ui-next 没有 Nunjucks 模板，前端必须做
- 重写与渲染是同一组件的两个相邻步骤

## 5. 组件规格

### `ContestDetailHeader`

| Prop | 类型 | 说明 |
|------|------|------|
| `title` | `string` | `tdoc.title` |
| `rule` | `string` | `tdoc.rule`（赛制码） |
| `status` | `'upcoming' \| 'ongoing' \| 'done'` | 由 `lib/contest-status.ts::isOngoing/isDone` 派生 |
| `attended` | `boolean` | `tsdoc?.attend === true` |
| `durationText` | `string` | `lib/contest-status.ts::renderDuration(tdoc)` |

布局：`Eyebrow`（赛制翻译）→ `<h1>` 标题 → `Chip` 簇（赛制 / 状态 / 已报名）。

### `ContestTimer`

Hook `useContestTimer`：

```ts
type TimerState = {
  status: 'pre' | 'running' | 'ended'
  msLeft: number
  progress: number   // 0..1
  display: string    // "12:34" 或 "01:23:45"
}

function useContestTimer(opts: {
  beginAt: number
  duration?: number
  tsdocStartAt?: number
  tsdocEndAt?: number
}): TimerState
```

实现：
- 内部 `useState<TimerState>` + `useEffect(() => setInterval(tick, 1000), [])`
- 卸载时 `clearInterval`
- `tick()` 用纯函数 `computeTimerState(now, opts)` 计算新值
- 当 `status` 切换时（pre→running、running→ended）通过 `CustomEvent('hydro:contest-tick')` 通知 NProgress 一次

UI：
- 文本用 `mm:ss`（< 1h）或 `dd:hh:mm`（≥ 1h）
- NProgress 进度条：`position: fixed; top: 0; height: 2px; transform-origin: left; transform: scaleX(progress); transition: transform 200ms linear`

### `ContestDescription`

| Prop | 类型 |
|------|------|
| `content` | `string` |
| `docId` | `string` |

实现：
1. `const rewritten = rewriteContent(content, docId);`
2. `<Article content={rewritten} />`（统一 Markdown 管线）

### `ContestFiles`

| Prop | 类型 |
|------|------|
| `files` | `FileInfo[]` |
| `urlForFile` | `(name: string) => string` |

实现：表格列 `name` / `size`；每行 `<a href={urlForFile(file.name)} target="_blank" rel="noopener noreferrer">`；`files.length === 0` 时显示 muted 文本 "No files attached."

### `ContestDetailSidebar`

| Prop | 类型 |
|------|------|
| `tdoc` | `SerializedTdoc` |
| `tsdoc` | `SerializedContestStatusDoc \| null` |
| `udict` | `SerializedUserDict` |
| `urlForFile` | `(name: string) => string` |

内部：
- 调用 `computeContestActions(tdoc, tsdoc, user)` 拿到 11+ 布尔位
- 根据 `canAttend` 渲染 Attend 按钮（邀请码 prompt / 直接 POST）
- 根据 `canEarlyEnd` 渲染 End Early（ConfirmDialog → POST）
- 根据 `canEdit` / `canManage` / `canShowScoreboard` / `canViewCode` / `canPrint` 渲染对应 `<Link>`
- 根据 `canSubscribe` 渲染订阅 toggle
- 根据 `canShowSelfRecord` / `canShowAllRecord` 渲染 All / My submissions 链接
- 根据 `canShowDiscussion` / `canCreateDiscussion` 渲染 Discussion 链接

提交：
- `useApi()` 返回的 `request.post` + `URLSearchParams`
- 成功 `window.location.reload()`（同步 server 注入的最新 `tsdoc` / `files`）
- 失败：捕获 `HydroClientError`，`<Alert variant="error" message={err.message}>` 显示

### `lib/contest-actions.ts`

纯函数，无 React 依赖：

```ts
type UserPerms = { hasPerm: (p: string) => boolean; own: (doc: { owner: string }) => boolean; _id: string };

export type ContestActionFlags = {
  canAttend: boolean
  canEarlyEnd: boolean
  canSubscribe: boolean
  canShowScoreboard: boolean
  canShowHiddenScoreboard: boolean
  canShowAllRecord: boolean
  canShowSelfRecord: boolean
  canEdit: boolean
  canManage: boolean
  canPrint: boolean
  canViewCode: boolean
  canShowDiscussion: boolean
  canCreateDiscussion: boolean
}

export function computeContestActions(
  tdoc: SerializedTdoc,
  tsdoc: SerializedContestStatusDoc | null,
  user: UserPerms
): ContestActionFlags
```

实现对照表（基于 `partials/contest_sidebar.html` 的 11 个 `{% if %}` 分支）：

| Flag | 条件 |
|------|------|
| `canAttend` | `!tsdoc?.attend && !isDone(tdoc) && user.hasPerm(PERM_ATTEND_CONTEST)` |
| `canEarlyEnd` | `tdoc.rule !== 'homework' && tsdoc?.attend && isOngoing(tdoc, tsdoc)` |
| `canSubscribe` | `tsdoc?.attend === true` |
| `canShowScoreboard` | `isDone(tdoc) \|\| isOngoing(tdoc, tsdoc)`（近似 server `canShowScoreboard(tdoc, false)`） |
| `canShowHiddenScoreboard` | `isDone(tdoc) && user.hasPerm(PERM_VIEW_HIDDEN_CONTEST_SCOREBOARD)` |
| `canShowAllRecord` | `isDone(tdoc) && user.hasPerm(PERM_READ_RECORD_CODE)` |
| `canShowSelfRecord` | `tsdoc?.attend === true` |
| `canEdit` | `user.own(tdoc) \|\| user.hasPerm(PERM_EDIT_CONTEST)` |
| `canManage` | `user.own(tdoc) \|\| user.hasPerm(PERM_EDIT_CONTEST)` |
| `canPrint` | `tdoc.allowPrint && (isOngoing(tdoc, tsdoc) \|\| isDone(tdoc))` |
| `canViewCode` | `isDone(tdoc) && user.hasPerm(PERM_READ_RECORD_CODE)` |
| `canShowDiscussion` | `user.hasPerm(PERM_VIEW_DISCUSSION)` |
| `canCreateDiscussion` | `user.hasPerm(PERM_CREATE_DISCUSSION)` |

**注意：** 上述条件仅用于**决定按钮显示/隐藏**，不能替代 server 端的 `checkPerm`。server 在 `postAttend` / `postSubscribe` / `postEarlyEnd` 内仍会再次校验。

### `lib/contest-timer.ts`

```ts
export type TimerOptions = {
  beginAt: number          // tdoc.beginAt
  duration?: number        // tdoc.duration
  tsdocStartAt?: number    // tsdoc.startAt
  tsdocEndAt?: number      // tsdoc.endAt
}

export type TimerState = {
  status: 'pre' | 'running' | 'ended'
  msLeft: number
  progress: number
  display: string
}

// 纯函数（可独立测试）
export function computeTimerState(now: number, opts: TimerOptions): TimerState

// React hook
export function useContestTimer(opts: TimerOptions): TimerState
```

`computeTimerState` 逻辑：
1. 起点 = `tsdocStartAt ?? beginAt`
2. 终点：
   - 若 `tsdocEndAt` 存在 → `tsdocEndAt`
   - 否则若 `duration` 存在 → `beginAt + duration`
   - 否则视为静态已结束
3. `now < start` → `pre`, `msLeft = start - now`, `progress = 0`
4. `now >= end` → `ended`, `msLeft = 0`, `progress = 1`
5. 否则 → `running`, `msLeft = end - now`, `progress = (now - start) / (end - start)`

`display`：
- `msLeft < 3_600_000` → `"mm:ss"`
- 否则 → `"dd:hh:mm"`

## 6. 错误处理与边界

| 场景 | 处理 |
|------|------|
| `args === undefined` | `<Alert variant="info">Contest information is loading…</Alert>` |
| `tdoc === undefined` | 渲染空态 |
| `tsdoc === null` | 显示 Attend 按钮，隐藏需要 `tsdoc.attend` 的按钮 |
| `files === []` 或缺失 | `<ContestFiles>` 显示空态 "No files attached." |
| Attend POST 失败（邀请码错） | `Alert variant="error"` 显示 server message |
| Attend POST 失败（比赛已结束） | `Alert variant="error"` "比赛已结束，无法报名" |
| Early End POST 失败 | `Alert variant="error"` 显示 server message |
| 网络错误 | `useToast().error('网络错误，请稍后重试')` |
| `tdoc.content === ''` | `<Article>` 渲染空 |
| `tdoc.duration` 缺失 | `computeTimerState` 用 `tsdocEndAt` 替代 |
| `tsdoc.startAt > tdoc.beginAt` | `computeTimerState` 用 `tsdoc.startAt` 作计时起点 |
| 路由命中但 tid 无效 | server 抛 `ContestNotFoundError`，由 ui-default fallback 渲染错误页 |

## 7. i18n

在 `packages/ui-next/src/lib/i18n.ts` 加 `ContestDetail.*` 段落（zh_CN 在前、en 在后，字母序）：

| Key | zh_CN | en |
|-----|-------|----|
| `ContestDetail.Attend` | 报名参赛 | Attend Contest |
| `ContestDetail.EndEarly` | 提前结束 | End Contest Early |
| `ContestDetail.EndEarlyConfirm` | 确定要提前结束比赛吗？此操作不可撤销。 | Are you sure you want to end the contest early? This cannot be undone. |
| `ContestDetail.InvitationCode` | 邀请码 | Invitation code |
| `ContestDetail.Loading` | 比赛信息加载中… | Contest information is loading… |
| `ContestDetail.NoFiles` | 暂无附件 | No files attached. |
| `ContestDetail.Scoreboard` | 排行榜 | Scoreboard |
| `ContestDetail.HiddenScoreboard` | 隐藏排行榜 | Hidden Scoreboard |
| `ContestDetail.Edit` | 编辑比赛 | Edit Contest |
| `ContestDetail.Manage` | 比赛管理 | Contest Management |
| `ContestDetail.Print` | 打印 | Print |
| `ContestDetail.Code` | 导出代码 | Export Code |
| `ContestDetail.Discussion` | 讨论 | Discussion |
| `ContestDetail.AllSubmissions` | 所有提交 | All submissions |
| `ContestDetail.MySubmissions` | 我的提交 | My submissions |
| `ContestDetail.Subscribe` | 订阅通知 | Subscribe |
| `ContestDetail.Unsubscribe` | 取消订阅 | Unsubscribe |
| `ContestDetail.TimerStarts` | 距离开始 | Starts in |
| `ContestDetail.TimerEnds` | 距离结束 | Ends in |
| `ContestDetail.TimerEnded` | 已结束 | Ended |
| `ContestDetail.ErrorEnded` | 比赛已结束，无法报名 | Contest has ended, cannot attend |
| `ContestDetail.NetworkError` | 网络错误，请稍后重试 | Network error, please try again |

## 8. 测试策略

### `pages/contest_detail.test.tsx`（必跑）

mock：`@monaco-editor/react`、`useApi` hooks、`lib/contest-timer.ts`（注入固定 TimerState）。

| # | 用例 | 注入 | 断言 |
|---|------|------|------|
| 1 | 完整未报名（upcoming） | tdoc 完整 + tsdoc=null + files=[] | Attend 显示；倒计时 "Starts in ..."；Edit 按权限显隐 |
| 2 | 完整已报名（ongoing） | tdoc 完整 + tsdoc={attend:true,startAt:...} + files=[{name,size}] | End Early 显示；Private files 显示 |
| 3 | 数据缺失 | args=undefined | 渲染空态 |
| 4 | 已结束比赛 | tdoc 完整 + endAt 已过 + tsdoc={attend:true} | Scoreboard/Code/Records 全部显示；Attend/EndEarly 隐藏 |
| 5 | homework 规则 | tdoc.rule='homework' + tsdoc.attend + ongoing | End Early **不**显示 |
| 6 | 邀请码比赛 | tdoc._code='abc' + tsdoc=null | 点 Attend → prompt → POST 含 code |

### `lib/contest-actions.test.ts`（必跑）

| 用例 | 矩阵 |
|------|------|
| canAttend | (未报名/已报名) × (进行中/未开始/已结束) × (有权限/无权限) |
| canEarlyEnd | 含 homework 否定分支 |
| canSubscribe | 仅 tsdoc.attend=true |
| canShowHiddenScoreboard | done && hasPerm |
| canManage / canEdit | own / hasPerm |
| canPrint | allowPrint + ongoing/done |

### `lib/contest-timer.test.ts`（必跑）

| 用例 | 输入 | 输出 |
|------|------|------|
| pre 状态 | now < beginAt | {status:'pre', progress:0, msLeft:beginAt-now} |
| running 状态 | now ∈ [beginAt, endAt] | {status:'running', progress:0.5, msLeft:endAt-now} |
| ended 状态 | now > endAt | {status:'ended', progress:1, msLeft:0} |
| tsdocEndAt 模式 | tsdoc.endAt 存在 | 用 tsdoc.endAt 替换 endAt |
| duration 模式 | duration 存在 + tsdoc.endAt 缺失 | 用 beginAt+duration |
| tsdoc.startAt > beginAt | 晚到场景 | 用 tsdoc.startAt 作起点 |
| display 格式 | msLeft < 1h | "mm:ss" |
| display 格式 | msLeft ≥ 1h | "dd:hh:mm" |

### `ContestDetailSidebar.test.tsx`（推荐）

| 用例 | 注入 | 断言 |
|------|------|------|
| Attend 提交成功 | mock `request.post` resolved | 触发 reload |
| Attend 邀请码错误 | mock reject InvalidTokenError | Alert 显示邀请码错误 |
| End Early confirm 取消 | 用户点 Cancel | 不发 POST |
| End Early 确认提交 | mock resolved | toast / reload |

### 跑测

```bash
cd packages/ui-next && npx vitest run \
  src/pages/contest_detail.test.tsx \
  src/lib/contest-actions.test.ts \
  src/lib/contest-timer.test.ts \
  src/components/contest/ContestDetailSidebar.test.tsx

# 全量回归
yarn workspace @hydrooj/ui-next test

# 验证路由名对齐
grep -n "registerPage" packages/ui-next/src/pages/index.ts | grep contest_detail
grep -n "ctx.Route" packages/hydrooj/src/handler/contest.ts | grep contest_detail
```

## 9. 实施顺序

1. 加 `lib/i18n.ts` 双语段落（最小 PR，最小可回滚）
2. 加 `lib/contest-actions.ts` + 单测（纯函数，先稳定）
3. 加 `lib/contest-timer.ts` + 单测（纯函数 + hook）
4. 加 `pages/index.ts` 的 `registerPage('contest_detail', ...)`（暂指向占位组件）
5. 加 `ContestDetailHeader` + `ContestDescription` + `ContestFiles`
6. 加 `ContestTimer`（含 NProgress）
7. 加 `ContestDetailSidebar`（含 11+ 分支）
8. 替换 `pages/contest_detail.tsx` 占位组件为完整版
9. `yarn workspace @hydrooj/ui-next test` 全量回归
10. `yarn lint`

每步独立 commit。

## 10. 风险与缓解

| 风险 | 缓解 |
|------|------|
| 11+ 权限分支遗漏或错位 | `lib/contest-actions.ts` 单测覆盖所有组合；server 端仍会校验 |
| `Article` 懒加载 Monaco 在 vitest 假计时器下卡住 | 沿用 rebuild.md §8.4 例外：纯函数 timer 用假计时器，**组件测试**用真实计时器 |
| `file://` 重写位置错位 | `ContestDescription` 内调用，文档明确说明 |
| Speculation Rules 浏览器支持 | `if (!('addSpeculationRules' in HTMLScriptElement.prototype)) return;` 兼容老浏览器 |
| NProgress 进度条与已有 UI 冲突 | 固定 top:0 + 2px 高度 + token 颜色 `--blue`，与现有 UI 不冲突 |
| i18n 段落漏 key | 测试断言兼容双语：`expect(screen.getByText(/报名参赛\|Attend Contest/i))` |

## 11. 相关文档

- `.claude/rebuild.md` — ui-default → ui-next 迁移指南
- `docs/superpowers/specs/2026-07-18-ui-next-markdown-live-preview-design.md` — 详情页 Markdown 管线
- `docs/superpowers/specs/2026-07-20-problem-submit-parity-design.md` — 问题提交页参考实现
- `packages/hydrooj/src/handler/contest.ts:153-203` — `ContestDetailHandler` 实现
- `packages/ui-default/templates/contest_detail.html` + `partials/contest_sidebar.html` — 现有 ui-default 实现
