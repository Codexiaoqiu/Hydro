# `@hydrooj/ui-next`

ui-next 是 Hydro 的新一代前端渲染器（Vite + React 19 SPA），与 ui-default（Nunjucks/Webpack/jQuery）通过 **renderer fallback 链**共存，逐步替代。

> 迁移状态、阶段路线、未迁移页面：见仓库根目录的 `.claude/build.md` 与 `.claude/q.md`。

---

## 1. 双 renderer 共存架构

```
请求 → framework/framework/server.ts:209
  → 收集所有 `r.accept.includes(templateName) || r.asFallback` 的 renderer
  → 按 priority DESC 排序取第一个
```

| Renderer | Priority | 何时生效 |
| --- | --- | --- |
| `next` (ui-next) | **100** | 默认；除非 addon 注册了更高优先级 renderer 或 ui-next 自身被关闭 |
| `ui-default` | 1 | fallback；由 `/admin/ui?next=off` 与 `?__disableNext=1` 触发 |

### 1.1 降级开关（三层）

1. **Admin 全局**：`GET/POST /admin/ui?next=on|off` 写入 `SettingModel`，影响 `UiContext.uiNext`
2. **单页 query**：`?__disableNext=1` 写入 `sessionStorage('hydro.disableNext')`，粘性
3. **运行时 hook**：`useDisableNext()` 在每个 ui-next 页面读取上述两者并暴露 `disabled / reason / enable / disable`

详细位置：`src/hooks/use-disable-next.ts`、`src/pages/admin_ui.tsx`。

### 1.2 数据注入

`index.ts` 在 `<script id="__HYDRO_INJECTION__">` 内注入（DEV/PROD 共用 `serializeInjection()`）：

```ts
{
  HYDRO_INJECTED: true,
  name,                  // _matchedRouteName
  template,              // page slot 查找
  args: { UserContext, UiContext, ...handler.response.body },
  url, route_map, endpoint, locale,
  plugins_url,           // 仅 PROD 有
}
```

客户端解析见 `src/globals.ts`、`src/context/page-data.tsx`。

---

## 2. 页面注册模型

三层注册，**三处名字必须完全一致**（`buildUrl` 依赖 `routeMap` 查路由名）：

```
server 端                  ui-next 端                     客户端运行时
─────────────────────────────────────────────────────────────────
ctx.Route(                registerPage(                  <PageData> →
  'problem_create',        'problem_create',             page:problem_create
  '/p/create',             () => import('./problem_create'),
  ProblemCreateHandler,    { layout: 'default' })
```

### 2.1 添加一个新页面（最小步骤）

1. `src/pages/<name>.tsx` 写页面组件
2. `src/pages/index.ts` `registerPage('<route>', () => import('./<name>'), { layout })`
3. `src/lib/i18n.ts` 补 zh_CN + en 双语（按字母序）
4. 可复用部分在 `src/components/<area>/` 抽组件（> 200 行）
5. `src/pages/<name>.test.tsx` ≥ 4 用例（空 / 正常 / 缺失 / 权限）
6. （可选）`e2e/visual.spec.ts` 加 Playwright 快照

### 2.2 组件布局（layout）

注册时通过 `{ layout }` 字段选择：

| layout | 适用页面 |
| --- | --- |
| `'default'` (默认) | 普通页面（带 TopNav + 主题切换） |
| `'auth'` | 登录 / 注册 / 密码找回 / sudo |

详见 `src/components/layout.tsx` 与注册约定。

### 2.3 禁止的操作

- ❌ `import 'vj/...'` 或 `from 'ui-default/...'`（跨包耦合）
- ❌ 修改 ui-default 模板"配合"ui-next（双向维护债务）
- ❌ `<a href="/hardcoded">`（路由变更时失效）
- ❌ 新页面无测试就提交

---

## 3. 主题系统

- 设计 token 集中在 `src/styles/tokens.css`（dark-first + Geist 风）
- 运行时主题：`localStorage('hydro.theme')` 三态（dark / light / system）
- SSR-safe 初始化脚本：`src/theme/theme-init.ts::THEME_INIT_SCRIPT`，注入到 `<head>` 内 `<script>`，早于 React 树渲染，避免 FOUC
- 组件级覆盖：每个组件独立 `*.module.css` 文件，从 token 中取值

```tsx
import { ThemeProvider } from '@/theme/ThemeProvider';
```

详见 `src/theme/ThemeProvider` 与 `e2e/visual.spec.ts`（双主题快照）。

---

## 4. 插件与 Slot 系统

`src/registry/` 提供三件套：

- **`slot.tsx`** — 声明式 slot（页面内的可替换区域，如 `homepage.hitokoto`）
- **`store.ts`** — 全局状态（HMR-safe，通过 `import.meta.hot?.data` 持久）
- **`plugin.ts`** — 插件联邦入口；支持 defineSlot + interceptor（`before` / `after` / `intercept` / `patch` / `replace` / `wrap`）

```ts
// 在 addon 的 ui/index.tsx 中
import { definePlugin } from '@hydrooj/ui-next/registry/plugin';

definePlugin({
  name: 'my-addon',
  slots: [
    { name: 'problem_detail.after', component: MyPanel },
  ],
});
```

### 4.1 DEV vs PROD 注入路径

- **DEV**：Vite 通过虚拟模块 `virtual:hydro-plugins` ESM 原生导入 addon，共享 react
- **PROD**：esbuild 把 addon 打成 IIFE，通过 `federationPlugin` 把 react/react-dom 重映射到 `window.__hydroExports.React`

---

## 5. Markdown 与判题流

- **Markdown 渲染**：`src/lib/markdown/plugins.tsx` 统一管线（react-markdown + remark-gfm + rehype-katex + rehype-highlight）
- **判题流**：`src/hooks/use-judge-stream.ts`（WebSocket）+ `src/hooks/use-record-stream.tsx`（SSE）
- 题目提交后的 iframe 通信：`record_detail.tsx` 通过 `window.parent.postMessage({ status: STATUS.STATUS_ACCEPTED })` 通知生成测试数据 modal

---

## 6. 测试

```bash
yarn workspace @hydrooj/ui-next test          # 单测（vitest + happy-dom + testing-library）
yarn workspace @hydrooj/ui-next test:watch    # 监视模式
yarn workspace @hydrooj/ui-next test:visual   # Playwright 视觉回归
yarn workspace @hydrooj/ui-next test:visual:update  # 重生成基准
```

约定：
- 文件命名：`*.test.{ts,tsx}`，与源码同目录
- 单元测试覆盖每个组件 / hook / lib 工具函数
- 页面级测试 ≥ 4 用例：空 args / 正常 / 缺失 / 权限
- 国际化文本断言须支持中英双语（zh_CN + en）
- 视觉回归在 `e2e/visual.spec.ts`，至少覆盖首页 + 题目详情

公共模式见 `src/test/setup.ts`（locale 锁定 + matchMedia stub + indexedDB shim）。

---

## 7. 常用命令

| 命令 | 用途 |
| --- | --- |
| `yarn workspace @hydrooj/ui-next dev` | Vite dev server（端口 8000，由顶层代理转发到 2333） |
| `yarn workspace @hydrooj/ui-next build` | 类型检查 + 生产产物（含 `public/`） |
| `yarn workspace @hydrooj/ui-next exec tsc --noEmit` | 仅类型检查 |
| `yarn workspace @hydrooj/ui-next exec eslint src/` | 仅 lint |

---

## 8. 关键文件索引

| 用途 | 路径 |
| --- | --- |
| Renderer 注册（DEV/PROD） | `index.ts` |
| 页面注册表 | `src/pages/index.ts` |
| 页面查找 + 渲染 | `src/app.tsx` |
| PageData 上下文 + UiContext | `src/context/page-data.tsx` |
| 路由表 + 跳转 | `src/context/router.tsx`、`src/globals.ts` |
| 主题初始化 | `src/theme/theme-init.ts`、`src/theme/ThemeProvider.tsx` |
| 降级开关 | `src/hooks/use-disable-next.ts` |
| i18n 字典 | `src/lib/i18n.ts` |
| 设计 token | `src/styles/tokens.css` |
| Slot / 插件 / HMR store | `src/registry/{slot,store,plugin}.{tsx,ts}` |
| Hooks | `src/hooks/use-*.{ts,tsx}` |
| 视觉回归 | `e2e/visual.spec.ts` |

---

## 9. 相关文档

- 顶层迁移计划：`.claude/build.md`
- 审计报告与风险：`.claude/q.md`
- 未迁移清单：`.claude/todo.md`
- 每个页面的迁移步骤：`.claude/rebuild.md`
- 已沉淀的设计 spec：`docs/superpowers/specs/2026-07-*.md`

新贡献前请先阅读 `.claude/build.md` §2（ui-default backendlib 冻结条款）。
