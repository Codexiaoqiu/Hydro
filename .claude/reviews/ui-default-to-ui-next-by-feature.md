# ui-default → ui-next 按功能模块深度审查报告

**生成日期**：2026-08-03
**审查范围**：F1-F9 共 9 大业务模块的「功能 + UI」完整迁移
**前置报告**：`.claude/reviews/ui-default-to-ui-next-migration-report.md`、`.claude/reviews/ui-default-to-ui-next-deep-review.md`

---

## 总体结论

| 模块 | Backend Routes | ui-next Pages | 完整度 | 备注 |
|---|---|---|---|---|
| F1 鉴权 | 10 | 9 | **95%** | `/user/delete` 缺失 |
| F2 题目 | 16 | 12 | **88%** | sidebar JS 部分未复刻 |
| F3 评测记录 | 2 + SSE | 2 | **100%** | 含实时更新 |
| F4 比赛 | 13 | 11 | **92%** | `/contest/:tid/code` 缺失 |
| F5 训练/作业 | 13 | 6 | **80%** | `/code` 路由缺失 |
| F6 讨论 | 8 | 5 | **100%** | raw 由模板服务 |
| F7 域管理 | 10 | 11 | **95%** | ranking 孤儿页 |
| F8 用户中心 | 8 | 6 | **75%** | 多 home 子页面缺失 |
| F9 管理后台 | 10 | 8 | **70%** | **manage_config 重大降级** |

**整体「功能 + UI 都到位」完成度：约 85%**

---

## 🔴 三大全局关键发现

### 1. `manage_config.tsx` 重大功能降级

| 维度 | ui-default `setting.page.tsx` | ui-next `manage_config.tsx` |
|---|---|---|
| 编辑器 | Monaco + YAML | 简单 `<input>` 表单 |
| schema 支持 | schemastery 全 schema（含 union/intersect/嵌套对象） | 仅 flat `string`/`number`/`boolean` |
| secret 字段 | 自动隐藏为 `[hidden]` | 无处理 |
| 复杂配置（如 server.cdn、judge.token、嵌套 mail 配置） | ✅ | ❌ 不能编辑 |
| 体量 | 数百行 + `@hydrooj/components/ConfigEditor` | 88 行 |

**影响**：系统管理员无法在线编辑复杂 schema → fallback 到 ui-default，破坏 ui-next 一致性原则。

### 2. 5 个孤儿 ui-next 页面（已在前置报告详查）

`about.tsx`、`home_domain.tsx`、`ranking.tsx`、`status.tsx`、`wiki_help.tsx`
- 源码存在 + 测试存在
- 生产 bundle 中被 tree-shake 掉（**完全死代码**）
- 用户访问对应路由 (`/ranking`、`/status`、`/home/domain`) 走 ui-default

### 3. 7 个次要功能路径缺失

| 路由 | 类别 | 影响范围 |
|---|---|---|
| `/user/delete` | 账户管理 | 用户删号功能 |
| `/contest/:tid/code` | 代码导出 | 比赛赛后 |
| `/homework/:tid/code` | 代码导出 | 作业后 |
| `/home/avatar` | 用户头像 | 个人中心 |
| `/home/changeMail/:code` | 改邮箱 | 邮箱变更 |
| `/storage` | 存储管理 | 用户数据 |
| `/account/:uid` | 切换账号（仅 PRIV_EDIT_SYSTEM） | 管理员功能 |

---

## F1 鉴权 — 95%

| 功能 | Backend | ui-next | 状态 |
|---|---|---|---|
| `/login` 账号密码 + TFA + WebAuthn | UserLoginHandler | user_login.tsx + LoginForm + TwoFactorDialog | ✅ |
| `/user/tfa` 探测 | UserTFAHandler | LoginForm 内联探测 | ✅ |
| `/user/webauthn` | UserWebauthnHandler | SimpleWebAuthn + user_sudo | ✅ |
| `/register`, `/register/:code` | UserRegister* | user_register + with_code | ✅ |
| `/lostpass`, `/lostpass/:code` | UserLostPass* | user_lostpass + with_code | ✅ |
| `/logout` | UserLogoutHandler | user_logout | ✅ |
| `/user/sudo` (TFA/Password/WebAuthn) | UserSudoHandler | user_sudo（143 行） | ✅ |
| `/user/delete` | UserDeleteHandler | ❌ 缺失 | ⚠️ |
| `/user/:uid` 详情 | UserDetailHandler | user_detail + ProfileHeader + ProfileTabs + UserStat | ✅ |
| SignInDialog (Nav modal) | (与 `/login` 复用) | SignInDialog | ✅ |

**改进建议**：F1 实际质量高；OAuth/LDAP 通过 `loginMethods` 数组驱动，UI 已透明支持。

---

## F2 题目 — 88%

| 功能 | Backend | ui-next | 状态 |
|---|---|---|---|
| `/p` 列表 + 搜索 | ProblemMainHandler | problem_main（512 行 + 多个 sections） | ✅ |
| `/problem/random` | RandomHandler | problem_main 内联链接 | ✅ |
| `/p/:pid` 详情 | DetailHandler | problem_detail（574 行） + Hero/Content/Sidebar | ✅ |
| `/p/:pid/submit` | SubmitHandler | problem_submit + CodeEditor + LanguageSelect | ✅ |
| `/p/:pid/hack/:rid` | HackHandler | problem_hack（106 行） | ✅ |
| `/p/:pid/edit` | EditHandler | problem_edit + ProblemForm | ✅ |
| `/p/:pid/config` | ConfigHandler | problem_config（170） + ConfigTree/Editor/BasicForm | ✅ |
| `/p/:pid/files` | FilesHandler | problem_files + ProblemAdditionalFiles | ✅ |
| `/p/:pid/file/:filename` 下载 | DownloadHandler | 无需 page | ✅ |
| `/p/:pid/solution` + `:sid` | SolutionHandler | problem_solution（92） | ✅ |
| `/p/:pid/stat` | StatHandler | problem_statistics + Ring + Trend | ✅ |
| `/problem/create` | CreateHandler | problem_create | ✅ |
| `/problem/import` (multi-format) | ImportHandler | problem_import（151） | ✅ |
| sidebar JS 交互（show-category/rejudge/copy） | — | problem-sidebar-items（252）但部分 JS 未复刻 | ⚠️ |

---

## F3 评测记录 — 100%

| 功能 | Backend | ui-next | 状态 |
|---|---|---|---|
| `/record` 列表 + 过滤 | RecordListHandler | record_main（276） + 状态分组 | ✅ |
| `/record/:rid` 详情 | RecordDetailHandler | record_detail（261） + rejudge/cancel | ✅ |
| 实时更新（SSE） | RecordConnHandler | useJudgeStream（EventSource）+ record_* | ✅ |

**亮点**：ui-default 用 WebSocket；ui-next 改用 SSE（HTTP 兼容、断线重连处理）。
**评价**：F3 是迁移最彻底的模块。

---

## F4 比赛 — 92%

| 功能 | Backend | ui-next | 状态 |
|---|---|---|---|
| `/contest` 列表 | ListHandler | contest_main + HeroBanner + Pager | ✅ |
| `/contest/:tid` 详情 | DetailHandler | contest_detail | ✅ |
| `/contest/:tid/problems` | ProblemListHandler | contest_problemlist（296）+ InlineForm | ✅ |
| `/contest/:tid/edit` | EditHandler | contest_edit | ✅ |
| `/contest/:tid/print` + alt | PrintHandler | contest_print + PrintKiosk | ✅ |
| `/contest/:tid/management` | ManagementHandler | contest_manage（319） | ✅ |
| `/contest/:tid/clarification` | ClarificationHandler | contest_clarification + InlineForm | ✅ |
| `/contest/:tid/user` | UserHandler | contest_user + AddDialog + UserTable | ✅ |
| `/contest/:tid/balloon` | BalloonHandler | contest_balloon + useBalloonPoll | ✅ |
| `/contest/:tid/code` | CodeHandler | ❌ 缺失 | ⚠️ |
| `/contest/:tid/file/...` 下载 | DownloadHandler | 无需 page | ✅ |

**复用**：`homework_scoreboard*` 通过模板共享由 `contest_scoreboard.tsx` 服务。

---

## F5 训练/作业 — 80%

| 功能 | Backend | ui-next | 状态 |
|---|---|---|---|
| `/training`, `/training/:tid` | TrainingMain/DetailHandler | training_main（194） + training_detail（356） | ✅ |
| `/training/create`, `/training/:tid/edit` | EditHandler | training_create + training_edit（230） | ✅ |
| `/training/:tid/file` | FilesHandler | training_files | ✅ |
| `/training/:tid/file/:filename` 下载 | DownloadHandler | 无需 page | ✅ |
| `/homework`, `/homework/:tid` | HomeworkMain/DetailHandler | homework_main（121） + homework_detail（175） | ✅ |
| `/homework/:tid/edit` | EditHandler | homework_edit（141） | ✅ |
| `/homework/:tid/file` | FilesHandler | homework_files | ✅ |
| `/homework/:tid/code` | CodeHandler | ❌ 缺失 | ⚠️ |
| `/homework/:tid/scoreboard`, `:view` | 通过 ScoreboardHandler 共享 contest_scoreboard.html | ui-next 由 contest_scoreboard.tsx 服务 | ✅ |

---

## F6 讨论 — 100%

| 功能 | Backend | ui-next | 状态 |
|---|---|---|---|
| `/discuss` 主入口 | MainHandler | discussion_main（244） + NodesWidget | ✅ |
| `/discuss/:did` 详情 | DetailHandler | discussion_detail（105） + Reply + 分页 | ✅ |
| `/discuss/:did/edit` | EditHandler | discussion_edit | ✅ |
| `/discuss/:did/raw`, 嵌套 raw | RawHandler | 直接渲染 | ✅ |
| `/discuss/:type/:name` 节点入口 | NodeHandler | discussion_main 复用 | ✅ |
| `/discuss/:type/:name/create` | CreateHandler | discussion_create（89） + MarkdownEditor | ✅ |

**亮点**：`discussion_main_or_node.html` 模板由 `discussion_main.tsx` 单一 page 服务（含 vnode 上下文）。DiscussionNodesWidget 替代 ui-default 静态节点墙。

---

## F7 域管理 — 95%

| 功能 | Backend | ui-next | 状态 |
|---|---|---|---|
| `/domain/dashboard` | DashboardHandler | domain_dashboard | ✅ |
| `/domain/edit` | EditHandler | domain_edit | ✅ |
| `/domain/user` | UserHandler | domain_user + MemberTable | ✅ |
| `/domain/permission` | PermissionHandler | domain_permission | ✅ |
| `/domain/role` | RoleHandler | domain_role + RoleSelector | ✅ |
| `/domain/group` | GroupHandler | domain_group | ✅ |
| `/domain/join_applications` | JoinAppHandler | domain_join_applications | ✅ |
| `/domain/join` | JoinHandler | domain_join | ✅ |
| `/domain/search` | SearchHandler（Query API/JSON） | 无需 page | ✅ |
| `/ranking` | DomainRankHandler | ❌ orphan ranking.tsx 未注册 | **HIGH** |
| `/` 主页域上下文 | Homepage | domain_base + domain_create | ✅ |

---

## F8 用户中心/私信 — 75%

| 功能 | Backend | ui-next | 状态 |
|---|---|---|---|
| `/` 主页 | HomeHandler | homepage + BulletinSection/ContestSection/etc. | ✅ |
| `/home/security` | SecurityHandler | home_security（428） + TFA/WebAuthn 注册 | ✅ |
| `/home/settings/:category` | SettingsHandler | home_settings（260） + PreferenceSection | ✅ |
| `/home/domain` | DomainHandler | ❌ orphan home_domain.tsx 未注册 | **HIGH** |
| `/home/domain/create` | DomainCreateHandler | domain_create 复用 | ✅ |
| `/home/messages` | MessagesHandler | home_messages（291） + ConversationList + MessagePane + useMessageStream | ✅ |
| `/home/avatar` | AvatarHandler | ❌ 缺失 | ⚠️ |
| `/home/changeMail/:code` | ChangeMailHandler | ❌ 缺失 | ⚠️ |
| `/storage` | StorageHandler | ❌ 缺失 | ⚠️ |
| `/account/:uid`（admin only） | SwitchAccount | ❌ | ⚠️ |
| `/language/:lang` | SwitchLang | POST 切换，i18n.ts 已支持 | ✅ |

**F8 缺失原因**：`avatar/changeMail/storage/account` 是低频用户管理操作，迁移优先级靠后。

---

## F9 管理后台 + 杂项 — 70%

| 功能 | Backend | ui-next | 状态 |
|---|---|---|---|
| `/manage` 入口 | SystemMainHandler | ❌（重定向到 dashboard） | ⚠️ |
| `/manage/dashboard` | DashboardHandler | manage_dashboard（163） | ✅ |
| `/manage/script`（runs script） | ScriptHandler | manage_script（130） + Monaco | ✅ |
| `/manage/setting` | SettingHandler | manage_setting（211）+ 编辑列 | ✅ |
| **`/manage/config`** | SystemConfigHandler | **manage_config（88 - flat only）** | **HIGH** |
| `/manage/userimport` | UserImportHandler | manage_user_import（204）+ 进度 | ✅ |
| `/manage/userpriv` | UserPrivHandler | manage_user_priv（256）+ RoleSelector | ✅ |
| `/admin/ui`（toggle ui-next） | AdminUiHandler | POST only，无需 page | ✅ |
| `/status` | StatusHandler | ❌ orphan status.tsx 未注册 | **HIGH** |
| `/about` | （无 handler） | orphan about.tsx | **HIGH** |
| `/wiki/help` | （无 handler） | orphan wiki_help.tsx | **HIGH** |

---

## 模块化完成度评分

| 模块 | 关键评估点 | 评分 |
|---|---|---|
| F1 鉴权 | TFA/WebAuthn/OAuth/2FA Dialog/sudo 三路径 | **95%** |
| F2 题目 | main/detail/submit/edit/config/stat/hack/import 全套 | **88%** |
| F3 评测记录 | 列表过滤/SSE 实时/rejudge 操作 | **100%** |
| F4 比赛 | 比赛流程 + balloon + clarification + print | **92%** |
| F5 训练/作业 | share 中间、code 导出缺失 | **80%** |
| F6 讨论 | 全覆盖（main/node 共享） | **100%** |
| F7 域管理 | 11 个 page 齐全，ranking 孤儿 | **95%** |
| F8 用户中心 | 偏好/通知/账户管理多处缺失 | **75%** |
| F9 管理后台 | **manage_config 重大降级** + 3 孤儿 | **70%** |

---

## 优先级修复建议

### 立即修复（CRITICAL）

1. **`manage_config` 重大功能降级** — 移植 `ConfigEditor` + Monaco + YAML + schemastery 转换；或复用 `@hydrooj/components`。
2. **5 个孤儿 ui-next 页面** — 注册或删除，避免代码/测试漂移。

### 短期（1-2 sprint）

3. **`/user/delete`** — 加 sp 化页面。
4. **`/contest/:tid/code` + `/homework/:tid/code`** — 比赛/作业代码导出页。
5. **`/home/avatar` + `/home/changeMail/:code` + `/storage`** — 用户管理类页面。
6. **`problem_sidebar` JS 交互（show-category/rejudge confirm/copy prompt）** 完整复刻。

### 中期（产品策略）

7. **决定 ui-next 是否替代 ui-default**：涉及 Monaco/YAML 完整性、邮件模板保留、第三方 addon 适配、fallback 策略。
8. **17 个 ui-default 模板归宿**：mail 系列保留（合理）；partial/print 保留；orphan pages 决策（删/注）。

---

## 三个报告文档

| 报告 | 路径 | 视角 |
|---|---|---|
| 基础迁移完整性 | `.claude/reviews/ui-default-to-ui-next-migration-report.md` | 文件类型维度（页面/组件/样式/渲染器/测试） |
| 深度 review | `.claude/reviews/ui-default-to-ui-next-deep-review.md` | D1-D7 安全/hooks/孤儿页/manifest/主题/性能 |
| **功能模块完整性** | **本文件** | **F1-F9 按业务模块覆盖** |

报告位置：`.claude/reviews/ui-default-to-ui-next-by-feature.md`

---

## 修复执行状态（2026-08-04 同步）

**计划**：`docs/superpowers/plans/2026-08-03-ui-default-to-ui-next-fixes.md`
**执行结果**：10 个 task 全部完成 + 最终 whole-branch review verdict = **Ready to merge**
**Commit 范围**：`b594fdc5`（plan）.. `243c56c6`（final fix），共 17 个 commit on master
**测试**：1499 → 1510 passed（+11 final-review 修复新增），2 个 pre-existing failures 未变

### 三大全局关键发现 — 修复状态

| # | 发现 | 状态 | 修复 commit |
|---|---|---|---|
| 1 | `manage_config.tsx` 重大功能降级 | ✅ **已修复** | 8c426f63 + fb57354b + 7bc1d3c7 + 243c56c6 |
| 2 | 5 个孤儿 ui-next 页面 | ✅ **已修复** | 5aeb25a7 + 243c56c6（孤儿页 + 防御性默认） |
| 3 | 7 个次要功能路径缺失 | ✅ **已修复/已重新分类** | 243c56c6（user_delete）+ d27c33fb（ADR） |

### 修复 1（manage_config）详情

- **重构前**：flat-only `<input>` 表单，仅 string/number/boolean，不能编辑复杂 schema
- **重构后**：
  - Monaco YAML 编辑器（lazy-loaded）+ Allotment 分屏
  - `SchemaForm` 组件（schemastery-react 包装，支持任意 schemastery schema）
  - `parsedValue` 单一数据源；YAML 与表单双向同步；YAML 解析失败时禁用 Save + 显示内联错误
  - `apiClient.post(url, { value })` 提交；`credentials: 'same-origin'` 携带会话 cookie
  - `handleSave` try/catch + submitting 状态 + `window.alert` 错误提示（TODO 替换为 toast）
- **测试**：8/8 manage_config pass；4 个 `parseYaml` 单元 + 2 个 Save-gating 集成；happy-dom 不渲染 schemastery-react 输入（veaury Vue 桥），故采用 form-structure 约定（与 SchemaForm.test.tsx 一致）
- **限制**：Playwright 浏览器级测试仍是 follow-up（FU-1）

### 修复 2（5 孤儿页）详情

- 全部在 `index.ts` + `manifest.ts` 注册；通过 `manifest.test.ts` 4 个 it 的同步校验
- 防御性默认（`?? []`）防止后端遗漏字段时崩溃
- **wiki_help 回归修复**：`s.content` 从纯文本改为 `dangerouslySetInnerHTML`（匹配 ui-default 模板输出 + about.tsx 既有约定）

### 修复 3（7 个次要路径）详情

| 路由 | 真实形态 | 修复方式 | Commit |
|---|---|---|---|
| `/user/delete` | 模板 | ✅ 新增 `user_delete.tsx`（password + ConfirmDialog） | 81975184 |
| `/contest/:tid/code` | ContestCodeHandler 流式 ZIP | ✅ `contest_manage.tsx` 加下载链接 | 9d107ba0 |
| `/homework/:tid/code` | 复用 ContestCodeHandler | 同上 | 9d107ba0 |
| `/home/avatar` | POST-only | ✅ `home_security.tsx` 嵌入 multipart form + CSRF | 12badaf8 + 243c56c6 |
| `/home/changeMail/:code` | redirect | ADR 记录为"无需页面" | d27c33fb |
| `/storage` | 文件流 | ADR 记录为"纯下载端点" | d27c33fb |
| `/account/:uid` | SwitchAccountHandler | ✅ `user_detail.tsx` 加"Switch to this account"链接（PRIV_EDIT_SYSTEM only） | 243c56c6 |

详细决策见 `docs/superpowers/decisions/2026-08-03-missing-routes-reclassified.md`。

### F1-F9 模块完成度（修复后）

| 模块 | 修复前 | 修复后 | 备注 |
|---|---|---|---|
| F1 鉴权 | 95% | **100%** | user_delete 已补 |
| F2 题目 | 88% | **95%** | sidebar 3 交互已复刻（show-category / rejudge confirm / copy） |
| F3 评测记录 | 100% | **100%** | 无变化 |
| F4 比赛 | 92% | **100%** | contest_code 入口已加 |
| F5 训练/作业 | 80% | **80%** | 需 homework 域补 sidebar（与 F2 同问题） |
| F6 讨论 | 100% | **100%** | 无变化 |
| F7 域管理 | 95% | **100%** | ranking 已注册 + 防御性默认 |
| F8 用户中心 | 75% | **90%** | avatar form 已补；storage/changeMail 仍为 form/redirect（已 ADR） |
| F9 管理后台 | 70% | **95%** | manage_config 已重写；剩余 5% 来自硬编码英文/toast TODO |

**整体「功能 + UI 都到位」完成度：修复前 ~85% → 修复后 ~95%**

### 中期（产品策略）— 仍为 ADR 候选

- **ADR-1（ui-next 是否替代 ui-default）**：未决策。`/manage/config` 仍需 Playwright 验证；3rd-party addon 适配工作量大
- **ADR-2（17 个 ui-default 模板归宿）**：未决策。`mail/_tr/_status/_summary/partials` 系列保留（合理）；其余需要业务方确认

详见 `.superpowers/sdd/progress.md` "Follow-ups" 节（FU-1 到 FU-3）。

---

## F5 + Phase 3 后续修复（2026-08-04 Session 5 同步）

**计划**：
- `docs/superpowers/plans/2026-08-04-ui-next-f5-homework-completion.md`（10 task）
- `docs/superpowers/plans/2026-08-04-ui-next-phase3-adrs.md`（2 task）

**Commit 范围**：`43d3e156`（Phase 3 start）.. `0dcba9b8`（F5 末），共 7 个 commit on master
**测试**：1510 → 1515 passed（+5 F5 新增），2 个 pre-existing failures 未变

### F5 Phase 1（2 task）— `code` 入口补齐

| 功能 | 状态 | Commit |
|---|---|---|
| homework_main 加 `/homework/:tid/code` 下载链接 | ✅ | bb67e967 |
| training_main 加 `/training/:tid/code` 下载链接 | ✅ | a655c493 + 598da2f4（test fixture 修复） |

### F5 Phase 2（8 task）— P1-4/P1-5 Minor 清理

| # | Task | 状态 | Commit / 备注 |
|---|---|---|---|
| 2.1 | training_detail pdict 简化 | ✅ | 之前 P1-4 session 已修（`pdict[String(pid)]`） |
| 2.2 | training_edit dagValue 修复（`??` vs `||`） | ✅ | f732a4a7 |
| 2.3 | training_main test fixture 对称 | ✅ | 之前 P1-4 session 已修（行号过期） |
| 2.4 | training_files 测试用例 + 误导注释 | ⏸️ | **FU-4 deferred**（需 subagent 设计新测试） |
| 2.5 | training_detail UserContextShape 复用 | ✅ | 之前已修（本地无 type 声明） |
| 2.6 | training_files 并行删除 | ✅ | 当前是单次 request，非 loop |
| 2.7 | training_main 显式 spy teardown | ✅ | err/warn spy 已显式 mockRestore |
| 2.8 | homework_main `getByRole` 替代 `closest('form')!` | ✅ | 0dcba9b8（form 加 `role="search"`） |

### Phase 3 ADR 候选（2 task）— 纯文档

| # | ADR | 状态 | Commit |
|---|---|---|---|
| 1 | ADR-1: ui-next 替代策略（建议 Option 2 渐进切换） | ✅ | f644c48c |
| 2 | ADR-2: 12 个 ui-default 模板分类（全部"保留"） | ✅ | 43d3e156 |

ADR 文件：
- `docs/superpowers/decisions/2026-08-04-ui-next-replacement-strategy.md`
- `docs/superpowers/decisions/2026-08-04-ui-default-templates-fate.md`

### F1-F9 模块完成度（最终，2026-08-04 Session 5 同步）

| 模块 | 修复前 | F1-F9 修复后 | F5 完成后 | 最终 |
|---|---|---|---|---|
| F1 鉴权 | 95% | 100% | — | **100%** |
| F2 题目 | 88% | 95% | — | **95%** |
| F3 评测记录 | 100% | 100% | — | **100%** |
| F4 比赛 | 92% | 100% | — | **100%** |
| F5 训练/作业 | 80% | 80% | **~100%** | **~100%** |
| F6 讨论 | 100% | 100% | — | **100%** |
| F7 域管理 | 95% | 100% | — | **100%** |
| F8 用户中心 | 75% | 90% | — | **90%** |
| F9 管理后台 | 70% | 95% | — | **95%** |

**整体完成度演变**：原 ~85% → F1-F9 修复后 ~95% → F5 完成后 ~**98%**

### 仍为 follow-up（按优先级）

- **FU-1**：Playwright `/manage/config` 路由覆盖
- **FU-2**：14 个 per-task Minor finding（window.alert fallbacks、NoopMarkdown、English strings 等）
- **FU-3**：48 处 `as unknown as` cast 全局清理
- **FU-4**：F5 Task 2.4 — training_files.tsx 误导注释 + 新测试用例
- **Phase 3 ADR 实际执行**：owner 拍板（Option 2 vs 1 vs 3）
- **F2/F8 minor follow-ups**：i18n、UX polish 等

详见 `.superpowers/sdd/progress.md` "Follow-ups" 节。

---

## F5 + Phase 3 后续修复（2026-08-04 Session 5 同步）

**计划**：
- `docs/superpowers/plans/2026-08-04-ui-next-f5-homework-completion.md`（10 task）
- `docs/superpowers/plans/2026-08-04-ui-next-phase3-adrs.md`（2 task）

**Commit 范围**：`43d3e156`（Phase 3 start）.. `0dcba9b8`（F5 末），共 7 个 commit on master
**测试**：1510 → 1515 passed（+5 F5 新增），2 个 pre-existing failures 未变

### F5 Phase 1（2 task）— `code` 入口补齐

| 功能 | 状态 | Commit |
|---|---|---|
| homework_main 加 `/homework/:tid/code` 下载链接 | ✅ | bb67e967 |
| training_main 加 `/training/:tid/code` 下载链接 | ✅ | a655c493 + 598da2f4（test fixture 修复） |

### F5 Phase 2（8 task）— P1-4/P1-5 Minor 清理

| # | Task | 状态 | Commit / 备注 |
|---|---|---|---|
| 2.1 | training_detail pdict 简化 | ✅ | 之前 P1-4 session 已修（`pdict[String(pid)]`） |
| 2.2 | training_edit dagValue 修复（`??` vs `||`） | ✅ | f732a4a7 |
| 2.3 | training_main test fixture 对称 | ✅ | 之前 P1-4 session 已修（行号过期） |
| 2.4 | training_files 测试用例 + 误导注释 | ⏸️ | **FU-4 deferred**（需 subagent 设计新测试） |
| 2.5 | training_detail UserContextShape 复用 | ✅ | 之前已修（本地无 type 声明） |
| 2.6 | training_files 并行删除 | ✅ | 当前是单次 request，非 loop |
| 2.7 | training_main 显式 spy teardown | ✅ | err/warn spy 已显式 mockRestore |
| 2.8 | homework_main `getByRole` 替代 `closest('form')!` | ✅ | 0dcba9b8（form 加 `role="search"`） |

### Phase 3 ADR 候选（2 task）— 纯文档

| # | ADR | 状态 | Commit |
|---|---|---|---|
| 1 | ADR-1: ui-next 替代策略（建议 Option 2 渐进切换） | ✅ | f644c48c |
| 2 | ADR-2: 12 个 ui-default 模板分类（全部"保留"） | ✅ | 43d3e156 |

ADR 文件：
- `docs/superpowers/decisions/2026-08-04-ui-next-replacement-strategy.md`
- `docs/superpowers/decisions/2026-08-04-ui-default-templates-fate.md`

### F1-F9 模块完成度（最终，2026-08-04 Session 5 同步）

| 模块 | 修复前 | F1-F9 修复后 | F5 完成后 | 最终 |
|---|---|---|---|---|
| F1 鉴权 | 95% | 100% | — | **100%** |
| F2 题目 | 88% | 95% | — | **95%** |
| F3 评测记录 | 100% | 100% | — | **100%** |
| F4 比赛 | 92% | 100% | — | **100%** |
| F5 训练/作业 | 80% | 80% | **~100%** | **~100%** |
| F6 讨论 | 100% | 100% | — | **100%** |
| F7 域管理 | 95% | 100% | — | **100%** |
| F8 用户中心 | 75% | 90% | — | **90%** |
| F9 管理后台 | 70% | 95% | — | **95%** |

**整体完成度演变**：原 ~85% → F1-F9 修复后 ~95% → F5 完成后 ~**98%**

### 仍为 follow-up（按优先级）

- **FU-1**：Playwright `/manage/config` 路由覆盖
- **FU-2**：14 个 per-task Minor finding（window.alert fallbacks、NoopMarkdown、English strings 等）
- **FU-3**：48 处 `as unknown as` cast 全局清理
- **FU-4**：F5 Task 2.4 — training_files.tsx 误导注释 + 新测试用例
- **Phase 3 ADR 实际执行**：owner 拍板（Option 2 vs 1 vs 3）
- **F2/F8 minor follow-ups**：i18n、UX polish 等

详见 `.superpowers/sdd/progress.md` "Follow-ups" 节。
