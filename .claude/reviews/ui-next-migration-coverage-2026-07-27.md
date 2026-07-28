# 迁移覆盖率审查: ui-default → ui-next (2026-07-27)

**审查日期**: 2026-07-27
**审查模式**: 覆盖率 / 架构审查(committed state, master, 工作区干净)
**用户诉求**: 「审查当前从 ui-default -> ui-next 的迁移情况,还差多少没有迁移」
**决定**: BLOCK — ui-next 当前配置下不应以启用状态交付

## 与既有审查文档的关系

`.claude/reviews/` 已有三份文档,本文不重复其内容:

| 文件 | 范围 | 本文差异 |
|---|---|---|
| `ui-default-to-ui-next-migration-review.md` (今日 10:21) | 单批 diff 审查 (home_messages / home_security / home_settings) | 不含覆盖率清单 |
| `ui-next-migration-gap-2026-07-21.md` | 逐页功能 parity 缺口 | 无渲染器分析;**第 466 行的假设与事实相反**(见 C1) |
| `ui-next-missing-pages-review-2026-07-22.md` | i18n / 细节缺陷 | 无渲染器分析 |

本文的 C1 / C2 / H1 / H2 为**首次记录**的阻断级问题。

## 一、还差多少没有迁移

统计口径:`packages/hydrooj/src` 与 `packages/ui-default` 中所有 `response.template = '<name>.html'`(共 72 个,其中 `main` 经 route-name 回退到 `homepage`)对比 `packages/ui-next/src/pages/index.ts` 的 35 个 `registerPage(...)` key。

**结论:71 个真实模板中已迁移 30 个(约 42%),未迁移 41 个(约 58%)。**

### 已迁移(30 模板 + 5 个仅 route-name 页面)

contest_detail, contest_main, contest_problemlist, contest_scoreboard, contest_manage,
contest_user, contest_balloon, contest_clarification, contest_edit, contest_print,
problem_main, problem_detail, problem_submit, problem_files, problem_config,
problem_hack, problem_edit, problem_import, record_detail, record_main,
home_messages, home_security, home_settings, user_login, user_register,
user_register_with_code, user_lostpass, user_lostpass_with_code, user_logout,
user_sudo + (homepage, error, contest_create, problem_create, admin_ui)

### 未迁移(41),按功能域

| 功能域 | 数量 | 模板 |
|---|---|---|
| 域管理 (domain) | 8 | domain_create, domain_dashboard, domain_edit, domain_group, domain_join, domain_join_applications, domain_permission, domain_role |
| 站点后台 (manage) | 6 | manage_config, manage_dashboard, manage_script, manage_setting, manage_user_import, manage_user_priv |
| 讨论 (discussion) | 4 | discussion_create, discussion_detail, discussion_edit, discussion_main_or_node |
| 训练 (training) | 4 | training_main, training_detail, training_edit, training_files |
| 作业 (homework) | 4 | homework_main, homework_detail, homework_edit, homework_files |
| 用户 / 账户 | 6 | user_detail, user_delete_pending, user_sudo_redirect, user_changemail_mail_sent, user_lostpass_mail_sent, user_register_mail_sent |
| 站点页面 | 6 | about, wiki_help, ranking, status, home_domain, home_files |
| 题目附属 | 2 | problem_solution, problem_statistics |
| 比赛 | 1 | contest_mode |

作业域为部分覆盖:`contest_scoreboard.tsx` 已处理 `page_name: 'homework_scoreboard'`,
`ContestForm` 已接受 `homework_create` / `homework_edit`,但 `homework_main` /
`homework_detail` 无对应页面。

讨论 / 训练 / 作业 / 排名仅存在**首页 section 挂件**
(`src/sections/DiscussionSection.tsx`、`TrainingSection.tsx`、`HomeworkSection.tsx`、
`RankingSection.tsx`),不是独立页面。

## 二、问题清单

### CRITICAL

#### C1 — ui-next 劫持全部模板,未迁移页面直接损坏而非回退到 ui-default

`framework/framework/server.ts:208-213`:
```ts
const renderers = Object.values(this.ctx.server.renderers)
    .filter((r) => r.accept.includes(templateName) || r.asFallback);
const topPrio = renderers.sort((a, b) => b.priority - a.priority)[0];
```
`accept` 是白名单,但 `asFallback: true` 会让该过滤条件**无条件通过**,使 `accept` 沦为死代码。两个渲染器都是 `accept: []` + `asFallback: true`:

- ui-next — `packages/ui-next/index.ts:286` (DEV) 与 `:315` (PROD),`priority: 100`
- ui-default — `packages/ui-default/backendlib/template.ts:247-254`,`priority: 1`

因此 **ui-next 对每一个模板名都胜出**,无论是否已迁移;不存在按模板协商的机制。客户端随后走 `packages/ui-next/src/app.tsx:45-51`:
```tsx
if (!entry) return (<div>Page not found: <code>{name}</code></div>);
```
该返回发生在 `Layout` 应用**之前**(`app.tsx:53`),因此无导航、无样式,且 HTTP 状态码仍为 **200**。服务端此时已提交 ui-next 外壳,无法再回退到 nunjucks。

`~/.hydro/addon.json` 中 ui-next 已启用,故这是当前的**实际线上行为**。

> 注:`ui-next-migration-gap-2026-07-21.md:466` 写道「确认 ui-next 已通过 `next` 渲染器 fallback」——事实相反。`asFallback` 的含义是「本渲染器可作为兜底接管一切」,而非「本渲染器会把未覆盖的页面让给别人」。该误解应在后续文档中更正。

#### C2 — 注册与找回密码邮件正文被替换为 SPA 外壳

由于 'next' 对所有 `renderHTML` 调用胜出,邮件正文被替换为 ui-next 的 HTML 文档:

- `packages/hydrooj/src/handler/user.ts:280` — `user_register_mail.html`
- `packages/hydrooj/src/handler/user.ts:366` — `user_lostpass_mail.html`
- `packages/hydrooj/src/handler/home.ts:247` — `user_changemail_mail.html`

用户收不到验证码,无法完成注册或找回账号。这是账号锁死,而非外观问题。

### HIGH

#### H1 — pjax / partial 片段被塞入完整 HTML 文档

`framework/framework/base.ts:73` 对 `response.pjax` 走同一 `renderHTML`,故片段也拿到 SPA 外壳并被嵌进 `<div>`:

- `packages/hydrooj/src/handler/problem.ts:178-182`(`partials/problem_list.html`、`problem_stat`、`problem_lucky`)、`:408`、`:673-674`
- `packages/hydrooj/src/handler/record.ts:363`(`record_main_tr.html`)、`:433-434`(`record_detail_status.html`、`record_detail_summary.html`)
- `packages/hydrooj/src/handler/contest.ts:1065`(`contest_scoreboard_download_html.html`)

#### H2 — 三层 opt-out 机制全部失效,没有任何逃生口

- `packages/ui-next/src/hooks/use-disable-next.ts` **零消费者**(grep `useDisableNext` 仅命中自身测试)。其 `?__disableNext=1` 分支写 `sessionStorage` 后 reload,但渲染器选择在服务端,`server.ts:209-211` 从不检查 query / cookie / storage。`grep -rn "__disableNext"` 在 ui-next 之外**无命中**。
- `UiContext.uiNext`(`use-disable-next.ts:54`)—— 在 `packages/hydrooj`、`framework`、`packages/ui-default` 中 grep `uiNext` **无命中**,永远为 `undefined`,故全局开关恒为 `false`。
- `packages/ui-next/src/pages/admin_ui.tsx:33` 向 `/admin/ui` POST `next=on|off`。`grep -rn "admin_ui\|'/admin/ui'" packages/hydrooj/src packages/ui-default` **无命中**,路由不存在:开关 404 且不持久化,而其 `:12-16` 的注释声称会写入 `SettingModel`。

#### H3 — 已迁移页面硬链接到未迁移页面

以下链接会落到 `Page not found` 裸 div:

- `src/components/sidebar/ProblemSidebar.tsx:132` → `discussion_node`
- `src/components/sidebar/ProblemSidebar.tsx:139` → `problem_solution`
- `src/components/sidebar/ProblemSidebar.tsx:150` → `problem_statistics`
- `src/pages/record_detail.tsx:107` → `user_detail`

### MEDIUM

#### M1 — `ContestForm` 丢失比赛访问控制

`src/components/contest/ContestForm.tsx` 声明了 `assign?: string[]`(第 32 行)却从未渲染,提交体(第 167-208 行)也从不发送 `permission` / `_code` / `assign`。ui-default 的 `contest_edit.html` 提供 `public` / `invite` / `assign` 下拉,含邀请码输入与用户/组指派选择器。**ui-next 上无法设置邀请码或指派参赛者。**

#### M2 — `MonacoEditor` 默认只是带样式的 `<textarea>`

`src/components/problem/MonacoEditor.tsx:5` — `// TODO: 接入真正的 Monaco / CodeMirror`。仅在传入 `useMonaco` 时加载真实 Monaco,目前只有 Scratchpad 启用,故 `ProblemForm` 编辑无语法高亮。

#### M3 — 题目侧栏提交入口是空操作

`src/components/sidebar/ProblemSidebar.tsx:104, 111, 214, 221, 270, 277` 共 6 处 `/* TODO */`;Submit / LoginToSubmit / NoPermissionToSubmit 渲染为 `href='#'` 且 `onClick` 为空,点击无反馈、无弹窗、无跳转。

#### M4 — `user_sudo` 可能未暴露 TFA / WebAuthn

`src/pages/user_sudo.tsx`(38 行)复用 `LoginForm`。ui-default 的 `user_sudo.html` + `user_sudo.page.ts` 提供 password / tfa / authn 三种可切换方式,并在 `confirm` 与 `webauthn_verify` 之间切换提交名。需验证送达 `UserSudoHandler` 的字段名与提交名是否正确。

### LOW

#### L1 — `CLAUDE.md` 严重过时

其称 ui-next「currently ships `homepage` and `problem_main` pages」。实际为 35 个已注册页面、约 36.6k LOC。这会误导后续贡献者对剩余工作量的判断。

## 三、验证

工作区干净,无待提交 diff 可供门禁;上述结论为架构性问题,依据源码定位而非构建失败。

| 检查 | 结果 |
|---|---|
| Type check | 未运行(无待审 diff) |
| Lint | 未运行(既有审查已记录 505 errors / 270 warnings 存量) |
| Tests | 未运行(既有审查已记录 8 failed / 873 passed 存量) |
| Build | 未运行 |

## 四、建议修复顺序

1. **反转渲染器门禁(一次性修掉 C1 / C2 / H1)**:将 ui-next 设为 `asFallback: false`,并用已注册页面 key 生成 `accept` 数组,使 ui-default 继续服务未迁移模板、partial 与邮件。这是让「部分迁移」可安全运行的唯一关键改动。
2. 让 opt-out 真正可用:要么实现 `admin_ui.tsx` 与 `use-disable-next.ts` 已假定存在的 `/admin/ui` 路由 + `UiContext.uiNext`,要么删除死代码以免暗示存在可用开关(H2)。
3. 屏蔽或移除指向未迁移页面的 4 处链接(H3)。
4. 在 `ContestForm` 中恢复 permission / invite / assign(M1)。
5. 按流量优先迁移剩余功能域:discussion → training → homework_main/detail → ranking / status / user_detail → domain_* → manage_*。
6. 更正 `CLAUDE.md` 的覆盖率描述(L1),并修正 `ui-next-migration-gap-2026-07-21.md:466` 对 `asFallback` 的误解。
