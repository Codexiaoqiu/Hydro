# ADR-2 — 17 个 ui-default 模板归宿

**状态**: Pending decision
**日期**: 2026-08-04
**前置 review**: [.claude/reviews/ui-default-to-ui-next-by-feature.md](../../.claude/reviews/ui-default-to-ui-next-by-feature.md)
**相关**: [ADR-1](2026-08-04-ui-next-replacement-strategy.md)

## Context

F1-F9 + P1-4/P1-5 完成后，ui-default 仍有约 17 个 .html 模板未被 ui-next 替代。本 ADR 决策每个模板的去向：保留 / 可删除 / 未决。

## 方法

通过以下命令比对 ui-default 和 ui-next 的模板清单：

```bash
comm -23 <(ls packages/ui-default/templates/*.html | sed 's|.*/||' | sort) \
         <(grep -oE "['\"'][a-z_]+\.html['\"']" packages/ui-next/src/pages/manifest.ts | tr -d "'\"" | sort)
```

结果：12 个模板仅存在于 ui-default，未被 ui-next 替代。

## 决策表

| 模板 | 去向 | 理由 |
|---|---|---|
| contest_scoreboard_download_html.html | 保留 | 二进制下载页，`contest.ts` handler 显式调用 `renderHTML` 生成并作为附件下载，ui-next 无对应路由 |
| domain_user_raw.html | 保留 | raw 导出格式，`domain.ts` handler 以 `format === 'raw'` 显式选择此模板，无 ui-next 等价物 |
| record_detail_status.html | 保留 | `record.ts` handler 通过 `renderHTML` 渲染后经 WebSocket/SSE 推送状态片段，ui-next 无法服务端渲染此类增量片段 |
| record_detail_summary.html | 保留 | 同上，`record.ts` handler 通过 `renderHTML` 生成摘要 HTML 并推送，ui-next 无对应机制 |
| record_main_tr.html | 保留 | `record.ts` handler 通过 `renderHTML` 生成翻译行，WebSocket/SSE 推送，ui-next 无对应 |
| user_changemail_mail.html | 保留 | 邮件模板，`home.ts` handler 调用 `renderHTML` 生成邮件正文，服务器端发送，AGPLv3 合规 |
| user_changemail_mail_sent.html | 保留 | 邮件发送确认页，`home.ts` handler 渲染并返回给用户，服务器端行为 |
| user_lostpass_mail.html | 保留 | 邮件模板，`user.ts` handler 调用 `renderHTML` 生成邮件正文，服务器端发送 |
| user_lostpass_mail_sent.html | 保留 | 邮件发送确认页，`user.ts` handler 渲染并返回 |
| user_register_mail.html | 保留 | 注册邮件模板，`user.ts` handler 调用 `renderHTML` 生成邮件正文，服务器端发送 |
| user_register_mail_sent.html | 保留 | 注册邮件发送确认页，`user.ts` handler 渲染并返回 |
| user_sudo_redirect.html | 保留 | sudo 模式重定向页，`user.ts` handler 设置 `this.response.template` 并跳转，服务器端行为 |

## Decision

全部 12 个模板均标记为 **保留**。

分类依据：
- **邮件模板**（6个 `*_mail.html` / `*_mail_sent.html`）：服务器端渲染并通过 SMTP 发送，ui-next 作为纯客户端 SPA 无法承担此职责；属于 ADR-1 所述"迁移成本 > 收益"类别。
- **下载页 / raw 导出页**（2个 `contest_scoreboard_download_html.html`、`domain_user_raw.html`）：以二进制或特殊格式输出，handler 显式调用 `renderHTML` 并设置 Content-Disposition，ui-next 无对应注册。
- **WebSocket/SSE 推送片段**（3个 `record_detail_status.html`、`record_detail_summary.html`、`record_main_tr.html`）：`record.ts` handler 通过 `renderHTML` 生成 HTML 片段，再通过实时连接推送增量更新；ui-next 尚未实现服务端流式片段渲染。

## Consequences

- 所有 12 个模板随 ui-default 长期共存，无需进一步操作。
- 无"可删除"或"未决"模板，无需创建 follow-up task。
- 本 ADR 结论：ui-default 与 ui-next 的模板边界已清晰，无需进一步模板迁移工作。

##实施步骤

（本 ADR 无需执行步骤，所有模板已确定保留）
