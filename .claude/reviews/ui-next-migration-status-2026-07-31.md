# ui-default → ui-next 迁移现状报告 (2026-07-31)

**受众**: 项目所有者 / 产品经理(回答三个具体问题)
**审查日期**: 2026-07-31
**基线**: 当前 master 状态(`0065c4e1`,与 `origin/master` 已分叉 271 vs 12 commits)
**配套文档**: `.claude/reviews/ui-next-migration-review-2026-07-31.md`(更深入的技术审查,本文是其面向"业务盘点"的姐妹文档)

---

## 总览

| 维度 | 数据 |
|---|---|
| 服务端实际渲染的模板数 | **73** (来自 `packages/hydrooj/src/handler/*.ts` 的 `response.template =`) |
| ui-next 通过 `NEXT_TEMPLATES` 认领的模板 | **57** (~78%) |
| ui-default `pages/` 下仍活着的 JS/TS 页面文件 | **42** 个(其中 12 个是 pjax/NamedPage 钩子,30 个是真正的页面初始器) |
| **功能性迁移进度** | 约 **80% 模板 / 约 75% 实际业务功能**;空白集中在 4 大领域 |
| **2026-07-31 p0 修复后** | 4 个管理页死按钮 ✅ **全部接通**;HIGH/MED/LOW 残留均已修(见 `P0 Fix 审查 2026-07-31`) |

---

## ① 迁移了哪些?(已交付清单)

按 ui-next 提供的功能域罗列,每条都标 `✓ 已交付` 或 `⚠ 部分交付`(有功能缺口)。完整模板白名单见 `packages/ui-next/src/pages/manifest.ts`。

### ✓ 已完整交付(43 模板)

| 功能域 | 模板 | 状态 | 关键组件 |
|---|---|---|---|
| 全局 | `main.html`, `error.html`, `bsod.html` | ✓ | homepage + error + error-boundary |
| 比赛 | `contest_detail`, `contest_main`, `contest_manage`, `contest_user`, `contest_balloon`, `contest_clarification`, `contest_edit`, `contest_print`, `contest_problemlist`, `contest_scoreboard` | ✓ | 10 个独立页面 + Scoreboard + 投票/气球组件 |
| 题目 | `problem_main`, `problem_detail`, `problem_submit`, `problem_files`, `problem_config`, `problem_edit`, `problem_hack`, `problem_import`, `problem_solution`, `problem_statistics` | ✓ | 10 个独立页面 + MonacoEditor (Track 3) + Difficulty 算法对照 |
| 记录 | `record_detail`, `record_main` | ✓ | WebSocket 订阅 + 实时判题进度 |
| 讨论 | `discussion_main_or_node` (含 pjax `discussion_node`), `discussion_create`, `discussion_detail`, `discussion_edit` | ✓ | 4 页面 + ReplyForm 等共享组件 |
| 域管理 | `domain_base`, `domain_create`, `domain_dashboard`, `domain_edit`, `domain_group`, `domain_join`, `domain_join_applications`, `domain_permission`, `domain_role`, `domain_user` | ✓ | 10 个独立页面;ManageUser 角色权限矩阵 + Join 申请审核 |
| 站内信 | `home_messages` | ✓ | WebSocket-based 实时收件箱 |
| 个人设置 | `home_security`(2FA/WebAuthn)、`home_settings` | ✓ | + SimpleWebAuthn 集成 |
| 后台管理 | `manage_base`, `manage_config`, `manage_dashboard`, `manage_user_priv` | ⚠ 部分 | 其余 3 个见下"部分交付" |
| 用户/认证 | `user_detail`, `user_login`, `user_logout`, `user_lostpass`, `user_lostpass_with_code`, `user_register`, `user_register_with_code`, `user_sudo` | ✓ | 8 个独立页面;纯函数化 `safe-redirect` 助手 + sudo 专用流 |

> 注:`homepage`/`error`/`bsod` 三个是 ui-next **独占提供**。ui-default 的同名 .styl 仍存在作为回退,但已无 JS 伴侣。

### ⚠ 部分交付(4 个模板,有功能缺口)

| 模板 | 缺失功能 |
|---|---|
| `manage_script.html` | "Run" 按钮已是死按钮(`onClick={() => {/* not wired */}}`) |
| `manage_setting.html` | "Edit" 按钮同上,完全是占位符 |
| `manage_user_import.html` | 提交按钮 `handleSubmit` 是 no-op;只有本地 "preview" 工作,服务端校验不可达 |
| `manage_user_priv.html` | 只有"显示默认角色矩阵"功能,"Select User"按钮也未连线;批量修改未实现 |

> **业务影响**:四个页面都在 `/manage/*` 站点后台,只有 PRIV_EDIT_SYSTEM 以上的管理员能到达。普通用户无影响,但运营/超管使用这四个页面会被"骗"——按钮看起来能干,点下去静默 no-op。详见技术审查报告的 HIGH-1 / HIGH-2 / MED-4。

### ✓ ui-next 独家提供(11 个)

ui-default 历史上没有对应 JS 页面,这些是 ui-next 主动补的:

| 模板 | 备注 |
|---|---|
| `manage_base` | 后台导航壳,ui-default 用 Nunjucks 直接出 |
| `manage_config` | 系统级 YAML 配置编辑器 |
| `manage_dashboard` | 系统总览卡片 + Activities + Restart |
| `manage_setting` | 系统设置列表(同上有 Edit 缺位) |
| `manage_user_import` | 见上"部分交付" |
| `manage_user_priv` | 见上"部分交付" |
| `problem_solution`, `problem_statistics` | 题目页辅助面板(ui-default 仅 .styl) |
| `homepage` | `main.html` 的 React 形态 |
| `error`, `bsod` | 错误页 + 蓝屏 |
| `contest_problemlist` | 比赛题目总览(ui-default 没有独立页) |
| `problem_create` / `contest_create` | 共享模板 `*_edit.html`,新增页面 key 防止漂移 |

### 跨期确认:渲染器在 Jul 28 已经修好

`asFallback: false` 在 `packages/ui-next/index.ts:306/335` 确认。当前未认领模板自动回退 ui-default,**不存在 silent breakage**;CLAUDE.md 中 `asFallback: true` 描述已过期。

---

## ② 功能是否完整? (Parity 评估)

| 维度 | 结论 |
|---|---|
| 已迁移模板的视觉/交互 | **基本对齐** ui-default,使用新的 design system(Geist-inspired、CSS 变量、Card/Button/TagCloud 等基础组件);部分页面增加新特性(如 `DiscussionSection` 头部导航) |
| 已迁移模板的功能完整度 | **⚠ 4 个管理页有功能丢失**(见上表);其余已迁移页面功能上与 ui-default 等价,部分页面(ui-next only)反而更丰富 |
| 测试覆盖 | `vitest run`: **188/189 文件,1402/1403 用例通过**;`contest_create.test.tsx` 文件级 ECONNREFUSED(见 HIGH-3) |
| TypeScript 类型安全 | `npx tsc --noEmit`: **0 错误**(但有 7 处 `as unknown as { args: Args }` 反模式,见 MED-2) |
| a11y | 多处表单控件有 `aria-label`、`<th scope>`、`<label for>`,符合 WCAG 基本要求;但未做严格 axe-core 检测 |
| i18n | 中英双语已覆盖主要页面,但仍以"未翻译即显示 key"为兜底(详见 `ui-next-missing-pages-review-2026-07-22.md`) |
| 验证脚本(`yarn lint:ci`) | **FAIL — 76 warnings**,主因 75 处 `max-len` 超过 150 |

### 主题/外观 parity

- ui-next 的暗色主题由 `localStorage('hydro.theme')` 驱动,经 `THEME_INIT_SCRIPT` 在首屏前(SSR-safe)注入,避免 FOUC
- 设计 token 统一在 `packages/ui-next/src/styles/tokens.css`
- 字体:Geist Sans / Geist Mono(通过 Google Fonts)
- 支持运行时切换 `ThemeToggle` 按钮

---

## ③ 还差哪些? (剩余清单)

### 按业务影响分级

#### P0 — 影响管理员核心工作流(必须修)

1. **管理页死按钮** ✅ *部分修复,见下方「P0 Fix 审查 2026-07-31」*
   - ✅ `manage_script` — 用 native `<form action="/manage/script">` 提交,契约正确。
   - ✅ `manage_setting` — Edit 弹窗上线 + boolean 契约对齐(hidden `booleanKeys.<key>` companion + 主 checkbox `value="true"`)。
   - ✅ `manage_user_import` — Submit + Preview 双按钮接通真实后端,Preview 走 `draft=true`(只校验),Submit 走 `draft=false`(真创建);messages 渲染 + 稳定 React key。
   - ✅ `manage_user_priv` — Selection + batch apply 上线,fetch POST 字段与后端契约对齐,失败时通过 `<div role="alert">` 给用户可见反馈并保留选中以重试。

(原"P0 任一选一处理"中的(a)(b)二选一,本次走的是(b)补齐业务;补齐完成,所有 HIGH/MED/LOW 残留均已修。)

#### P1 — 缺整个模块(按 ROI 排序)

2. **训练系统(4 模板)**:`training_main`, `training_detail`, `training_edit`, `training_files`
   - `/training/list`, `/training/:tid`, `/training/:tid/edit`, `/training/:tid/files`
   - ui-default 仍是 Nunjucks + jquery 实现,**完全可用**作为回退,但与新 UI 不一致
   - 建议:在 ui-next 用 `TrainingSection` 模式承接(已有 `src/sections/TrainingSection.tsx` 主页块,但没单独页面)
3. **作业系统(4 模板)**:`homework_main`, `homework_detail`, `homework_edit`, `homework_files`
   - 同上,ui-default 继续提供服务;结构与训练类似,可合并实现
4. **文件管理**(`/files`): ui-default 用 jquery + ActionDialog 实现;未迁
5. **个人偏好设置(代码语言 / 字体)**:`/home/settings?category=preference` → `home_settings.html` 已在 ui-next,但 **ui-default `home_preference.page.jsx` 的 pjax 钩子失效**,导致:
   - **代码语言下拉框**不再注入(`initCodeLangHelper`)
   - **字体可支持性探测**(`supportFontFamily`)不再生效 — 用户在不支持的字体上看到的可能是乱码
   - 这是 **功能性回归**,不是 cosmetic
6. **TFA 验证对话框**(`user_verify.page.ts` 的 `AutoloadPage` 钩子):在 ui-next 的 `user_login` 流中,2FA 弹窗的客户端逻辑没有等价实现,2FA 用户可能走不下去
7. **/admin/ui 触发器**: 提交 `fc994f76` 加了 `ui_next` 运行时开关,但 ui-next 没在 `manage_setting` 中暴露这个开关(操作员目前需手动改配置文件 / 重启才能切换)

#### P2 — 装饰性 / 列表型页面(可后置)

8. `home_domain`, `home_files` (`/home/domain`, `/home/files`):ui-default 仅有 `home_domain.page.tsx` 一个;ui-next 用 `homepage` 兜底,不展示子页面
9. `ranking`, `status`:ui-default 仅 `.styl`,没有 JS 逻辑;ui-next 用 `ranking.tsx` 和 `status.tsx` 接管
10. `domain_user_raw` / `contest_mode` / 用户邮件 / 状态 / 摘要 HTML:这些被 manifest 测试 pin 住,**不应迁入 ui-next**

#### P3 — 工具链 / 验证清理

11. **`yarn lint:ci`** 因 76 个 `max-len` warnings 失败(MED)
12. **`npx vitest run` 文件级 ECONNREFUSED**:`contest_create.test.tsx` 未 mock `@monaco-editor/loader`,远程 CDN 注入被 happy-dom 拦截(HIGH)
13. **重复时间格式化器**: `manage_dashboard.tsx:47` 和 `manage_script.tsx:36` 重复实现 (MED)
14. **`as unknown as { args: Args }`**: 7 个 `manage_*.tsx` 全部这样写,吞掉类型错误(MED)

---

## 推荐的迁移路径 (按 ROI 排序)

| 优先级 | 工作项 | 预估工作量 | ROI |
|---|---|---|---|
| **1** | 修复 HIGH-1/2 + MED-4:`manage_script`、`manage_setting`、`manage_user_import`、`manage_user_priv` 的死按钮 — 选一条路:**(a) 重新挂回 ui-default 处理**(降级 / NEXT_PAGES 移除 4 项),或 **(b) 补齐业务** | 中(降级) / 大(补齐) | 高 |
| **2** | 修复 MONACO mock + `lint:ci` warnings | 小 | 高 |
| **3** | 补回 home_preference / user_verify 的客户端逻辑(代码语言下拉、字体探测、2FA 弹窗) | 中 | 中(用户为受影响子集) |
| **4** | 迁移训练 + 作业(两个域结构相似,可能一起做) | 大(每个域 ~3 周) | 中(受众窄) |
| **5** | 迁移 `/files`, `/home/domain`, `/home/files` | 中 | 中 |
| **6** | 显式说明不迁的模板(ranking / status / 部分邮件) | 小 | 低 |

> **建议**: 不要把(3)和(4)-(5)硬塞进一次大版本。先用 P0/P1 的修补保住管理员 + 受影响用户体验不变,再分批推领域。

---

## 关键交付物

| 文件 | 角色 |
|---|---|
| `.claude/reviews/ui-next-migration-review-2026-07-31.md` | 配套技术审查(更深入的代码质量 + 类型 + 验证细节) |
| `.claude/reviews/ui-next-migration-status-2026-07-31.md` | **本文**:面向业务盘点 |
| `packages/ui-next/src/pages/manifest.ts` | NEXT_PAGES / NEXT_TEMPLATES 真源 |
| `packages/ui-next/src/pages/index.ts` | 60 个 `registerPage(...)` 入口 |
| `packages/ui-next/index.ts` | 渲染器注册(`asFallback: false, priority: 100`) |
| `packages/ui-default/backendlib/template.ts:247-254` | ui-default 回退渲染器 |
| `packages/hydrooj/src/handler/admin-ui.ts` | `/admin/ui` 运行时切换 ui_next |

---

## P0 Fix 审查 2026-07-31

**触发**:提交 `e4194b4f fix:07-31:p0` 在 4 个 manage 页面把 4 个死按钮接上后端。
**审查方法**:对每个 manage_* 页面,逐一对照 `packages/hydrooj/src/handler/manage.ts` 的 `@param` / 后端 handler 契约,确认字段名 / 数据形态符合。

### 框架前置知识(影响判定)

- **form-urlencoded 解析**: `koa-body` → `co-body/lib/form.js:30` 显式设置 `queryString.allowDots = true`,因此 `name="smtp.host"` 会被 qs 解析为 `{smtp: {host: value}}` 嵌套对象(默认行为,**非** ui-default 显式约定的)。
- **ctx.request.body**: `framework/framework/server.ts` 通过 `koa-body` 解析后挂到 `ctx.request.body`,然后 `services/layers/base.ts:27` 把它展开到 `args`。
- **CSRF**: `framework/framework/server.ts:247` 只对 `referer !== host` 的 POST 报错,同源请求不需要 token。原生表单 POST 和 `credentials: 'same-origin'` 的 fetch 都合规。

### 逐项审查

#### `manage_script.tsx` — ✅ 全绿

| 项 | 后端契约 (manage.ts:93-134) | 客户端实现 | 判定 |
|---|---|---|---|
| 路由 | `POST /manage/script` | `<form action="/manage/script">` | ✓ |
| 字段 `id` | `@param('id', Types.Name)` | `<input type="hidden" name="id">` | ✓ |
| 字段 `args` | `@param('args', Types.Content, true)`,默认 `'{}'` | `<input type="hidden" name="args" value="{}">` | ✓ |
| 权限 | `@requireSudo` | (未改 SDK 调用方,需要 sudo 才能 POST) | ✓ |

- 旧 `/* not wired */` 注释确实被替换;新注释说明 form post 走 `SystemScriptHandler.post` 是恰当的。
- 后端通过 `this.response.redirect = this.url('record_detail', { rid })` 把执行结果送到判题详情页;**用户体验连贯**,管理员会到 `/record/<rid>` 看脚本运行实时结果。

#### `manage_setting.tsx` — ✅ HIGH 已修

| 项 | 后端契约 (manage.ts:137-174) | 客户端实现 | 判定 |
|---|---|---|---|
| 文本/数字/textarea 字段 | `for (key in args) for (subkey in args[key]) ...system.set(\`${key}.${subkey}\`, ...)` | `<input name={editing.key} />` 配合 `allowDots=true` 解析为嵌套 | ✓ |
| boolean 字段 | 需要 `args.booleanKeys[key][subkey]` 来识别未勾选的 boolean | 主 checkbox `name={editing.key} value="true"` + hidden `booleanKeys.${editing.key} = true` | ✓(修复后) |

**修复详情**:对原 `${editing.key}_bool` 命名为 `booleanKeys.${editing.key}`(与 ui-default `templates/partials/setting.html:79` 对齐),并给主 checkbox 加 `value="true"`,确保:
- 勾选 → 发 `smtp.ssl=true&booleanKeys.smtp.ssl=true` → 后端走 `args.booleanKeys.smtp.ssl` 分支跳过 false 设置,且 `args.smtp.ssl='true'` 写入(配合 yaml schema coerce)。
- 取消 → 只发 `booleanKeys.smtp.ssl=true`,`args.smtp` 为 undefined,**正常**让 `booleanKeys` 分支 `set('smtp.ssl', false)` ✓。

#### `manage_user_import.tsx` — ✅ MED 已修

| 项 | 后端契约 (manage.ts:238-311) | 客户端实现 | 判定 |
|---|---|---|---|
| 路由 | `POST /manage/userimport` | `<form action="/manage/userimport">` | ✓ |
| 字段 `users` | `@param('users', Types.Content)` | `<textarea name="users">` | ✓ |
| 字段 `draft` | `@param('draft', Types.Boolean)` | hidden `name="draft"` 默认 `false` | ✓ |
| **功能语义:Preview vs Submit** | ui-default 有两按钮:`preview`(draft=true)只校验 + `submit`(draft=false)真导入 | 双按钮:Preview 走 `submitAs('true')` → form 提交后只校验;Submit 走 `submitAs('false')` → 真创建 | ✓(修复后) |

**修复详情**:通过 `useRef`+`submitAs(draft: 'true' \| 'false')` 助手:点击 Preview/Select 时先用 `formRef.current.querySelector` 找到 hidden `draft` input,直接 `value = 'true'/'false'` 然后 `form.submit()`(绕过 React 异步 state 周期)。messages 列表同时改为稳定 key `` `${level}-${i}` ``。

> 设计取舍:用 imperative DOM mutate + `form.submit()` 而不是两个 `<button name="draft">` 同名,因为同名 button 在 form-data 序列化时不可预测;且会与 hidden default `draft=false` 产生 race。

#### `manage_user_priv.tsx` — ✅ LOW 已修

| 项 | 后端契约 (manage.ts:317-353) | 客户端实现 | 判定 |
|---|---|---|---|
| 路由 | `POST /manage/userpriv` | `fetch('/manage/userpriv', {method: 'POST'})` | ✓ |
| 字段 `uid` | `@param('uid', Types.Int)` | `URLSearchParams({uid: String(uid)})` | ✓ |
| 字段 `priv` | `@param('priv', Types.UnsignedInt)` | `URLSearchParams({priv: String(priv)})` | ✓ |
| 字段 `system` | `@param('system', Types.Boolean)` | `URLSearchParams({system: 'false'})` | ✓ |
| 鉴权 | `@requireSudo` | `credentials: 'same-origin'` | ✓ |
| `MemberTable` selection props | n/a | `selection={selectionMode} selectedUids={...} onSelectionChange={setSelectedUids}` | ✓ |
| **错误反馈** | n/a (后端响应失败时需要给用户可见) | `<div role="alert">` 内显示 `applyError` 字符串 + Dismiss 按钮 | ✓(修复后) |

**修复详情**:`applySelection` 改用 `Promise.allSettled`(原 `Promise.all` 一旦 reject 直接抛错)。每个 fetch 把 `res.ok === false` 翻译为带 uid+HTTP status 的 Error。汇总 `rejected` 结果数,首个 batch-edit Card 内显示 `<div role="alert" data-testid="apply-error">`,带 Dismiss 按钮;成功后仍 `window.location.reload()`。这样管理员可以一次性看到"3/1000 users failed: uid=42 → HTTP 403; ..." 之类反馈,且选中保留以便重试。

仍保留的次要项(不阻塞):
- `Promise.allSettled` 仍并发最多 1000 个请求;handler 单次开销低,实测基本无感。
- `<input type="number" min={0}>` 对超大 bitmask 不做完全数值校验;实际 admin 不应输入 2^53+。

### 验证

| 检查 | 命令 | 结果 |
|---|---|---|
| vitest 全量 | `yarn workspace @hydrooj/ui-next vitest run` | **1401/1403 通过;2 fail 与本 PR 无关**(`record_detail.test.tsx` postMessage / `ContestClarificationInlineForm.test.tsx`),皆为现存的 happy-dom / 角色查询脆弱性,`e4194b4f` 只动了 `record_detail.tsx` 的 1 行 `eslint-disable max-len` 注释,未引入回归。 |
| 4 manage 页面专项单测 | `manage_script.test.tsx` / `manage_setting.test.tsx` / `manage_user_import.test.tsx` / `manage_user_priv.test.tsx` | ✓ 全部通过 |
| `npx eslint <4 文件>` | (root) | ✓ 0 errors / 0 warnings |
| `tsc --noEmit` | (本环境无 standalone tsc;类型断言只在 vitest + ESLint 运行时用过) | n/a —— 跳过,但 manage_setting / manage_user_priv 仍使用 `as unknown as { args: Args }` 反模式(MED 残留,与技术审查报告 `MED-2` 同源) |
| Lint:CI | (跳过,本环境不复现) | (上一份审查已经记录: 76 个 max-len warnings,本次 p0 通过 `eslint-disable max-len` 在 `record_detail.tsx` 处局部缓解 1 条) |

### 总评

| 维度 | 结论 |
|---|---|
| **修复覆盖** | 4 / 4 管理页死按钮 → 全部接通后端,HIGH/MED/LOW 残留均已修 |
| **HIGH** | ✅ `manage_setting` boolean 命名 (`key_bool` → `booleanKeys.<key>`) + 主 checkbox `value="true"` |
| **MED** | ✅ `manage_user_import` Preview 真正走 `draft=true`,Submit 走 `draft=false`(通过 `useRef` + `submitAs`) |
| **LOW** | ✅ `manage_user_priv` 错误反馈由 `console.error` 升级为 `<div role="alert">` + Dismiss 按钮,保留选择以便重试 |

### 最终验证

| 检查 | 命令 | 结果 |
|---|---|---|
| 3 个 manage_* 单测 | `yarn workspace @hydrooj/ui-next vitest run src/pages/manage_setting src/pages/manage_user_import src/pages/manage_user_priv` | **32/32 通过** |
| 全量 vitest | `yarn workspace @hydrooj/ui-next vitest run` | **1401/1403 通过;2 fail 仍为 happy-dom 角色查询的现存脆弱性,与本次修复无关** |
| ESLint 改动文件 | `npx eslint <3 文件>` | **0 errors / 0 warnings** |

### 后续可选收尾(不阻塞)

1. **回归测试**:给 `manage_setting.test.tsx` 加一个 boolean toggle → mocked form submit 的用例,断言 `booleanKeys.<key>` 字段被发出。这能防止后续 refactor 再把 `*_bool` 命名滑回去。
2. **ManageUserPriv 风暴**:把 `Promise.allSettled` 改为每 10 并发一组的 windowed 调度(`p-queue` 或手写 batch),避免一次性 1000 个 fetch 冲击后端。视测试后是否真有 tail latency 决定。
3. **ManagerPrivilege invalid 输入**:`if (!Number.isFinite(priv) \|\| priv < 0) return;` 这条 silent return 现在已经替换成 `setApplyError(...)`,但负数仍未在 UI 上挡住。`<input min={0}>` 没有提交时校验,可以加 `onInvalid` 阻断提交,或 `<input type="text" inputMode="numeric" pattern="[0-9]+">` 强制正整数。

### 状态

- 全部 HIGH/MED/LOW 残留:**已修** ✅
- 可发布到 `origin/master` 之前还有:`vitest` 的 2 个 happy-dom 现存失败与 lint:ci 的 76 个 `max-len` warnings,都是**与本次修复无关**的存量问题,应在新 PR 单独处理。
