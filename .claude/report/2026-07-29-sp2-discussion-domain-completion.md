# SP2 讨论域迁移 — 完成报告

**日期**: 2026-07-29  
**状态**: ✅ 完成  
**范围**: 11 commits（5 components + 4 pages + e2e+report；按交付项口径）

> Git 实际历史为 10 个 commit：5 个组件交付 commit、4 个页面交付/fix commit、1 个 e2e+report commit。`discussion_main` 与 `discussion_node` 两个页面共用实现并合入同一 commit，因此比“5 + 4 + 1”逐项拆 commit 的计划口径少 1 个 commit。

---

## 一、问题来源

覆盖率审查 `.claude/reviews/ui-next-migration-coverage-2026-07-27.md` 的讨论域缺口原文为：

> `讨论 (discussion) | 4 | discussion_create, discussion_detail, discussion_edit, discussion_main_or_node`

其中 `discussion_detail` 已在 SP1 完成。SP2 处理余下 3 个模板：`discussion_main_or_node.html`、`discussion_create.html`、`discussion_edit.html`；共享模板对应 `discussion_main` 与 `discussion_node` 两个 schema route page key，因此形成 4 个页面入口。

---

## 二、修复方案

### 1. 讨论域共享组件

| 组件 | 用途 |
|---|---|
| `DiscussionList` / `DiscussionListItem` | 讨论列表、节点/作者/回复数/浏览数与详情链接 |
| `DiscussionNodesWidget` | 讨论节点导航 |
| `DiscussionSidebar` | 主讨论页和普通节点页侧栏、创建入口 |
| `DiscussionForm` | create/edit 共用标题、Markdown 内容、高亮、置顶与 Ctrl+Enter 提交协议 |

### 2. 页面接入

- `discussion_main` 与 `discussion_node` 共用 `discussion_main.tsx`，并在 `index.ts` 中注册两次。
- 两个 page key 都映射到同一个 `discussion_main_or_node.html`；`NEXT_TEMPLATES` 自动去重。
- `discussion_create.tsx` 对应 `discussion_create.html`。
- `discussion_edit.tsx` 对应 `discussion_edit.html`。
- create/edit 都复用 `DiscussionForm`；实际 POST 使用 SP1 同款 `document.createElement('form')` 协议，避免嵌套表单，并支持 edit 的 update/delete 两个 verb。
- manifest 漂移检测继续复用 SP0 的 `manifest.test.ts`，没有新建第二套清单校验。

---

## 三、11 commit 列表

以下来自 `git log --oneline 58dbbc9c..HEAD` 的 SP2 历史；Task 8 commit 为本报告与 e2e 的最终提交：

| # | Commit | 任务 |
|---|---|---|
| 1 | `e505d08d` | DiscussionList + DiscussionListItem |
| 2 | `68669d10` | DiscussionNodesWidget |
| 3 | `7c40020b` | DiscussionSidebar |
| 4 | `f0c39aae` | DiscussionForm（create/edit 共享） |
| 5 | `1057e8a7` | discussion primitives 统一从 `index.ts` 导出 |
| 6 | `4a12417a` | discussion_main + discussion_node 共享页面 |
| 7 | `911000fb` | discussion_main/node review fix（逻辑 id、侧栏、breadcrumb、创建入口） |
| 8 | `12c60b02` | discussion_create 页面 |
| 9 | `386894d4` | discussion_edit 页面 |
| 10 | `本 commit` | SP2 4 条 e2e + 完成报告 |

计划标题的“11 commits”实际是 11 个交付项口径；共享页面同 commit 落地后，Git commit 数为 10，未伪造不存在的第 11 个 SHA。

---

## 四、缺陷关闭矩阵

| Route | Schema page key | 服务端模板 | SP2 后行为 |
|---|---|---|---|
| `/discuss` | `discussion_main` | `discussion_main_or_node.html` | ui-next shell，不再 fall-through |
| `/discuss/:type/:name` | `discussion_node` | `discussion_main_or_node.html` | ui-next shell，不再 fall-through |
| `/d/:did/edit` | `discussion_edit` | `discussion_edit.html` | ui-next shell，不再 fall-through |
| `/discuss/:type/:name/create` | `discussion_create` | `discussion_create.html` | ui-next shell，不再 fall-through |

`manifest.ts`、`pages/index.ts` 与 `manifest.test.ts` 同步登记，确保 schema-routed page key 和真实模板一致。

---

## 五、测试结果

### SP2 定向单元测试

执行：

```text
yarn workspace @hydrooj/ui-next test \
  src/components/discussion/DiscussionList.test.tsx \
  src/components/discussion/DiscussionNodesWidget.test.tsx \
  src/components/discussion/DiscussionSidebar.test.tsx \
  src/components/discussion/DiscussionForm.test.tsx \
  src/pages/discussion_main.test.tsx \
  src/pages/discussion_create.test.tsx \
  src/pages/discussion_edit.test.tsx \
  src/pages/manifest.test.ts
```

结果：**8 files passed，30/30 tests passed**。

| 范围 | 结果 |
|---|---|
| DiscussionList/ListItem + NodesWidget + Sidebar + Form | 14/14 |
| discussion_main/node（含 review fix 分支） | 8/8 |
| discussion_create | 1/1 |
| discussion_edit | 3/3 |
| manifest drift test | 4/4 tests；required-template 用例包含 4 个 discussion assert |

运行时打印了若干 `ECONNREFUSED 127.0.0.1:3000` 噪声，但 Vitest 最终退出成功且 30/30 通过。

### e2e

`test/main.ts` 在 SP0/SP1 的 7 条断言之后新增 4 条 smoke assert：`/discuss`、`/discuss/node/x`、`/d/1/edit`、`/discuss/node/x/create` 均要求 HTTP 200 且包含 ui-next root shell。

实际 e2e 执行仍被 SP0 报告 F6 所述预存 `loader.ts:133` boot error 阻塞；断言结构已落地，harness 修复后即可执行。该阻塞不是 SP2 引入。

### 预存基线

- `lib/i18n.ts` 的预存冲突保持不动（SP0 F5）。
- MonacoEditor 相关预存测试冲突/失败保持不动（SP0/F6 基线），不属讨论域范围。

---

## 六、文件清单

Git 相对 `58dbbc9c` 实际新增 **24 个文件**。brief 中“13 new files”只覆盖组件实现/样式/部分测试的子口径，不能代表整批新增文件；以下按仓库事实列出。

### 组件（15）

- `DiscussionForm.tsx`、`.module.css`、`.test.tsx`
- `DiscussionList.tsx`、`.module.css`、`.test.tsx`
- `DiscussionListItem.tsx`、`.module.css`（测试并入 DiscussionList）
- `DiscussionNodesWidget.tsx`、`.module.css`、`.test.tsx`
- `DiscussionSidebar.tsx`、`.module.css`、`.test.tsx`
- `components/discussion/index.ts`

### 页面（9）

- `discussion_main.tsx`、`.module.css`、`.test.tsx`（同时服务 main/node）
- `discussion_create.tsx`、`.module.css`、`.test.tsx`
- `discussion_edit.tsx`、`.module.css`、`.test.tsx`

### 修改

- `packages/ui-next/src/pages/index.ts`
- `packages/ui-next/src/pages/manifest.ts`
- `packages/ui-next/src/pages/manifest.test.ts`
- `test/main.ts`

---

## 七、SP3+ 路线

1. **M1：Button danger variant** — 为 discussion_edit 删除动作提供正式 danger 视觉语义，替换当前 ghost 样式。
2. **SP3 parity** — ContestForm permission/invite/assign、真实 Monaco、ProblemSidebar 提交入口、user_sudo TFA/WebAuthn。
3. **后续页面迁移** — training、homework、contest_mode；随后 ranking/status/about/wiki/home_domain/home_files、domain 管理与 manage 后台。
4. **讨论域增强** — reaction/emoji、节点折叠与选中态、vnode 封面、登录 modal、历史/版本链、权限与限速反馈。

---

## 八、回退路径

设置 `ui.next = false` 即可让这些 route 回到 ui-default：

- 开关由 renderer accept getter 每请求读取，支持热回退。
- SP0 的 manifest hygiene 继续保护邮件模板、pjax row/status/summary 与 `partials/*`，这些模板不会被 ui-next 接管。

---

## 九、关键设计决策

1. **共享模板双注册**：`discussion_main` 与 `discussion_node` 注册同一个动态 import，并共享 `discussion_main_or_node.html`。
2. **共享表单协议**：create/edit 共用 `DiscussionForm`；MarkdownEditor 与 Ctrl+Enter 行为一致，页面负责构造 POST form。
3. **真实权限常量**：删除门控使用 `PERM_DELETE_DISCUSSION`；通过 `lib/perm-constants` 从 `@hydrooj/common` re-export，不复制 bigint 位值。
4. **逻辑 id 而非数据库 `_id`**：Task 5 review fix 修正 problem/contest/generic node 的 route id 选择，避免 problem 分页链接使用 Mongo `_id`。
5. **i18n 冲突不扩散**：`lib/i18n.ts` 存在预存 git conflict，本批不修改；测试局部 mock，避免把无关冲突带入 SP2。

---

报告结束。
