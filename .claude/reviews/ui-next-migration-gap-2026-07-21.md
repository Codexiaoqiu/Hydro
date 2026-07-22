# ui-default → ui-next 迁移功能缺失审查报告

**审查日期**: 2026-07-21
**范围**: 已迁移页面的功能对等性（重点：problem / contest）
**方法**: 逐页比对 ui-default 模板 + `*.page.ts(x)` 与 ui-next `src/pages` + `src/components`

## 结论概览

ui-next 已迁移的页面比 CLAUDE.md 记录的多很多（几乎覆盖了 problem/contest 的主要页面），但**功能对等度不足**：许多页面只做了"外壳"，交互逻辑、批量操作、编辑器能力、实时更新缺失。此外有 **4 个 contest 页面 + 2 个 problem 页面完全未迁移**。

统计（去重后近似）：
- **CRITICAL（阻断性 / 数据丢失 / 页面不可用）**: 10
- **HIGH（核心功能缺失）**: ~30
- **MEDIUM**: ~35
- **LOW（样式 / 提示 / 细节）**: ~30

---

## 一、CRITICAL（必须优先修复）

### 完全未迁移的页面（后端路由仍在，前端 404 / 无渲染器）
| 页面 | 作用 | 影响 |
|---|---|---|
| `problem_config` | 判题配置编辑器（YAML + Basic 表单 + subtask/testcase 树 + 保存 config.yaml + 自动 cases/subtasks 迁移） | 无法配置题目评测，题目不可用。侧栏 config 链接指向不存在的渲染器 |
| `problem_files` **测试数据表** | testdata 列表/上传/生成/批量下载重命名删除/生成数据表单 | 当前页面只渲染 additional-files，测试数据完全无法管理 |
| `contest_balloon` | 现场赛气球分发（状态、发送、Set Color 对话框、60s 刷新） | 现场赛无气球分发 UI；manage 侧栏链接 404 |
| `contest_clarification` | 赛中答疑 Q&A（广播 / 回复 / 主题选择） | 评委↔选手无法沟通 |
| `contest_user` | 参赛者管理（添加/删除、rank/unrank、resume 个人时限） | 私有赛 / OI 个人时长赛无法管理 |

### 已迁移页面中的阻断性缺陷
| 缺陷 | 位置 | 说明 |
|---|---|---|
| **创建题目后跳转到 `/p//files`** | `ProblemForm.tsx:181-185` | 未用 POST 响应返回的生成 pid，PID 留空时构造出无效 URL |
| **Hack 提交后跳到源记录而非新 hack 记录** | `problem_hack.tsx:34-43` | 丢弃了后端返回的新 hack `rid`，跳到 `rdoc._id` |
| **客观题（objective）表单完全缺失** | `problem_detail.tsx` | 无 input/select/multiselect 解析、无 IndexedDB 答案缓存、无 YAML 提交；整类题型不可用 |
| **Scratchpad WebSocket URL 构造错误** | `usePretestSession.ts:28` | 传相对 `record-conn?...`，原生 WebSocket 无法构造，pretest/实时更新失效 |
| **保存 config.yaml 流程缺失** | (随 problem_config 缺失) | 无 yaml.dump / FormData / 上传 |

---

## 二、HIGH（核心功能缺失，应在合并前修复）

### 题库列表 `problem_main`
- 编辑模式切换（display/edit mode）缺失
- 行多选 checkbox + 全选、`ProblemSelectionDisplay` 选择面板缺失
- 批量操作全缺失：隐藏 / 取消隐藏 / 删除 / 复制到域 / 打包下载
- 分类过滤器搜索解析（`category:` / `difficulty:` / `namespace:` 关键字 + chip 对话框）仅部分实现

### 题目详情 `problem_detail`
- normal 模式下缺失：Star 收藏按钮、Score/状态徽章、Download、Copy to domain
- OGP meta 组件存在但**从未挂载**（`ProblemOpenGraph` 未引用）

### 题目编辑/文件
- `problem_edit` / `problem_files` / `problem_hack` / `problem_submit` 缺少标准 Problem 侧栏 + 信息卡
- Markdown 编辑器缺剪贴板图片/ZIP 粘贴上传、`file://` 引用（导致创建题目图片链接失效）
- additional-file 缺下载/重命名/预览；`ProblemFiles.tsx` 用了错误的 `type=additional`（后端要 `additional_file`）
- 生成测试数据表单 + 校验/进度对话框缺失
- FPS 导入页 (`problem_import_fps`) 未注册渲染器

### Scratchpad IDE（大量缺失）
- F9/F10 快捷键传入 no-op 回调（实际无效）
- 面板不可拖拽调整大小（固定布局）
- pretest 失败无 `res.ok` 检查（可能永久卡在 running）
- 记录面板不接收 WebSocket 实时记录更新（只 mount 时 fetch 一次）
- `canViewRecord` 权限门控缺失（始终显示 Records）
- remote_judge / pretest / validAs 语言门控缺失
- 设置 tab / 主题选择 / 插件 addPage 扩展点缺失

### 比赛
- `contest_scoreboard`: `isLocked` 忽略 `tdoc.unlocked`（解锁后仍显示锁定）；record 单元格无 `canView` 门控（泄露记录 ID）；刷新用 `window.location.reload()` 丢失过滤/滚动状态（原为 pjax 局部刷新）
- `contest_detail` / `contest_problemlist`: 侧栏状态信息块（`<dl>`）缺失；Attend 的 Login/Join Domain 分支缺失
- `contest_problemlist`: 状态列（颜色/图标/记录链接/评测进度）仅纯文本；提交表（submissions）缺失；答疑表单 + 展示缺失；私有材料（privateFiles）侧栏缺失
- `contest_manage`: 管理侧栏完全缺失（View/Edit/Attendee/Export/Balloon/Clarification 导航）；文件下载链接缺失
- `contest_print`: 打印工作流整体缺失（`allowPrint` 可编辑但两端无 UI）

---

## 三、MEDIUM / LOW（择机修复，详见各分区）

MEDIUM 典型：编辑器 Ctrl+Enter 提交、autofocus、默认题面模板、分类去选、维护者用 UserSelectAutoComplete、时区处理、导入完成重定向、scoreboard 冻结横幅动态文案、contest_main GET 无 JS 回退、perm 字符串 `includes` 子串误匹配（应按 BigInt 位运算）。

LOW 典型：月份标签、difficulty 独立列、star 行指示、Markdown 提示补全、气泡定时器样式、Jury 徽章、Tags> 渐进展开等。

> 注：本报告由并行代码探查生成，CRITICAL/HIGH 条目建议修复前用 `git`/运行时二次确认（部分 MEDIUM/LOW 可能是有意的设计取舍或 SPA 限制）。

---

## 修复计划（分阶段）

### 阶段 0 — 阻断性修复（1–2 天）
1. `ProblemForm.tsx`：创建后用响应 `pid` 再跳转
2. `problem_hack.tsx`：用响应返回的 hack `rid` 跳转
3. `usePretestSession.ts`：用 origin/protocol + `ws_prefix` 规范化 WebSocket URL
4. `ProblemFiles.tsx`：`type=additional` → `additional_file`
5. `contest_scoreboard.tsx`：`isLocked` 加 `!tdoc.unlocked`；record 单元格加 `canView` 门控

### 阶段 1 — 补齐缺失页面（1–2 周）
6. 新增 `problem_config.tsx`（YAML + Basic + subtask 树 + 保存 + 自动迁移），注册到 `pages/index.ts`
7. `problem_files.tsx` 补测试数据表 + 上传/生成/批量操作
8. 新增 `contest_user.tsx`（参赛者管理）
9. 新增 `contest_clarification.tsx`（答疑）
10. 新增 `contest_balloon.tsx`（气球）
11. 新增 `problem_import_fps` 渲染器

### 阶段 2 — 核心交互补齐（2–3 周）
12. `problem_main.tsx`：编辑模式 + 多选 + 批量操作 + 分类搜索解析
13. `problem_detail.tsx` / `ProblemHero.tsx`：Star / Score 徽章 / Download / Copy / 挂载 OGP
14. 客观题表单组件（`ObjectiveForm.tsx`）+ IndexedDB 缓存 + YAML 提交
15. Scratchpad：F9/F10 真实回调、可拖拽面板、WebSocket 记录更新、`canViewRecord` 门控、语言门控
16. Markdown 编辑器：粘贴上传 + `file://` 引用 + Ctrl+Enter 提交
17. `contest_manage` 管理侧栏；`contest_problemlist` 状态列/提交表/答疑/材料；`contest_detail` 侧栏信息块 + Attend 分支

### 阶段 3 — 细节与打磨
18. MEDIUM/LOW 条目：时区、默认模板、autofocus、提示文案、perm 位运算、scoreboard pjax 刷新等

---

## 关键文件索引

**新增/重写（ui-next）**:
`src/pages/problem_config.tsx`（新）, `problem_files.tsx`, `problem_main.tsx`, `problem_detail.tsx`, `contest_user.tsx`（新）, `contest_clarification.tsx`（新）, `contest_balloon.tsx`（新）, `contest_manage.tsx`, `contest_problemlist.tsx`, `contest_scoreboard.tsx`
`src/components/problem/ProblemForm.tsx`, `ProblemHero.tsx`, `ProblemAdditionalFiles.tsx`, `ProblemFiles.tsx`, `ObjectiveForm.tsx`（新）, `MonacoEditor.tsx`
`src/components/sidebar/ProblemSidebar.tsx`
`src/components/scratchpad/*`（Panel/Toolbar/PretestPanel/RecordsPanel/usePretestSession/useScratchpadHotkeys/reducer）
`src/components/contest/ContestDetailSidebar.tsx`, `ContestDetailHeader.tsx`, `ContestForm.tsx`
`src/components/primitives/MarkdownEditor.tsx`
`src/lib/contest-status.ts`, `contest-actions.ts`, `perms.ts`

**参考（ui-default）**:
对应 `templates/*.html` + `templates/partials/*` + `pages/*.page.ts(x)` + `components/scratchpad/*` + `components/problemconfig/*` + `components/monaco/*`
