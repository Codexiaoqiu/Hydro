# ADR-1 — ui-next 是否替代 ui-default

**状态**: Pending decision (建议下次 sprint 拣起)
**日期**: 2026-08-04
**作者**: claude (autonomous plan execution)
**前置 review**: [.claude/reviews/ui-default-to-ui-next-by-feature.md](../.claude/reviews/ui-default-to-ui-next-by-feature.md)

## Context

ui-default 是基于 Nunjucks + React（webpack 打包）的传统 UI；ui-next 是 Vite + React 19 的 SPA。F1-F9 业务模块覆盖率从 85% 提升到 95%，但仍存在以下约束影响替代决策：

- **运行时差异**：ui-next 的 `manage_config` 使用 schemastery-react（Vue/Element Plus 桥接），浏览器级行为未独立验证
- **邮件系统**：ui-next 不实现 mail 模板，邮件仍由 ui-default 服务
- **第三方 addon**：大部分 addon 的前端仍由 ui-default 提供；迁移成本未评估
- **AGPLv3 合规**：替代后 ui-default 模板可能需要保留（邮件、partials、print 等）
- **toggle 机制**：当前 `/admin/ui` 提供运行时 toggle（已存在），可平滑过渡

## Options

### Option 1: 全量替换（删除 ui-default）

- 优点：单一技术栈，bundle 体积减半，长期维护成本低
- 缺点：
  - 破坏邮件系统（mail 模板未迁移）
  - 破坏第三方 addon 的页面（每个 addon 需单独迁移）
  - 破坏 `partials/` 系列（print、files 等）
  - 需要审计所有 ui-default 路由并逐一迁移

### Option 2: 渐进切换（按路由选择 UI）

- 优点：
  - 风险可控
  - 用户体验渐进
  - 第三方 addon 可独立迁移
- 缺点：
  - 双 UI 长期共存，bundle 体积不减半
  - URL 路由设计需要重新考虑（同一路由两种渲染）

### Option 3: 用户自选（`/admin/ui` toggle — 现状）

- 优点：灵活性最高；用户/管理员可选择
- 缺点：默认 ui-default 意味着新功能继续在 ui-default 实现，ui-next 改进缺乏动力

## Decision (建议)

**Option 2 (渐进切换)** — 默认 ui-default（稳定），admin 后台 / 用户中心 / 比赛详情走 ui-next（已实现），通过 `/admin/ui` toggle 让用户自选。理由：
- 风险最小，不破坏现有 3rd-party addon
- ui-next 已有 95% 覆盖率，可独立发展
- 邮件系统由 ui-default 继续服务（迁移成本 > 收益）
- 长期可考虑 Option 1（删除 ui-default），但需要先做 addon 适配 + 邮件迁移

## Consequences

- ui-default 模板仍需维护（`packages/ui-default/templates/` 保留）
- 第三方 addon 仍按 ui-default 模式开发
- ui-next 的 F5 / F8 / F9 minor follow-ups 继续推进
- 每季度 review 一次覆盖率和用户反馈
