# SP0: ui-next 渲染器门禁与安全增量 — 设计

**日期**: 2026-07-28
**状态**: 设计稿,待用户审阅
**父审查**: `.claude/reviews/ui-next-migration-coverage-2026-07-27.md`
**子项目**: SP0(SP0–SP7 全量迁移路线图的第一项)

---

## 1. 范围

修复 ui-default → ui-next 迁移中三个阻断级缺陷与两个高危缺陷,使「42% 已迁移」可安全上线:

- **C1** ui-next 通过 `asFallback: true` + `priority: 100` 劫持所有模板,导致 41 个未迁移页面损坏(详见审查报告)
- **C2** 注册/找回密码邮件正文被替换为 SPA 外壳(账号锁死)
- **H1** pjax 片段被塞入完整 HTML 文档
- **H2** 三层 opt-out 机制全部失效,无逃生口
- **H3** 已迁移页面硬链接到未迁移页面,产生 4 处现存 404

后续子项目(SP1–SP7)的页面迁移与功能补齐**不在本 spec 范围**。

## 2. 根因

`framework/framework/server.ts:208-213` 的渲染器选择是 `r.accept.includes(name) || r.asFallback`,再按 `priority` 降序取第一。ui-next(`accept: []`, `asFallback: true`, `priority: 100`)与 ui-default(`accept: []`, `asFallback: true`, `priority: 1`)都设了 `asFallback: true`,该过滤条件**无条件通过**两者——故 `accept` 实际是死代码,ui-next 永远胜出。客户端 `app.tsx:45-51` 找不到注册页就返回裸 `<div>Page not found</div>`,发生在 `Layout` 之前,无导航无样式,HTTP 仍为 200。SPA 跳转走 `base.ts:77-99` 的 JSON 分支,**根本不调 `renderHTML`**。

## 3. 架构

四个改动,职责互不重叠:

| # | 改动 | 修复 | 文件 |
|---|---|---|---|
| 1 | 清单模块(纯数据,零依赖) | 提供服务端 `accept` 单一来源 | 新增 `src/pages/manifest.ts` |
| 2 | `index.ts` 用清单驱动 `accept`,`asFallback: false` | C1 / C2 / H1 | 修改 `packages/ui-next/index.ts` |
| 3 | `app.tsx` 错误页升级 + `router.tsx` `navigate()` 整页加载兜底 | H3 + 未来 H3(随迁移自动失效) | 修改 `src/app.tsx`, `src/context/router.tsx` |
| 4 | `ui.next` 站点级开关 + `/admin/ui` Handler + 删除三层死代码 | H2 | 新增 `src/handler/admin-ui.ts` + 设置项;删除 `src/hooks/use-disable-next.ts` 及其测试;清理 `src/pages/admin_ui.tsx` 中关于 `SettingModel` 的虚假注释 |

### 3.1 清单模块

`src/pages/manifest.ts`(新增,纯数据,服务端与客户端共用):

```ts
export const NEXT_PAGES = {
  homepage:     ['main.html'],
  error:        ['error.html', 'bsod.html'],
  contest_edit: ['contest_edit.html'],   // contest_create 共用
  problem_edit: ['problem_edit.html'],   // problem_create 共用
  problem_main: ['problem_main.html'],
  // …共 30 条映射,key 与 src/pages/index.ts 中 registerPage 的 key 一一对应
} as const;

export const NEXT_TEMPLATES: readonly string[] = Object.freeze(
  [...new Set(Object.values(NEXT_PAGES).flat())],
);
```

`as const` + `Object.freeze` 防止意外篡改。`homepage` 路由对应 `main.html`(`handler/home.ts:172`),`contest_create` 与 `problem_create` 各自共用 `_edit.html`,`error` 需包含 `error.html` 与 `bsod.html`(`base.ts:117`)。遗漏任一项即导致对应路由回退到 ui-default 而非报错——所以测试 3.2 的「必须含」断言同样关键。

### 3.2 渲染器注册

`packages/ui-next/index.ts` 在 `registerRenderer('next', ...)` 内将 `accept` 改为 getter,以承载站点开关并保持 `readonly` 契约:

```ts
ctx.server.registerRenderer('next', {
  name: 'next',
  output: 'html',
  asFallback: false,                                  // 反转:不再接管一切
  priority: 100,
  get accept() { return enabled ? NEXT_TEMPLATES : []; },
  render: /* 不变 */,
});
```

`renderers` 存对象引用(`server.ts:910`),`renderHTML` 每请求重读 `r.accept`(`:210`),getter 天然支持热切换——无需重注册、无需重启。DEV 与 PROD 两路注册都需同样改。

### 3.3 站点级开关

- 新增设置项 `ui.next`(默认 ON,装 addon 即视为同意)。
- 新增 `src/handler/admin-ui.ts` 实现 `POST /admin/ui` Handler,设 `PRIV.PRIV_EDIT_SYSTEM` 权限,载荷 `{ next: 'on' | 'off' }`,写入 `SettingModel.set('ui.next', ...)`。
- `index.ts` 监听 `system/setting` 事件,更新 `enabled` 局部变量,getter 当次请求即生效。
- `admin_ui.tsx` 现已实现完整的 toggle UI + read-only 模式,只需把 `:12-16` 的「Writes the boolean to SettingModel」注释从「谎言」变为事实——其 POST 调用不再 404。
- 删除 `src/hooks/use-disable-next.ts` 及其测试。删除 `src/pages/admin_ui.tsx` 中对 `SettingModel` 的任何虚假引用(若有)。保留 `useDisableNext` 之外的 `use-disable-next` 导入如被其他文件使用则保留 hook 框架但移除 query/storage 路径——本 spec 实施时需 grep 确认。

### 3.4 SPA 跳转兜底

死循环风险与分流:首次加载无注册页是「清单漂移」bug,应渲染错误;SPA 跳转无注册页是「目标未迁移」,应交回服务端。

| 场景 | 含义 | 处理 |
|---|---|---|
| 首次加载 · 查无注册页 | 服务端已决定归 ui-next,客户端无对应 → 漂移 | `app.tsx` 渲染正式错误页(带 nav),**绝不重载** |
| `navigate()` · 查无注册页 | 目标未迁移,属预期 | `router.tsx` 执行 `window.location.href = url`,`return false` |

`navigate()` 拿 JSON 时已得到 `x-hydro-page` / `x-hydro-template`(`router.tsx:86-87`),立刻查 `store.getDefault('page:'+name)`,查不到就整页加载并 `return false`。首次加载**不经过 `navigate()`**——结构上分流,**死循环在代码上不可能**。无需 `PENDING_HTML` 那类 sessionStorage 计数器。

`app.tsx` 的 `Page not found` 分支(`:45-51`)升级为带 `DefaultLayout` 的真实错误页,标题「此页面尚未提供新版 UI」,内含「返回首页」链接 + 「切换到旧版 UI」(指向 `/admin/ui` 当且仅当当前用户有 `PRIV_EDIT_SYSTEM`)。这覆盖漂移与未来某次构建产物损坏两种情况。

## 4. 组件边界

- **`manifest.ts`** — 纯数据,无任何 React/Node 依赖。客户端(测试)+ 服务端(运行时)都 import。
- **`admin-ui.ts` Handler** — 仅设置读写,不渲染任何 UI。`admin_ui.tsx` 是它的可视化端。
- **`enabled` 变量** — 闭包于 `apply()` 内,被 renderer getter 与 setting 事件监听器共享。getter 与 `enabled` 必须在同一闭包内,否则两路注册会各有独立副本——这点在实施时由单一 `apply()` 函数自然保证。
- **`router.tsx`** — 增加的兜底逻辑只影响 SPA 跳转;首次加载入口 `fetchPage(init: true)` 不变。

## 5. 错误处理

- 设置项缺失/类型错误 → 默认为 `true`(装 addon 即同意),打 `logger.warn` 一次。
- 清单漂移(测试发现)→ CI 失败,本 spec 视作不允许发生的事件;若运行时通过其他路径发现(例如新加的路由忘了清单),`app.tsx` 错误页给出可操作指引而非空白。
- `navigate()` 兜底后服务端仍返回 ui-next SPA → 不会发生(GET 整页加载时 `base.ts:101` 走 `renderHTML`,而 `accept` 命中意味着 ui-next;但客户端查不到页是漂移,**首次加载不重载**,所以该路径不存在)。
- 邮件/pjax 修复是 `asFallback: false` 的直接副产品——它们的模板不在清单,`renderHTML` 落到 `ui-default(priority: 1)`,无新增代码。

## 6. 测试

| 层级 | 文件 | 内容 |
|---|---|---|
| 单元 | `src/pages/manifest.test.ts` | (1) `Object.keys(NEXT_PAGES) === registerPage keys`;(2) `NEXT_TEMPLATES ⊇ ['main.html','error.html','bsod.html']`;(3) `NEXT_TEMPLATES` 不含 `/(_mail\|_tr\|_status\|_summary\|partials)/` 模式(直接钉死 C2/H1 回归) |
| 单元 | `src/context/router.test.tsx` | `navigate()` 收到未注册模板时调用 `window.location.href`,首次加载入口不调用 |
| 单元 | `src/hooks/use-disable-next.test.tsx` | 整个文件删除 |
| e2e | `test/main.ts` | (a) `GET /` 响应含 `<div id="root">`;(b) `GET /ranking` 响应含 nunjucks `{{` 标记或 ui-default 静态资源;(c) 注册流响应体含验证码而非 SPA 根 div |

## 7. 灰度

按严重度而非代码顺序验证——C2 邮件锁账号是唯一会「出事故」的:

1. 基线记录:SP0 实施前跑一次 `yarn lint` / `yarn test`,记录存量错误数(已知 505 lint / 8 fail)。SP0 **不允许新增**。
2. 落地 `manifest.ts` + `accept` getter + `asFallback: false`。
3. **手工验证注册邮件**(C2):发一封测试邮件,确认正文含验证码而非 `<div id="root">`。
4. `navigate()` 兜底 + `app.tsx` 错误页升级。
5. `/admin/ui` Handler + `ui.next` 设置项 + `system/setting` 监听。
6. `yarn lint` / `yarn test` / `yarn build` 全跑,确认不增错误。
7. 提交 PR,描述里明确「邮件 + pjax 同步修复」「SPA 跳转自动兜底」。

`ui.next` 默认 ON;`/admin/ui` 关闭后 `accept` 返回 `[]`,ui-default 全面接管,热生效。任何环节出问题,设置改 false 即可回退,无需重启。

## 8. 风险与权衡

- **接受**:加了一处 `getter` 抽象(getter 不在原 `Renderer` 接口契约中,但 `readonly string[]` 兼容)。代价是 ui-next 注册时多一层间接。
- **接受**:SP0 不在 e2e 覆盖 C2(邮件)——`test/main.ts` 不走 SMTP。本 spec 强制要求手工验证作为合并条件,在 PR 描述里点明。
- **推迟**:存量 lint / test 错误属独立问题,本 spec 不修。
- **推迟**:SP1–SP7 全部页面迁移与功能补齐在独立 spec 推进。

## 9. 实施分解(供 writing-plans 进一步展开)

1. `manifest.ts` + 清单卫生测试
2. `index.ts` `accept` getter + `asFallback: false` + 删 `asFallback: true` 注释
3. `navigate()` 兜底测试 + 落地
4. `app.tsx` 错误页升级
5. `admin-ui.ts` Handler + `ui.next` 设置项 + `system/setting` 监听
6. 删除 `use-disable-next.ts` 及其测试
7. 全套测试 + `yarn build` + 手工邮件验证
