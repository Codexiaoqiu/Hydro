# ui-next 题目编辑实时 Markdown 预览设计

- **Date**: 2026-07-18
- **Status**: Draft, pending user review
- **Scope**: `packages/ui-next/src/components/primitives/MarkdownEditor.tsx`（改）、新增 `MarkdownPreview` 与 `lib/markdown/plugins`，`components/article/Article.tsx` 改为共享插件常量
- **Related**: 前置 spec `2026-07-18-problem-edit-completion-design.md` 已经接入 Monaco，但未做实时预览

## 背景

ui-next 的 `problem_create` / `problem_edit` 页面已通过 `ProblemForm` 接入 `MarkdownEditor`，后者使用 `@monaco-editor/react` 渲染 Markdown 源码。然而与 ui-default 对应页面相比缺少**实时渲染预览**：ui-default 在 `problem_edit.html` 配合 `md-editor-rt` 的 `MdEditor` 提供左右双栏编辑器，左侧源码、右侧实时渲染（`initMarkdownEditor()` 中挂载在 `<textarea data-editor>` 之上，HTML5 渲染管线由 `mdeditor.ts` 装配的 remark/rehype 插件驱动）。

当前 ui-next 的 `MarkdownEditor` 仅展示源码、没有任何预览面板，用户无法在提交前看到题目渲染效果；与 problem_detail 详情页（由 `components/article/Article.tsx` 渲染）也存在体验落差。

本次设计在已有 Monaco 编辑器基础上，叠加右侧实时预览，复用详情页同款渲染管线，做到"所见即所得"。

## 目标

1. **行为对齐 ui-default**：`MarkdownEditor` 同时提供源码编辑与渲染预览，左右分栏随输入实时刷新
2. **预览所见即详情页所见**：预览侧使用与 `Article.tsx` 完全相同的 remark / rehype 插件、相同的 `preprocessContent`（含样例对拆块）
3. **不增加新依赖**：所有需要的 react-markdown / remark-gfm / remark-math / rehype-katex / rehype-highlight 等已经在 ui-next `package.json` 中为 `Article.tsx` 安装
4. **保留现有能力**：Monaco 图片上传 Action、textarea fallback（Suspense 内）、`onUpload` / `aria-label` 公共 API 不变
5. **测试覆盖**：新增 MarkdownPreview + MarkdownEditor 实时刷新相关用例，跑齐 22 条历史用例不回归

## 非目标

- 不引入 `md-editor-rt` 或其他第三方 Markdown 编辑器（不必要、避免双套渲染系统）
- 不实现 ui-default 的工具栏按钮（bold / italic / list / table / link 等）—— Monaco 自带语法高亮已满足"边写边看"核心需求；工具栏属于额外特性后续可单独 follow-up
- 不支持 mermaid（`Article.tsx` 也没启用，与 ui-default 的 `noMermaid` 一致）
- 不动 ui-default 任何代码
- 不改 problem_create / problem_edit 的服务端 handler 注入逻辑
- 不做拆分布局可拖拽调节（先固定 1:1，后续可加拖拽手柄）

## 架构设计

### 数据流

```
ProblemForm
  │ value (受控) ──────► MarkdownEditor
  │                       │
  │                       ├─ Monaco (左)
  │                       │    onChange(v) ──► 立即更新本地 draft
  │                       │                ──► onChange(v) ──► ProblemForm 写回 contentByLang[activeLang]
  │                       │
  │                       └─ MarkdownPreview (右)
  │                            source = value (受控)
  │                            渲染前对 source 做 150ms debounce（避免每个按键触发 react-markdown 重算）
  │                            切语言 / 切 tab：清空 pending timer，立即用最新值渲染一次
  │
  │ 图片上传：保留现有 Monaco Action 'hydro.upload-image'
  │   → 走 onUpload → ProblemForm.uploadImage → 把 markdown 插入到光标位置
```

### 组件拆分

| 组件 | 路径 | 职责 |
|------|------|------|
| `MarkdownEditor` | `components/primitives/MarkdownEditor.tsx`（改） | 左右分栏容器；Monaco 左、MarkdownPreview 右；图片上传 Action；textarea Suspense fallback |
| `MarkdownPreview` | `components/primitives/MarkdownPreview.tsx`（新） | 接 `source: string`，调用 react-markdown + 共用插件；套 `.markdown` 样式（继承自 `lib/markdown.module.css`）；150ms 防抖；错误隔离；主题适配 |
| `lib/markdown/plugins.ts` | `lib/markdown/plugins.ts`（新） | 导出 `REMARK_PLUGINS` / `REHYPE_PLUGINS` / `REMARK_REHYE_OPTIONS` 与 `renderArticleBlocks(source: string): ReactNode[]`（含 SamplePair 渲染逻辑） |
| `Article` | `components/article/Article.tsx`（改） | 移除本地 `REMARK_PLUGINS` / `REHYPE_PLUGINS` / `REMARK_REHYE_OPTIONS` 与 `SamplePairsBlock`，改为从 `lib/markdown/plugins` 调用 `renderArticleBlocks()` |

`MarkdownPreview` 内部直接渲染 `preprocessContent` 拆出的 blocks，对 `samples` 类型调用 `SamplePair` 组件——与 `Article.tsx` 行为完全对齐。这样代码虽然重复，但语义最清晰；如果未来有变化，两边改一处即可（重构到 `lib/markdown/plugins.ts` 的 `renderArticleBlocks()` 函数）。

### 防抖策略

- 防抖时长：**150ms**（参考 ui-default 的 500ms 因 `md-editor-rt` 自带渲染成本，而我们用 react-markdown + 完整插件管线偏重，150ms 体感更顺）
- 切语言（LangTabs 切换 activeLang）：通过 `<MarkdownPreview key={activeLang} ...>` 强制重挂载，新内容立即渲染一次，避免切语言后还要等 150ms
- 用户停止输入 150ms 后才触发 `MarkdownPreview` 重渲染（typing 期间使用 `useDebouncedValue` 风格的 hook：值变更后启动 timer，timer 内重复变更重置 timer；timer 触发后落地新值）

### 样式

- 容器：CSS Grid `grid-template-columns: 1fr 1fr`，gap `var(--space-3)`
- 高度：`height={420}` 应用到 grid 容器；左 Monaco 与右 Preview 各占满自己的格子
- 分隔：左右之间用 `var(--border)` 1px 中间线（用 grid gap + Monaco 容器加 `border-right` 实现）
- 预览样式：套用 `lib/markdown.module.css` 的 `.markdown` 类（已有题详情页样式），无需新写
- 响应式：`@media (max-width: 768px)` 时切换为 `grid-template-columns: 1fr`，上下两块（编辑器在上、预览在下）
- 主题：跟随 `hydro:theme-change` 事件（与 Monaco 一致；`.markdown` 类已自带 dark/light 适配）

### 错误处理

- 渲染抛错时退化为 `<pre>{source}</pre>` 而不是炸掉整个表单
- 空内容：渲染 placeholder "在左侧编辑题目描述..."（避免空白屏）
- Suspense fallback：保留现有 `<textarea>` 作为 Monaco 加载期的占位

### 可访问性

- Monaco 容器：`aria-label="Markdown source"`
- 预览容器：`aria-label="Rendered preview"`、`aria-live="polite"`（屏幕阅读器不打断）

## 风险与遗留

### 风险

- **bundle 体积**：react-markdown + 6 个 remark/rehype 插件以前就因 `Article.tsx` 而打包；本次零新增依赖
- **katex CSS**：`main.tsx:4` 已经 `import 'katex/dist/katex.min.css'`，`main.tsx:5` 已经 `import 'highlight.js/styles/github-dark.css'` —— 预览侧零额外 CSS 工作
- **mermaid**：ui-default `noMermaid`、ui-next `Article.tsx` 也没启用。一致
- **性能**：每按键触发 react-markdown 重渲染，靠 150ms debounce 抑制；若实际卡顿可降到 250ms

### 遗留（本次不做）

- 工具栏排版按钮（ui-default 的 md-editor-rt 自带）
- 可拖拽调节左右宽度
- 全屏 / 预览独立窗口
- 预览区滚动同步（编辑器滚动 → 预览同步滚到对应 heading）

## 测试 & 验证

### 单元测试（happy-dom + vitest）

**1. `MarkdownEditor.test.tsx`（改）**
- 既有两条用例保留（textarea fallback 行为）
- mock `@monaco-editor/react` 的 `Editor` 输出 `<textarea data-testid="editor-source">`
- 新增 `data-testid="editor-preview"` 容器
- 断言：输入 `value="# Hi"` 后，preview 容器在 150+50ms debounce 时间后渲染出 `<h1>Hi</h1>`

**2. `MarkdownPreview.test.tsx`（新）**
- 渲染 GFM 表格、代码块（含 highlight）、file:// 媒体协议替换
- katex：mock `rehype-katex` 避免拉真实 katex

**3. `problem_create.test.tsx`（改）**
- 现有用例保留
- 新增断言页面中存在 `editor-preview` 容器

### 回归

`yarn workspace @hydrooj/ui-next test` —— 跑齐 22 条历史用例不回归。

### 视觉回归（可选）

若用户确认可以接受更新 baseline，给 `problem_create` 加一条 playwright snapshot（与现有 `test:visual:update` 工作流一致）。

## 实施清单

- [ ] 新建 `packages/ui-next/src/lib/markdown/plugins.ts`：导出 `REMARK_PLUGINS` / `REHYPE_PLUGINS` / `REMARK_REHYE_OPTIONS` 和一个 `renderArticleBlocks(source: string): ReactNode[]` 函数（含 SamplePair 渲染逻辑）
- [ ] 改 `packages/ui-next/src/components/article/Article.tsx`：移除本地常量与 SamplePairsBlock，调用 `renderArticleBlocks()`
- [ ] 新建 `packages/ui-next/src/components/primitives/MarkdownPreview.tsx`：含 150ms debounce、错误隔离、主题适配
- [ ] 改 `packages/ui-next/src/components/primitives/MarkdownEditor.tsx`：左右 grid 分栏，右侧挂 `MarkdownPreview`
- [ ] 新建 `packages/ui-next/src/components/primitives/MarkdownPreview.test.tsx`
- [ ] 改 `packages/ui-next/src/components/primitives/MarkdownEditor.test.tsx`：加 preview 相关用例
- [ ] 改 `packages/ui-next/src/pages/problem_create.test.tsx`：加 preview 容器断言
- [ ] 跑 `yarn workspace @hydrooj/ui-next test` 不回归
