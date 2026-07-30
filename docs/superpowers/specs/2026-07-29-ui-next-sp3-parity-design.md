# Hydro ui-next SP3 parity 设计

**日期：** 2026-07-29  
**状态：** 待用户审阅  
**范围：** 已迁移页面的四项功能 parity，以及 `discussion_edit` 删除动作的正式危险语义

## 1. 背景与目标

SP0 建立了 manifest 驱动的 renderer 门禁与整站回退，SP1 修复四个断链页面，SP2 完成讨论域迁移。覆盖率审查和前三阶段完成报告将下一阶段定义为已迁移页面的 parity 补齐：

- M1：`ContestForm` 权限、邀请码与指派能力；
- M2：题目编辑相关场景的真实 Monaco；
- M3：`ProblemSidebar` 提交入口；
- M4：`user_sudo` 的 password、TFA 与 WebAuthn；
- SP2 follow-up：为 `discussion_edit` 删除动作增加 `Button danger` variant。

SP3 的目标不是继续接管新模板，而是修复已经迁移页面中影响核心功能、安全性或操作反馈的差距。

## 2. 总体架构

SP3 拆为五个可以独立实现、测试、审查和回退的 Track：

1. ContestForm parity；
2. 真实 Monaco；
3. ProblemSidebar 提交入口；
4. `user_sudo` 安全 parity；
5. `Button danger` primitive。

五个 Track 无强实现依赖，最终汇入统一的 SP3 回归和完成门禁。各 Track 应尽可能采用独立 commit，避免 Monaco 或 sudo 的高风险变更阻塞其他功能回退。

## 3. Track 1：ContestForm parity

### 3.1 目标

使 `contest_create` 与 `contest_edit` 恢复 ui-default 已有的比赛访问控制：

- `permission = public | invite | assign`；
- `invite` 模式支持 `_code`；
- `assign` 模式支持用户或用户组指派；
- 编辑已有比赛时正确回填现值。

### 3.2 设计边界

复用现有 `ContestForm`，并优先复用仓库已有 autocomplete/select 协议，不新增用户搜索 API。SP3 不顺带迁移覆盖率审查未列入 M1 的 ranklist、气球等比赛功能。

### 3.3 数据与提交协议

`ContestEditHandler` 和 ui-default 表单是字段协议的真源。数据流为：

```text
服务端 args
  → ContestForm 初始状态
  → permission 切换
      public → 不显示附加字段
      invite → 显示邀请码输入
      assign → 显示用户/用户组指派选择
  → URLSearchParams
  → 现有 create/edit POST endpoint
```

提交约束：

- 始终提交 `permission`；
- 仅在 `invite` 模式提交 `_code`；
- 仅在 `assign` 模式提交 `assign`；
- 切换模式后不得提交已失效的附加字段；
- edit 页面必须回填已有值；
- 类型定义必须匹配服务端实际注入数据，不用猜测性断言隐藏协议差异。

### 3.4 错误处理

`assign` 数据加载或 autocomplete 失败时保留已选值并显示可恢复错误，不静默提交空值覆盖原配置。服务端验证失败继续走现有表单错误显示。若模板与 handler 协议存在差异，以 handler 实际读取逻辑为准，并用测试固定。

## 4. Track 2：真实 Monaco

### 4.1 目标

让需要代码或 YAML 编辑能力的题目编辑入口使用真实 Monaco，同时保留 textarea 回退、内容同步和既有提交协议。

### 4.2 设计边界

先盘点 `MonacoEditor` 所有调用方，只为需要代码编辑能力的入口启用真实 Monaco。不全局强制修改默认值，以免无意影响所有调用方、增加加载成本或破坏不需要 Monaco 的输入区域。Scratchpad 的现有行为必须保持。

### 4.3 数据流

```text
value
  → MonacoEditor / MonacoEditorHost
  → 本地编辑状态
  → debounce onChange
  → 表单状态
  → submit 前 flushPendingChange()
```

要求：

- 通过 lazy import 加载 Monaco，不阻塞页面壳；
- 加载期间保持可用 fallback 或明确加载状态；
- 加载或初始化失败时退回 textarea，且不丢内容；
- 页面卸载或提交前 flush pending change；
- YAML/config 场景保留验证，普通源码场景不误套 YAML schema；
- 不改变字段名、语言值或 endpoint。

### 4.4 错误处理

Monaco 是渐进增强而非页面可用性的单点故障。dynamic import 或初始化失败均在组件边界内回退。验证失败阻止对应配置提交并定位错误，但不得清除用户输入。测试环境不强求启动 Monaco worker，而是验证 adapter、同步和 fallback 边界。

## 5. Track 3：ProblemSidebar 提交入口

### 5.1 目标

清除所有 `href="#"` 和空 `onClick`，让提交入口只有三种显式状态：允许提交、需要登录、禁止提交。

### 5.2 单一行为解析

多个菜单分支不得分别拼接 URL。引入单一提交动作解析边界：

```text
pdoc + tdoc + mode + UserContext
  → resolveSubmitAction()
      allowed   → problem_submit URL
      anonymous → login URL + redirect
      forbidden → disabled item + reason
  → Menu 渲染
```

约束：

- 普通题目保留 `pid`；
- contest/homework 模式保留 `tid` 和题目上下文；
- 未登录时进入登录流程并携带站内返回地址；
- 已登录但无权限时使用不可点击语义和可访问的原因文本；
- 缺少关键 `pid` 或 `tid` 时降级为禁止状态，不生成畸形链接；
- 不重做整个 sidebar，不扩展提交页本身。

## 6. Track 4：`user_sudo` 安全 parity

### 6.1 目标

严格对齐 `UserSudoHandler` 和 ui-default 协议，支持：

- password confirmation；
- TFA code；
- WebAuthn；
- 成功后的安全重定向；
- 失败后保留当前认证方式和上下文。

### 6.2 组件边界

认证方式由服务端能力和当前用户状态决定，前端只显示被允许的方式。如果通用 `LoginForm` 无法表达 sudo 的多方法协议和 fail-closed 边界，则新增职责明确的 `SudoAuthForm`，不为追求复用而扩大登录组件职责。

### 6.3 数据流与协议

```text
服务端 args / available methods
  → 选择 password | tfa | authn
  → 构造对应字段和 operation
  → UserSudoHandler
  → 成功：校验 redirect 后导航
  → 失败：保留当前方法并显示错误
```

要求：

- password/TFA 使用 handler 要求的 `confirm` 操作和字段；
- WebAuthn 获取 challenge 后调用 `navigator.credentials.get()`；
- credential 使用 ui-default 或仓库现有 helper 的格式序列化；
- 使用 handler 要求的 `webauthn_verify` 操作提交；
- 浏览器不支持 WebAuthn 时隐藏或禁用该方式，并提供说明；
- 成功只能由服务端响应确认。

### 6.4 安全边界

采用 fail-closed：

- 未知认证方式不渲染；
- challenge 缺失、WebAuthn API 不可用、credential 为空或序列化失败时不提交；
- 用户取消 WebAuthn 是可恢复状态，不自动换方法或重试；
- 服务端拒绝后不自动重试；
- password、TFA code 和 credential 不进入 URL、日志、analytics 或持久化存储；
- redirect 只接受站内相对目标，非法值回退安全默认页面；
- 本 Track 必须接受独立 TypeScript/React review 和 security review。

## 7. Track 5：`Button danger`

### 7.1 目标与边界

扩展现有 Button variant：

```ts
variant: 'primary' | 'ghost' | 'danger'
```

`danger` 定义默认、hover、focus-visible 和 disabled 状态，并替换 `discussion_edit` 删除动作当前的 `ghost`。不在 SP3 增加 `size`、loading、icon 或 outline 等无关能力。

### 7.2 行为约束

`danger` 只表达视觉语义，不自动执行确认或删除。`discussion_edit` 继续使用现有 ConfirmDialog、权限门控和 delete POST 协议。disabled 必须实际阻止点击，focus-visible 不能只依赖颜色。

## 8. 测试策略

### 8.1 ContestForm

至少覆盖：

- create 默认 permission；
- edit 回填三种 permission；
- permission 切换时字段显示与隐藏；
- invite 提交 `permission` 与 `_code`；
- assign 提交 `permission` 与完整 `assign`；
- 切换后不提交失效字段；
- 服务端错误不清空当前选择；
- 既有基础字段、delete 和 clone 行为不退化；
- 测试中的字段断言与 `ContestEditHandler` 实际读取逻辑一致。

### 8.2 Monaco

至少覆盖：

- 目标编辑入口启用真实 Monaco；
- lazy import 成功后显示 Monaco；
- 加载或初始化失败时回退 textarea；
- fallback 与 Monaco 切换不丢内容；
- debounce 变更在提交前 flush；
- YAML/config 验证不退化；
- Scratchpad 和既有调用方不回归。

### 8.3 ProblemSidebar

建立以下矩阵：

| 上下文 | 用户状态 | 预期 |
|---|---|---|
| 普通题目 | 有权限 | 正确 `problem_submit` URL |
| contest | 有权限 | URL 保留 `tid`、`pid` |
| homework | 有权限 | URL 保留作业上下文 |
| 任意 | 未登录 | 登录 URL 带安全 redirect |
| 任意 | 已登录无权限 | 不可点击并显示原因 |
| 缺关键数据 | 任意 | 禁用，不生成畸形 URL |

另加不变式：输出中不存在 `href="#"`。

### 8.4 `user_sudo`

至少覆盖：

- password、TFA、WebAuthn 按服务端能力展示；
- password 和 TFA 提交准确的 operation 与字段；
- challenge 获取、`navigator.credentials.get()` 和 credential 序列化；
- 用户取消时不提交；
- 不支持 WebAuthn 时提供可恢复状态；
- 服务端拒绝后保留当前方法；
- 只接受站内 redirect；
- 外部、协议相对和畸形 redirect 回退安全默认地址；
- 敏感值不进入查询串或本地存储。

### 8.5 Button danger

至少覆盖：

- `danger` class 映射；
- `primary`、`ghost` 不退化；
- disabled 阻止点击；
- `discussion_edit` 删除按钮采用 `danger`；
- ConfirmDialog 确认后才执行 delete。

## 9. 综合验证顺序

按成本从低到高执行：

1. 五个 Track 的定向 Vitest；
2. `manifest.test.ts`；
3. 完整 `@hydrooj/ui-next` 测试套件；
4. TypeScript/build；
5. `lint:ci` 或受影响范围 lint；
6. 环境允许时运行 SP3 e2e；
7. 若 e2e 仍被既有 `loader.ts:133` boot error 阻塞，必须如实记录，不能以结构性测试宣称 e2e 已通过。

## 10. 完成门禁

仅当以下条件全部满足时才可发布 SP3 完成报告：

- M1–M4 与 Button danger 均有实现和测试；
- 所有新增定向测试通过；
- manifest 无新增漂移；
- Monaco 保留可用 fallback；
- `ProblemSidebar` 不再有空操作提交入口；
- `user_sudo` 已完成 handler 协议对照和安全审查；
- 无新增 TypeScript、lint 或构建错误；
- e2e 实际执行状态被准确记录；
- 每个 Track 的已知限制与回退路径均有记录。

## 11. 回退策略

SP3 不新增模板接管，继续保留 SP0 的站点级回退：

```text
ui.next = false
```

除此之外，各 Track 应可独立回退：

- Monaco 可单独退回 textarea；
- sudo Track 可独立回退，不影响其他 Track；
- Button danger 回退不改变删除协议；
- Contest 与 Sidebar 的回退不影响 renderer manifest。
