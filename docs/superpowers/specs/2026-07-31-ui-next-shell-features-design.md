# Shell Features Completion 设计

**日期**: 2026-07-31
**状态**: 待用户审阅
**范围**: 把 SP6/SP7/SP8 已迁移页面从"外壳渲染"提升到"基本功能可用"

## 1. 背景与目标

SP6 (site pages)、SP7 (domain management)、SP8 (admin backend) 各自把 6+10+7 = 23 个 ui-default 页面迁移到 ui-next。这些页面都是"外壳渲染"——能显示但不能交互。本计划补齐关键交互(form submit / CRUD / 权限编辑),把外壳提升到"基本功能可用"。

## 2. 总体架构

按页面优先级分 4 个 Track:

- **Task 1**: about / wiki_help / status / ranking / home_files / home_domain / home_messages — 最小交互(read-only 增强)
- **Task 2**: domain_create + domain_edit(共享 DomainForm 接 submit handler)
- **Task 3**: domain_user / domain_group / domain_role / domain_permission(CRUD 接线)
- **Task 4**: 综合回归 + final review

## 3. 每个 Track 的最小边界

### 3.1 Track 1: read-only 增强
- about / wiki_help / status:加锚点跳转 / 时间排序 / 严重度颜色
- ranking:加前 3 名高亮(已部分实现,验证)
- home_files / home_domain / home_messages:列表渲染 + 空态 + 排序

### 3.2 Track 2: domain_create / edit 接 submit
- 引入 `useFormSubmit` hook
- DomainForm 接 `onSubmit={...}` 调 `request.post(/domain/{create|edit})`
- 加载状态(`busy`)+ 错误 toast
- 成功后路由跳转

### 3.3 Track 3: domain_user / group / role / permission CRUD
- 引入 `useDomainAction` hook(批量 API:join / leave / update role / delete group)
- MemberTable 接 `onAction` 回调
- RoleSelector 接 `onChange` 回调(checkbox grid)
- 实际 POST / DELETE 到 `/domain/{user|group|role|permission}`

### 3.4 Track 4: 综合回归

## 4. 完成门禁

- read-only 增强:7 页 + 测试
- domain_create / edit:form 接 submit + 路由跳转 + 错误处理
- domain_user / group / role / permission:CRUD 接通 + MemberTable/RoleSelector 接 onAction/onChange
- 全量 vitest + e2e harness 通过

## 5. 回退策略

每 Task 独立回退。

## 6. 已知限制

- 不实现 optimistic UI(每次 mutation 后 reload)
- 不实现表单字段级 validation(只 client-side 必填检查)
- 不实现 search / filter / pagination(留 SP10+)

---

报告:`.claude/report/2026-07-31-ui-next-shell-features-completion.md`。