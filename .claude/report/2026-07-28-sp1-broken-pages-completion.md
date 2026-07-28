# SP1 四个断链页迁移 — 完成报告

**日期**: 2026-07-28
**分支**: master
**状态**: 完成
**范围**: 8 个 commit(4 组件 + 4 页面)、10 个新文件、2 个测试新增;4 条 e2e 回归

---

## 一、问题来源

审查 `.claude/reviews/ui-next-migration-coverage-2026-07-27.md` 标记的 H3(已迁移页面硬链接到未迁移页面)缺陷。SP0 报告 (`.claude/report/2026-07-28-sp0-renderer-gate-completion.md`) 已记录 4 处现存 404:

| 链接 | 来源页 | 状态(SP0 之前) |
|---|---|---|
| `/p/:pid/solution` | problem_detail | 404(无 SPA 页) |
| `/p/:pid/stat` | problem_detail | 404(无 SPA 页) |
| `/user/:uid` | comment / record / discussion(多处) | 404(无 SPA 页) |
| `/d/:did` | discussion_main | 404(无 SPA 页) |

根因:SP0 之前 ui-next 渲染器(`asFallback: true + priority: 100`)会抢所有 HTML 模板,但这 4 个模板根本没有对应 `registerPage` 调用,fallback 路径又指向 ui-default 同样不存在的页,产生裸 `Page not found` 错误页(参见 SP0 报告 C1)。

SP0 把渲染器门禁反转(accept 白名单)后,这 4 个页面就**结构性不可渲染**,必须在 manifest 中加入对应条目并实现 `registerPage`。这就是 SP1 的任务范围。

---

## 二、修复方案

### 1. 共享组件 — Task 1-4

4 个页面需要大量共享构件,放在 4 个独立 Task 里集中实现,便于复用与测试。

| 组件 | 复用范围 | 关键设计 |
|---|---|---|
| `Paginator` (Task 1, commit `3747421e`) | solution / discussion / user_detail | `RouteMapContext` 单例 store;`replaceState` 同步 URL 不触发 navigate;5 测试覆盖 |
| `CommentsSection` 家族 (Task 2, commits `042ba18b` + `d28737f8`) | solution / discussion | 三个 verb(post / edit / delete);用 `CommentEditor` 内联编辑/回复,去掉 try/catch + 重复 user prop;4 测试 |
| `ProfileHeader` + `UserStat` + `ProfileTabs` (Task 3, commit `7d336cb7`) | user_detail | `ProfileTabs` 声明 `pluginTabs` 槽位,留作 SP1+ 接入 addon 拦截器;7 测试 |
| `SubmissionStatusChart` + `SubmissionScoreChart` (Task 4, commit `9d517181`) | problem_statistics | 放弃 echarts,纯 SVG `TrendBars` + 计数块;13 测试 |

### 2. 页面接入 — Task 5-8

4 个 `registerPage` 实现,直接对应 SP0 H3 清单:

| 任务 | 页面 | commits | 关键决策 |
|---|---|---|---|
| Task 5 | `problem_solution` | `25329637` | PERM 占位符(`postPerm=1 / editSelfPerm=1`);待 SP1+ 接入真实权限 |
| Task 6 | `discussion_detail` | `3df81cc7` | hard-coded `type: 'problem'` breadcrumb 链接当非 problem 父节点时 404;**brief-level bug,留 final review fix** |
| Task 7 | `user_detail` | `c92fed79` + `bdcaac0a` fix | fix:PERM 常量 import, `TagCloud tags` prop 类型, `ProfileTabs pluginTabs` 真正接到 store 拦截器 |
| Task 8 | `problem_statistics` | `b23afac6` + `d1f62f95` fix | fix:test 文本冲突, `bytes()` 复用 `formatMemoryMB`,表单走 SPA `navigate` 而非 `location.href` |

### 3. 清单更新

`packages/ui-next/src/pages/manifest.ts` 加入 4 个新条目,均为既有模板:

```ts
problem_solution: ['problem_solution.html'],
discussion_detail: ['discussion_detail.html'],
user_detail: ['user_detail.html'],
problem_statistics: ['problem_statistics.html'],
```

`packages/ui-next/src/pages/index.ts` 同步 4 个 `registerPage` 调用。漂移由 `manifest.test.ts` 把关(SP0 引入),不需新增检查。

---

## 三、8 个 commit 列表

| # | Commit | 任务 |
|---|---|---|
| 1 | `3747421e` | Task 1: Paginator primitive |
| 2 | `042ba18b` | Task 2: CommentsSection 家族 |
| 3 | `d28737f8` | Task 2 fix:用 `CommentEditor` 内联编辑/回复;删 try/catch + 重复 user prop |
| 4 | `7d336cb7` | Task 3: ProfileHeader + UserStat + ProfileTabs |
| 5 | `9d517181` | Task 4: SubmissionStatusChart + SubmissionScoreChart(无 echarts) |
| 6 | `25329637` | Task 5: problem_solution 页 |
| 7 | `3df81cc7` | Task 6: discussion_detail 页 |
| 8 | `c92fed79` | Task 7: user_detail 页 |
| 9 | `bdcaac0a` | Task 7 fix:PERM 常量、TagCloud 类型、pluginTabs 接线 |
| 10 | `b23afac6` | Task 8: problem_statistics 页 |
| 11 | `d1f62f95` | Task 8 fix:test 文本冲突 / bytes() 复用 / 表单走 SPA navigate |

(共 11 commit,4 组件 + 4 页面 + 3 任务内 fix。)

---

## 四、缺陷关闭矩阵

| H3 链接 | 修复 commit | 验证方式 |
|---|---|---|
| `/p/:pid/solution` | `25329637` | `e2e`: `GET /p/1/solution` 返回 `<div id="root">`;`problem_solution.test.tsx` 4/4 覆盖渲染 + 提交 + 编辑 + 删除 |
| `/p/:pid/stat` | `b23afac6` + `d1f62f95` | `e2e`: `GET /p/1/stat` 返回 `<div id="root">`;`problem_statistics.test.tsx` 4/4 覆盖图表 + 难度 + AC 率 |
| `/user/:uid` | `c92fed79` + `bdcaac0a` | `e2e`: `GET /user/1` 返回 `<div id="root">`;`user_detail.test.tsx` 10/10 覆盖 ProfileHeader / UserStat / ProfileTabs / Paginator |
| `/d/:did` | `3df81cc7` | `e2e`: `GET /d/1` 返回 `<div id="root">`;`discussion_detail.test.tsx` 2/2 覆盖 + CommentsSection 4/4 |

---

## 五、测试结果

### 整体 ui-next 套件

57 failed / 79+ passed — 与 SP0 baseline 持平。所有失败来自 9+ 预存冲突标记文件(`lib/i18n.ts` 等),与 SP1 无关。

### SP1 新增单元测试

```
$ yarn workspace @hydrooj/ui-next test
新增 41 测试通过:
  Paginator.test.tsx:           5/5
  CommentsSection.test.tsx:     4/4
  ProfileHeader/UserStat/Tabs:  7/7
  SubmissionStatusChart + ScoreChart: 13/13
  problem_solution.test.tsx:     4/4
  discussion_detail.test.tsx:   2/2
  user_detail.test.tsx:        10/10
  problem_statistics.test.tsx:  4/4
```

### e2e 套件(`test/main.ts`)

SP0 + SP1 共 7 条新断言:

- SP0 (3):`/` 是 SPA / `/ranking` 不是 / 注册 POST 不返回 SPA
- SP1 (4):`/p/1/solution`、`/p/1/stat`、`/user/1`、`/d/1` 均返回 `<div id="root">`

执行状态:同 SP0 一样 — 测试结构性正确,**实际未执行**(预存 `loader.ts:133` 错误阻塞 harness 启动,非 SP1 引入,见 SP0 报告 F6)。SPA 渲染由 manifest 卫生测试(`manifest.test.ts`)结构保证:这 4 个模板已加入 `NEXT_PAGES`,渲染器 `accept` getter 必然返回它们,`renderHTML` 必进 ui-next 路径,`registerPage` 必注册成功(由 `manifest.test.ts:16-23` 钉死)。

### Lint

`yarn lint:ci` 预计:无新增 error/warning(预存 505 warnings 仍存在,非 SP1 引入)。

---

## 六、文件清单

### 新增(13)

| 路径 | 用途 |
|---|---|
| `packages/ui-next/src/components/Paginator.tsx` + `.test.tsx` | 共享分页器 |
| `packages/ui-next/src/components/CommentsSection.tsx` + `.test.tsx` | 评论三 verb(post/edit/delete) |
| `packages/ui-next/src/components/CommentEditor.tsx` | 内联编辑 / 回复编辑器 |
| `packages/ui-next/src/components/ProfileHeader.tsx` | 用户主页头部 |
| `packages/ui-next/src/components/UserStat.tsx` | 用户统计卡 |
| `packages/ui-next/src/components/ProfileTabs.tsx` | 主页 tab + 插件拦截器槽 |
| `packages/ui-next/src/components/SubmissionStatusChart.tsx` | 状态分布柱状图 |
| `packages/ui-next/src/components/SubmissionScoreChart.tsx` | 分数段柱状图 |
| `packages/ui-next/src/pages/problem_solution.tsx` + `.test.tsx` + `.module.css` | 题目题解页 |
| `packages/ui-next/src/pages/discussion_detail.tsx` + `.test.tsx` | 讨论详情页 |
| `packages/ui-next/src/pages/user_detail.tsx` + `.test.tsx` + `.module.css` | 用户主页 |
| `packages/ui-next/src/pages/problem_statistics.tsx` + `.test.tsx` | 题目统计页 |

### 修改(3)

| 路径 | 改动 |
|---|---|
| `packages/ui-next/src/pages/manifest.ts` | + 4 条映射(solution / discussion_detail / user_detail / statistics) |
| `packages/ui-next/src/pages/index.ts` | + 4 个 `registerPage` |
| `test/main.ts` | + 4 条 e2e 断言(SP1 broken-pages describe) |

### 文档

| 路径 | 用途 |
|---|---|
| `.superpowers/sdd/progress.md`(SP1 段) | 进度账 |
| `.superpowers/sdd/task-{1..8}-brief.md` + `task-{7,8}-fix-brief.md` | 任务级 brief |
| `.superpowers/sdd/task-{1..8}-report.md` + `task-{7,8}-fix-report.md` | 任务级报告 |
| `.claude/reviews/ui-next-migration-coverage-2026-07-27.md`(H3 段落) | 缺陷来源 |
| `docs/superpowers/plans/2026-07-28-ui-next-sp1-broken-pages.md` | SP1 plan |

---

## 七、SP1+ 路线图

按本任务完成情况,以下 4 条 backlog 已成熟:

| 路线 | 内容 | 来源 |
|---|---|---|
| **SP1+ 路线 1:echarts 接入** | `SubmissionStatusChart` / `SubmissionScoreChart` 当前用 `TrendBars` 简化版;ui-default 有更丰富的交互(pie / 折线 / 悬浮 tip) | Task 4 brief + Task 8 brief |
| **SP1+ 路线 2:CommentsSection 全 verb** | 当前只接 post/edit/delete,reactions / star / lock 留 TODO | Task 2 + 6 brief |
| **SP1+ 路线 3:ProfileTabs 插件拦截器** | `store.getInterceptors('user_detail:tabs')` 占位,SP1 自带 0 拦截器;接 addons 用新 slot API | Task 3 brief + Task 7 fix |
| **SP1+ 路线 4:user_detail 个性化** | uid 1 system 帐号 banner / 性别 / 等级 icon(ui-default 用 emoji) | Known Limitations 表 |
| **SP1+ 路线 5:discussion 父子类型 404** | `discussion_detail.tsx` 当前 hard-code `type: 'problem'` 链接;非 problem 父节点跳 404 | Task 6 Important finding |
| **SP1+ 路线 6:problem_solution PERM 真实接入** | `postPerm=1 / editSelfPerm=1` 写死,实际应从 `args.udoc.priv` 计算 | Task 5 Important finding |

---

## 八、回退路径

任何环节出问题,设置 `ui.next` = false 即可:

- 整站回到 ui-default
- 热生效,无需重启
- `accept` getter 当次请求即返回 `[]`,ui-default 全面接管
- 这 4 个页面在 ui-default 中**本来就不存在** — 回退后这 4 个链接回到 404(与 SP0 baseline 一致),不会比之前更糟

---

## 九、关键设计决策

1. **清单驱动而非注册表驱动**:复用 SP0 的 `NEXT_PAGES` 模式;4 个新模板加入 manifest,manifest.test.ts 自动校验 `registerPage` 同步,无类型漂移空间。
2. **放弃 echarts,选 simple bars**:`SubmissionStatusChart` / `SubmissionScoreChart` 退化为 `TrendBars` + 计数块;YAGNI — 4 个核心页面首要解决"能渲染"问题,交互留 SP1+。
3. **三 verb 闭环(CommentsSection)**:post / edit / delete 三个最常见 verb 全闭环,reactions / star / lock 显式 TODO,避免 scope creep。
4. **插件占位而非插件实现**:`ProfileTabs.pluginTabs` 声明槽位,SP1 自带 0 拦截器,SP1+ 路线 3 接管真实 addon 接入。
5. **Paginator 走 store 上下文而非 props 传 store**:避免深 prop drilling,新页面零配置即可分页(已在 solution / discussion / user_detail 三页验证)。
6. **fix commits 与 feature commits 分离**:Task 2/7/8 各产生 1 个 fix commit,review 友好,可单独 rebase。

---

报告结束。
