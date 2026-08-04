# ui-next Phase 3 ADR 计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 review 中"中期（产品策略）"的 2 个开放性问题落到具体 ADR，方便下次 sprint 拣起时不需要重新讨论。这是**纯文档任务**，无代码改动。

**Architecture:** 每个 ADR 是单独的 markdown 文件，使用标准 ADR 模板（Context / Options / Decision / Consequences）。ADR 不强制立即决策 — 如果 owner 还没拍板，标记 "Pending decision" 并记录 options 即可。

**Tech Stack:** Markdown（仅文档，无代码依赖）。

## Global Constraints

- ADR 文件位置：`docs/superpowers/decisions/YYYY-MM-DD-<name>.md`（已存在 1 个：`2026-08-03-missing-routes-reclassified.md`，是 Task 2.1 产物）
- ADR 之间互相引用使用 markdown link：`[name](file.md)`
- 不得包含 info-bearing 注释或翻译字符串（与项目其他 markdown 一致）
- 任务粒度：每步 2-5 分钟；以"commit"作为 task 收尾

---

## Task 1: ADR-1 — ui-next 是否替代 ui-default

**Files:**
- Create: `docs/superpowers/decisions/2026-08-04-ui-next-replacement-strategy.md`

**Background:** 当前 ui-next 覆盖约 95% 业务功能（修复后），但仍有以下不确定性影响"是否替代 ui-default"的决策：
- `manage_config` 仍依赖 schemastery-react（Vue/Element Plus wrapped in veaury），happy-dom 不渲染 inputs；浏览器级行为未独立验证
- `manage_user_import` 的 preview UX 在 P1-0 重构后未做端到端浏览器测试
- 邮件系统（mail 模板）未迁移到 ui-next，仍由 ui-default 服务
- 17 个 ui-default 模板（mail/_tr/_status/_summary/partials/）仍由 ui-default 服务
- 第三方 addon 的页面适配工作量大

- [ ] **Step 1: 写 ADR-1**

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/decisions/2026-08-04-ui-next-replacement-strategy.md
git commit -m "docs(adr): ui-next replacement strategy (pending decision)"
```

---

## Task 2: ADR-2 — 17 个 ui-default 模板归宿

**Files:**
- Create: `docs/superpowers/decisions/2026-08-04-ui-default-templates-fate.md`

**Background:** F1-F9 修复 + P1-4/P1-5 后，ui-default 仍有 17 个模板未被 ui-next 替代。需要按"保留 / 可删除 / 未决"分类。

- [ ] **Step 1: 列出 17 个 ui-default 模板的归宿**

```bash
cd /home/xq/Hydro
ls /home/xq/Hydro/packages/ui-default/templates/*.html > /tmp/all-templates.txt
grep -oE "['\"][a-z_]+\.html['\"]" /home/xq/Hydro/packages/ui-next/src/pages/manifest.ts | tr -d "'\"" | sort -u > /tmp/ui-next-templates.txt
comm -23 /tmp/all-templates.txt /tmp/ui-next-templates.txt
```

预期：得到 ~17 个 ui-default 独有的模板。

- [ ] **Step 2: 写 ADR-2**

```markdown
# ADR-2 — 17 个 ui-default 模板归宿

**状态**: Pending decision
**日期**: 2026-08-04
**前置 review**: [.claude/reviews/ui-default-to-ui-next-by-feature.md](../.claude/reviews/ui-default-to-ui-next-by-feature.md)
**相关**: [ADR-1](2026-08-04-ui-next-replacement-strategy.md)

## Context

F1-F9 + P1-4/P1-5 完成后，ui-default 仍有约 17 个 .html 模板未被 ui-next 替代。本 ADR 决策每个模板的去向：保留 / 可删除 / 未决。

## 决策表

(实际生成 — 由 `comm -23` 输出的 17 个模板逐行分类)

| 模板 | 去向 | 理由 |
|---|---|---|
| *_mail.html 系列 | 保留 | 邮件由 ui-default 服务，迁移成本 > 收益（见 ADR-1） |
| *_tr.html 系列 (translation) | 保留 | i18n fragments，ui-next 用 useTranslate |
| *_status.html, *_summary.html | 未决 | 需要业务方确认是否还需要 |
| partials/* | 保留 | print / files 等 partials 仍由 ui-default 服务 |
| contest_scoreboard_download_html.html | 保留 | 独立下载页，未在 ui-next 注册 |
| (其他) | 逐个分类 | (run step 1 后填入) |

## Decision

(在 step 1 完成后填入 — 记录每个模板的具体去向和理由)

## Consequences

- "保留"类模板随 ui-default 长期共存（AGPLv3 合规）
- "可删除"类模板在下个 sprint 删除前需要先确认无引用
- "未决"类模板需要业务方确认

## 实施步骤

1. 运行 step 1 的命令生成实际模板列表
2. 对每个模板做去引检查（`grep -r "template.*X" packages/hydrooj/src/handler/` 确认无 handler 引用）
3. 对"保留"类加入 ui-default 维护清单
4. 对"可删除"类创建 follow-up task
5. 对"未决"类在下次 sprint 拣起时与业务方讨论
```

- [ ] **Step 3: 用 step 1 输出的实际模板列表填充 ADR**

(运行 step 1 命令后，将输出粘贴到 ADR 决策表)

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/decisions/2026-08-04-ui-default-templates-fate.md
git commit -m "docs(adr): 17 ui-default templates fate (pending decision)"
```

---

## Self-Review Checklist

- [ ] 2 个 ADR 文件创建于正确路径
- [ ] ADR 格式：Context / Options / Decision / Consequences
- [ ] ADR 之间互相引用（ADR-2 引用 ADR-1）
- [ ] Decision section 包含建议选项（不强制 owner 拍板，但有推荐）
- [ ] commit message 以 `docs(adr):` 开头

## Out of Scope

- 实际执行 ADR 中的删除操作（属 follow-up sprint）
- 决策本身（owner 拍板 — Pending decision）
- 新代码改动
