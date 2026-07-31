# P0 补齐计划:管理页死按钮 + CI 验证(2026-07-31)

**目标**: 把 `packages/ui-next` 中 SP8 批次(`692f7b8a`…`5bc523dc`)遗留的 4 个管理页死按钮、HIGH-3 的 lint/test 失败,在不破坏现有功能的前提下,补齐到可以合入 master 的状态。

**策略**: 用户已确认 **B. 全部在 ui-next 补齐业务**(不降级回 ui-default)。HIGH-3 验证修复同时纳入 P0。

**预估工作量**: ~6 个工作单元 / 3-5 天(/ ~+800 行 ui-next 代码 + 监测/测试)

---

## 0. 起点确认

### 0.1 当前提交基线
- HEAD `0065c4e1`(与 `origin/master` 分叉,本地领先 271 commits)
- 配套审查: `.claude/reviews/ui-next-migration-review-2026-07-31.md`(技术),`ui-next-migration-status-2026-07-31.md`(业务)

### 0.2 服务端 API 现有端点(用于本计划的 P0 补齐,**无需新增后端**)

| 路由 | 方法 | 参数 | 返回 | 鉴权 |
|---|---|---|---|---|
| `/manage/script` | POST | `id`, `args`(JSON 字符串) | HTML 重定向 `/record/<rid>` | sudo |
| `/manage/setting` | POST | 表单 body,支持嵌套 `key.subkey` | 重定向回 `/manage/setting` | sudo |
| `/manage/userimport` | POST | `users`(TSV/CSV), `draft`(boolean) | 同模板(返回 `users` + `messages`) | PRIV_EDIT_SYSTEM |
| `/manage/userpriv` | POST | `uid`, `priv`, `system`(boolean) | 重定向回 | sudo |
| `/admin/ui` | POST | `next`(boolean) | 重定向回 | PRIV_EDIT_SYSTEM |

所有 POST 走 Cordis `@param` 校验,失败抛 `ValidationError`(400)。后端处理要么已经存在,要么**完全不需要改动** —— 这是补齐计划的关键事实。

### 0.3 三个本计划**不**动的页面
- `manage_base.tsx`(task 1)、`manage_dashboard.tsx`(task 3)、`manage_config.tsx`(task 2) —— 这三个已经基本工作,本次不动。
- LOW-3(`manage_base.tsx:41` 空 main)单独列为尾部清理。

---

## 1. 任务卡片

### T1 — manage_script 补齐 Run 按钮 (`packages/ui-next/src/pages/manage_script.tsx`)

**当前问题** (`packages/ui-next/src/pages/manage_script.tsx:90-97`):
```tsx
<Button variant="primary" type="button" onClick={() => { /* not wired */ }} aria-label={`Run ${entry.id}`}>Run</Button>
```

**目标行为**:
- 点击 "Run" → 调 `POST /manage/script`,body 用 form-encoded `id=<script_id>&args={}`
- 拿到 `rid` → 跳到 `/record/<rid>`(因为 handler `redirect: this.url('record_detail', { rid })`)
- 失败 → 内联错误,显示 `Notification.error(...)`

**实现步骤**:
1. 引入 `request.post(url, body)` 包装(已存在 `packages/ui-next/src/hooks/use-api.ts`)
2. 新增 `RunButton` 局部组件,管 `running: boolean` 状态
3. `onClick` 内:
   ```ts
   const res = await request.post('/manage/script', { id, args: '{}' }, { form: true });
   if (res.redirect) navigate(res.redirect); else Notification.success(...);
   ```
4. 状态机:`idle → submitting (disabled) → redirected`
5. 加测试 `manage_script.test.tsx`:
   - mock `request.post` → `Promise.resolve({ redirect: '/record/123' })`
   - 点击按钮 → 验证 `navigate('/record/123')` 被调用

**验收**:
- `npx vitest run src/pages/manage_script.test.tsx` 通过
- 真实环境:`HYDRO_CLI=... start`,以 `root` 登录,跑 `manage_script.html`,点 "Run foo.js" 看到跳到 `/record/...`

**风险**:
- `request.post` 当前未必支持 `redirect` 字段的解析 —— 需要读 `use-api.ts` 看一下,可能要打补丁才能继续

**文件**:
- `packages/ui-next/src/pages/manage_script.tsx` (改 +60 行)
- `packages/ui-next/src/pages/manage_script.test.tsx` (新增 +60 行)
- `packages/ui-next/src/hooks/use-api.ts` (若不支持 form/redirect,小补丁)

---

### T2 — manage_setting 补齐 Edit 按钮 (`packages/ui-next/src/pages/manage_setting.tsx`)

**当前问题** (`:71-80`): 完全占位 onClick。

**目标行为**:
- 每行 "Edit" 按钮 → 弹出一个**编辑对话框**,包含:
  - 当前值(预填)
  - 输入框(text/textarea/select 由 `s.type` 决定,与 task 4 的 manage_config 类似)
  - "保存" + "取消"
- "保存" → 调 `POST /manage/setting`,body 是 form-encoded `key=value`
- 成功后 `Notification.success` + 刷新 settings 列表(`router.reload()`)

**实现步骤**:
1. 复用 `manage_config.tsx` 中已经写过的 `Input` 模式
2. 新增 `SettingEditDialog` 组件(放在 `packages/ui-next/src/components/manage/SettingEditDialog.tsx`)
3. 用 `Portal` 渲染到 `document.body`
4. `onSubmit`:
   ```ts
   await request.post('/manage/setting', { [s.key]: value }, { form: true });
   Notification.success(...);
   setOpen(null);
   router.refresh(); // 或 reload()
   ```
5. 表单验证:依据 `s.type`(number/boolean/select);select/radio/textarea 暂时降级为 `<Input>`(LOW-2 已知问题,不在本 P0 范围)

**验收**:
- 测试 `manage_setting.test.tsx`: 点击 Edit → 显示对话框 → 修改值 → 提交 → `request.post('/manage/setting', ...)` 被调用

**文件**:
- `packages/ui-next/src/components/manage/SettingEditDialog.tsx` (新增 +120 行)
- `packages/ui-next/src/pages/manage_setting.tsx` (改 +30 行)
- `packages/ui-next/src/pages/manage_setting.test.tsx` (新增 +80 行)

---

### T3 — manage_user_import 接入服务端导入 (`packages/ui-next/src/pages/manage_user_import.tsx`)

**当前问题** (`:46-48`): `handleSubmit = noop`;`onSubmit={(e) => e.preventDefault()}`。

**目标行为**:
- 提交(`/manage/userimport`):
  - 把 `users` textarea 的纯文本作为 `users` 表单字段
  - 提交后,根据 handler 的同模板响应,把服务器返回的 `users` / `messages` 注入 `args.preview` / `args.messages`
  - 因为这个 POST 不是 JSON API 而是同模板回灌,**当前实现有两种走法**(见下"方案选择")

#### 方案选择

**A. 完整迁移 — 推荐**
1. 在后端 `SystemUserImportHandler.post` 增加一个 `application/json` 接受分支(返回 `{ users, messages }` JSON),或者新增 `/api/manage/userimport` 复制 handler 逻辑返回 JSON
2. 前端 fetch 走 JSON,把结果写到 `args.preview` / 显示在 `Messages` 区
3. 优点:page 与现有 record-main 风格一致
4. 缺点:需要后端改动,估计 +60 行

**B. SPA 模式(form action 不变)**
1. 把表单改成普通 HTML form,`<form method="post">`,action 指向 `/manage/userimport`
2. 由服务端接收 + 重定向回同一个 URL,新 HTML 带新 `users`/`messages`
3. 优点:**零后端改动**,server 已验证逻辑可直接复用
4. 缺点:失去 SPA 的局部刷新,但对管理员可以接受

**本计划选 B**(零后端改动,P0 内可完成);A 在下个版本里再做,把后端抽到 JSON API。

**实现步骤**:
1. 拆掉 `onSubmit={(e) => e.preventDefault()}`
2. 表单改为正常 submit(`<form method="post" action="/manage/userimport">`)
3. 加隐藏 input `name="users"` 和 `name="draft" value="false"`
4. textarea 用 `defaultValue` 而非受控 `useState`(让浏览器原生表单主导)
5. 进度卡片接收 `args.progress` → 服务端不返回这个字段,加一个乐观 UI:提交期间 `setSubmitting(true)` 显示"提交中…",等待跳回
6. Messages 卡片从 `args.messages` 取值(用 `<pre>` 显示)

**验收**:
- 测试:提交一个含 1 行有效 TSV 的 form,断言 `request.post('/manage/userimport')` 被调用,body 包含 `users=alice@x.com\talice\tpass123`
- 服务端集成:点 Submit 后页面自动刷新,Messages 卡片显示"1 users found."

**文件**:
- `packages/ui-next/src/pages/manage_user_import.tsx` (改 +40 行)
- `packages/ui-next/src/pages/manage_user_import.test.tsx` (改 / 增强 +40 行,共测 preview 计数 + submit 调用)

---

### T4 — manage_user_priv 补齐 Select User + 批量设置 (大幅,本计划分两阶段)

**当前问题** (`packages/ui-next/src/pages/manage_user_priv.tsx`):
- `:70-72` `Select User` 按钮没有 onClick
- 整个页面的交互模型与 ui-default 不匹配:ui-default 是 Nunjucks partial,管理员先在左侧选用户 → 右侧设置 priv bit;ui-next 把它当成"显示默认角色矩阵",缺交互流程

**目标行为(对齐 ui-default)**:
- 左:`users` 列表(MemberTable) → 勾选若干用户
- "Select User" 按钮 → 把选中的 uid 列表灌入 `RoleSelector`(矩阵多列,每行一个用户)
- 中部:priv bit 矩阵(checkbox 网格)
- 顶部:Copy from default / Apply to selected buttons

#### 阶段 1(本计划 P0):最小可用交互
1. 给 MemberTable 启用 `selection` 模式,暴露 `selectedUids: number[]`
2. "Select User" → 把 `selectedUids` 写到 state,渲染矩阵时为每个 uid 渲染一列
3. 矩阵变化 → 触发 `applyPriv` → `request.post('/manage/userpriv', { uid, priv, system: false }, { form: true })`

#### 阶段 2(下个 P0):从默认位复制
4. 顶部加 "Copy default priv" 按钮 → 选中用户的 priv 全设为 `defaultPriv`
5. "Apply to all current default-priv users" → 走 `system: true` POST

**实现步骤**(本计划只做阶段 1):
1. 改造 `MemberTable`(若没有 `selection` 模式,新增 `onSelectionChange` prop)
2. `manage_user_priv.tsx` 加 `useState<Set<number>>` 管选中的 uid
3. 渲染矩阵: `roles: [{ _id: u.uid, perm: u.priv }, ...]`
4. 单元格点击 → 维护 `dirtyPriv: Record<uid, number>` 
5. "Save" 按钮 → 遍历 `dirtyPriv` 调 `POST /manage/userpriv`,然后 `router.refresh()`

**验收**:
- 测试: 选中 2 个用户 → 翻转一个 bit → 点 Save → `request.post` 被调用 2 次,带正确的 `uid` 和 `priv`
- 真实环境:勾 2 个用户,改一个 bit,点保存,刷新看 priv 变化

**文件**:
- `packages/ui-next/src/components/domain/MemberTable.tsx` (改 +30 行,加 selection)
- `packages/ui-next/src/pages/manage_user_priv.tsx` (改 +120 行,交互流程)
- `packages/ui-next/src/pages/manage_user_priv.test.tsx` (改 / 增强 +150 行)

**风险**: 这是 P0 中最大的一项,工作量 ~1.5 天。如果进度落后,可以压缩为"只暴露 selection + Save"两步,矩阵编辑留到下个迭代。

---

### T5 — 修 HIGH-3:lint + test 文件级失败 (`yarn lint:ci` 与 `vitest contest_create.test.tsx`)

#### T5.1 `yarn lint:ci` 76 warnings 失败

**当前**: `max-len`(75 处)+ `naming-convention`(1 处 `owner_udoc`),CI 阈值 = 0 warnings,**直接 FAIL**。

**方案选择**:
- **A. 一次性 bulk fix**: `cd packages/ui-next && yarn lint --fix` 让 eslint 自动把超长行拆分。预估 ~10 分钟,无风险
- **B. 放宽到 200 字符**:`packages/ui-next/.eslintrc*` 加 `{ rules: { 'max-len': ['warn', { code: 200 }] } }`。快速但**会引入新的债务**
- **C. 局部禁用**:对 `theme/theme-init.ts:1` 这种单行 JSON / 模板字符串加 `// eslint-disable-next-line max-len`

**本计划选 A**(cleaner),`src/lib/format.ts:38` 和 `src/registry/interceptors.tsx` 这类注释行可加 disable comment。

**实施**:
```bash
cd /home/xq/Hydro
yarn lint --fix
# 然后单独处理 naming-convention:packages/ui-next/src/...
# 找到 owner_udoc,改成 ownerUdoc
```

**验收**: `yarn lint:ci` 输出空。

#### T5.2 `contest_create.test.tsx` 文件级失败

**当前**:
- 5/5 测试**用例本身**通过
- 但 happy-dom 拦截到 `https://cdn.jsdelivr.net/npm/monaco-editor@0.55.1/min/vs/loader.js` 这个远程 script
- + 一个独立的 `ECONNREFUSED 127.0.0.1:3000`(说明某处用了真实 localhost)

**方案选择**:
- **A. mock `@hydrooj/monaco-loader`**(`packages/ui-next/src/components/contest/*` 装载的 loader),返回 dummy object
- **B. 在 `vitest.config.ts` 中 `server.deps.inline = ['@monaco-editor/loader']`**,让 happy-dom 不去打 cdn
- **C. 直接禁用 happy-dom 默认禁止远程 script 的开关**(会污染其他测试)

**本计划选 A**(最干净)。定位:
```bash
grep -rn "monaco-editor\|@hydrooj/monaco\|loader.init" packages/ui-next/src --include='*.tsx' --include='*.ts'
```
找到装载点后,在 `packages/ui-next/vitest.setup.ts`(或测试顶部)写:
```ts
vi.mock('@hydrooj/monaco', () => ({
  loadMonaco: async () => ({ monaco: { /* minimal stub */ } }),
}));
```

**验收**: `npx vitest run src/pages/contest_create.test.tsx` 报 `Tests 5 passed (5)` 且无 `Errors 0 errors`。

---

## 2. 实施顺序

| 顺序 | 任务 | 依赖 | 估时 |
|---|---|---|---|
| 1 | T5.1 lint:ci bulk fix | 无 | 0.5h |
| 2 | T5.2 vitest mock Monaco | 无 | 1h |
| 3 | T1 manage_script Run | T5.1 (需提交前 lint 绿) | 0.5d |
| 4 | T3 manage_user_import 改 form submit | 无 | 0.5d |
| 5 | T2 manage_setting Edit dialog | T5.1 | 1d |
| 6 | T4 manage_user_priv selection + Save | T5.1 | 1.5d |
| 7 | 端到端验证:启 hydrooj,4 个管理页全点过 | T1..T4 完成 | 0.5d |

**总估时**: ~4.5 天(单人)。

并行性: T1 / T3 可在 T2 / T4 进行时同步,因为它们对文件无重叠冲突。

---

## 3. 验收矩阵(完整 PR 合并前)

| 项 | 命令 | 期望 |
|---|---|---|
| 类型 | `npx tsc --noEmit` (在 ui-next) | 0 errors |
| 单元测试 | `npx vitest run` | 188/189 → **189/189 文件**, 全部 0 errors |
| Lint | `yarn lint:ci` | 0 warnings (无输出) |
| 端到端(可选) | `yarn test` | green(整个 e2e 套件,启 hydrooj + supertest) |
| 浏览器中(手工) | 启 hydrooj,以 root 登录 | 4 个管理页的所有按钮都能触发可见反应(跳转 / 弹窗 / 重载) |
| 隐私 | (n/a) | — |

---

## 4. 文件改动一览

```
packages/ui-next/src/pages/manage_script.tsx        (T1)
packages/ui-next/src/pages/manage_script.test.tsx   (T1, 新增)
packages/ui-next/src/pages/manage_setting.tsx      (T2)
packages/ui-next/src/pages/manage_setting.test.tsx (T2, 新增)
packages/ui-next/src/components/manage/SettingEditDialog.tsx  (T2, 新增)
packages/ui-next/src/pages/manage_user_import.tsx  (T3)
packages/ui-next/src/pages/manage_user_import.test.tsx (T3, 增强)
packages/ui-next/src/pages/manage_user_priv.tsx    (T4)
packages/ui-next/src/pages/manage_user_priv.test.tsx (T4, 增强)
packages/ui-next/src/components/domain/MemberTable.tsx (T4, 加 selection)
packages/ui-next/src/hooks/use-api.ts               (T1 / T4, 视实际需要小补丁)
packages/ui-next/vitest.setup.ts  或 packages/ui-next/vitest.config.ts (T5.2, mock Monaco)
.eslintrc* (T5.1, 验证无残余)
```

**预计净增**: ~600 行实现 + ~350 行测试。

---

## 5. 风险与备选

| 风险 | 影响 | 缓解 |
|---|---|---|
| T4 manage_user_priv 工作量超出预期 1.5 天 | 延期 | 降级为 **阶段 1 最小版**:只暴露 Save,矩阵编辑体验差但功能通;下个 P1 迭代完成 |
| T2 dialog 复用 `manage_config` 的 Input 模式时发现 select/radio 没实现 | 体验降级 | LOW-2 已知问题,在 dialog 里用 `<Input type=text>` 兜底,文档化下个 P1 解决 |
| `request.post` 的 form/redirect 解析缺失 | T1/T3/T4 都依赖 | 单点扩展 `hooks/use-api.ts`,约 +20 行 |
| T5.2 mock Monaco 后,**其他**测试也开始需要 mock | 连锁反应 | `vitest.setup.ts` 用 `vi.mock(...)` 集中声明,只 mock 一次 |
| `yarn lint:fix --fix` 把非长行也修了 | 噪音 PR | 先 diff `yarn lint -- --fix --dry-run` 看变化范围 |

---

## 6. 不在本计划但属于下一批(P1 / P2)

留给下个 plan:
- LOW-3 `manage_base.tsx:41` 空 main 处理
- LOW-2 manage_config 的 select/radio/textarea 实现
- MED-1 时间格式化重复(`manage_dashboard` 与 `manage_script` 重复)
- MED-2 `as unknown as { args: Args }` 反模式 → 推 `usePageArgs<Args>()` 助手
- LOW-4 bigint/number 在 manage_user_priv 中的边界
- LOW-5 `packages/ui-default/pages/setting.page.tsx` 的命名误导
- P1(更大事项): 训练 + 作业系统迁移,文件 / 个人偏好 / 2FA 弹窗

---

## 7. 决策日志

| 时间 | 决策 | 原因 |
|---|---|---|
| 2026-07-31 | B. 全部在 ui-next 补齐业务 | 用户确认;目标是把所有页面统一到 React + design system |
| 2026-07-31 | HIGH-3 纳入 P0 | CI 红无法合并 |
| 2026-07-31 | T3 选"方案 B(form action 不变)" | 零后端改动,P0 内可完成;JSON 化留给下个 P1 |
| 2026-07-31 | T4 只做"阶段 1 最小版" | 工作量最大,先稳交付 |
| 2026-07-31 | T5.1 选 `yarn lint --fix` bulk 自动修 | 比放宽 max-len 干净 |
| 2026-07-31 | T5.2 选 mock MonacoLoader 优先 | 比改 happy-dom / vitest 配置更局部 |

---

## 8. 完成定义(DoD)

- [ ] T1..T5.2 全部实施完成
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npx vitest run` 0 失败,0 errors,全部用例通过
- [ ] `yarn lint:ci` 0 warnings
- [ ] 真实环境启 hydrooj,以 root 登录(本地 Docker MongoDB),4 个 `/manage/*` 页面所有按钮可见响应
- [ ] 提交通过 squash + rebase,PR 链接加入本计划"## 7. 决策日志" 之后
- [ ] 本文状态变为 ✅ COMPLETED
