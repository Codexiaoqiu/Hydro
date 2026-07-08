# ui-default → ui-next 页面迁移 TODO（基于 ui-default 现用功能）

> 后端不变（`packages/hydrooj/src/handler/{user,problem,record}.ts` 与 `ui-default/templates/**` 是事实来源），只迁移前端。迁移原则：**路由、字段名、状态码、错误码、限流、副作用与 ui-default 完全一致**；只重做视觉、状态结构和 SPA 数据流。下面每条都对应一份现状清单，避免凭空设计。

## 0. 共享前置（只列 ui-next 现在缺的、又必须新增的最小集合）

- [ ] **0.1 确认 layout/auth 槽位**：ui-next 目前只有 `default` 布局（`registry/layout.ts`）。`/login`、`/register`、`/lostpass` 系列使用 ui-default 的 `layout/immersive.html`（居中、无 TopNav），新加 `auth` layout（顶栏可选隐藏，主体居中卡片）。
- [ ] **0.2 `useApi` 复用 ui-default 的 `request` 约定**：`request.post('/login', formData)` 是 `application/x-www-form-urlencoded`，CSRF 由 framework 注入；错误经 `HydroError` 抛出，前端用 `err.code` / `err.message` 渲染（参考 `ui-default/components/dialog/index.ts` 的 `alert`）。
- [ ] **0.3 复用现有基础件 + 少量补齐**
  - 复用：`Card` / `Button` / `Chip` / `Eyebrow` / `Select` / `TagCloud` / `LangTabs` / `Avatar` / `Article` / `IDEFrame` / `SamplePair` / `Menu` / `CtaCard`。
  - 补齐（最小集，按需即可）：
    - `primitives/Input`（label + error + hint，token focus ring）——给所有表单字段用。
    - `primitives/Alert`（error / success / warn / info）——给服务端错误回显用。
    - `primitives/Checkbox` / `Switch` —— `rememberme`、`hidden` 用。
    - `auth/AuthShell` —— 沉浸式布局内的左品牌 + 右表单组合。
- [ ] **0.4 全局登录弹窗**：ui-default 的 `window.showSignInDialog()`（`components/signin/signInDialog.page.js`）在桌面端从导航触发，新页面要沿用 —— 抽象成 `useSignInDialog()` hook + `<SignInDialog>` 组件，桌面端弹窗、移动端跳 `/login`，并接 `simplewebauthn` 的 passkey 自动登录。
- [ ] **0.5 `?redirect=` 约定**：登录成功后跳 `redirect` 优先；fallback 沿用 ui-default 的逻辑 —— `request.referer` 非 `/login` 时用 referer，否则跳 `homepage`。封装在 `usePostLoginRedirect()`。
- [ ] **0.6 限流提示**：所有受 `limitRate` 保护的接口（`user_login`、`send_mail`、`add_record`），前端用 `Alert` 展示 `err.message`（硬编码中文 fallback 文案）。

## 1. 注册 / 登录（事实源：`handler/user.ts` + `templates/user_*.html`）

> 涉及页面：`/login`、`/register`、`/register/:code`、`/lostpass`、`/lostpass/:code`、全局登录弹窗、登出 `/logout`、sudo `/user/sudo`。

- [ ] **1.1 登录页 `page:user_login`（GET/POST `/login`）**
  - 字段：`uname`（autofocus，autocomplete=`username webauthn`）、`password`、`rememberme`（checkbox）、`tfa`（hidden）、`authnChallenge`（hidden）、`login_submit`（submit）。
  - 页面数据：`builtInLogin`（=`system.server.login`）、`loginMethods`（OAuth provider 列表 `[{id,text}]`）、`redirect`。
  - 渲染条件：当 `builtInLogin === false` 时只渲染第三方登录按钮组；都从 `PageData` 读。
  - 第三方登录按钮：每个 provider 一条 `<a href="/oauth/:type/login?redirect=...">`（沿用 `url('user_oauth', { type, query: { redirect } })`）。
  - 底部"忘记密码 / 用户名"链 `/lostpass`。
  - 服务端错误映射（来自 `UserLoginHandler.post`）：`BuiltinLoginError`、`UserNotFoundError`（`uname`）、`BlacklistedError`（含 `banReason`）、`ValidationError('ip')`（`system.contestmode`）、`ValidationError('2FA', 'Authn')`（需 TFA / WebAuthn）、`InvalidTokenError('2FA'|'webauthn')`、限流 `too_many_requests`。前端用 `Alert` 展示 `err.message`。
  - 2FA / WebAuthn：用户名 blur 时 `GET /user/tfa?q=<uname>`（返回 `{tfa, authn}`）→ 弹出对应输入框（参考 `UserTFAHandler`）。
- [ ] **1.2 注册页 `page:user_register`（GET/POST `/register`）**
  - 字段：`mail`（autofocus，type=text）、captcha。
  - 提交后两种分支（`UserRegisterHandler.post`）：`smtp.verify && smtp.user` → 渲染 `user_register_mail_sent`；否则跳 `user_register_with_code?code=…`。
  - 错误：`UserAlreadyExistError(mail)`、`BlacklistedError(mailDomain)`、限流。
  - 权限：要求 `PRIV.PRIV_REGISTER_USER`。
- [ ] **1.3 注册填写页 `page:user_register_with_code`（GET/POST `/register/:code`）**
  - 字段：`mail`（disabled，来自 token）、`uname`（autofocus）、`password`、`verifyPassword`。
  - 错误：`InvalidTokenError`（token 失效）、`ValidationError('uname')`、`VerifyPasswordError`。
  - 成功：跳 `tdoc.redirect` 或 `home_settings?category=preference`。
- [ ] **1.4 忘记密码 `page:user_lostpass`（GET/POST `/lostpass`）**
  - 字段：`mail`（autofocus）。
  - 渲染条件：`system.smtp.user` 未配置时显示 "Relax and try to remember your password."（即 ui-default 的 fallback 文本），不显示表单。
  - 错误：`UserNotFoundError(mail)`、限流。
  - 成功：渲染 `user_lostpass_mail_sent` 提示页。
- [ ] **1.5 重置密码 `page:user_lostpass_with_code`（GET/POST `/lostpass/:code`）**
  - 字段：`uname`（disabled）、`password`（autofocus）、`verifyPassword`。
  - 错误：`InvalidTokenError(LOSTPASS)`、`VerifyPasswordError`。
  - 副作用：成功后 `user.setById(uid, { authenticators: [], tfa: false })`（后端处理，前端只展示成功文案并跳 `homepage`）。
- [ ] **1.6 登出 `page:user_logout`**：纯 GET 链接，沿用 ui-default 文案。
- [ ] **1.7 sudo `page:user_sudo`（GET/POST `/user/sudo`）**：复用登录的 2FA / WebAuthn 输入框组件。
- [ ] **1.8 全局登录弹窗 `<SignInDialog>`**
  - 桌面端模态：复用登录表单；移动端跳 `/login`。
  - WebAuthn passkey：`browserSupportsWebAuthnAutofill()` + `startAuthentication`，失败用 `Notification.error`。
  - 入口：导航栏"登录"按钮；调用方通过 `useSignInDialog().show()` 替代 ui-default 的 `window.showSignInDialog()`。
- [ ] **1.9 单元 / 视觉回归**
  - `user_login.test.tsx`：5 类错误码的渲染分支、2FA 输入出现时机、OAuth 按钮列表为空 / 不为空。
  - `user_register*.test.tsx` / `user_lostpass*.test.tsx`：成功 / 失败 / 邮件已发 / 邮件未配置 fallback。
  - 视觉：登录 / 注册 / 忘记 / 邮件已发四态 × 桌面 1440 / 移动 390 / 暗色。

## 2. 新增 / 修改题目（事实源：`handler/problem.ts` + `templates/problem_edit.html` + `templates/problem_import.html`）

> 涉及：`/problem/create`、`/p/:pid/edit`、题目导入（按 `ui.getNodes('ProblemAdd')` 注册的扩展点）、`/p/:pid/files` 的侧栏上传块（编辑页内嵌）。

- [ ] **2.1 编辑页 `page:problem_edit` / `page:problem_create`**
  - 同一份 React 组件 `ProblemForm`，通过 `page_name` 区分（`'problem_edit' | 'problem_create'`），与 ui-default 共用 `problem_edit.html` 一致。
  - 字段（与 `ProblemEditHandler.post` / `ProblemCreateHandler.post` 一一对应）：
    - `pid`：可选；regex `^(?:[a-z0-9]{1,10}-)?[a-z][a-z0-9]*$`（大小写不敏感，编辑时改名走 `newPid`，原值通过路由 `:pid` 读）；占位符 `P1000`。
    - `title`：必填（`Types.Title`），`page_name === 'problem_create'` 时 autofocus。
    - `hidden`：checkbox。
    - `tag`：CSV 字符串，UI 上接 `TagCloud` 双向绑定；后端用 `parseCategory` 解析为 `string[]`。
    - `difficulty`：1–10 整数（`PositiveInt`，`+i <= 10` 校验）。
    - `content`：多语言 Markdown，按 `statementLangs`（来自 `ctx.i18n.langs(false)`）切 tab。
  - 页面数据：`statementLangs`、`pdoc`（编辑时）、`additional_file`（编辑时）、`categoryTree`（侧栏分类）、`page_name`。
  - 多语言编辑器：tab 头来自 `statementLangs`，用户当前 `viewLang` 显示为默认；切换 tab 提交时把所有语言一起 POST（与 ui-default 一致：单一 `content` 字段里塞多语言结构化数据，参见 `partials/problem_default.md`）。
  - Markdown 预览：复用 `lib/markdown.tsx`；上传图：`data-markdown-upload` 行为（用户在描述里 `file://xxx.png` 引用 → 走 problem 的 `additional_file` 流程）—— 迁移时按 ui-default 的 `user.upload` → `storage.rename` → `problem.addAdditionalFile` 后端链路提供上传 UI。
  - 提交按钮文案：`Create` / `Update`；编辑页同时渲染 `Delete`（条件：`handler.user.own(pdoc, PERM_EDIT_PROBLEM_SELF) || PERM_EDIT_PROBLEM`），点击后 POST `operation=delete`。
  - 侧栏：
    - 始终渲染：分类树 `categoryTree`（点击即追加到 `tag`），沿用 `partials/category.html`。
    - 编辑页：`additional_file` 上传卡片（`partials/problem_files.html` + `filetype='additional_file'`），按钮 `Upload` 调 `/p/:pid/files` 的 `upload` 动作。
    - 创建页：替换为 `components/md_hint.html`。
- [ ] **2.2 题目导入 `page:problem_import`**
  - 字段（与 `problem_import.html` 一致）：`file`（zip）、`preferredPrefix`（text，placeholder=`Leave empty for default`）、`hidden`（checkbox）、仅当 `PRIV_EDIT_SYSTEM && !type` 时 `keepUser`。
  - 路由：`/problem/import/:type`（每个 importer 是一个插件注册 `ProblemAdd` 节点），侧栏"Create Problem"菜单来自 `ui.getNodes('ProblemAdd')` —— 迁移时通过 `defineSlot('problem:create:action', …)` 接收插件注入的入口。
- [ ] **2.3 错误码**
  - `ProblemAlreadyExistError(newPid)`：pid 已存在，回到编辑页高亮 `pid` 字段。
  - `ProblemIsReferencedError('edit config'|'edit files')`：禁用 / 隐藏对应区块。
  - `ValidationError('uname' | 'pid' | 'title' | 'content' | 'difficulty' | 'tag')`：回填 `Alert`。
  - 限流 `too_many_requests`。
- [ ] **2.4 测试**
  - `ProblemForm.test.tsx`：必填、pid regex、difficulty 1-10、多语言 tab 切换、删除二次确认、分类点击追加、Markdown 预览。
  - 视觉：创建 / 编辑 / 编辑只读 / 删除确认 / 导入五态。

## 3. 题目详情（事实源：`handler/problem.ts::ProblemDetailHandler` + `templates/problem_detail.html` + `templates/partials/problem_*.html`）

> 路由 `/p/:pid`；ui-next 已有 `problem_main` slot 是题库列表，**题目详情**是另一路由，命名为 `page:problem_detail`，与 ui-default 保持独立。

- [ ] **3.1 路由 / 页面数据**
  - 路由 `page:problem_detail` ↔ `/p/:pid`。
  - `PageData`：`pdoc`（必含 `pid | docId`、`title`、`config.{type,subType,timeMin,timeMax,memoryMin,memoryMax,langs,fileIOMode,fileIOInputName,fileIOOutputName,pretest,type:'submit_answer'|'objective'|'default'|...}`、`tag`、`difficulty`、`nSubmit`、`nAccept`、`reference`、`data`、`additional_file`、`hidden`）、`rdoc`（来自最新提交，可选）、`psdoc`（个人 status，可选）、`udoc`（上传者）、`tdoc`/`tsdoc`（比赛 / 训练上下文，可选，含 `pids`、`rule`、`tsdoc.detail[pid].status`）、`owner_udoc`、`tdocs` / `ctdocs` / `htdocs`（相关集合）、`discussionCount` / `solutionCount`。
  - 上下文模式：`mode ∈ { normal, contest, homework, view, correction }`，决定题面顶部 banner 与操作按钮可见性。
- [ ] **3.2 头部 `<ProblemHeader>`**
  - 左：标题区，含 `#pid.docId` 或比赛字母 `utils.getAlphabeticId(tdoc.pids.indexOf(pdoc.docId))`；前缀逻辑 `if tdoc and tdoc.pids.length > 1 then 字母 else if pdoc.pid and pdoc.pid.includes('-') then '#a#b' else '#pid|docId'`。
  - 比赛内多题导航条（仅当 `tdoc.pids.length in [2, 26]`）：A/B/C... 链接，状态图标（pass / fail / active）。
  - 收藏星标：仅 `PRIV_USER_PROFILE && !tdoc` 时显示，POST `operation=star` + `star=true|false`。
  - 状态徽章：若 `rdoc` 存在，链 `record_detail` 并显示 `model.builtin.STATUS_CODES[rdoc.status]` 对应图标 + `rdoc.score`。
- [ ] **3.3 标签行 `<ProblemTagRow>`**
  - 字段顺序与 ui-default 严格一致：
    1. `ID: pdoc.docId`（仅 `!tdoc`）
    2. `problem_type.<type>`（`pformat` 含 subtype）
    3. `File IO: <subType>`（仅 `type==='default' && subType`）
    4. 时间 / 内存 chip（`type !== 'objective' && type !== 'submit_answer'`；区间用 `min~max`）
    5. `Tried: nSubmit`（链 `record_main?pid=...`，仅 `!tdoc`）
    6. `Accepted: nAccept` 或 `?`（仅 `!tdoc`）
    7. `Difficulty: <pdoc.difficulty> || lib.difficulty(nSubmit, nAccept) || '(None)'`
    8. `Uploaded By: <owner_udoc.render_inline>`
    9. `Tags > <tag chips>`（点击展开）
- [ ] **3.4 题面区 `<ProblemContent>`**
  - 复用 `Article` 组件渲染 `pdoc.content|content(preferredLang, pdoc.html)`。
  - 多语言 tab：仅当 `pdoc.content|contentLang|length > 1` 时显示，链接到 `./<pid>?lang=<k>`。
  - 顶部警告 banner（`<Alert warn>`）：
    - `pdoc.data.length === 0 && !pdoc.reference` → "No testdata at current."
    - `typeof pdoc.config === 'string'` → 直接显示 `pdoc.config` 错误信息。
    - `pdoc.config.langs && !pdoc.config.langs.length` → "No submission language available for this problem."
    - 比赛内 `mode === 'view'` → "You cannot submit for this problem because the contest is ended. You can click 'Open in Problem Set' to view this problem in normal mode."
    - 比赛内 `mode === 'correction'` → "The contest is ended. New submissions will be treated as correction submissions and will not be counted in the contest."
  - 偏好语言解析顺序：`request.query.lang → user.viewLang → session.viewLang → first lang`。
- [ ] **3.5 侧栏 `<ProblemSidebar>`**
  - 复用 `sidebar/Menu` 组件。项顺序与 ui-default 一致：
    1. 条件项：仅 `discussion_node | discussion_detail` 页时显示 "Create a Discussion" / "Login to Create a Discussion" / "Join Domain to Create a Discussion" / "No Permission to Create a Discussion" 四态。
    2. 条件项：仅 `problem_detail` 页时显示 Scratchpad 入口（条件：`PERM_SUBMIT_PROBLEM && setting('ui-default.enableScratchpad')`，快捷键 `Alt+E` / `Alt+Q`）—— 此项 ui-next 暂不实现，预留 `defineSlot('problem:sidebar:scratchpad', …)`。
    3. 其它页：默认 "View Problem" 链 `problem_detail`。
    4. "Submit" / "Login to Submit" / "Join Domain to Submit" / "No Permission to Submit"（按 `PERM_SUBMIT_PROBLEM` / `PRIV_USER_PROFILE` / `_dudoc.join` 切换）。
    5. `PERM_REJUDGE_PROBLEM` 时："Rejudge all submissions"（POST `operation=rejudge`）。
    6. 分隔符（当 `PERM_VIEW_DISCUSSION || _canViewSolution`）。
    7. `PERM_VIEW_DISCUSSION` 时："Discussions"（含 `discussionCount`）。
    8. `_canViewSolution` 时："Solutions"（含 `solutionCount`），`_canViewSolution = PERM_VIEW_PROBLEM_SOLUTION || (PERM_VIEW_PROBLEM_SOLUTION_ACCEPT && psdoc.status === STATUS_ACCEPTED)`。
    9. "Files"（`/p/:pid/files`）。
    10. "Statistics"（`/p/:pid/stat`）。
    11. `own(pdoc, PERM_EDIT_PROBLEM_SELF) || PERM_EDIT_PROBLEM` 时：分隔符 + "Edit" / "Judge Config"（`!pdoc.reference`）。
    12. 仅 `problem_detail` 页：分隔符 + `own(pdoc) || PRIV_READ_PROBLEM_DATA || PERM_READ_PROBLEM_DATA` 时 "Download" + `PRIV_USER_PROFILE` 时 "Copy"。
- [ ] **3.6 Information 卡片**：用 `<dl>` 渲染（沿用 `partials/problem-sidebar-information.html`）：ID / Time / Memory / Difficulty / Tags / # Submissions / Accepted / Uploaded By。注意"Tags"在卡片里也展示一次（与头部 tag row 不同位置，与 ui-default 保持一致）。
- [ ] **3.7 Related 卡片**：当 `tdocs.length || ctdocs.length || htdocs.length > 0` 时显示，列出"包含此题的训练 / 比赛 / 作业"链接。
- [ ] **3.8 实时与连接**
  - `UiContext` 字段：`problemId`、`problemNumId`、`codeLang`、`codeTemplate`、`pdoc`、`tdoc`/`tsdoc`（可选）、`canViewRecord`、`postSubmitUrl` / `getSubmissionsUrl` / `getRecordDetailUrl` / `pretestConnUrl`（含比赛 `tid` 时拼上）。
  - 端点：`/record-conn?pretest=1&uidOrName=<uid>&pid=<docId>&domainId=<domainId>[&tid=<tid>]`。
  - 迁移时：把这套 UiContext 字段写到 ui-next 的 `PageData.problemDetail` 子结构上，供 Scratchpad / 自定义面板后续接入。
- [ ] **3.9 测试**
  - `ProblemHeader.test.tsx`：标题前缀规则、比赛字母、星标切换。
  - `ProblemTagRow.test.tsx`：所有 9 行条件分支。
  - `ProblemSidebar.test.tsx`：每个 menu item 的可见性矩阵（4 种用户角色 × 4 种页面模式）。
  - `problem_detail.test.tsx`：警告 banner 4 种、比赛 view / correction / normal 三态。
  - 视觉：登录 / 匿名 / 比赛进行中 / 比赛结束 view / 比赛结束 correction / 管理员。

## 4. 编写代码（事实源：`handler/problem.ts::ProblemSubmitHandler` + `handler/record.ts` + `templates/problem_submit.html` + `templates/record_detail.html` + `templates/record_main.html`）

- [ ] **4.1 提交页 `page:problem_submit`（GET/POST `/p/:pid/submit`）**
  - 页面数据：`pdoc`、`langRange`（优先 `pdoc.config.langs` → `setting.SETTINGS_BY_KEY.codeLang.range`）、`handler.user.codeLang`（默认选中）、`page_name`（含比赛上下文时区分 `contest_detail_problem_submit` / `homework_detail_problem_submit`）。
  - 字段：`lang`（select）、`code`（textarea，`autofocus`、`nospellcheck`）、`file`（zip / 单文件，可选）。
  - 提交：沿用 ui-default 的 form POST 行为；前端在调用 `/p/:pid/submit` 前校验 `code` 与 `file` 至少一个；文件大小按 `limit.codelength` 提示（默认 128KB；`submit_answer` 类型 128MB；二进制语言或 `.zip` 文件走文件上传）。
  - 错误码：`ProblemConfigError`（`pdoc.config` 不是 object）、`ProblemNotAllowLanguageError`、`ProblemNotAllowPretestError('type')`、`ValidationError('input' | 'code')`、`FileTooLargeError('file')`、限流。
  - 比赛上下文：`tid` 时走 `problem_submit?pid=…&tid=…`，若 `!contest.canShowSelfRecord` 则跳 `homework_detail` / `contest_problemlist` 而不是 `record_detail`。
  - `pretest`：仅 `default` / `remote_judge` 类型可用；携带 `input[]` 数组（来自 scratchpad 测试用例）。
- [ ] **4.2 提交页 scratchpad 集成（条件项）**
  - `setting('ui-default.enableScratchpad')` + `PERM_SUBMIT_PROBLEM`：复用 ui-default 的 Scratchpad，键盘 `Alt+E` 打开 / `Alt+Q` 关闭，hotkey hook 接 ui-next。
  - 预测试：`pretestConnUrl` 用 `EventSource` 接收增量更新，渲染到 scratchpad 面板。
- [ ] **4.3 提交详情 `page:record_detail`（GET `/record/:rid`）**
  - 页面数据：`rdoc`（必含 `status | code | files.code | files.hack | lang | _id | domainId | judgeAt | hackTarget | contest | uid`）、`pdoc`、`tdoc`、`udoc`、`judge_udoc`（可选）、`allRevs`（历史版本 `[revId, time][]`）、`rev`（当前选中 rev）。
  - 状态区：若 `typeof rdoc.status === 'number'` 且 `!rev`，渲染 `record_detail_status.html`（含进度 / 编译 / 错误信息），用 `EventSource('/record-detail-conn?domainId=…&rid=…')` 实时刷新。
  - 代码区：`<pre><code class="language-<langs[rdoc.lang].highlight>">` + `?download=true` 下载按钮（含 `hack` 文件时下载 Hack Input）。
  - 侧栏操作（按权限矩阵）：
    1. `PERM_REJUDGE && !rdoc.files.hack`：`Rejudge`（POST `operation=rejudge`） + `Cancel Score`（POST `operation=cancel`）。
    2. `PERM_SUBMIT_PROBLEM && pdoc.config.hackable && rdoc.status === STATUS_ACCEPTED && rdoc.uid !== user._id`：`Hack`（链 `/p/:pid/hack/:rid`，比赛时附 `?tid=…`）。
    3. 通用 Information 列表（与 ui-default 顺序一致）：`Submit By` / `Hacked`（若 `rdoc.hackTarget`） / `Problem` / `Homework|Contest`（按 `tdoc.rule`） / `Language`（仅 `type !== 'objective'`） / `Code Length`（仅 `rdoc.code`） / `Submit At`（`datetimeSpan(rdoc._id)`） / `Judged At` / `Judged By`。
    4. 状态汇总 `record_detail_summary.html`（仅当 `typeof rdoc.status === 'number'`）。
    5. History（仅当 `allRevs.length`）：`Latest Version` + 各历史版本，URL 形式 `?rev=<id>`。
- [ ] **4.4 提交列表 `page:record_main`（GET `/record`）**
  - 筛选字段：`uidOrName`、`pid`、`tid`（contest）、`language`、`status`、`all`、`allDomain`，与 ui-default 一致。
  - 实时：`socketUrl = '/record-conn?domainId=…[&tid=…][&uidOrName=…][&pid=…][&all=1][&allDomain=1]'`，`rids = rdocs.map(r => r._id.toString())`。
  - 行点击跳 `record_detail?rid=<rid>`。
- [ ] **4.5 hack 页 `page:problem_hack`（GET/POST `/p/:pid/hack/:rid`）**
  - 字段：`input`（textarea，可为空）+ `autoOrganizeInput`（checkbox）、可选文件上传（≤2MB）。
  - 错误：`HackFailedError`（"This problem is not hackable." / "This contest is not hackable." / "You cannot hack your own submission" / "You must accept this problem before hacking." / "You cannot hack a unsuccessful submission."）、`ContestNotLiveError`、`RecordNotFoundError`、限流。
- [ ] **4.6 测试**
  - `problem_submit.test.tsx`：默认语言、文件 vs code 互斥、`pretest` 数组、比赛上下文跳转、限流文案。
  - `record_detail.test.tsx`：5 种权限分支 × 状态徽章 × 历史版本切换 × 实时刷新收敛。
  - `record_main.test.tsx`：筛选条件组合、URL 参数同步、socket 收敛。
  - `problem_hack.test.tsx`：4 类 `HackFailedError` 渲染。
  - 视觉：提交页（编辑器 / 文件上传 / 错误回显）+ 评测中（4 阶段进度）+ 评测完成（AC / WA / TLE / MLE / RE）+ hack 表单。

## 5. 跨页：视觉回归、灰度

- [ ] **5.1 视觉回归基线**
  - 在 4 个页面的 happy-path 各加一张 Playwright 截图，桌面 1440 / 平板 768 / 移动 390 三档 × 暗 / 亮两态 = 24 张基线。
  - `test:visual:update` 走流程：先 `yarn workspace @hydrooj/ui-next build`，再 `test:visual:update`，最后 `test:visual` 比对。
- [ ] **5.2 灰度开关**
  - 单页 query `?__disableNext=1` 立即回退到 ui-default（按 ui-default 已有的 `?legacy=1` 机制改造）。
  - 全局开关：`/admin/ui?next=on|off`，写入 system setting（`SettingModel`）。
  - 指标：每个 `page:*` slot 上报 mount 次数到 `prom-client`（如果 `prom-client` addon 启用）。
- [ ] **5.3 共享 token 验证清单（DoD）**
  - 路由与后端 `ctx.Route(…)` 完全一致。
  - 表单 `name` 属性与后端 `@param/@post` 名完全一致（`uname`/`password`/`rememberme`/`tfa`/`authnChallenge`/`login_submit`/`mail`/`code`/`preferredPrefix`/`hidden`/`keepUser`/`pid`/`title`/`content`/`tag`/`difficulty`/`lang`/`file`/`input`/`autoOrganizeInput`/`operation`/`star` 等）。
  - 错误码与 `HydroError` 子类一一对应（不在前端编文案，统一用 `err.message` + i18n 兜底）。
  - 副作用（限流计数 / 计数器 / 邮件发送 / 2FA 清除）由后端负责，前端不绕过。
  - 链接走 `useBuildUrl` 而非硬编码，确保 domain 切换 / 反代下也正确。
  - 与 `ui-default` 共存时（`next` 渲染器 priority 100 / `asFallback: true`），用户对同一 URL 的体验保持一致。

## 6. 风险 / 待确认

- **Scratchpad**：ui-default 的 Scratchpad 是个独立的 Monaco 容器（`pages/problem_main.page.tsx` 的 scratchpad 模式），迁移成本高；建议 ui-next **第 1 期先不接**，预留 `defineSlot('problem:sidebar:scratchpad', …)`，等核心页面稳定后再做。
- **judge 流式输出（`RecordMainConnectionHandler` / `RecordDetailConnectionHandler`）**：ui-default 用 `socket.io`。ui-next 当前没有 socket 客户端；需要 `use-judge-stream.ts` 选型（原生 `EventSource` / 自建 WS），并实现断线重连 + 最终态收敛。
- **编辑器选型**：ui-default 走 Monaco（`components/monaco`）。Monaco bundle 体积大；ui-next 是否复用还是换 CodeMirror 7（更小、token 化友好）需与 `package.json` 体积目标对齐。
- **Markdown 上传图**：ui-default 走 `user.upload` + 后端重命名到 `problem/<id>/additional_file/`。ui-next 需复用同一上传端点（不能改 backend），UI 上要暴露同等的 drag-drop / 复制粘贴体验。
- **`mode === 'contest'` 的 `canViewRecord`**：后端在 `RecordListHandler` 计算后写入 `UiContext.canViewRecord`，前端不能假设总是 true；提交成功后跳哪条路由必须读这个布尔。

---

## 7. q.md code review fixes — 进度快照（2026-07-09，会话被中断）

> 来源：`/home/Hydro/.claude/q.md` 报告的 20 条 ui-next code review findings（+ 2 条 follow-up）。本节是中断点状态快照，下个会话从这里继续。

### 7.1 已完成（14 项）

| # | finding | 文件 | 关键改动 |
|---|---|---|---|
| 1 | #4 | `components/auth/SignInDialog.tsx` | `usePageData()` 移到 `if (!open) return null` 之前；hook 数量稳定为 7 |
| 2 | #5 | `components/primitives/Alert.tsx:69-94` | `RateLimitAlert` `code` 类型从 string 改 number；`'too_many_requests'` 字符串改 `429` |
| 3 | #5b | `components/primitives/Alert.tsx:74-94` | 追加 `code===403` + `'too frequent'` 子串兜底（Hydro 实际限流是 `OpcountExceededError`/ForbiddenError，message 模板 `'Too frequent operations of {0} …'`） |
| 4 | #9 | `hooks/use-judge-stream.ts:53-126` | 新增 `timeoutRef` + `clearScheduledConnect()` + `closeExistingSource()`；connect/error/cleanup 路径全部清理；stale error 加 `esRef.current === es` guard |
| 5 | #11 | `pages/record_detail.tsx:1,55-79` | 内联 EventSource 的 `liveStatus` 移出 deps，改用 `liveStatusRef`；终态显式 `es.close()` 代替"重跑 effect + cleanup" |
| 6 | #2 | `components/article/Article.tsx`（重写） + `package.json` | `react-markdown@^10.1.0` + `remark-gfm@^4.0.1`；新增 `content?: string` prop（关键：原 Article 不支持 `content` prop，problem_detail.tsx:217 一直静默忽略）；新增 `Article.test.tsx` 8 个测试 |
| 7 | #7 | `components/sidebar/Menu.tsx`（重写）+ `Menu.module.css` | 新 `MenuItem` 字段 `href?/form?/action?/postBody?/csrf?/separator?`；`FormRow` 渲染隐藏 `<form action method>` + 隐藏 input + submit button；`resolveForm()` 归一化 `{form:true, action, postBody}` 与 `{form:{...}}` |
| 8 | #13 | `components/auth/LoginForm.tsx:120-131, 202` | 抽 `oauthRedirectQs` 用 `URLSearchParams` 构造；避免手动拼接重编码 `?` `&` |
| 9 | #14 | `components/problem/ProblemForm.tsx:66-92` | useState 初始化器先 `JSON.parse` 旧 content；line 123 `fd.set('content', JSON.stringify(contentByLang))` 保持原状（与 ui-default 约定一致） |
| 10 | #12 | `pages/record_main.tsx:75-91` | `apply(patch)` 改用项目自带 `useNavigate()` 替代 `window.location.search = ...`；表单值保留，try/catch + `setError(HydroClientError)` |
| 11 | #16 | `pages/record_main.tsx:4, 7, 60, 67, 88` | `useState<null>(null)` → `useState<HydroClientError \| null>(null)`；删 `(error as unknown as {message: string}).message` 断言 |
| 12 | #15 | `pages/problem_import.tsx:15-23, 26-46, 49-136` | early return loading + 拆分 `ProblemImportShell` / `ProblemImportForm`；`actionUrl` 只在 PageData 就绪后计算；顺手修 `Button` 缺 `disabled` prop |
| 13 | #17 | `hooks/use-post-login-redirect.ts:17-43` | 抽 `isAuthPagePath(value, prefix)` 只在 `prefix === value` 或 `prefix + ?/#/` 时拦截；放过 `/loginRequired` 等合法路径 |
| 14 | #12b | `pages/problem_main.tsx:143, 167, 174, 193, 196, 340` + `problem_main.test.tsx` | 5 处 `window.location.href = ...` 全替换为 `navigate(...)`；测试用 `vi.spyOn(routerMod, 'useNavigate')` 替代 `window.location.href` stub |

### 7.2 待续（8 项 — 中断前第四批 agent 被停止，未做）

| # | finding | 预期文件 | 状态 |
|---|---|---|---|
| 15 | #10 | `pages/problem_detail.tsx:87` + `context/UiContext*.ts(x)` | 需改 context 实现提供响应式；不能只在 problem_detail 加 workaround |
| 16 | #3 | `pages/problem_detail.tsx:70` | `STATUS` 枚举应是 1=AC 2=WA 3=TLE…，原代码按 0-indexed 全部偏移一位；从 `@hydrooj/common` 导入 `STATUS` 常量 |
| 17 | #6 | `pages/problem_detail.tsx:103, 110-116` | preferredLang 先 `viewLang` 本身（'zh_CN'），再按 baseLang 兜底（'zh' → 找 'zh_CN'/'zh_HK'/'zh_TW'）；并补 `JSON.parse` contentText |
| 18 | #8 | `pages/problem_detail.tsx:222` + sidebar 三套 helper | `getNormalMenu` / `getContestMenu` / `getHomeworkMenu`；`mode === 'correction'/'view'` 时显示 'Open in Problem Set'；homework 模式隐藏 Discussions/Solutions/Files/Statistics |
| 19 | #18 | `pages/problem_detail.tsx:177-191` | status 比较用 `STATUS.STATUS_AC === 1` 而非 `=== 0`；链接拼 `?tid=${tdoc._id}` 保留 |
| 20 | #19 | `templates/partials/` 或 `components/problem/` 下新建 `ProblemFiles` / `ProblemReference` / `ProblemOpenGraph` / `Scratchpad`（占位） / `MonacoEditor`（textarea 兜底） | 不硬塞到 problem_detail.tsx；不引入 monaco 依赖 |
| 21 | #20 | `lib/difficulty.ts` + `lib/avatar.tsx` + problem 列表/详情 memory & tag 渲染 | `nSubmit=0 → '—'`；`uploadedBy` 旁加 `<Avatar uid={uid} size=24>`；`parseMemoryMB` + GiB/MiB 单位；tag 默认折叠 5 个 + "Show all" |
| 22 | #1 | 全局：renderer 注入 `window.LOCALES` + `src/lib/i18n.ts` + `useTranslate()` + `locales/zh.ts`；改 14+ 文件硬编码英文为 `t('key')` | **最后做**，会触碰 14+ 文件 |

### 7.3 子进程已发现的相关问题（已修 / 标 follow-up，未修）

- **`#14` 修复** 时发现 `problem_detail.tsx:110-116` 的 `contentText` 也未 `JSON.parse` —— 属于 #6 的关联修复。
- **`#12+#16` 修复** 时发现 `problem_main.tsx` 也有全页 reload —— 已开 #12b 并完成。
- **`#9` 修复** 时发现 record_detail 不走 `useJudgeStream`，是独立内联 EventSource —— 已在 #11 单独修。
- **`#15` 修复** 时发现 Button primitive 缺 `disabled` prop，导致 5 处 use site 类型错误 —— 已修。

### 7.4 中断点文件改动（git status 应该能看到）

- `packages/ui-next/src/components/auth/SignInDialog.tsx`
- `packages/ui-next/src/components/auth/LoginForm.tsx`
- `packages/ui-next/src/components/article/Article.tsx`（重写）
- `packages/ui-next/src/components/article/Article.test.tsx`（新增）
- `packages/ui-next/src/components/primitives/Alert.tsx`
- `packages/ui-next/src/components/primitives/Button.tsx`（small fix）
- `packages/ui-next/src/components/problem/ProblemForm.tsx`
- `packages/ui-next/src/components/sidebar/Menu.tsx`（重写）
- `packages/ui-next/src/components/sidebar/Menu.module.css`
- `packages/ui-next/src/hooks/use-judge-stream.ts`
- `packages/ui-next/src/hooks/use-post-login-redirect.ts`
- `packages/ui-next/src/pages/problem_import.tsx`
- `packages/ui-next/src/pages/problem_main.tsx`
- `packages/ui-next/src/pages/problem_main.test.tsx`
- `packages/ui-next/src/pages/record_detail.tsx`
- `packages/ui-next/src/pages/record_main.tsx`
- `packages/ui-next/package.json`（react-markdown + remark-gfm 新增）

### 7.5 下个会话从哪里接

1. 跑 `git status --short` 确认 7.4 的文件列表都在
2. 跑 `cd /home/Hydro/packages/ui-next && npx vitest run` 确认 111+ 测试通过
3. 跑 `npx tsc --noEmit -p tsconfig.ui-next.json` 确认无新增错误
4. 按 7.2 顺序继续：
   - 先派发 `problem_detail.tsx` 的 #3+#6+#8+#10+#18 合并子进程（5 个 bug 同一文件，串行）
   - 派发 #19 partials（独立子进程）
   - 派发 #20 细节（独立子进程）
   - 最后派发 #1 i18n（独立大任务）
