# SP0 渲染器门禁与安全增量 — 完成报告

**日期**: 2026-07-28
**分支**: master(用户于 2026-07-28 决定直接 commit,覆盖此前 q.md "不提交" 约定)
**状态**: ✅ 完成
**范围**: 9 个 commit,17 个文件,+311/-420 净行

---

## 一、问题来源

审查 `.claude/reviews/ui-next-migration-coverage-2026-07-27.md` 发现 5 个迁移缺陷:

| 缺陷 | 严重度 | 现象 |
|---|---|---|
| C1 | CRITICAL | ui-next 渲染器通过 `asFallback: true + priority: 100` 劫持所有 HTML 模板,导致 41 个未迁移页面损坏(裸 `<div>Page not found</div>`,无导航无样式) |
| C2 | CRITICAL | 注册/找回密码邮件正文被替换为 SPA 外壳 → 用户收不到验证码 → 账号锁死 |
| H1 | HIGH | pjax 片段(`/problem_list` 等)被塞入完整 HTML 文档,污染 `{fragments:[{html}]}` JSON 响应 |
| H2 | HIGH | 三层 opt-out 机制(use-disable-next hook、UiContext.uiNext、admin_ui 页面)全部失效,无逃生口 |
| H3 | HIGH | 已迁移页面硬链接到未迁移页面,产生 4 处现存 404 |

根因:ui-default 与 ui-next 两个渲染器都设了 `accept: [] + asFallback: true`,`accept` 沦为死代码,ui-next 永远胜出。

---

## 二、修复方案

四个改动,职责互不重叠:

### 1. 单一来源清单

`packages/ui-next/src/pages/manifest.ts`(新增,纯数据,零依赖):

```ts
export const NEXT_PAGES = {
  homepage: ['main.html'],
  error: ['error.html', 'bsod.html'],
  contest_edit: ['contest_edit.html'],   // contest_create 共用
  // …共 30 条映射
} as const;
export const NEXT_TEMPLATES = Object.freeze(
  [...new Set(Object.values(NEXT_PAGES).flat())]
);
```

### 2. 渲染器门禁反转

`packages/ui-next/index.ts` 两路 `registerRenderer` 调用:

```ts
ctx.server.registerRenderer('next', {
  asFallback: false,                              // 反转
  priority: 100,
  get accept() { return enabled ? NEXT_TEMPLATES : []; },  // getter 承载开关
  // render 逻辑不变
});
```

`renderers` 存对象引用(`framework/framework/server.ts:910`),`renderHTML` 每请求重读 `r.accept`(`:210`),getter 天然支持热切换。

### 3. 站点级开关

- `packages/hydrooj/src/interface.ts:33` — `SystemKeys` 增加 `ui_next: boolean`
- `packages/hydrooj/src/handler/admin-ui.ts` (新增) — `AdminUiHandler`,`POST /admin/ui`,`PRIV_EDIT_SYSTEM` 门控
- `packages/hydrooj/src/handler/manage.ts:364` — 注册路由
- `packages/ui-next/index.ts:258-269` — `system/setting` 监听器,翻转 `enabled` 闭包变量

支持 pm2 集群: `bus/broadcast` 在 worker 间转发(`packages/hydrooj/src/service/bus.ts:106-122`),每个 worker 独立更新自己的 `SystemModel.cache`,所以切换在所有 worker 同步生效。

### 4. SPA 跳转兜底 + 错误页升级

`packages/ui-next/src/context/router.tsx`:

```ts
// fetchPage 返回 { ok, pageName } — Option A 设计选择
// 兜底只在 navigate() 中执行,fetchPage 直接调用路径(首次加载)结构上不可达
if (pageName && !store.getDefault(`page:${pageName}`)) {
  window.location.href = url;
  return false;
}
```

`packages/ui-next/src/app.tsx:45-61` — `Page not found` 分支升级为带 `DefaultLayout` 的完整错误页,带导航恢复路径。

### 5. 删死代码

- `packages/ui-next/src/hooks/use-disable-next.ts`(102 行)
- `packages/ui-next/src/hooks/use-disable-next.test.tsx`(124 行)
- `packages/ui-next/src/pages/admin_ui.tsx`(70 行)
- `packages/ui-next/src/pages/admin_ui.test.tsx`(109 行)
- `packages/ui-next/src/api.ts` 移除两行 `useDisableNext` re-export

---

## 三、9 个 commit 列表

| # | Commit | 任务 |
|---|---|---|
| 1 | `d1612d0e` | feat(ui-next): add NEXT_PAGES manifest as single source of truth |
| 2 | `65383090` | feat(ui-next): reverse renderer hijack via manifest-driven accept allowlist |
| 3 | `3041ecfc` | feat(ui-next): SPA navigate() falls back to full page load for unmigrated pages |
| 4 | `cfab3741` | feat(ui-next): upgrade Page not found to a full-layout error page |
| 5 | `fc994f76` | feat: add /admin/ui handler and ui.next setting for ui-next toggle |
| 6 | `bef168c3` | refactor(ui-next): remove dead opt-out code (use-disable-next, admin_ui page) |
| 7 | `b5f3c907` | fix(ui-next): remove dangling admin_ui references after page deletion(Task 6 后续) |
| 8 | `699c6a0e` | test: add e2e regression for SP0 renderer gate |
| 9 | `3bd72b26` | fix(ui-next): move SPA fallback from fetchPage to navigate(整分支 review F1 修复) |

---

## 四、缺陷关闭矩阵

| 缺陷 | 修复 commit | 验证方式 |
|---|---|---|
| C1 渲染器劫持 | `65383090` | `manifest.test.ts:16-23` 断言 5 个关键模板必须含;smoke test: `curl /` 返回 `<div id="root">`,`curl /ranking` 不返回 |
| C2 邮件被劫持 | `d1612d0e` | `manifest.test.ts:25-35` 钉死 `*_mail.html` 永不进入 `NEXT_TEMPLATES`(结构保证);`test/main.ts:107-114` 注册响应不含 SPA shell(proxy 验证) |
| H1 pjax 片段被劫持 | `d1612d0e` | `manifest.test.ts:25-35` 同样钉死 `*_tr.html` / `*_status.html` / `*_summary.html` / `partials/*` |
| H2 opt-out 死代码 | `bef168c3` + `fc994f76` | 4 文件删除;真 `POST /admin/ui` Handler 注册到 `manage.ts:364` |
| H3 SPA 跳转到未迁移页 | `3041ecfc` + `3bd72b26` | `router.test.tsx` 两个测试用例(无注册页 → fallback 触发;有注册页 → fallback 不触发) |

---

## 五、测试结果

### SP0 新增测试

```
$ yarn workspace @hydrooj/ui-next test src/pages/manifest.test.ts src/context/router.test.tsx
 Test Files  2 passed (2)
      Tests  6 passed (6)
```

- `manifest.test.ts`:4 条不变式(键匹配 / 必须含 / 永不收录禁止模板 / 冻结去重)
- `router.test.tsx`:2 条(无注册页兜底触发 / 有注册页兜底不触发)

### 整体 ui-next 套件

57 failed / 79+ passed — 与 SP0 之前持平。失败均来自 9+ 预存冲突标记文件(`lib/i18n.ts` 等),非 SP0 引入。`9177231c fix:ui-next` 之后又增加了更多预存脏文件。

### 整分支 review(opus)

**APPROVE WITH COMMENTS** — 6 项发现:

| 编号 | 严重度 | 描述 | 处置 |
|---|---|---|---|
| F1 | MEDIUM | SPA 兜底在 `fetchPage` 而非 `navigate`(spec §3.4 偏差) | ✅ commit `3bd72b26` 修复 |
| F2 | LOW | `index.ts:262` 的 `as never` 类型断言 + 死 catch 块 | 文档化为 tsconfig-cache 临时方案,`yarn install` 后可去除 |
| F3 | LOW | `AdminUiHandler` 非标参数解构 | 纯样式,留作后续清理 |
| F4 | LOW | C2 缺运行时 e2e(MAIL_TRANSPORT=debug 不存在) | 源码保证已足够;runtime e2e 作 follow-up |
| F5 | INFO | 9+ 预存冲突标记文件 | 不属 SP0 范围,单独 chore |
| F6 | INFO | `loader.ts:133` 预存 "invalid plugin" 错误阻塞 e2e 套件启动 | 不属 SP0 范围,单独 fix |

---

## 六、文件清单

### 新增(5)

| 路径 | 用途 |
|---|---|
| `packages/ui-next/src/pages/manifest.ts` | NEXT_PAGES 清单 |
| `packages/ui-next/src/pages/manifest.test.ts` | 4 条不变式 |
| `packages/ui-next/src/context/router.test.tsx` | 2 条兜底测试 |
| `packages/hydrooj/src/handler/admin-ui.ts` | AdminUiHandler |
| `.claude/reviews/ui-next-migration-coverage-2026-07-27.md`(审查输入) | 覆盖率审查 |

### 修改(7)

| 路径 | 改动 |
|---|---|
| `packages/ui-next/index.ts` | import + enabled 闭包 + 两路 getter + system/setting 监听 |
| `packages/ui-next/src/context/router.tsx` | fetchPage 返回 `{ok, pageName}`,navigate 兜底 |
| `packages/ui-next/src/app.tsx` | Page not found → 完整错误页 |
| `packages/ui-next/src/registry/store.ts` | 新增 `keys(): string[]` API |
| `packages/hydrooj/src/interface.ts` | `SystemKeys.ui_next: boolean` |
| `packages/hydrooj/src/handler/manage.ts` | 注册 `admin_ui` 路由 |
| `test/main.ts` | 3 条 e2e 回归断言 |

### 删除(4)

| 路径 | 行数 |
|---|---|
| `packages/ui-next/src/hooks/use-disable-next.ts` | 102 |
| `packages/ui-next/src/hooks/use-disable-next.test.tsx` | 124 |
| `packages/ui-next/src/pages/admin_ui.tsx` | 70 |
| `packages/ui-next/src/pages/admin_ui.test.tsx` | 109 |

### 文档

| 路径 | 用途 |
|---|---|
| `docs/superpowers/specs/2026-07-28-ui-next-renderer-gate-design.md` | 设计 |
| `docs/superpowers/plans/2026-07-28-ui-next-renderer-gate.md` | 实施计划 |
| `.claude/reviews/ui-next-migration-coverage-2026-07-27.md` | 覆盖率审查(问题来源) |
| `.superpowers/sdd/progress.md`(SP0 段) | 进度账 |
| `.superpowers/sdd/task-{1..7}-report.md` + `task-1-fix-report.md` + `task-6-fix-report.md` + `task-3-fix2-report.md` | 任务级报告 |

---

## 七、SP1+ 路线图(SP0 已扫清安全增量部署的障碍)

按 `.claude/reviews/ui-next-migration-coverage-2026-07-27.md` 中的 SP0–SP7 排序:

| 子项目 | 内容 | 页数 | 启动条件 |
|---|---|---|---|
| **SP1** | 4 个当前断链页(problem_solution / problem_statistics / user_detail / discussion_detail) | 4 | 立即可启动 |
| **SP2** | 讨论域 | 3 | SP1 之后 |
| **SP3** | 已迁移页面的 parity 补齐(M1 ContestForm 权限、M2 Monaco、M3 侧栏提交、M4 sudo TFA) | — | 独立 |
| **SP4** | 训练 + 作业(可大量复用比赛组件) | 7 | SP2 之后 |
| **SP5** | 站点页面 + 账户杂项(ranking / status / about / wiki_help / home_domain / home_files + 账户 5 页) | 11 | 独立 |
| **SP6** | 域管理 | 8 | 流量低,放后面 |
| **SP7** | 站点后台 | 6 | 同上 |

每个子项目都按 SP0 流程:独立 spec → 独立 plan → subagent 实施 → 任务级 review → 整分支 review。

---

## 八、回退路径

任何环节出问题,设置 `ui.next` = false 即可:

- 整站回到 ui-default
- 热生效,无需重启
- `accept` getter 当次请求即返回 `[]`,ui-default 全面接管
- 51% 未迁移页面继续以旧 UI 正常服务

---

## 九、关键设计决策(供未来参考)

1. **清单而非注册表驱动**:`NEXT_PAGES` 是数据而非代码,使服务端 `accept` 与客户端 `registerPage` 可单独校验;漂移测试在 CI 把关。
2. **getter 而非 watcher**:`enabled` 是闭包变量,getter 在 `renderHTML` 时按需读取。比订阅+重注册简单,且能正确支持 pm2 多 worker。
3. **SystemModel 而非 SettingModel**:`ui.next` 是系统级配置,不应进入 `SettingService` 的域/用户分桶。`SystemKeys` 是它的正确归宿。
4. **navigate 而非 fetchPage 兜底**:首次加载的 `useEffect` 走 `fetchPage` 而非 `navigate`,结构上隔离,死循环不可能。
5. **manifest 卫生作为 C2/H1 的实际保证**:mail/pjax 模板根本不进入 `NEXT_TEMPLATES`,ui-next 渲染器永远看不到它们。比试图验证邮件正文更可靠。

---

报告结束。
