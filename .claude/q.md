
---
1. 总体结论

迁移进度：约 60–65 %（按页面计数）/ 30 %（按用户流量权重估计）

ui-next 已经具备完整的"基础设施层 + 主题系统 + 插件插槽 + 渲染器优先级",并覆盖了用户最常访问的几个高流量页面（首页、题目列表/详情/提交/编辑、比赛详情/管理/气球/打印、登录注册流程）。但是管理后台、讨论区、域管理、作业、训练、家庭设置、个人主页周边等大量页面尚未迁移,且 ui-next 与 ui-default 通过 renderer fallback 机制同时存在,形成"部分页面新 UI + 部分页面旧 UI"的过渡期。

┌────────────────────────┬────────────────────────────────────────────────────────────────────────────────┐
│          维度          │                                      评估                                      │
├────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤
│ 架构整合               │ ✅ 完整且健壮（renderer 优先级 + 单页/全局 kill-switch + admin 开关）          │
├────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤
│ 主题系统               │ ✅ dark-first,SSR-safe,localStorage('hydro.theme')                             │
├────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤
│ 插件系统               │ ✅ defineSlot + interceptor（before/after/intercept/patch/replace/wrap）+ 联邦 │
├────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤
│ 核心高流量页面         │ ✅ 首页、题目、比赛详情、提交                                                  │
├────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤
│ 管理/域/讨论/作业/训练 │ ❌ 未迁移（仍走 ui-default）                                                   │
├────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤
│ 测试覆盖               │ ⚠️ 单元 125 个 / 46 个页面只有 19 个测试,视觉回归只覆盖 2 路由                 │
├────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤
│ 文档                   │ ⚠️ 缺顶层 README 说明架构,只有 e2e/README.md                                   │
└────────────────────────┴────────────────────────────────────────────────────────────────────────────────┘

---
2. 渲染层共存机制（核心架构）

// packages/ui-default/backendlib/template.ts:247
ctx.server.registerRenderer('ui-default', { asFallback: true, priority: 1, ... });

// packages/ui-next/index.ts:210 / 245
ctx.server.registerRenderer('next',       { asFallback: true, priority: 100, ... });

框架选择逻辑（framework/framework/server.ts:209-211）:

const renderers = Object.values(this.renderers)
    .filter((r) => r.accept.includes(templateName) || r.asFallback);
const topPrio = renderers.sort((a, b) => b.priority - a.priority)[0];

→ ui-next（priority 100）总是赢，除非请求的模板名命中某个 renderer 的 accept 列表。

2.2 三层降级开关

- 当前路由名（_matchedRouteName）
- 模板名（用于路由到对应 page slot）
- UserContext / UiContext
- routeMap / endpoint / locale / plugins_url

▎ ⚠️ 小风险：注入逻辑在 index.ts:217-237（DEV）和 :251-273（生产）几乎完全重复（约 20 行 JSON.stringify + 同样字段）。建议提取共用函数,避免字段漂移。

---
3. 页面覆盖度对照表

3.1 ui-next 已注册页面（33 个，来自 src/pages/index.ts）

┌──────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┬────────────────────────┐
│ 路由类别 │                                                                                 已迁移                                                                                 │          备注          │
├──────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────┤
│ 首页     │ homepage                                                                                                                                                               │ ✅ 含 13 个 section    │
│          │                                                                                                                                                                        │ slot                   │
├──────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────┤
│ 题目     │ problem_main, problem_detail, problem_submit, problem_files, problem_config, problem_create, problem_edit, problem_import, problem_hack                                │ ✅ 完整                │
├──────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────┤
│ 比赛     │ contest_detail, contest_main, contest_problemlist, contest_scoreboard, contest_manage, contest_user, contest_create, contest_edit, contest_balloon,                    │ ✅ 最完整,11 个        │
│          │ contest_clarification, contest_print                                                                                                                                   │                        │
├──────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────┤
│ 记录     │ record_detail, record_main                                                                                                                                             │ ✅                     │
├──────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────┤
│ 用户认证 │ user_login, user_register, user_register_with_code, user_lostpass, user_lostpass_with_code, user_logout, user_sudo                                                     │ ✅ 全部                │
├──────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────┤
│ Admin    │ admin_ui                                                                                                                                                               │ ✅ 仅 UI 切换页        │
└──────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┴────────────────────────┘

3.2 ui-default 仍有、ui-next 尚未迁移的页面（约 25 个）

按用户接触频度分组：

🔴 高频（建议优先迁移）
- home_messages.page.tsx — 站内消息中心
- home_security.page.tsx — 安全设置
- home_settings.page.ts — 系统设置
- home_preference.page.jsx — 偏好设置
- home_domain.page.tsx — 个人域选择

🟡 中频
- discussion_main.page.ts / discussion_node_bg — 讨论区主页/节点
- problem_sidebar.page.ts / problem_statistics.page.ts — 题目侧栏/统计
- files.page.tsx — 文件管理
- domain_dashboard.page.ts / domain_edit.page.tsx / domain_group.page.ts — 域管理
- domain_join_applications.page.ts / domain_join.page.styl — 域加入申请
- domain_role.page.js / domain_user.page.js — 域角色/用户管理
- training_detail.page.ts / training_edit.page.ts — 训练
- homework_main.page.js / homework_edit.page.ts / homework_detail.page.styl — 作业
- setting.page.tsx — 系统设置页
- user_verify.page.ts — 邮箱验证

🟢 低频（管理后台）
- manage_dashboard.page.js / manage_script.page.js
- manage_user_import.page.js / manage_user_priv.page.js
- error/（错误页特殊化版本,已被 error.tsx 取代但目录残留）

▎ ⚠️ contest_main.page.ts（比赛列表） vs contest_main.tsx（ui-next 同名）—— 同名不同物。ui-default 的比赛列表已迁移到 contest_problemlist.tsx（实际上 ui-default 的 contest_main 是"比赛详情 wrapper"）。建议归档 ui-default 旧文件以消除歧义。

---
4. 组件与基础库成熟度

4.1 已建立的子系统

src/
├── components/
│   ├── primitives/    (28 个原子件: Alert/Avatar/Button/Card/Checkbox/Chip/ConfirmDialog/
│   │                   Dropdown/Eyebrow/HexColorPicker/Input/LangTabs/Loading/MarkdownEditor/
│   │                   MarkdownPreview/Modal/ProblemSelectAutoComplete/Select/Switch/TagCloud/
│   │                   Toast/UserSelectAutoComplete/...)
│   ├── nav/            (TopNav/GlobalNav/BrandMark/NavLink/UserMenu/LangPill)
│   ├── layout.tsx      (DefaultLayout)
│   ├── contest/        (15 个比赛专用组件: BalloonTable/ClarificationList/ContestForm/
│   │                   ContestTimer/ContestUserTable/PrintKiosk/...)
│   ├── problem/        (20 个题目专用组件: CodeEditor/MonacoEditor/ProblemConfigEditor/
│   │                   ProblemHero/ProblemForm/SubtaskSettings/ObjectiveForm/...)
│   ├── ide/            (Monaco IDE 容器)
│   ├── article/        (Markdown 文章视图)
│   ├── files/          (文件浏览)
│   ├── charts/         (图表)
│   ├── sidebar/        (侧栏)
│   └── auth/           (AuthShell + SignInDialog)
├── sections/           (13 个首页 section slot 实现)
├── hooks/              (15 个自定义 hook)
├── lib/                (i18n/markdown/difficulty/perms/contest-timer/...)
├── theme/              (ThemeProvider + tokens.css)
└── registry/           (slot/store/plugin/interceptors)

总文件数：约 130+ .tsx/.ts 文件（不含测试）。

4.2 关键能力（已可用）

- ✅ i18n 多语言（lib/i18n.ts，前后端共享 locale 注入）
- ✅ WebSocket 判题流（hooks/use-judge-stream.ts）
- ✅ Markdown + 数学公式（react-markdown + rehype-katex + rehype-highlight）
- ✅ Monaco 编辑器（@monaco-editor/react）
- ✅ 主题切换（dark-first,Geist 风格）
- ✅ 路由拦截器（interceptor 模式: before/after/intercept/patch/replace/wrap）

---
5. 测试与质量保证

┌────────────────────┬─────────────────────────────────────┬─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│        类型        │                数量                 │                                                                      范围                                                                       │
├────────────────────┼─────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Vitest             │ 125                                 │ 组件、hooks、lib 工具函数                                                                                                                       │
│ 单元/组件测试      │ 个文件（src/**/*.test.{ts,tsx}）    │                                                                                                                                                 │
├────────────────────┼─────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 页面级测试         │ 19 / 46 = 41 %                      │ contest/balloon,clarification,create,detail,main,print,problemlist,user + problem/config,create,detail,edit,files,hack,import,main,submit +     │
│                    │                                     │ record_detail,homepage                                                                                                                          │
├────────────────────┼─────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Playwright         │ 2 路由 × 2 主题 = 4 个截图          │ 仅 homepage 和 problem_main                                                                                                                     │
│ 视觉回归           │                                     │                                                                                                                                                 │
├────────────────────┼─────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ E2E 文档           │ e2e/README.md ✅                    │ 完整说明                                                                                                                                        │
└────────────────────┴─────────────────────────────────────┴─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

5.1 测试覆盖缺口
- contest_scoreboard.tsx、contest_manage.tsx、contest_edit.tsx —— 比赛核心无单元测试
- problem_detail.tsx、problem_submit.tsx —— 最高流量仅部分覆盖（已有 test 文件但需检查覆盖度）
- record_detail.tsx、record_main.tsx —— 全部无测试
- admin_ui.tsx —— 无测试（关键开关,UI 错就全站错）

🟡 中优先级
- user_login.tsx、user_register*.tsx、user_lostpass*.tsx —— 鉴权流程无测试

5.2 视觉回归范围太窄

e2e/visual.spec.ts 只覆盖 homepage + problem_main,新增页面必须手动加 spec,否则上线没有视觉保护。

---
6. 风险与问题

🔴 HIGH

R1. 双 renderer 同时注册,字段重复
- 文件：packages/ui-next/index.ts:217-237 vs :251-273
- 20 行 JSON 序列化代码几乎完全相同,任何字段补全必须改两处,容易漂移。
- 建议：抽 buildInjectedHtml(html, context, extra) 公共函数。

R2. 测试覆盖率断层
- 27 / 46 页面（59%）无单元测试；视觉回归只覆盖 2 路由。
- 建议：迁移新页面时强制要求测试；为 admin_ui（控制中心）和高流量详情页优先补测试。

R3. 同名歧义
- contest_main.page.ts（ui-default,旧）与 contest_main.tsx（ui-next,新）名字相同但语义已不一致（ui-default 的 contest_main 是 wrapper,实际比赛列表已迁移）。
- 建议：迁移完成后批量归档 ui-default 已迁页面 + 在 package.json 加 lint 规则禁止同名。

🟡 MEDIUM

R4. 插件联邦在 DEV/PROD 行为不一致
- DEV 模式（index.ts:179-203）走 Vite ESM 原生导入 addon,共享同一份 react
- PROD 模式（index.ts:134-174）通过 esbuild 把插件打成 IIFE,通过 federationPlugin 把 react/react-dom 重映射到 window.__hydroExports.React
- 风险：addons 仓库如果用 useState 等 hook,且 DEV/PROD 走两条不同的 react 实例链路,可能导致 "Invalid hook call" 错误。
- 建议：DEV 路径同样走 federation 机制,或确保 Vite optimizeDeps 把 react 单例化（已配 optimizeDeps.include: ['react', 'react-dom'],但 addons 不一定走 optimizeDeps）。

R5. UI 默认值 race
- main.tsx 中 await loadPlugins() 在 createRoot().render() 之前,但 StrictMode 下 React 会二次挂载,如果插件慢可能导致初始空渲染。
- 当前是顶级 await,失败只 console.warn,用户看到空白页。
- 建议：插件加载失败时显示 toast 提示而非静默吞掉。

R6. 缺顶层 README
- packages/ui-next/ 没有 README.md 描述：
  - 迁移策略（renderer fallback + 开关）
  - 页面/组件/slot 注册约定
  - 主题系统用法
  - 插件 API
  - 测试策略
- 现有 e2e/README.md 仅讲 Playwright。

🟢 LOW

R7. useDisableNext 的 enable() 在禁用状态调用时,如果 globalFlag 已 set 但 queryFlag 未 set,enable 会做一次 window.location.href 重载,可能引发无限重载循环。
- 文件：use-disable-next.ts:55-64
- 建议：enable() 区分 query/global 来源,只做对应来源的清除。

R8. PENDING_HTML 中的 <meta http-equiv="refresh" content="3">
- 在生产构建产物未生成时返回此 HTML。用户等待 3 秒后自动刷新,但如果生产构建卡住,用户被无限重定向。
- 建议：返回更明确的错误页面 + 一次性 query param 防止无限重载。

R9. ui-default 仍在每个生产构建中被 webpack 打包
- 即使所有用户都迁到 ui-next,webpack 产物仍然存在(yarn build:ui:production 会产出 ui-default/public)。
- 建议：设置一个 build flag 让 ui-default 产物可选构建,等迁移完成后彻底删 webpack。

2. 给 admin_ui、record_detail、record_main、所有 auth 页加单元测试（R2）
3. 写顶层 README（R6）
4. 修复 useDisableNext.enable() 边界（R7）

阶段 B:扩页面（按用户流量,2–4 周）

按优先级迁移：
1. home_messages / home_security / home_settings / home_preference（个人中心,R5 影响留存）
2. discussion_main / discussion_node_bg / discussion_detail（社区核心）
3. problem_sidebar / problem_statistics（题目页完整性）
4. files / domain_ / training / homework*（域管理 + 学习）

阶段 C:质量加固

1. 扩展 Playwright 视觉回归到所有已迁移页面
2. 修复插件联邦 DEV/PROD 不一致（R4）
3. 归档 ui-default 已迁页面（R3）

阶段 D:收尾
├───────────────────────────┼────────────────────────────────────────────────────────────────┤
│ Renderer 注册（DEV/PROD） │ packages/ui-next/index.ts:176-286                              │
├───────────────────────────┼────────────────────────────────────────────────────────────────┤
│ UI-default renderer       │ packages/ui-default/backendlib/template.ts:247-254             │
├───────────────────────────┼────────────────────────────────────────────────────────────────┤
│ 页面注册表                │ packages/ui-next/src/pages/index.ts                            │
├───────────────────────────┼────────────────────────────────────────────────────────────────┤
│ 页面查找/渲染             │ packages/ui-next/src/app.tsx                                   │
├───────────────────────────┼────────────────────────────────────────────────────────────────┤
│ 数据注入上下文            │ packages/ui-next/src/context/page-data.tsx                     │
├───────────────────────────┼────────────────────────────────────────────────────────────────┤
│ 路由表 store              │ packages/ui-next/src/globals.ts                                │
├───────────────────────────┼────────────────────────────────────────────────────────────────┤
│ 主题初始化                │ packages/ui-next/src/theme/theme-init.ts + theme/ThemeProvider │
├───────────────────────────┼────────────────────────────────────────────────────────────────┤
│ 降级开关                  │ packages/ui-next/src/hooks/use-disable-next.ts                 │
├───────────────────────────┼────────────────────────────────────────────────────────────────┤
│ Admin 开关 UI             │ packages/ui-next/src/pages/admin_ui.tsx                        │
├───────────────────────────┼────────────────────────────────────────────────────────────────┤
│ Slot 注册                 │ packages/ui-next/src/registry/slot.tsx + store.ts + plugin.ts  │
├───────────────────────────┼────────────────────────────────────────────────────────────────┤
│ 框架 renderer 选择        │ framework/framework/server.ts:209-211                          │
└───────────────────────────┴────────────────────────────────────────────────────────────────┘

---
9. 验证建议

执行以下命令以验证迁移基线健康：

# 类型检查
yarn workspace @hydrooj/ui-next exec tsc --noEmit

# 单元测试
yarn workspace @hydrooj/ui-next test

# 视觉回归（需要先 build）
yarn workspace @hydrooj/ui-next build
yarn workspace @hydrooj/ui-next exec playwright install --with-deps chromium
yarn workspace @hydrooj/ui-next test:visual

# Lint
yarn workspace @hydrooj/ui-next exec eslint src/

# ui-default 仍然构建以保留兼容
yarn build:ui:production

---
总结

迁移基础设施已完成且设计精良——renderer fallback + admin 开关 + 单页 query 开关 + 主题系统 + 插件插槽都是为平滑过渡量身定制。当前最大短板是测试覆盖不足和未迁移页面仍占多数。建议按本报告阶段 A → B → C → D 推进,优先补测试再扩页面,避免新 UI 带着未验证行为上线。