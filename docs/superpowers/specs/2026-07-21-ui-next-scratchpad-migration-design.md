# ui-next Scratchpad（在线编程模式）功能等价迁移设计

**日期：** 2026-07-21
**状态：** 已确认，待实施计划
**目标页面：** `packages/ui-next/src/pages/problem_detail.tsx` 及其新增的 Scratchpad 子模块

## 1. 背景

`ui-default` 在题目详情页(`problem_detail.page.tsx`)提供"进入在线编程模式"按钮，点击后将页面切换为一个内嵌的 Monaco IDE：

- 左侧：题目内容（DOM 直接迁移到 React 子树）；
- 右侧：垂直分布的工具栏 + Monaco 编辑器 + 可选的预测试面板 + 可选的提交记录面板；
- 全局快捷键：`Alt+Q` 退出、`F9` 跑预测试、`F10` 提交、`Alt+P` 切换预测试面板、`Alt+R` 切换记录面板；进入模式无快捷键，仅通过侧边栏菜单点击；
- 后端契约：`POST <postSubmitUrl>` 携带 `pretest:true` 与 `input:[...]` 触发预测试；`GET /record-conn?pretest=1&...` WebSocket 流式返回预测试输出；`GET <getSubmissionsUrl>` 拉取最近提交。

`ui-next` 当前只实现了一个 placeholder Card（`components/problem/Scratchpad.tsx`），文案"Scratchpad 正在准备中"，侧边栏没有"进入在线编程模式"入口，编辑器内核也只是 textarea 回退。

本设计把 ui-default 的 Scratchpad 行为对齐到 ui-next，但**不强制 Redux / 全屏覆盖**，保持 ui-next 的状态管理风格与左右分栏呈现。

## 2. 目标

1. `problem_detail` 在 ui-next 下提供与 ui-default 用户可观察行为一致的 Scratchpad 模式。
2. 编辑器从 textarea 升级为真实 Monaco（与 ui-default 一致）。
3. 预测试走 WebSocket 流式输出，提交走现有表单协议；与 `problem_submit` 共享 `postSubmitUrl` / `pretestConnUrl` / `getSubmissionsUrl`。
4. 状态管理用 `useReducer` + Context 替换 ui-default 的 Redux；保持代码量可控。
5. 不新增独立路由；通过 URL `?mode=scratchpad` 标识，浏览器后退即退出。
6. 删除当前 `Scratchpad.tsx` 的 "ComingSoon" 占位 UI。

## 3. 非目标

- 不在独立路由 `problem_scratchpad` 提供 Scratchpad。
- 不替换 ui-default 的 Scratchpad；ui-default 与 ui-next 并存直到 ui-default 关闭。
- 不重写后端 `RecordMainConnectionHandler` 的消息协议；沿用现有 `{type, payload}` 推送格式。
- 不实现 Monaco IntelliSense / 自定义 language service；只使用 monaco-editor 内置语言支持。
- 不做主题切换的 Monaco 主题适配；主题跟随 `hydro.theme` 在 CSS 层面处理。
- 不做 IndexedDB 之外的额外持久化。

## 4. 架构

```
problem_detail.tsx (已有)
  ├── ProblemHero (已有)
  ├── <ScratchpadPanel>           ← 新增容器（条件渲染：mode=scratchpad）
  │     ├── <ScratchpadProblemPane>  左栏：题目内容（只读）
  │     └── <ScratchpadEditorPane>   右栏：垂直堆叠
  │           ├── <ScratchpadToolbar>   Run Pretest/Submit/Exit/Lang/Panels
  │           ├── <MonacoEditor>        升级为真实 Monaco
  │           ├── <PretestPanel>        WebSocket 实时输出
  │           └── <RecordsPanel>        最近 5 条提交
  ├── 普通布局 (mode != scratchpad)  ← 保持现状
  └── 侧边栏新增 "进入在线编程模式" 菜单项
```

## 5. 组件契约

### 5.1 ScratchpadPanel
- 入参：`{ problemId: number; pdoc: Pdoc; tdoc?: Tdoc; UserContext?: UserContext; canSubmit: boolean; onExit: () => void }`
- 行为：
  - 挂载时建立 `ScratchpadContext.Provider`，初始化 `useScratchpadState`
  - 通过 CSS Grid 划分左右两栏（`grid-template-columns: minmax(320px, 1fr) minmax(420px, 1.2fr)`）
  - 监听键盘 `Alt+Q` → 如果 `confirm("未提交代码将被丢弃")` 通过则调用 `onExit()`
  - 卸载时关闭 WebSocket、清理 IndexedDB 写入定时器

### 5.2 ScratchpadProblemPane
- 直接复用 `problem_detail` 现有的内容区渲染逻辑：langTabs + `ProblemContent` + `Article`
- 包裹在只读容器（CSS `pointer-events: none` on CTA 按钮）

### 5.3 ScratchpadEditorPane
- 垂直 flex：toolbar (fixed 48px) + editor (flex 1) + bottom panels (collapsible)
- 持有 Monaco editor 实例引用

### 5.4 ScratchpadToolbar
- 按钮：Run Pretest (F9)、Submit (F10)、Exit (Alt+Q)、语言下拉、Toggle Pretest (Alt+P)、Toggle Records (Alt+R)
- 语言下拉复用 `ProblemLanguageSelect` 组件
- 提交流程：调用 `POST <postSubmitUrl>` body `{ lang, code }`，返回 `{ rid, url }` 后 `window.location.href = url`

### 5.5 PretestPanel
- 订阅 `usePretestSession` 的 WebSocket 状态
- 流式渲染 `<pre>` 内容
- "复制输出"、"清空"按钮

### 5.6 RecordsPanel
- 初始化时 `GET <getSubmissionsUrl>`，取最近 5 条
- 每条展示：状态徽章、语言、提交时间、链接到 `/record/<rid>`
- 空态：提示"暂无提交记录"

## 6. 状态管理

### 6.1 ScratchpadState
```typescript
interface ScratchpadState {
  code: string;
  lang: string;
  pretest: {
    running: boolean;
    input: string;
    output: string[];
    error?: string;
  };
  submitting: boolean;
  records: Array<{ _id: string; status: number; lang: string; time: number }>;
  showPretestPanel: boolean;
  showRecordsPanel: boolean;
  wsStatus: 'idle' | 'connecting' | 'open' | 'closed' | 'error';
}
```

### 6.2 Reducer Actions
| Action | 用途 |
|---|---|
| `SET_CODE` | Monaco onChange |
| `SET_LANG` | 语言切换 |
| `START_PRETEST` | 标记 running，记录 rid |
| `PUSH_PRETEST_LINE` | WebSocket 推一行 |
| `END_PRETEST` | 标记 running=false |
| `PRETEST_ERROR` | 编译/系统错误 |
| `SUBMIT_START` / `SUBMIT_END` | 提交中状态 |
| `TOGGLE_PANEL` | 切换 Pretest/Records 面板 |
| `LOAD_RECORDS` | 拉取记录完成 |
| `WS_STATUS` | WebSocket 状态变化 |

### 6.3 Hooks
- `useScratchpadState(initialLang, initialCode)` → `{ state, dispatch }`
- `useScratchpad()` → Context 消费者
- `usePretestSession(pretestConnUrl, dispatch)` → WebSocket 生命周期
- `useScratchpadPersistence(problemKey, code)` → IndexedDB debounced 写入（800ms）

## 7. 数据流与 API

### 7.1 URL
- 进入：`/p/<pid>?mode=scratchpad[&tid=<tid>]`
- 退出：移除 `mode=scratchpad`，URL 变化触发 `ScratchpadPanel` 卸载
- 浏览器后退 = 退出

### 7.2 后端契约（沿用）
- 预测试：`POST <postSubmitUrl>` body `{ lang, code, input:[input], pretest:true }` → `{ rid }`
- 预测试输出：WebSocket `/record-conn?pretest=1&uidOrName=<uid>&pid=<pid>[&tid=<tid>]`，消息 `{type, payload}` 流式推送
- 提交：`POST <postSubmitUrl>` body `{ lang, code }` → `{ rid, url }`，前端跳转 `url`
- 记录：`GET <getSubmissionsUrl>` → 最近 5 条 `{ _id, status, lang, time }`

`UiContext` 已由 `problem_detail.tsx` 在 `setUiContext` 中注入（参见既有实现 234-264 行），所有 URL 直接读 `UiContext`。

### 7.3 持久化
- IndexedDB store `solutions`，key = `${uid}/${domainId}/${pid}#scratchpad`
- 800ms debounce 写入
- 进入页面：优先加载草稿；草稿为空 → 使用 `UserContext.codeTemplate`

## 8. 错误处理

| 场景 | 行为 |
|---|---|
| WebSocket 断开 | 3 秒后自动重连；连续 3 次失败 → 显示重试按钮 |
| Run Pretest 401/403 | 按钮禁用 + 侧边提示"需要登录" |
| Submit 失败 | Toast `err.message`，不清空代码 |
| 退出时 `state.code !== savedCode` | `confirm("未提交代码将被丢弃")` |
| Monaco 加载失败 | 回退到 textarea（沿用 `MonacoEditor.tsx` 已有路径） |
| 语言不支持 | 按钮 disabled + tooltip |

## 9. 国际化

- 复用现有 i18n 键：`Scratchpad.OpenButton` / `CloseButton` / `Title` / `RegionLabel`
- 新增键（zh + en）：
  - `Scratchpad.RunPretest` / `SubmitSolution` / `Exit` / `Pretest` / `Records`
  - `Scratchpad.PretestInput` / `PretestOutput` / `NoRecords` / `CopyOutput` / `ClearOutput`
  - `Scratchpad.UnsavedConfirm` / `ReconnectFailed`

## 10. 测试策略

### 10.1 单元测试（Vitest + happy-dom）
| 文件 | 覆盖 |
|---|---|
| `useScratchpadState.test.tsx` | 全部 reducer action 与初始状态 |
| `usePretestSession.test.tsx` | WebSocket 生命周期、重连、消息分发 |
| `ScratchpadToolbar.test.tsx` | F9/F10/Alt+Q/Alt+P/Alt+R 快捷键、disabled 状态 |
| `PretestPanel.test.tsx` | 流式追加、error 展示、空态 |
| `RecordsPanel.test.tsx` | 加载/空态/点击跳转 |
| `ScratchpadPanel.test.tsx` | mode=scratchpad 挂载、否则不挂载、onExit 触发 |

### 10.2 集成测试
- `problem_detail.test.tsx` 增加用例：
  - 侧边栏点击"进入在线编程模式" → URL 出现 `?mode=scratchpad`
  - 模拟 `postSubmit` 返回 `{ rid:'r1' }` → 验证 SUBMIT_START → SUBMIT_END
  - 模拟 WebSocket 消息 → PretestPanel.output 更新

### 10.3 不测试
- Monaco 内部语法高亮
- 后端 `RecordMainConnectionHandler` 行为
- IndexedDB 内部实现

## 11. 风险与权衡

| 风险 | 缓解 |
|---|---|
| Monaco 包体积大（~5MB） | 动态 import：`const monaco = await import('monaco-editor')` |
| WebSocket 重连风暴 | 指数退避（3s, 6s, 12s），3 次后停止 |
| Monaco 与 ui-default 主题不一致 | 短期接受差异，长期通过 `defineTheme` 对齐 |
| 不重写 Redux 导致 ui-default 的 `ctx.scratchpad` 服务缺失 | ui-next 通过 Context + Service 接口替代，不暴露全局 `window.store` |

## 12. 文件清单（预计新增 / 修改）

### 新增
- `packages/ui-next/src/components/scratchpad/ScratchpadPanel.tsx`
- `packages/ui-next/src/components/scratchpad/ScratchpadProblemPane.tsx`
- `packages/ui-next/src/components/scratchpad/ScratchpadEditorPane.tsx`
- `packages/ui-next/src/components/scratchpad/ScratchpadToolbar.tsx`
- `packages/ui-next/src/components/scratchpad/PretestPanel.tsx`
- `packages/ui-next/src/components/scratchpad/RecordsPanel.tsx`
- `packages/ui-next/src/components/scratchpad/useScratchpadState.ts`
- `packages/ui-next/src/components/scratchpad/usePretestSession.ts`
- `packages/ui-next/src/components/scratchpad/useScratchpadPersistence.ts`
- `packages/ui-next/src/components/scratchpad/Scratchpad.module.css`
- `packages/ui-next/src/components/scratchpad/*.test.tsx`

### 修改
- `packages/ui-next/src/pages/problem_detail.tsx`：检测 `?mode=scratchpad`、挂载 `<ScratchpadPanel>`
- `packages/ui-next/src/components/sidebar/ProblemSidebar.tsx`：菜单新增"进入在线编程模式"
- `packages/ui-next/src/components/problem/Scratchpad.tsx`：删除或标记 deprecated
- `packages/ui-next/src/components/problem/MonacoEditor.tsx`：添加真实 Monaco 实现分支（默认仍为 textarea 回退，由调用方通过 prop 切换）
- `packages/ui-next/src/lib/i18n.ts`：新增 §9 国际化键
- `packages/ui-next/package.json`：添加 `monaco-editor` 依赖