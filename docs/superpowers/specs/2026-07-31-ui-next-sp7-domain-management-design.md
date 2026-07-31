# Hydro ui-next SP7 Domain Management Migration 设计

**日期**: 2026-07-31
**状态**: 待用户审阅
**范围**: 把 ui-default 的 11 个域管理页面迁移到 ui-next

## 1. 背景与目标

SP0 §7 路线图里的"域管理 8 页"(实际 11 个模板)。SP6 已完成 6 个站点页面;SP7 接管域管理 UI。

11 个 ui-default 模板:

| Template | 行数 | 复杂度 | Handler |
|---|---|---|---|
| domain_base | 26 | 中(layout 基础) | domain.ts |
| domain_dashboard | 45 | 中 | domain.ts |
| domain_create | 54 | 中 | domain.ts |
| domain_edit | 6 | 小(extends base) | domain.ts |
| domain_join | 46 | 中 | home.ts |
| domain_join_applications | 66 | 中-大 | domain.ts |
| domain_permission | 66 | 中-大 | domain.ts |
| domain_role | 71 | 大 | domain.ts |
| domain_user | 86 | 大 | domain.ts |
| domain_user_raw | 4 | 极小(JSON API) | domain.ts |

**`domain_user_raw`** 返回原始 JSON(API endpoint),SPA shell 不太合适——保持 ui-default 提供。

## 2. 总体架构

9 个 Track(8 个页面 + final review),按依赖顺序递进:

- **Task 1**: `domain_base`(基础 layout,作为其他页面 shell)
- **Task 2**: `domain_dashboard`(domain 主页)
- **Task 3**: `domain_create` + `domain_edit`(共享 `DomainForm`)
- **Task 4**: `domain_join` + `domain_join_applications`(共享 join 流程)
- **Task 5**: `domain_user`(user 列表,大型)
- **Task 6**: `domain_group`(group 列表)
- **Task 7**: `domain_role`(role 管理,大型)
- **Task 8**: `domain_permission`(permission 管理,中-大型)
- **Task 9**: 综合回归 + final review

每 Track 自包含:
- 新 `.tsx` + 新 `.test.tsx`
- `manifest.ts` +1 行
- `index.ts` +1 行
- 必要时共享 component(如 `DomainForm`、`MemberTable`)

**共享 components**:
- `DomainForm` — create/edit 复用(Task 3)
- `MemberTable` — user/group/permission 复用(Task 5/6/8)
- `RoleSelector` — role 选择器(Task 7)

## 3. 每个 Track 的最小边界

### 3.1 domain_base

- **数据**:`domain: { _id, name, displayName, owner }` + `userPerm: string`
- **渲染**:顶部 banner(domain info)+ sidebar nav(Dashboard / User / Group / Role / Permission)+ content slot
- **不做**:实际 nav 跳转(用 `<a href>` 占位)

### 3.2 domain_dashboard

- **数据**:`domain`, `stats: { userCount, groupCount, problemCount, contestCount }`, `recentActivities: Array<{ time, message }>`
- **渲染**:stats cards(4 个)+ recent activities list
- **不做**:实际 activity 详情页

### 3.3 domain_create + edit (共享 DomainForm)

- **数据**:`domain: { name, displayName, gravatar, _id? }`
- **渲染**:表单(name, displayName, gravatar, submit)
- **共享**:`<DomainForm domain={...} />` 组件
- **不做**:实际 submit、validation(只渲染 fields)

### 3.4 domain_join + applications

- **数据**:`domain`, `joinInfo: { code?, allowJoin, joinMessage? }`, `applications: Array<{ uid, time, message, status }>`
- **渲染**:domain info + join form / applications table
- **不做**:实际 join flow

### 3.5 domain_user

- **数据**:`domain`, `users: Array<{ uid, uname, role, joinedAt, email }>`
- **渲染**:data-table(uid / uname / role / joinedAt / actions)
- **共享**:`<MemberTable members={users} type="user" />`
- **不做**:分页、详情页

### 3.6 domain_group

- **数据**:`domain`, `groups: Array<{ _id, name, memberCount, owner }>`
- **渲染**:data-table(_id / name / members / owner / actions)
- **共享**:复用 `MemberTable` (type="group")

### 3.7 domain_role

- **数据**:`domain`, `roles: Array<{ _id, name, permissions: string[], userCount }>`
- **渲染**:role list + permission matrix(checkbox grid)
- **共享**:复用 `RoleSelector`
- **不做**:实际权限编辑

### 3.8 domain_permission

- **数据**:`domain`, `permissions: Array<{ _id, name, scope, type, appliesTo }>`
- **渲染**:permission matrix(grid by type × scope)
- **共享**:复用 `RoleSelector`
- **不做**:实际 permission CRUD

### 3.9 domain_user_raw (Task 9 决策)

- **Decision point**:在 Task 9 综合回归时判断:`domain_user_raw` 返回 JSON,不是 SPA 渲染;保持 ui-default 提供,不纳入 ui-next manifest。

## 4. 测试策略

每个页面 3-5 个 vitest,覆盖:
- 渲染(空数据、典型数据)
- 关键不变式(role gating、permission display)
- i18n 边界

**不**测:
- 实际 API 调用
- 实际 submit/CRUD

## 5. 完成门禁

- 10 个 page(domain_user_raw 跳过)+ 10 个 test 创建完成
- `manifest.ts` 增加 10 条映射,`index.ts` 增加 10 个 `registerPage`
- `manifest.test.ts` 自动覆盖 drift
- 全量 vitest 不新增 failures
- lint 不新增 errors

## 6. 回退策略

每个 page 独立回退。站点级 `ui.next = false` 继承 SP0。

## 7. 已知限制

- `domain_user_raw` 保留 ui-default(JSON API endpoint)
- 表单 submit / CRUD flow / 权限矩阵实际编辑留 SP8+
- 视觉一致性刻意不 100%

---

报告与 progress ledger:`.claude/report/2026-07-31-sp7-domain-management-completion.md`、`.superpowers/sdd/progress.md`。