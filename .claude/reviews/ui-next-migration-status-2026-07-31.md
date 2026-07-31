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

1. **管理页死按钮**:`manage_script`, `manage_setting`, `manage_user_import`, `manage_user_priv` —— 见"部分交付"表;任一选一处理:**(a) 把这 4 个页面从 NEXT_PAGES 移除回退到 ui-default**,或 **(b) 补齐业务逻辑**

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
