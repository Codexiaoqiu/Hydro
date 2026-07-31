# Hydro ui-next SP6 Site Pages Migration 设计

**日期**: 2026-07-31
**状态**: 待用户审阅
**范围**: 把 6 个 ui-default 站点页面迁移到 ui-next

## 1. 背景与目标

SP0–SP4 完成了讨论域 + 比赛页 + 题页迁移;SP5 闭环了 deferred 项与 lint/test 基线。SP6 目标是把 SP0 §7 路线图里"站点页面 + 账户杂项"尚未迁移的 6 个站点页面接管到 ui-next。

5 个账户页(`home_messages` / `home_security` / `home_settings` / 6 个 user_*)已在 SP0–SP2 期间迁移;实际剩 6 个站点页未接管:

| Page | 模板行数 | Handler | 复杂度 |
|---|---|---|---|
| about | 13 | misc.ts | 简单(wiki content) |
| home_files | 15 | misc.ts | 简单(files list) |
| home_domain | 63 | home.ts | 中(domain table + role) |
| status | 74 | status.ts | 中(journal log) |
| ranking | 80 | misc.ts | 中(user ranking) |
| wiki_help | 189 | misc.ts | 复杂(wiki 多 section) |

SP6 不动 renderer / manifest 注册机制 / 站点级回退;仅增加 6 个 `registerPage` + 6 个 `manifest.ts` 条目 + 6 个 React 组件 + 测试。

## 2. 总体架构

6 个 Track(每个页面一个),完全独立 commit,各自独立回退。共享组件(`TopNav` / `Markdown` / `RichMedia` 等)沿用 SP0–SP4 已建的,不新建 primitives。

每个 Track 的最小交付:
- `packages/ui-next/src/pages/<page>.tsx` — React 组件
- `packages/ui-next/src/pages/<page>.test.tsx` — vitest
- `packages/ui-next/src/pages/manifest.ts` — 加 1 条 `NEXT_PAGES` 映射
- `packages/ui-next/src/pages/index.ts` — 加 1 个 `registerPage`

页面优先级(按复杂度 + 复用性):
- **Task 1**: about(13 行, wiki 渲染,验证 wiki primitives 可复用)
- **Task 2**: home_files(15 行, list + upload,验证 file primitives 可复用)
- **Task 3**: home_domain(63 行, table + permission gating,验证 perm primitives)
- **Task 4**: status(74 行, journal log,验证 pjax 子集已存在)
- **Task 5**: ranking(80 行, user ranking,验证用户列表 primitives)
- **Task 6**: wiki_help(189 行,最大,放最后,前面 5 个会暴露 primitives 缺口)

## 3. 每个 Track 的最小边界

### 3.1 about

- 数据:handler 注入 `sections: Array<{ id: string; title: string; content: string }>`
- 渲染:循环 sections,渲染 `Markdown` + 锚点
- 不做:wiki 编辑器、wiki 搜索、嵌套子页

### 3.2 home_files

- 数据:handler 注入 `files: Array<{ name: string; size: number; mtime: number }>`(简化假设)
- 渲染:files 列表 + 上传按钮(按钮不接事件,只是占位)
- 不做:实际 upload、delete、rename

### 3.3 home_domain

- 数据:handler 注入 `domains: Array<{ _id: string; name: string; role: string }>`
- 渲染:data-table(Name / ID / My Role / Action),`Create Domain` / `Join Domain` 按钮(权限门控)
- 不做:domain 创建/加入的实际 flow

### 3.4 status

- 数据:handler 注入 `journals: Array<{ time: number; message: string; level: string }>`
- 渲染:journal list(时间倒序),每条 `level` 配色(`info` / `warn` / `error`)
- 不做:实际 pjax 更新(`/status/update`)、订阅

### 3.5 ranking

- 数据:handler 注入 `ranking: Array<{ rank: number; udoc: UserLite; score: number }>`
- 渲染:list,每行 rank / avatar / uname / score,top-3 高亮
- 不做:实际分页、详情页跳转(用 placeholder `<a>`)

### 3.6 wiki_help

- 数据:handler 注入 `sections: Array<{ id: string; title: string; content: string }>`(与 about 同结构)
- 渲染:左侧 TOC + 右侧 sections(锚点跳转)
- 不做:搜索、嵌套子页

## 4. 测试策略

每个页面 3-5 个 vitest 测试,覆盖:
- 渲染(空数据、典型数据)
- 关键不变式(ranking top-3 高亮、home_domain 权限门控、wiki_help 锚点)
- i18n 边界(中文/英文 key 存在)

**不**测:
- 实际 API 调用(vitest 不发请求)
- 实际文件上传 / 删除
- pjax 轮询

## 5. 完成门禁

- 6 个 page + 6 个 test 创建完成
- `manifest.ts` 增加 6 条映射,`index.ts` 增加 6 个 `registerPage`
- `manifest.test.ts` 自动覆盖 drift(沿用 SP0 测试)
- `yarn workspace @hydrooj/ui-next test src/pages/about.test.tsx src/pages/home_files.test.tsx src/pages/home_domain.test.tsx src/pages/status.test.tsx src/pages/ranking.test.tsx src/pages/wiki_help.test.tsx` 全过
- `yarn workspace @hydrooj/ui-next test` 不新增 failures
- `yarn lint:ci` 不新增 errors
- 全分支 review 通过

## 6. 回退策略

每个页面独立回退(单 commit revert)。站点级 `ui.next = false` 继承 SP0。任何页面出问题,设置开关即回退整个 ui-next。

## 7. 已知限制

- 6 个页面只是"外壳"渲染,实际功能(file upload / domain create / status update / ranking 详情 / wiki 编辑)留 SP7+ follow-up
- 复杂度高的 wiki_help(189 行)受 SP6 任务大小限制,可能只能覆盖 ~70% 的原始模板字段;剩余部分由 SP7 backlog 处理
- 不引入新 primitives(沿用现有);如发现 primitives 缺口,先记入 ledger,留 SP7 处理

---

报告与 progress ledger:`.claude/report/2026-07-31-sp6-site-pages-completion.md`、`.superpowers/sdd/progress.md`。