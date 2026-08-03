# ui-next 迁移 P1 执行计划 (2026-08-03)

> **For agentic workers:** 本文件是 P1 阶段的伞形计划(umbrella plan)。每个 P1 项是独立子系统,建议在每个 Task 落地时**按需再细化 bite-sized 步骤**(套用 `superpowers:writing-plans` 的任务级分解)。任务追踪使用 checkbox 语法。

**基线**: `d9ef88cf`(2026-07-31 p0 修复已完成,4 个管理页死按钮全部接通)
**上游文档**: `.claude/reviews/ui-next-migration-status-2026-07-31.md`(P1/P3 项的发现来源),`.claude/reviews/ui-next-migration-review-2026-07-31.md`(技术细节)
**范围声明**: P0 已闭合。本计划覆盖 P1 (功能性回归 + 模块迁移)与 P3 (工具链 / 验证清理);P2 装饰性页面明确**不**在本计划内。

---

## Goal

消除 ui-next 迁移的"管理员外围 + 普通用户偏好"功能空白,补齐训练 / 作业 / 文件管理三大缺位域,并清理工具链告警,使 ui-next 可以作为可发布的渲染器单独运行而无 UX 回归。

## Architecture

每个 P1 项按"独立可发布"的子系统拆分,沿用既有 ui-next 模式:
- 后端契约先于 UI 改动(`@param` / `response.template` 行号引用)
- `manifest.ts` 的 `NEXT_PAGES` / `NEXT_TEMPLATES` 是单一真相源
- 复用 `src/sections/` 已存在的 `TrainingSection` / `HomeworkSection` 作为页面骨架
- 工具链清理独立成 PR,不阻塞功能落地

## Tech Stack

- React 19 + Vite + `registerPage` 插件注册
- `vitest` + `happy-dom` + `@testing-library/react`
- `@monaco-editor/loader`(需要 mock;见 P3-7)
- `co-body`(`allowDots=true`,form-urlencoded 默认嵌套解析)
- `@simplewebauthn/browser`(用于 P1-2 2FA)
- TypeScript / ESLint / oxlint

## Global Constraints

[沿用 CLAUDE.md + ui-next 已确立的约定,逐字保留]

- **不允许静默 break**: `manifest.ts` 新增的每个模板必须已被 `registerPage` 注册;`manifest.test.ts` 会在 CI 中强制校验
- **不允许 info-bearing 注释或 i18n 字符串未评审**: 贡献者负责新增内容,不允许 AI 自动提交
- **不允许 `as unknown as { args: Args }` 反模式新增**;既有 7 处残留纳入 P3-9 集中清理
- **不允许模板白名单偷偷扩大**: 新增模板前必须在 `NEXT_TEMPLATES` / `NEXT_PAGES` 双侧登记
- **CSRF**: 同源 POST 不需要 token,`credentials: 'same-origin'` 已合规
- **测试**: 每个新页/新组件必须有 `.test.tsx` 配套;`happy-dom` 限制下避免 `postMessage` / 角色查询脆弱性

---

## Task Map (按 ROI 排序)

| # | 任务 | 工作量 | 依赖 | ROI |
|---|---|---|---|---|
| **P1-0** | manage_user_import Preview UX gap (新发现 MED) | XS | 无 | 高(收尾) |
| **P1-1** | home_preference pjax 钩子回归(`initCodeLangHelper` + `supportFontFamily`) | S | 无 | 高(用户受损) |
| **P1-2** | 2FA 验证对话框补回(user_login 流) | S | 无 | 高(2FA 用户受损) |
| **P1-3** | /admin/ui 运行时开关在 manage_setting 暴露 | S | 无 | 中 |
| **P1-4** | 训练系统迁移(training_main / detail / edit / files) | L | 无 | 中 |
| **P1-5** | 作业系统迁移(homework_main / detail / edit / files) | L | 可与 P1-4 并行 | 中 |
| **P1-6** | /files 文件管理页迁移 | M | 无 | 中 |
| **P3-7** | vitest monaco loader mock(`contest_create.test.tsx` 修复) | XS | 无 | 高(阻塞 CI) |
| **P3-8** | 重复时间格式化器提取(`manage_dashboard.tsx` + `manage_script.tsx`) | XS | 无 | 低(DRY) |
| **P3-9** | `as unknown as { args: Args }` 7 处反模式替换 | S | 无 | 低(类型质量) |
| **P3-10** | `yarn lint:ci` 76 处 `max-len` warnings 清理 | M | 无 | 中(阻塞 CI) |

**总估时**: ~3 周(单人,全任务;P1-4/P1-5/P1-6 可并行);其中 P1-4 / P1-5 各 ~5 天,P1-6 ~3 天,工具链 + 小修复合计 ~2 天。

**执行顺序建议**: P3-7 → P1-0 → P1-1 → P1-2 → P1-3 → P1-6 → P1-4 / P1-5(并行)→ P3-8 / P3-9 / P3-10(独立 PR)。

---

## Task P1-0: manage_user_import Preview UX gap(新发现 MED 残留)

**触发**: `.claude/reviews/ui-next-migration-status-2026-07-31.md` 代码层同步验证段"新增发现 MED"。

**根因**: 服务端 handler (`manage.ts:308-309`) 只回填 `users` 和 `messages`,**没**回填 `preview` 字段;客户端 `manage_user_import.tsx:50` 注释"Server populates these after a POST round-trip" 与实际契约不一致;native form submit 触发 navigation,React state 丢失。

**Files**:
- Modify: `packages/hydrooj/src/handler/manage.ts:308-309`(handler post-handler)
- Modify: `packages/ui-next/src/pages/manage_user_import.tsx:50,130-143`(客户端)
- Test: `packages/ui-next/src/pages/manage_user_import.test.tsx`(新增 preview 契约断言)

**Backend contract** (current):
```ts
// manage.ts:308-309
this.response.body.users = udocs;          // 仅有 users
this.response.body.messages = messages;   // 仅有 messages
```

**步骤(任务级,落地时再细化)**:

1. **写失败的契约测试**:`manage_user_import.test.tsx` 增加用例 "Preview 按钮触发的 server round-trip 应当回填 `preview = {count, valid, invalid}` 字段",断言当前实现下 `preview === undefined`,测试**应当失败**。
2. **服务端补齐**: `manage.ts:308-309` 之后追加 `this.response.body.preview = {count: udocs.length, valid: messages.filter(...), invalid: ...}`。**注意**: `draft=true` 路径下也要写,与 `draft=false` 路径一致(Preview 用户的核心期望就是看到行数)。
3. **客户端注释修正**: `manage_user_import.tsx:50` 注释删除"Server populates",改写为 "Server populates `users` (canonicalized) + `messages` (validation report)";新增注释说明 `preview` 字段在 server 端从 `messages` 派生。
4. **客户端 Preview 按钮**: 区分"本地预览"与"服务端 Preview"两按钮:`<button>Local Preview</button>` 仅触发 `handleLocalPreview()`(react state),`<button>Submit Preview</button>` 触发 `submitAs('true')` + native form submit。当前单按钮同时调两者导致 navigation 后 React state 丢失。
5. **跑测试**:`yarn workspace @hydrooj/ui-next vitest run src/pages/manage_user_import` 应 **41/41 + 1 通过**。
6. **提交**:`git commit -m "fix(ui-next): surface server-side preview on manage_user_import"`。

**Acceptance**:
- 服务端 `preview` 字段在 `draft=true` 与 `draft=false` 路径下都存在
- 客户端双按钮职责清晰:Local = 纯前端;Submit Preview = 真服务端校验
- 注释与代码契约一致

---

## Task P1-1: home_preference pjax 钩子回归修复

**触发**: P1 第 5 项;ui-next 已认领 `home_settings.html`,但 ui-default `home_preference.page.jsx` 的 pjax 钩子失效。

**根因**: `home_preference.page.jsx` 通过 `NamedPage('home_settings_preference')` 在 pjax 切到 `/home/settings?category=preference` 时注入 `initCodeLangHelper` + `supportFontFamily`;ui-next 没有等价的客户端增强器。

**Files**:
- Read(参考): `packages/ui-default/pages/home_preference.page.jsx:1-90`
- Modify: `packages/ui-next/src/pages/home_settings.tsx`(新增 `category === 'preference'` 分支)
- Test: `packages/ui-next/src/pages/home_settings.test.tsx`(新增字体探测 + 语言下拉断言)

**关键代码抽取**(参考源,不要原样粘贴到 plan):

```js
// home_preference.page.jsx:8-29
async function initCodeLangHelper() {
  const $select = $('.section__preference-code-langs');
  if (!$select.length) return;
  const langs = await request.get('/home/settings/codeLangs');
  // 注入 select 选项 + 选中态持久化
}

// home_preference.page.jsx:31-50
function supportFontFamily(f) {
  // canvas measureText 检测系统是否支持该字体;返回 boolean
}
```

**步骤**:

1. **后端契约核对**: `grep -nE "codeLangs|home_preference" packages/hydrooj/src/handler/home.ts` 确认 `/home/settings/codeLangs` 路由存在,响应形态是 `string[]`(语言 id 列表)。
2. **写失败测试**: `home_settings.test.tsx` 增加用例 "当 URL 包含 `?category=preference` 时,渲染 Code Lang 下拉 + 字体可支持性探测器";happy-dom 下用 `mock request.get` 模拟 `/home/settings/codeLangs`,断言调用且下拉 options 注入。
3. **客户端实现**: `home_settings.tsx` 增加 `useSearchParams()` 读取 `category`;当 === 'preference' 时挂载 `<PreferenceSection>` 子组件(新文件 `src/sections/PreferenceSection.tsx`)。子组件内部用 `useEffect` 触发 `initCodeLangHelper` + `supportFontFamily`。
4. **字体探测在 happy-dom 下的处理**: `document.createElement('canvas').getContext('2d')` 在 happy-dom 中可用但 metric 数据可能不稳定,测试用 `vi.spyOn(HTMLCanvasElement.prototype, 'getContext')` 返回 mock `measureText`。
5. **验证**: `yarn workspace @hydrooj/ui-next vitest run src/pages/home_settings` 通过。
6. **提交**:`fix(ui-next): restore home_preference pjax hooks (code lang + font support)`。

**Acceptance**:
- `/home/settings?category=preference` 在 ui-next 下拉显示正常
- 字体不兼容时(返回 `measureText` width 一致)给出 i18n 警告
- `?category=other` 不触发额外逻辑(无副作用)

---

## Task P1-2: 2FA 验证对话框补回

**触发**: P1 第 6 项;2FA 用户在 ui-next `user_login` 流无法走完。

**Files**:
- Read(参考): `packages/ui-default/pages/user_verify.page.ts:1-130`(完整 AutoloadPage 钩子)
- Modify: `packages/ui-next/src/pages/user_login.tsx`
- Create: `packages/ui-next/src/sections/TwoFactorDialog.tsx`(新组件)
- Create: `packages/ui-next/src/sections/TwoFactorDialog.module.css`
- Test: `packages/ui-next/src/sections/TwoFactorDialog.test.tsx`

**关键行为**(从 user_verify.page.ts 抽取):

- 触发条件: 后端响应 login 失败 + `error === '2fa-required'`
- 弹窗选项:
  - **WebAuthn**:`@simplewebauthn/browser` `startAuthentication({optionsJSON})` → POST `/user/webauthn`
  - **TFA Code**: 6 位数字 input → POST `/login/2fa` 带 `tfa_code`
- 不可关闭(`canCancel: false`)直到 verify 完成或失败

**步骤**:

1. **后端契约核对**: `grep -nE "login/2fa|user/webauthn|tfa_code" packages/hydrooj/src/handler/user.ts` 确认两条 POST 路由 + 参数形态。
2. **写失败测试**: `TwoFactorDialog.test.tsx` 渲染对话框,断言:
   - "Use Authenticator" 按钮可见(若用户已注册 webauthn)
   - "Use TFA Code" 按钮可见
   - 点击 TFA 后输入 '123456' → mock fetch 成功 → 提交 challenge 给调用方
3. **客户端实现**: `TwoFactorDialog.tsx` 用 ui-next 现有 Dialog 原语(若有;否则用 `<dialog>` + 状态);`user_login.tsx` 在 catch `error === '2fa-required'` 分支渲染此组件;成功 resolve 后 `onSuccess(challenge)` 调用方继续登录。
4. **i18n**: 复用现有 key `Two Factor Authentication` / `6-Digit Code` / `Use TFA Code` / `Use Authenticator`;**新增 key 须**走 i18n 评审流程(参见 CLAUDE.md)。
5. **验证**: `yarn workspace @hydrooj/ui-next vitest run src/sections/TwoFactorDialog` 通过。
6. **提交**:`feat(ui-next): restore 2FA verification dialog in login flow`。

**Acceptance**:
- 已开启 2FA 的用户在 ui-next 登录可走完
- WebAuthn 失败 / TFA 失败有用户可见的 Notification.error
- 不可关闭的语义保留(用户必须 verify 或重试 login)

---

## Task P1-3: /admin/ui 运行时开关暴露在 manage_setting

**触发**: P1 第 7 项;`AdminUiHandler` POST 已存在(`handler/admin-ui.ts:8-14`),写 `system.set('ui_next', next)`,但 ui-next `manage_setting.tsx` 没有暴露此开关。

**Files**:
- Modify: `packages/ui-next/src/pages/manage_setting.tsx`(新增 "UI Renderer" section)
- Modify: `packages/ui-next/src/pages/manifest.ts`(无需改;已认领 manage_setting.html)
- Test: `packages/ui-next/src/pages/manage_setting.test.tsx`(新增切换断言)

**后端契约**:

```ts
// handler/admin-ui.ts:9-15
class AdminUiHandler extends Handler {
  @param('next', Types.Boolean)
  async post({ _domainId }, next: boolean) {
    this.checkPriv(PRIV.PRIV_EDIT_SYSTEM);   // 仅超管
    await system.set('ui_next', next);
    this.back();
  }
}
```

**注意**: `manage_setting.tsx` 当前表单 POST 到 `/manage/setting`,**不是** `/admin/ui`。要么复用现有 form + 增加 hidden `ui_next=true/false`(由"切到 ui-next"按钮触发),要么单开一个 fetch 到 `/admin/ui`。

**步骤**:

1. **写失败测试**: `manage_setting.test.tsx` 渲染页面,断言当前没有 "UI Renderer" 切换控件;测试**应当失败**(期望存在但不存在)。
2. **实现**: 在 setting 列表顶部新增 `<fieldset>` "UI Renderer" + 单 checkbox `<input type="checkbox" name="ui_next" value="true" />` + hidden `booleanKeys.ui_next=true` companion + submit 按钮 "Switch UI";复用 `manage_setting` form action(而不是新开 fetch),保证其他字段不被截断。
3. **持久化**: 服务端 `manage.ts:148-173` 的 handler 迭代 `args.ui_next` 写入 `system.set('ui_next', true/false)`;与现有 setting 字段一致。
4. **视觉提示**: 当前正在使用 ui-next 时,checkbox 显示 "(Active)" 标签;切到 ui-default 时,提示 "Reload to apply"。
5. **验证**: `yarn workspace @hydrooj/ui-next vitest run src/pages/manage_setting` 通过。
6. **提交**:`feat(ui-next): expose ui_next runtime toggle in manage_setting`。

**Acceptance**:
- 超管可在 `/manage/setting` 直接切换 `ui_next`,无需手改配置文件
- 切换后 `system.set('ui_next', ...)` 写入,下次 reload 生效
- 权限 `PRIV.PRIV_EDIT_SYSTEM` 后端强校验(非超管按钮置灰 + 后端 403)

---

## Task P1-4: 训练系统迁移(4 模板)

**触发**: P1 第 2 项;ui-default 仍 Nunjucks + jquery 服务,与新 UI 不一致。

**Files**:
- Create: `packages/ui-next/src/pages/training_main.tsx` + `.module.css` + `.test.tsx`
- Create: `packages/ui-next/src/pages/training_detail.tsx` + `.module.css` + `.test.tsx`
- Create: `packages/ui-next/src/pages/training_edit.tsx` + `.module.css` + `.test.tsx`
- Create: `packages/ui-next/src/pages/training_files.tsx` + `.module.css` + `.test.tsx`
- Modify: `packages/ui-next/src/pages/manifest.ts`(`NEXT_PAGES` 加 4 项,`NEXT_TEMPLATES` 自动包含)
- Modify: `packages/ui-next/src/pages/index.ts`(`registerPage` 加 4 项)
- Read(参考): `packages/ui-default/pages/training_main.page.styl`,`training_detail.page.styl`,`training_edit.page.ts`,`packages/hydrooj/src/handler/training.ts`(模板 + 契约行号)
- Read(骨架): `packages/ui-next/src/sections/TrainingSection.tsx`(主页块复用)

**Backend contracts** (handler/training.ts):

| 模板 | 行号 | 路由 |
|---|---|---|
| `training_main.html` | 92 | GET `/training` |
| `training_detail.html` | 166 | GET `/training/:tid` |
| `training_edit.html` | 202 | GET `/training/:tid/edit` |
| `training_files.html` | 258 | GET `/training/:tid/files` |

POST 端点(用于 edit 表单提交): 见 handler/training.ts:210-215 起的 `@param` 序列(`title` / `content` / `dag` / `pin` / `description`)。

**步骤**:

1. **manifest 登记**(`manifest.ts`):在 `NEXT_PAGES` 中加
   ```ts
   training_main: ['training_main.html'],
   training_detail: ['training_detail.html'],
   training_edit: ['training_edit.html'],
   training_files: ['training_files.html'],
   ```
   `NEXT_TEMPLATES` 自动派生。运行 `yarn workspace @hydrooj/ui-next vitest run src/pages/manifest.test.ts` 确认登记正确。
2. **registerPage 登记**(`index.ts`):
   ```ts
   registerPage('training_main', () => import('./training_main'));
   registerPage('training_detail', () => import('./training_detail'));
   registerPage('training_edit', () => import('./training_edit'));
   registerPage('training_files', () => import('./training_files'));
   ```
3. **training_main.tsx**:基于 `TrainingSection` 扩展(已有主页块),接收后端 `args` 中的训练列表;复用 `ContestList` 的列表卡组件(若适用);分页器走 ui-default 同款 URL param `?page=`。
4. **training_detail.tsx**:接收 `args.tdoc`(training doc)+ `enrollStatus`;复用 `problem_main` 的"题目列表 + 进度"卡片模式;`enroll` / `unenroll` 按钮走 fetch POST `/training/:tid/enroll`。
5. **training_edit.tsx**:对接 `@param` 序列;dag 是 JSON-encoded content;pin 是 UnsignedInt;`<form action="/training/:tid/edit">` + hidden inputs 与 manage_edit 同款模式;**注意 `@requireSudo` / `@requirePermission`** 后端会校验。
6. **training_files.tsx**:复用 `problem_files.tsx` 既有实现(同样是按文件列出 + 链接 `/training/:tid/file/:filename`)。
7. **i18n**: 复用既有 key;新增 key 走评审。
8. **测试**: 每个页面 `.test.tsx` 至少 3 个用例(空状态 / 列表渲染 / 按钮 onclick 触发 fetch)。
9. **验证**:`yarn workspace @hydrooj/ui-next vitest run src/pages/training_` 通过 + manifest 测试通过。
10. **提交**:`feat(ui-next): migrate training domain (4 pages)`。

**Acceptance**:
- `/training`, `/training/:tid`, `/training/:tid/edit`, `/training/:tid/files` 在 ui-next 可用
- ui-default 的同名 `.page.ts` 删除(或不删除保留回退;**确认策略后再删**)
- manifest 单一真相源被强制

**依赖**: 无;可与 P1-5 并行(不同 domain,不同文件集)。

---

## Task P1-5: 作业系统迁移(4 模板)

**触发**: P1 第 3 项;结构与训练类似,可合并实现。

**Files**:
- Create: `packages/ui-next/src/pages/homework_main.tsx` + `.module.css` + `.test.tsx`
- Create: `packages/ui-next/src/pages/homework_detail.tsx` + `.module.css` + `.test.tsx`
- Create: `packages/ui-next/src/pages/homework_edit.tsx` + `.module.css` + `.test.tsx`
- Create: `packages/ui-next/src/pages/homework_files.tsx` + `.module.css` + `.test.tsx`
- Modify: `packages/ui-next/src/pages/manifest.ts`
- Modify: `packages/ui-next/src/pages/index.ts`
- Read(参考): `packages/ui-default/pages/homework_*.page.{styl,js,ts}` + `packages/hydrooj/src/handler/homework.ts`
- Read(骨架): `packages/ui-next/src/sections/HomeworkSection.tsx`

**Backend contracts** (handler/homework.ts):

| 模板 | 行号 | 路由 |
|---|---|---|
| `homework_main.html` | 75 | GET `/homework` |
| `homework_detail.html` | 107 | GET `/homework/:tid` |
| `homework_edit.html` | 165 | GET `/homework/:tid/edit` |
| `homework_files.html` | 275 | GET `/homework/:tid/files` |

**步骤**: 同 P1-4,但针对 homework;额外注意:
- `penaltyRules` 是 `Types.Content` 带 `validatePenaltyRules` + `convertPenaltyRules`(handler/homework.ts:185)
- `pids` 是 `Types.Content`(JSON-encoded pid 数组,handler/homework.ts:188)
- `extensionDays` 是 `Types.Float`
- 复用 `problem_submit` 的提交体验(作业是"提交后判分")

**Acceptance / Dependencies**: 同 P1-4;与 P1-4 并行。

---

## Task P1-6: /files 文件管理页迁移

**触发**: P1 第 4 项;ui-default jquery + ActionDialog。

**Files**:
- Create: `packages/ui-next/src/pages/files.tsx` + `.module.css` + `.test.tsx`
- Modify: `packages/ui-next/src/pages/manifest.ts`
- Modify: `packages/ui-next/src/pages/index.ts`
- Read(参考): `packages/ui-default/pages/files.page.tsx`(行为参考)
- **后端契约核对**(前置): `packages/hydrooj/src/handler/` 中是否有 `files.ts`? 若无,需先与 backend owner 对齐;若 `home.ts` / `manage.ts` 中有等价路由,引用对应行号。

**步骤**:

1. **后端契约先决**: 在写 UI 前,**必须**找到 `/files` 路由对应的 handler 类,引用 `@param` 行号到 plan 的对应位置。若 handler 不存在,本 Task 阻塞,先建 issue。
2. **UI 实现**: 列出 `/files` 下的目录 / 文件(由后端 args 提供),每个条目一个 Card + 操作按钮(下载 / 重命名 / 删除);删除走 ActionDialog(参考 ui-default 行为)。
3. **删除后状态管理**: 失败显示 `<div role="alert">` + Dismiss;成功本地 state 过滤该条目。
4. **验证**: 路径同上。
5. **提交**:`feat(ui-next): migrate /files page`。

**Acceptance**:
- `/files` 在 ui-next 可浏览、下载、重命名、删除
- 删除二次确认对话框保留
- 与 manage_script 同等的失败反馈模式

---

## Task P3-7: vitest monaco loader mock(`contest_create.test.tsx` 修复)

**触发**: 上游审查 HIGH-3;`yarn workspace @hydrooj/ui-next vitest run` 文件级 ECONNREFUSED。

**Files**:
- Modify: `packages/ui-next/vitest.config.ts`(或新建 `packages/ui-next/src/test-setup.ts`)
- Modify: `packages/ui-next/src/pages/contest_create.test.tsx`(确保 mock 生效)

**根因**: `@monaco-editor/loader` 在 happy-dom 下尝试 fetch CDN(`https://cdn.jsdelivr.net/...`),被网络拦截 → ECONNREFUSED → 测试失败。

**步骤**:

1. **写失败测试**(若需要): 当前已经失败(ECONNREFUSED),无需新增。
2. **加 mock**: 在 vitest setup 中加
   ```ts
   vi.mock('@monaco-editor/loader', () => ({
     init: vi.fn().mockResolvedValue({
       editor: { create: () => ({ getValue: () => '', getModel: () => ({ setValue: () => {} }), onDidChangeModelContent: () => ({ dispose: () => {} }) }) },
       KeyMod: { CtrlCmd: 1 },
       KeyCode: { Enter: 1 },
     }),
   }));
   ```
3. **验证**:`yarn workspace @hydrooj/ui-next vitest run src/pages/contest_create` 通过。
4. **提交**:`test(ui-next): mock @monaco-editor/loader for happy-dom`。

**Acceptance**: `yarn workspace @hydrooj/ui-next vitest run` 全绿(或仅剩与本次修复无关的 2 个 happy-dom 脆弱性失败)。

---

## Task P3-8: 重复时间格式化器提取

**触发**: 上游审查 MED-3;`manage_dashboard.tsx:47` 和 `manage_script.tsx:36` 重复。

**Files**:
- Create: `packages/ui-next/src/utils/time.ts`(共享格式化器)
- Modify: `packages/ui-next/src/pages/manage_dashboard.tsx:47`
- Modify: `packages/ui-next/src/pages/manage_script.tsx:36`
- Test: `packages/ui-next/src/utils/time.test.ts`(新)

**步骤**:

1. **抽取签名**: 从两处现状抽取重复逻辑,产出
   ```ts
   export function formatRelativeTime(input: Date | string | number, locale = 'en'): string
   ```
   (用 `Intl.RelativeTimeFormat` 而非手写,以避免 locale bug)
2. **替换两处调用点**,删除内联实现。
3. **新增测试**: 同输入下旧实现与新实现输出**应当字节级一致**(回归保护)。
4. **提交**:`refactor(ui-next): extract shared time formatter`。

**Acceptance**: 两处都使用新工具;既有视觉输出不变;新测试通过。

---

## Task P3-9: `as unknown as { args: Args }` 7 处反模式替换

**触发**: 上游审查 MED-2;`manage_*.tsx` 全部这样写,吞掉类型错误。

**Files**:
- Modify: 7 个 `manage_*.tsx`(具体清单在审查报告 MED-2 段落)
- **核查**: 实际位置 + 个数,以 `grep -rn "as unknown as { args" packages/ui-next/src/pages/` 为准

**根因**: 后端 `args` 字段 schema 是 schemastery,client 端 `Args` interface 与之不对齐;客户端开发者用 `as unknown` 跳过校验。

**步骤**:

1. **逐文件抽取 args 真实形态**: 读 `manage.ts` 对应 `@param` + handler return 的 `response.body`,产出真实类型。
2. **替换为类型守卫**: 优先用 `ResponseType<typeof Backend>`(若项目有)或手写 interface;不用 `any` / `as unknown`。
3. **测试**: `tsc --noEmit` 通过(若有);ESLint 通过。
4. **提交**: 单一 `refactor(ui-next): type manage_* page args without unknown cast`。

**Acceptance**: 7 处反模式全部消除;`tsc --noEmit` 通过;既有页面行为不变(回归测试)。

---

## Task P3-10: `yarn lint:ci` 76 处 `max-len` warnings 清理

**触发**: 上游审查 P3-11;`yarn lint:ci` 因 75 处 `max-len` 超过 150 而失败。

**Files**: 75+ 处散落(以 `yarn lint:ci 2>&1 | grep max-len` 输出为准)。

**步骤**:

1. **抓清单**: `yarn lint:ci 2>&1 | grep -B1 max-len | head -200` 收集所有 file:line。
2. **逐文件修复**: 大多数是单行超长,可以拆为多行 / 抽取局部变量 / 简化表达式。
3. **不可拆的**: 用 `// eslint-disable-next-line max-len` + 一行说明注释,**避免**成为新的反模式。
4. **提交**: 单 PR,`chore(ui-next): resolve 76 max-len warnings`。

**Acceptance**: `yarn lint:ci` 通过(0 warnings)。

---

## 文件级总览(本次 P1 范围)

### 新建

```
packages/ui-next/src/pages/
  training_main.tsx + .module.css + .test.tsx
  training_detail.tsx + .module.css + .test.tsx
  training_edit.tsx + .module.css + .test.tsx
  training_files.tsx + .module.css + .test.tsx
  homework_main.tsx + .module.css + .test.tsx
  homework_detail.tsx + .module.css + .test.tsx
  homework_edit.tsx + .module.css + .test.tsx
  homework_files.tsx + .module.css + .test.tsx
  files.tsx + .module.css + .test.tsx
packages/ui-next/src/sections/
  PreferenceSection.tsx + .module.css + .test.tsx
  TwoFactorDialog.tsx + .module.css + .test.tsx
packages/ui-next/src/utils/
  time.ts + .test.ts
```

### 修改

```
packages/ui-next/src/pages/manifest.ts          # +5 NEXT_PAGES entries
packages/ui-next/src/pages/index.ts             # +5 registerPage calls
packages/ui-next/src/pages/manage_user_import.tsx     # P1-0 双按钮拆分
packages/ui-next/src/pages/manage_setting.tsx         # P1-3 ui_next 切换
packages/ui-next/src/pages/home_settings.tsx          # P1-1 偏好钩子
packages/ui-next/src/pages/user_login.tsx             # P1-2 2FA 弹窗
packages/ui-next/src/pages/manage_dashboard.tsx:47    # P3-8
packages/ui-next/src/pages/manage_script.tsx:36       # P3-8
packages/ui-next/src/pages/manage_*.tsx (×6)          # P3-9 反模式替换
packages/ui-next/src/pages/contest_create.test.tsx    # P3-7 mock 兼容
packages/ui-next/vitest.config.ts                     # P3-7 mock setup
packages/hydrooj/src/handler/manage.ts:308-309        # P1-0 preview 字段
~75 文件                                              # P3-10 max-len
```

### 删除

**本次不删**。ui-default 的同名 `.page.{ts,tsx,styl}` 保留作为回退(渲染器 `asFallback: false` 的策略已固定,不破坏回退);后续若决定"ui-next 完全取代 ui-default",再单独建 PR。

---

## 执行检查清单(本计划合入前的 sanity check)

- [ ] P1-0 / P1-1 / P1-2 / P1-3 范围对齐上游审查 MED/LOW 残留
- [ ] P1-4 / P1-5 模板行号(92 / 166 / 202 / 258 / 75 / 107 / 165 / 275)与代码现状一致
- [ ] P1-6 后端契约(是否存在 files handler)已**先决**确认
- [ ] P3-7 mock 不会破坏其他用到 `@monaco-editor/loader` 的测试
- [ ] P3-9 7 处反模式真实数量与位置已 `grep` 确认
- [ ] P3-10 75 处与 `yarn lint:ci` 实际输出一致

---

## 验证矩阵

| 命令 | 期望 |
|---|---|
| `yarn workspace @hydrooj/ui-next vitest run` | 全绿(或仅剩与本次 P1 无关的 2 个 happy-dom 脆弱性失败) |
| `yarn lint:ci` | 0 warnings |
| `npx tsc --noEmit`(若项目内可执行) | 0 errors |
| 手动 smoke: `/training/:tid/edit`,`/homework/:tid/edit`,`/files`,`/manage/setting`(UI 切换),`/home/settings?category=preference`,2FA 用户登录 | 全部可用 |

---

## 后续可选 P2(本计划不覆盖)

明确**不**在本计划内的项目,留待 P2 阶段决定:

- `home_domain`, `home_files` 装饰性迁移
- `ranking`, `status` 列表型(ui-default 无 JS 逻辑,ui-next 兜底已可用)
- 不迁入 ui-next 的: `domain_user_raw`, `contest_mode`, 用户邮件模板,摘要 HTML(已被 manifest 测试 pin 住)

---

## 状态

- **草稿状态**: 待评审(基线 `d9ef88cf`)
- **依赖外部输入**: P1-6 后端契约核对(可能发现 `files.ts` 不存在)
- **可分批 PR**: 每个 Task 独立 PR,不强制单次大版本
- **不阻塞**: 上游 P0(`e4194b4f` + `d9ef88cf`)已合入,可发布到 `origin/master`