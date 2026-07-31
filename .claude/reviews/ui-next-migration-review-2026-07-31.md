# 迁移进度审查: ui-default → ui-next (2026-07-31)

**审查日期**: 2026-07-31
**审查模式**: 覆盖率 + 验收复查 + 最近一批提交质量 (Local Review)
**范围**: 当前 master 状态 + 自 2026-07-21 以来的 ui-next 提交 (其中 SP8 task 1–7 / manage_* 系列 + 之前的渲染器修复)
**决定**: REQUEST CHANGES — TypeScript/lint 通过,但 `yarn lint:ci` 与单测试存在稳定可复现的失败,加之 SP8 三个管理页存在未连线按钮,需要修整后再合入

---

## 与既有审查文档的关系

`.claude/reviews/` 现存四份文档(均早于本批次):

| 文件 | 时间 | 覆盖范围 | 本文的差异 |
|---|---|---|---|
| `ui-default-to-ui-next-migration-review.md` | 2026-07-27 | 单批 diff (home_messages/security/settings) | 范围更窄,不含覆盖率与渲染器拆解 |
| `ui-next-migration-coverage-2026-07-27.md` | 2026-07-27 | 当时 30/71 ≈ 42% 已迁移 | 当时定下的 CRITICAL C1 **已通过 65383090 修复**(见下) |
| `ui-next-migration-gap-2026-07-21.md` | 2026-07-21 | 逐页功能 parity 缺口 | 仍有效;被本文 M1 重新统计 |
| `ui-next-missing-pages-review-2026-07-22.md` | 2026-07-22 | i18n / 细节缺陷 | 仍有效,部分细节被本文核对 |

---

## 一、跨期变更:对 2026-07-27 C1 的修正

### C1 (2026-07-27) → RESOLVED
原 CRITICAL 主张:`packages/ui-next/index.ts` 用 `asFallback: true` + `priority: 100`,会把所有模板劫持到 ui-next;未迁移页面直接走 `Page not found: <name>` 兜底,HTTP 200,样式导航全无。

**修复证据**:
- 提交 `65383090 feat(ui-next): reverse renderer hijack via manifest-driven accept allowlist`(2026-07-28)将 `asFallback` 改为 `false`,`accept` getter 返回 `enabled ? NEXT_TEMPLATES : []`。
- 现行代码 `packages/ui-next/index.ts:302-308`(DEV)与 `:331-337`(PROD)确认:
  ```ts
  ctx.server.registerRenderer('next', {
    name: 'next',
    get accept() { return enabled ? NEXT_TEMPLATES : []; },
    output: 'html',
    asFallback: false,
    priority: 100,
    ...
  });
  ```
- `packages/ui-default/backendlib/template.ts:247-254` 同时为 `asFallback: true, priority: 1, accept: []`,因此 ui-default 仅在 ui-next 不认领的模板上取胜。两者按模板名协商,**未迁移页面自动回退到 ui-default**(Nunjucks + react DOM 渲染)。

### 新增 C3 — `ui_next` 系统设置 + /admin/ui 处理器 (LOW)
- 提交 `fc994f76 feat: add /admin/ui handler and ui.next setting for ui-next toggle` (2026-07-28) 在 `packages/hydrooj/src/handler/admin-ui.ts` 新增 POST `/admin/ui`,把 `system.set('ui_next', next)` 通过 `PRIV_EDIT_SYSTEM` 鉴权后落盘;`ui-next/index.ts` 注册 `system/setting` 监听,重读 `system.get('ui_next')` 后翻转本地 `enabled` 闭包。
- 这是对修复 C1 之后的"运营层面"补充,但当前 ui-next 的所有 SP8 管理页(包括有 dead button 的页面)都没有提供 UI 触发这个开关的位置,操作员**只能**通过命令行或在 ui-default 的 Nunjucks 控制台操作。可以在 ui-next 的 `manage_setting` 或一个独立的 "UI 偏好" 卡片中暴露 `ui_next` 开关。

> 注: `CLAUDE.md` 当前描述 `asFallback: true` 是**过期**的;应改为 `asFallback: false, priority: 100`。

---

## 二、还差多少没迁移(2026-07-31 统计)

统计口径:`packages/hydrooj/src/handler/*.ts` 中所有 `this.response.template = '<name>.html'`(实际渲染模板),对比 `packages/ui-next/src/pages/manifest.ts` 的 `NEXT_PAGES`.

**当前结论(大幅优于 2026-07-27 的 30 / 71):**

| 类别 | 数量 | 说明 |
|---|---|---|
| `NEXT_PAGES` 注册键 | **60** | 含通过 `registerPage(...)` 实际可用的页面 key |
| 当前唯一的 `NEXT_TEMPLATES` 模板名 | **50** | 比 PAGES 少是因为 `contest_create` / `problem_create` / `discussion_node` 与对应 edit / main 共享模板 |
| 未在 ui-next 的 handler 模板 | 仍由 ui-default 服务的页面 | 见下表 |

### 未迁移 / 仍由 ui-default 渲染的页面

| 功能域 | 模板 | 备注 |
|---|---|---|
| 文件管理 | `files.html` | ui-next 没有 `files.page.tsx`(ui-default 那份仍是 jquery + ActionDialog 实现) |
| 训练 | `training_main.html`, `training_detail.html`, `training_edit.html`, `training_files.html` | 训练领域整体未迁移 |
| 作业 | `homework_main.html`, `homework_detail.html`, `homework_edit.html`, `homework_files.html` | 同上 |
| 用户账户 | `home_preference.html`, `user_verify.html`, 部分 mail_*_sent / status / summary 模板 | `user_*_mail_sent.html` 等邮件 / pjax 片段被 manifest 测试 C2/H1 主动 pin 住,**不应**迁入 ui-next |
| 控制台(老) | `setting.html` | 与 ui-next 的 `manage_setting.html` 不同;旧 setting 页面以 `manage_config` 形式从 ui-default 提供,详见下"惊喜/历史" |
| 站点页 | `status.page.styl`(CSS only,JS 已删), `ranking.page.styl`, `home_domain.page.styl`, `home_account.page.styl` 等 | 多数保留为 CSS 兜底,JS 在历史已被裁掉 |

> ui-default 在 SP8 完成后还**保留**了完整 serve 链:priority 1 + `asFallback: true`。所以未迁移的页面会自动回退到 Nunjucks + 旧的 react-DOM/jquery 方案。

### 已被 ui-default 裁掉(只留 .styl)

以下 ui-default 入口现在只有 `.page.styl`,主体 JS / TS 已被彻底删除,可视为**单向完成**的迁移:

- `contest_*.page.styl`(整套比赛域已无 JS,均由 ui-next 提供)
- `domain_*.page.styl`
- `error.page.styl`, `files.page.styl`
- `home_account.page.styl`, `home_messages.page.styl`, `home_preference.page.styl`(少量), `home_security.page.styl`, `home_settings.page.styl`
- `homework_main.page.styl`, `homework_detail.page.styl`, `homework_scoreboard.page.styl`
- `problem_*.page.styl`, `record_*.page.styl`, `ranking.page.styl`, `status.page.styl`
- `manage_user_priv.page.styl`(说明 manage_user_priv 的样式在 ui-default 仍可见)
- `user_detail.page.styl`, `user_verify.page.styl`

### ui-next 独家提供(原本不在 ui-default /pages)

`about`, `contest_create`, `contest_detail`, `contest_problemlist`, `discussion_*` 5 个页面, `domain_base`, `domain_create`, `domain_join`, `domain_permission`, `homepage`, `home_files`, `manage_base`, `manage_config`, `manage_setting`, `problem_create`, `problem_hack`, `problem_import`, `problem_solution`, `status`, `user_login`, `user_logout`, `user_lostpass`, `user_lostpass_with_code`, `user_register`, `user_register_with_code`, `user_sudo`, `wiki_help`, `error`, `homepage`(`main.html`) — 这些是 ui-next 主动填补的页面,而不是从 ui-default 平移来的。

### 惊喜:ui-default 的 `setting.page.tsx` 实际上是 `manage_config`
打开 `packages/ui-default/pages/setting.page.tsx`,文件首行的 `NamedPage` 注册名是 `manage_config`,即 *ui-default 的 `setting.page.tsx` 是 `manage_config` 的旧实现*。因为它走的也是 `manage_config.html` 模板,而该模板已经在 `NEXT_TEMPLATES` 之中,所以 ui-next 的 SP8 task 2 (`manage_config.tsx`) 取代了它。**ui-default 文件命名误导**,建议在后续清理 ui-default 时删除它,避免新人误解。

---

## 三、最近 SP8 (task 1–7) 提交质量

七次提交 (692f7b8a ... 5bc523dc) 在结构上是一致的:`usePageData()` → typed Args 接口 → 用 `Button` / `Card` / `Input` primitives → 用 `Card variant="stat"` / `data-table` 类名 → 都附 vitest 测试 (但有些测试简短,只是渲染快照)。

### MED-1 重复的时间格式化器

`manage_dashboard.tsx:47-53` 的 `formatActivityTime` 与 `manage_script.tsx:36-43` 的 `formatModified` 三处逻辑近乎一致 — `time < 1e12 ? time * 1000 : time`,然后 `.toISOString()`。

**修复建议**:提取到 `packages/ui-next/src/lib/datetime.tsx`(已存在)或者新建 `lib/timeFormat.ts`,签名 `formatLocalTime(t: string | number | undefined): string`,空值返回 `'—'`。`datetime.tsx` 当前只放 `LocalizedTime`(依赖 i18n),不适合这种"无 i18n、纯本地化"的格式化。

### MED-2 `as unknown as { args: Args }` 全局反模式

七个 manage_*.tsx 全部使用:
```ts
const { args } = usePageData() as unknown as { args: Args };
```
而不是让 `usePageData` 提供泛型 (`usePageData<Args>()`) 或者由 `Args` 推导。一旦后端改字段名,这一行 `as unknown as` 会**静默吞掉**类型错误。

**修复建议**: `packages/ui-next/src/context/page-data.ts` 增加泛型与默认值;或者引入一个 `usePageArgs<Args>()` 包装函数统一处理。

### HIGH-1 SP8 manage_script / manage_setting 有 **可见但不可点** 的按钮

`manage_script.tsx:90-97`:
```tsx
<Button variant="primary" type="button" onClick={() => { /* script execution is not wired in this view */ }} aria-label={`Run ${entry.id}`}>Run</Button>
```

`manage_setting.tsx:71-80`:同样模式,`<Button onClick={() => { /* inline edit is not wired in this view */ }}>Edit</Button>`

**影响**:ui-next 的 `priority=100` 已经接管了 `manage_script.html` / `manage_setting.html`。任何点 "Run" 或 "Edit" 的用户都会看到一个完全无反应的按钮。这是从 `ui-default` 平移时**功能遗漏**,不是有意的占位。

**修复方案** (按优先级):
1. 把这两个页面降级回 ui-default (在 `NEXT_PAGES` 移除 `manage_script` / `manage_setting` 映射,让 ui-default 的 `manage_script.page.js` / `manage_setting.page.js` 重新接管 — 后者仍存在并工作)。
2. 或:补齐 onClick 的真实业务实现。
3. 或:在按钮上写明 "Not implemented" 文案并 disable,而不是假装可用。

### HIGH-2 manage_user_import 的表单提交是 noop

`manage_user_import.tsx:46-48`:
```ts
const handleSubmit = () => {
  // Submission flow is not wired in this view; backend handles import via SystemUserImportHandler.post.
};
```
+ `onSubmit={(e) => e.preventDefault()}` — 用户在 textarea 填了一堆用户名,点 Submit,然后什么都没有发生。

`SystemUserImportHandler.post` 是否真的能在 SPA fetch 路径里正常收请求?需要确认:
- 当前页面是否含 `<form action>` 或 `<input type="submit" formaction="...">` — 不含,整段 form 在 client-side 被 `preventDefault`,**必须**有 fetch 实现才行。
- 注释说"由 backend 直接处理"在 HTTP 协议上**不成立**:如果前端不发请求,后端永远收不到。

**修复方案**:同 HIGH-1,优先降级到 ui-default。

### MED-3 manage_user_import 的 "local preview" 行为在 commit 834f7e73 修过一次
commit `834f7e73 fix(ui-next): address Task 6 review finding (truthful local preview counts)` 提到该页面的本地预览计数要"诚实"。需要复核该提交实际是否解决了问题 — 单元测试 `manage_user_import.test.tsx` 应当涵盖 ("preview 显示 `Detected: N lines (validation requires server preview)`" 而不是假装已校验)。

### MED-4 manage_user_priv 使用 RoleSelector 模拟 priv 矩阵,维度错误

`manage_user_priv.tsx:54-56`:
```ts
const permissions: RoleSelectorPermission[] = Object.entries(Priv).map(([name, key]) => ({ key, desc: name }));
```
然后创建单个 `roles: [{ _id: 'default', perm: defaultPriv }]`,意味着矩阵只展示"系统默认角色对每个 priv bit 的状态"。但实际 ui-default 的 `manage_user_priv.html` 是**每个用户一行**,每行展示该用户当前的 bitmask;管理员选择若干用户后可"批量设置"。

`RoleSelector` 组件复用,虽然视觉相似,但功能维度不匹配:ui-next 把 `MemberTable` 用作用户列表,但**没有任何批量编辑触发器**。"Select User" 按钮 (`manage_user_priv.tsx:70-72`) 同样没有 onClick。

**影响**:管理员来到这个页面,看到默认角色矩阵 + 一个死按钮 + 多个死按钮。
**修复**:同 HIGH-1,或实现完整流程。

### LOW-1 manage_dashboard 使用 `domain.avatar` 但没解释 `domain` 从哪儿来
`manage_dashboard.tsx:31-38` 的 `Args` 接口的 `domain` 字段在 `manage.ts` 中(系统级)并非显然 — 这里把"系统管理面板"的 `domain` 字段当作"本系统的默认 domain"。这是个隐性假设,应补注释或在 `Args` doc 段落实例。

### LOW-2 manage_config.tsx 没有 select/radio/textarea 等 richer 类型的支持
`SystemSetting['type']` 有 8 种 (`text` / `number` / `boolean` / `select` / `password` / `float` / `radio` / `textarea` / `markdown`),但 `manage_config.tsx:53-77` 只处理 `boolean` 和默认 (text/number),其他都退化到 `Input type=text`。对管理员是 UX 退化。

---

## 四、验证结果(Phase 4)

| 项 | 命令 | 结果 |
|---|---|---|
| TypeScript | `npx tsc --noEmit` (在 `packages/ui-next`) | **PASS** (无输出即零错误) |
| 单元测试 | `npx vitest run` | **188/189 文件,1402/1403 用例通过**;`contest_create.test.tsx` 文件级失败 — 见 HIGH-3 |
| `yarn lint` | 自动修复 | (未跑,与 lint:ci 重复) |
| `yarn lint:ci` | 无警告门槛 | **FAIL** — 76 warnings (75 max-len + 1 naming-convention);最大单行: `theme/theme-init.ts:1` 长度 578 |
| Build | `yarn workspace @hydrooj/ui-next build` | (未跑;tsc 已绿,主要风险是 vite 资源/路径) |

### HIGH-3 `contest_create.test.tsx` 文件级别不通过(可复现)

**复现步骤**:
```bash
cd packages/ui-next && npx vitest run
# 或独立: npx vitest run src/pages/contest_create.test.tsx
```
**现象**:5/5 测试**全部通过**(PASS),但 vitest 在文件级别报 `Errors 2 errors`:
```
Error: connect ECONNREFUSED 127.0.0.1:3000
```
和 DOMException `Failed to load script "https://cdn.jsdelivr.net/npm/monaco-editor@0.55.1/min/vs/loader.js"`。

**根因(从 verbose 输出定位)**:
1. 测试在 happy-dom + jest-dom 下渲染 `contest_create.tsx`,该组件加载 Monaco 编辑器,而 `domComponent → monaco → loader` 试图注入远程 `<script src="https://cdn.jsdelivr.net/...">`。
2. happy-dom 默认禁用了远程 script 加载,抛 `DOMException: NotSupportedError`,而这个 promise rejection 没有被组件捕获,被升级为 unhandled rejection,被 vitest 视为文件级错误。
3. 同时还有一个独立的 `ECONNREFUSED 127.0.0.1:3000` 来自 vite dev server 启动脚本,但 dev server 在 CI 显然不会启动,所以是测试代码**没有正确 mock** `@monaco-editor/loader`。

**修复建议**:
- 在 `setup.ts` (或 `contest_create.test.tsx` 顶部) `vi.mock('@monaco-editor/loader', () => ({ loader: { init: () => Promise.resolve(), config: () => {} } }))`,把远程脚本路径覆盖掉。
- 或在测试 config (`vitest.config.ts`) 中 `server.deps.inline = ['@monaco-editor/loader']`,让 happy-dom 看到的是模块接口而不是 script 元素。
- 或在测试 setup 里 `Object.defineProperty(window, 'crossOriginIsolated', { value: true })` 并把 cdn 路由指向本地 fixture。

---

## 五、Low-级别附加发现

### LOW-3 `pages/manage_base.tsx:41` 留了一个空的 `<main className="manage-content" />`
它从未被填入子节点;ui-default 的 `manage_base.html` 是用 `{{>part}}` 部分模板组合多个 panel,而 ui-next 的版本是一个孤儿空 main。建议要么真正实现 slot 注入,要么删除这行避免视觉空缺。

### LOW-4 未在 `manage_user_priv.tsx` 处理 `defaultPriv` 为 bigint 时的位运算
`Permissions` 来自 `PRIV` 枚举,源码实际是 `number`,但 ui-next `manage_user_priv.test.tsx` 提到 `tests may pass bigint literals` — 这意味着组件在新代码中混用 `number | bigint`。当前 `RoleSelector` 内部应已处理,但建议在 `manage_user_priv.tsx` 的注释或类型中显式说明 "bitmask 统一以 number 形式与 RoleSelector 通信,bigint 在更高层转换"。

### LOW-5 `packages/ui-default/pages/setting.page.tsx` 命名误导
如二节"惊喜"所述,文件内容却是 `manage_config` 的旧实现。建议列入未来清理任务。

---

## 六、决定与建议

### Decision: REQUEST CHANGES

**阻断理由合并**(任一未解决都不应进入下一批次合入):
- HIGH-1 / HIGH-2 / MED-4 三个管理页按钮 dead 行为 — 用户能到达、能点击,反馈为无
- HIGH-3 vitest 文件级 ECONNREFUSED + 远程 script 注入失败 — 测试套件不可信
- `yarn lint:ci` 因 76 个 max-len 警告失败 — CI 不允许 warnings

**非阻断但建议处理**:
- MED-1 时间格式化重复
- MED-2 `as unknown as` 反模式
- MED-3 local preview 行为需复核 commit 834f7e73
- LOW-1..5

### 推荐的下一步工作(按优先级)

1. 修 HIGH-3 mock MonacoLoader
2. 处理 HIGH-1 / HIGH-2 / MED-4 的三种方案选一(降级到 ui-default 优先,补齐业务次之)
3. 把 `yarn lint:ci` 跑成绿色: `yarn lint:fix` 一次性 bulk fix,或把 max-len 阈值在 ui-next 子项目下放宽到 200
4. 推进训练 / 作业 / 文件管理 / home_preference 等 6 大空白域的迁移,或者显式记录"未来 N 期内不迁,长期回退"
5. 更新 `CLAUDE.md` 中关于 `asFallback` 的描述,与当前 `false` 一致
6. 把 `packages/ui-default/pages/setting.page.tsx` 重命名或彻底删除,避免误导

### 不在本文范围但建议复核
- `.claude/reviews/ui-next-migration-gap-2026-07-21.md` 中的功能 parity 缺口
- `.claude/reviews/ui-next-missing-pages-review-2026-07-22.md` 中的 i18n 错误

---

## 七、文件与提交清单

### 本次审查涉及的文件(读过,仅 `.tsx` / `.ts` 摘要级,非全文逐行)
| 文件 | 用途 |
|---|---|
| `packages/ui-next/index.ts` | 渲染器注册(`asFallback: false`) |
| `packages/ui-next/src/pages/manifest.ts` | 模板白名单(50 模板) |
| `packages/ui-next/src/pages/index.ts` | 60 个 `registerPage(...)` |
| `packages/ui-next/src/pages/manage_*.{tsx,test.tsx}` × 7 | SP8 task 1–7 |
| `packages/ui-next/src/registry/page.tsx` | `registerPage` 实现 |
| `packages/ui-default/pages/setting.page.tsx`(ui-default)| 旧 manage_config 实现(命名误导) |
| `packages/ui-default/backendlib/template.ts:247-254` | ui-default `asFallback: true, priority: 1` |

### 参考提交
| Commit | Title |
|---|---|
| `65383090` | feat(ui-next): reverse renderer hijack via manifest-driven accept allowlist |
| `fc994f76` | feat: add /admin/ui handler and ui.next setting for ui-next toggle |
| `692f7b8a` | feat(ui-next): add manage_base page (SP8 task 1) |
| `00f63a3c` | fix(ui-next): align manage_base nav with production ControlPanel + correct URLs |
| `3ad9e3db` | feat(ui-next): add manage_config page (SP8 task 2) |
| `3771c1f3` | fix(ui-next): address Task 2 review findings |
| `f15319d2` | feat(ui-next): add manage_dashboard page (SP8 task 3) |
| `2edf8f7a` | feat(ui-next): add manage_script page (SP8 task 4) |
| `3fba4d7e` | feat(ui-next): add manage_setting page (SP8 task 5) |
| `e6f44d79` | feat(ui-next): add manage_user_import page (SP8 task 6) |
| `834f7e73` | fix(ui-next): address Task 6 review finding (truthful local preview counts) |
| `5bc523dc` | feat(ui-next): add manage_user_priv page (SP8 task 7) |
| `0065c4e1` | fix:ui-next (HEAD)|
