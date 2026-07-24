# ui-default → ui-next 迁移构建（Build）计划

> 范围声明：本文件描述 ui-default（Nunjucks/Webpack/jQuery）前端栈向 ui-next（Vite + React 19 + slot 系统）迁移的**构建计划与执行约定**。迁移期间严格遵守"**不修改 `packages/ui-default/` 下任何后端代码**"的约束,详情见 §2。

配套文档:
- 操作手册 / 踩坑记录: `.claude/rebuild.md`（每页迁移的具体步骤）
- 审计报告: `.claude/q.md`（当前迁移进度与风险）
- 未迁移清单: `.claude/todo.md`（按模块分组,38 项）

---

## 1. 目标与非目标

### 1.1 目标

| # | 目标 | 完成判据 |
| --- | --- | --- |
| G1 | 所有用户面向路由可在 ui-next 渲染 | `routeMap` 中每个路由名在 `src/pages/index.ts` 有 `registerPage` |
| G2 | 全站默认走 ui-next,不再依赖 webpack 产物 | `priority 100 (next)` 永远胜过 `priority 1 (ui-default)` 的 fallback 链成立 |
| G3 | 任意路由可一键回退到 ui-default | `?__disableNext=1` 与 `/admin/ui?next=off` 都能工作 |
| G4 | 主题、插件、判题流、Markdown 等核心能力在 ui-next 全可用 | 对应 hooks/components 存在且有测试 |
| G5 | 视觉回归与单元测试覆盖所有已迁移页面 | 每个新页面至少 4 个用例 + 视觉 spec |
| G6 | ui-default 后端代码**完全冻结**,只读引用 | `packages/ui-default/backendlib/**` 与 `templates/**` 不再被改动（详见 §2） |

### 1.2 非目标（明确不做）

- ❌ **不修改** `packages/ui-default/backendlib/**`（`template.ts`、`misc.ts` 等服务端逻辑）
- ❌ **不修改** `packages/ui-default/index.ts`、`hydro.ts`、`api.ts`（CLI/服务端入口）
- ❌ **不重写** 服务端 handler（`packages/hydrooj/src/handler/**`），迁移只动前端
- ❌ **不迁移** 判题子系统、worker、MongoDB 层
- ❌ **不删除** ui-default 包（即使所有页面已迁完,webpack 产物保留直至 §7 阶段 D）
- ❌ **不引入** 与 ui-default 同名的新组件（避免歧义,见 §5 R3）

---

## 2. 硬约束: ui-default 后端代码冻结

### 2.1 "ui-default 后端代码" 的定义

| 类别 | 路径 | 冻结策略 |
| --- | --- | --- |
| **后端 TS 逻辑** | `packages/ui-default/backendlib/**` | ❌ 禁止改动。Renderer 注册、模板编译、locales 加载等均在此 |
| **入口 / 服务端入口** | `packages/ui-default/index.ts`, `hydro.ts`, `api.ts`, `sentry.ts`, `service-worker.ts` | ❌ 禁止改动 |
| **CLI 配置** | `packages/ui-default/setting.yaml` | ❌ 禁止改动 |
| **包元数据** | `packages/ui-default/package.json` | ⚠️ 只允许新增 `files` 字段/脚本,不允许修改 `dependencies` |
| **前端产物** | `packages/ui-default/pages/**`, `components/**`, `templates/**`, `theme/**`, `locales/**`, `public/**`, `static/**` | ⚠️ **允许只读引用**,不允许改动。需要新增 UI 时只在 `packages/ui-next/src/` 下写 |
| **webpack 构建** | `packages/ui-default/build/**` | ⚠️ 允许改 `build/main.ts` 内的构建开关(关闭产物生成),不允许改 webpack loader/plugin 行为 |

### 2.2 为什么要冻结

- ui-default 与 ui-next 共用同一份 `SettingModel`、`UserContext`、CSRF、locale、routeMap 等基础设施。
- 任何在 ui-default backendlib 引入的字段,会污染 ui-next 的注入数据契约(反向亦然)。
- 一旦后端代码两边都要维护,迁移成本会随时间指数级上升。

### 2.3 边界判定流程（PR 评审时使用）

> "我要做的改动是否在 ui-default 的 backendlib/ 中？"
>
> - **是** → 走 PR review,需有 §2.4 例外条款的明确理由
> - **否,但涉及 ui-default 其他路径** → 默认允许,需在 PR 描述中标注
> - **完全在 ui-next 内** → 直接合并

### 2.4 例外条款（必须留痕）

只有以下场景可以改动 ui-default backendlib:

1. **修复 ui-default 自身的生产事故**(与 ui-next 无关)
2. **为支持 ui-next 而扩展注入字段**(此时改动应该双向:ui-next 也读取新字段)
3. **删除 / 归档已迁完的页面模板**(阶段 D 才允许)

例外改动必须:
- 在 PR 标题加 `[ui-default-only]` 前缀
- 在 commit body 引用本节条款编号
- 由 reviewer 显式 ack

---

## 3. 架构总览（迁移期间如何共存）

### 3.1 双 renderer 优先级

```
请求 → framework/framework/server.ts:209
  → 收集所有 r.accept.includes(templateName) || r.asFallback 的 renderer
  → 按 priority DESC 排序取第一个
```

| Renderer | 优先级 | 何时生效 |
| --- | --- | --- |
| `next` (ui-next) | **100** | 默认;请求没有更高优先级 renderer 接管的 `accept` |
| `ui-default` | 1 | fallback;或 ui-next 主动通过 `useDisableNext` 让位 |

→ **ui-next 永远赢**,除非某条路由被 addons 注册了更高优先级的 renderer 或 ui-next 自身被关闭。

### 3.2 数据注入契约

`packages/ui-next/index.ts:217-237` (DEV) 与 `:251-273` (PROD) 在 `<script id="__HYDRO_INJECTION__">` 中注入:

```ts
{
  HYDRO_INJECTED: true,
  name,                  // _matchedRouteName
  template,              // 用于 page slot 查找
  args: {
    UserContext, UiContext, ...handler.response.body
  },
  url, route_map, endpoint, locale,
  plugins_url            // PROD 才有
}
```

客户端通过 `src/globals.ts` 解析该 JSON,作为 `PageData` 喂给 React 树。

> ⚠️ **DRY 提醒**:DEV/PROD 两处序列化代码几乎完全相同(§5 R1)。**重构这个函数是阶段 A 的首项任务**。重构后,新增注入字段只改一处。

### 3.3 三层降级开关

1. **Admin 全局**:`/admin/ui?next=on|off` → 写 `SettingModel` → `UiContext.uiNext`
2. **单页 query**:`?__disableNext=1` → 写 `sessionStorage('hydro.disableNext')`,粘性
3. **运行时 hook**:`useDisableNext()` 在每个 ui-next 页面顶部读取上述两者并消费

---

## 4. 页面注册模型（如何在 ui-next 端加新页）

### 4.1 三层注册

```
server 端                  ui-next 端                      客户端运行时
─────────────────────────────────────────────────────────────────────
ctx.Route(                registerPage(                   <PageData> →
  'problem_create',         'problem_create',              page:problem_create
  '/p/create',              () => import('./problem_create'),
  ProblemCreateHandler,     { layout: 'default' }           →
  PERM.PERM_CREATE_PROBLEM)
```

**三处名字必须完全一致**(`buildUrl` 依赖该字符串查 `routeMap`)。

### 4.2 添加一个新页面的最小步骤

参考 `.claude/rebuild.md` §2 的清单,以下是**必须项**:

1. 在 `src/pages/<name>.tsx` 写页面组件
2. 在 `src/pages/index.ts` 中 `registerPage('<route>', () => import('./<name>'))`
3. 在 `src/lib/i18n.ts` 补 zh_CN + en 双语,按字母序插入
4. 在 `src/components/<area>/` 下抽可复用组件(超过 200 行就抽)
5. 写 `src/pages/<name>.test.tsx`,至少 4 用例(空 / 正常 / 缺失 / 权限)
6. (可选) 在 `e2e/visual.spec.ts` 加该页面的视觉快照

### 4.3 禁止操作

| 反模式 | 后果 | 替代方案 |
| --- | --- | --- |
| 在 ui-next 内 `import 'vj/...'` 或 `from 'ui-default/...'` | 跨包耦合,违反 §2 | 复制必要常量到 ui-next 自己的 `lib/` |
| 在 ui-next 内 import ui-default 的 `template.html` | 把 ui-default 模板当组件用 | 在 ui-next 重写组件 |
| 修改 ui-default `pages/<name>.page.tsx` 来"配合"ui-next | 双向维护,违反 §2 | ui-next 完全自治 |
| 新页面不写测试就提交 | 不可发现回归 | 强制 4 用例起步 |
| `<a href="/hardcoded">` | 路由变更时失效 | `buildUrl('route', {params})` |

---

## 5. 当前状态快照（2026-07-24）

来源:`.claude/q.md` + `ls packages/ui-next/src/pages/` + `ls packages/ui-default/pages/` + `grep -c test`。

| 维度 | 状态 |
| --- | --- |
| ui-next 已注册页面 | **33** |
| ui-default 页面文件 | **44**(含已迁移的同名 wrapper) |
| 待迁移页面 | **~25**(详见 `.claude/todo.md`,38 个里部分已由 todo 维护者标注为合并状态) |
| 单元/组件测试 | **125 个** |
| 页面级测试 | **19 / 33** = 58%(早期估计 41% 含未注册文件;以实际 registerPage 为准) |
| Playwright 视觉回归 | **2 路由**(`homepage`, `problem_main`)× 2 主题 |
| 已迁移高流量页面 | 首页 / 题目 / 比赛详情 / 提交 / 全部 auth 流程 |
| 未迁移高流量页面 | home_messages / home_security / home_settings / home_preference / 讨论区 |

### 5.1 已沉淀的设计 spec

- `docs/superpowers/specs/2026-07-18-ui-next-markdown-live-preview-design.md`
- `docs/superpowers/specs/2026-07-18-problem-edit-completion-design.md`
- `packages/ui-next/src/styles/tokens.css` — 设计 token 全集
- `packages/ui-next/src/lib/markdown/plugins.tsx` — 统一 Markdown 渲染管线
- `packages/ui-next/src/components/problem/ProblemForm.tsx` — problem_create / problem_edit 共享表单

---

## 6. 阶段路线图

### 阶段 A:补基础(1–2 周)

> 目标:把审计报告(q.md)里的 HIGH/MEDIUM 风险先解决,再开始扩页面。

| 任务 | 来自 §q.md 风险编号 | 完成判据 |
| --- | --- | --- |
| 抽出 `buildInjectedHtml()` 公共函数 | R1 | DEV/PROD 两处共用同一函数,新增注入字段只改一处 |
| 给 `admin_ui.tsx`、`record_detail.tsx`、`record_main.tsx` 补单元测试 | R2 | 各 4+ 用例,跑 `yarn workspace @hydrooj/ui-next test` 全绿 |
| 给 auth 流程所有页面(user_login / user_register / user_lostpass)补测试 | R2 | 同上 |
| 修复 `useDisableNext.enable()` 的 reload loop 边界 | R7 | 加单元测试覆盖 `enable()` 在三种 reason 下的行为 |
| 写顶层 README(`packages/ui-next/README.md`) | R6 | 涵盖 §3 架构 + §4 注册模型 + 主题 + 插件 + 测试 |
| 修复 `PENDING_HTML` 无限重载 | R8 | 加一次性 query param 防重入 |

### 阶段 B:扩页面(按用户流量,2–4 周)

> 目标:把高频 / 中频页面迁完,使 80% 用户行为路径走 ui-next。

优先级顺序:

1. **个人中心**(影响留存)
   - `home_messages` / `home_security` / `home_settings` / `home_preference` / `home_domain`
2. **讨论区**(社区核心)
   - `discussion_main` / `discussion_detail` / `discussion_node_bg`(`discussion_section` 已存在,只缺页面入口)
3. **题目侧栏 / 统计**
   - `problem_sidebar` / `problem_statistics`
4. **域管理 + 文件 + 训练 + 作业**(B 类)
   - `files` / `domain_*` / `training_*` / `homework_*`

每个页面按 §4.2 的 6 步清单完成。**每个 Task 独立 commit**(便于回滚)。

### 阶段 C:质量加固

| 任务 | 来自 §q.md 风险编号 |
| --- | --- |
| 扩展 Playwright 视觉回归到所有已迁移页面(目标 ≥ 20 路由) | 测试 |
| 修复插件联邦 DEV/PROD 不一致 | R4 |
| 归档 ui-default 已迁页面(物理删除 .page.tsx/.page.styl/.page.js/.page.jsx) | R3 |
| 在 `packages/ui-next/package.json` 加 lint 规则禁止与 ui-default 同名文件 | R3 |

### 阶段 D:收尾

| 任务 | 说明 |
| --- | --- |
| 把 `registerRenderer('ui-default', { asFallback: true, ... })` 改为 `accept: [...]` 显式列表 | 收口 ui-default 的 fallback 行为 |
| 关闭 `packages/ui-default/build/main.ts` 的 webpack 产物生成 | 节省构建时间 |
| (可选)完全删除 `packages/ui-default/` | 仅当 ui-default 没有任何被 addons 引用的资源 |

---

## 7. 完成定义 (Definition of Done)

### 7.1 单页面级 DoD

一个页面算"完成迁移"必须全部满足:

- [ ] `packages/ui-next/src/pages/<name>.tsx` 存在且 lazy-load 成功
- [ ] `src/pages/index.ts` 已 `registerPage`
- [ ] 服务端 handler 注入了所有必要字段(`grep this.response.body` 覆盖每个被前端访问的字段)
- [ ] `src/lib/i18n.ts` 补齐 zh_CN + en
- [ ] 至少 4 个单元测试用例(空 / 正常 / 缺失 / 权限)
- [ ] (高流量页) Playwright 视觉快照已加入 `e2e/visual.spec.ts`
- [ ] `yarn workspace @hydrooj/ui-next test` 全绿
- [ ] `yarn lint` 无新告警
- [ ] 在浏览器手测过 happy path + 一条 sad path
- [ ] 通过 §2 边界判定(未触碰 ui-default backendlib)

### 7.2 整体迁移 DoD

整个迁移算"完成"必须满足:

- [ ] `.claude/todo.md` 38 项清零
- [ ] `routeMap` 中所有路由在 ui-next 有对应注册
- [ ] `priority 100 (next)` 在所有路由都生效
- [ ] Playwright 视觉回归覆盖 ≥ 80% 路由
- [ ] admin_ui 可关闭 ui-next 后,所有路由仍可用(来自 ui-default)
- [ ] `packages/ui-default/backendlib/` 在过去 30 天内无 commit

---

## 8. 验证策略

### 8.1 PR 提交前

```bash
# 1. 类型检查
yarn workspace @hydrooj/ui-next exec tsc --noEmit

# 2. 单元/组件测试
yarn workspace @hydrooj/ui-next test

# 3. Lint
yarn workspace @hydrooj/ui-next exec eslint src/

# 4. (高流量页)视觉回归
yarn workspace @hydrooj/ui-next build
yarn workspace @hydrooj/ui-next test:visual
```

### 8.2 CI 强制项

- `yarn lint:ci`(无 warning 通过)
- `yarn workspace @hydrooj/ui-next test`
- `yarn test`(主仓库 e2e)
- `yarn workspace @hydrooj/ui-next build`(产物可生成)

### 8.3 冒烟测试

PR 合并后人工:

1. 打开 `https://hydro.ac/` → 应看到新 UI(深色,Geist 风格)
2. 访问 `/p/100` → 题目详情页 ui-next
3. 访问 `/admin/ui?next=off` → 切到 ui-default,确认所有路由仍可用
4. 访问任意 ui-next 路由 + `?__disableNext=1` → 应回退到 ui-default

### 8.4 回归告警

迁移期间监控:
- 客户端 JS 报错率(`window.onerror` 计数)
- WebSocket 判题流断连率
- `routeMap` 解析失败(`page:<x>` slot 找不到)
- 视觉回归 diff > 2% 像素

---

## 9. 关键文件索引

| 用途 | 文件 |
| --- | --- |
| ui-next Renderer 注册 | `packages/ui-next/index.ts:176-286` |
| ui-default Renderer 注册 | `packages/ui-default/backendlib/template.ts:247-254` ⚠️ **只读** |
| 页面注册表 | `packages/ui-next/src/pages/index.ts` |
| 页面查找 / 渲染 | `packages/ui-next/src/app.tsx` |
| 数据注入上下文 | `packages/ui-next/src/context/page-data.tsx` |
| 路由表 store | `packages/ui-next/src/globals.ts` |
| 主题初始化 | `packages/ui-next/src/theme/theme-init.ts` + `theme/ThemeProvider` |
| 降级开关 hook | `packages/ui-next/src/hooks/use-disable-next.ts` |
| Admin 开关 UI | `packages/ui-next/src/pages/admin_ui.tsx` |
| Slot 注册系统 | `packages/ui-next/src/registry/slot.tsx` + `store.ts` + `plugin.ts` |
| 框架 renderer 选择 | `framework/framework/server.ts:209-211` |
| 设计 token | `packages/ui-next/src/styles/tokens.css` |
| 共享 Markdown 渲染 | `packages/ui-next/src/lib/markdown/plugins.tsx` |
| i18n 字典 | `packages/ui-next/src/lib/i18n.ts` |
| 视觉回归 spec | `packages/ui-next/e2e/visual.spec.ts` |

---

## 10. 相关索引

- 操作手册(每页迁移步骤): `.claude/rebuild.md`
- 审计报告(进度与风险): `.claude/q.md`
- 未迁移清单(38 项): `.claude/todo.md`
- 已沉淀的设计 spec: `docs/superpowers/specs/2026-07-*.md`
- 服务契约入口: `packages/hydrooj/src/handler/`
- 设计规范: `packages/hydrooj/setting.yaml`
- 顶层 CLAUDE.md: `CLAUDE.md`(项目说明)

---

## 11. 变更日志

| 日期 | 事件 |
| --- | --- |
| 2026-07-24 | 初版。基于审计报告 `.claude/q.md` 与操作手册 `.claude/rebuild.md` 整合。明确"ui-default backendlib 冻结"为硬约束,定义 DoD 与阶段路线。 |