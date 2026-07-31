# Hydro ui-next SP8 Admin Backend Migration 设计

**日期**: 2026-07-31
**状态**: 待用户审阅
**范围**: 把 ui-default 的 7 个后台管理页面迁移到 ui-next

## 1. 背景与目标

SP0 §7 路线图的"站点后台 6 页"(实际 7 个模板)。SP6 完成 site pages,SP7 完成 domain management;SP8 完成最后一项后台管理 UI。

7 个 ui-default 模板:

| Template | 复杂度 |
|---|---|
| manage_base | 中(layout) |
| manage_config | 中 |
| manage_dashboard | 中 |
| manage_script | 中 |
| manage_setting | 中 |
| manage_user_import | 中 |
| manage_user_priv | 中(可复用 SP7 MemberTable) |

`manage_base` 是其他 manage 页面的 layout 基础。

## 2. 总体架构

8 个 Track(7 页 + final review),按依赖顺序递进:

- **Task 1**: `manage_base`(layout 基础)
- **Task 2-7**: `manage_config` / `manage_dashboard` / `manage_script` / `manage_setting` / `manage_user_import` / `manage_user_priv`
- **Task 8**: 综合回归 + final review

每 Track 自包含:新 `.tsx` + 新 `.test.tsx` + `manifest.ts` +1 行 + `index.ts` +1 行。

## 3. 每个 Track 的最小边界

### 3.1 manage_base
- **数据**:`user: { _id, uname, perm, priv }` + 当前 section 名
- **渲染**:顶部 banner(user info)+ sidebar nav(7 个后台入口)+ content slot

### 3.2-3.6 manage_config / dashboard / script / setting / user_import
- 各 handler 注入对应 args;渲染 form / cards / table;不做 submit 持久化

### 3.7 manage_user_priv
- 复用 SP7 `MemberTable`(type="user")

## 4. 完成门禁

- 7 个 .tsx + 7 个 .test.tsx;manifest.ts +7 行,index.ts +7 行;vitest 不新增 failures;lint 不新增 errors。

## 5. 回退策略

每页独立回退。站点级 `ui.next = false` 继承 SP0。

## 6. 已知限制

- 表单 submit / 持久化 / bulk import 留 SP9+;视觉一致性刻意不 100%。

---

报告:`.claude/report/2026-07-31-sp8-admin-backend-completion.md`。