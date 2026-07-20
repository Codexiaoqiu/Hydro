# ui-default → ui-next 迁移指南  注意:这是一份参考流程 不是必须完全按照说明执行

> 这份文档总结了从 ui-default（Webpack + Nunjucks + jQuery）迁移到 ui-next（Vite + React 19 + slot 系统）时**必须指定**的内容。每条都是踩过的坑、产线事故或重复工作。

---

## 1. 服务端契约确认（迁移前第一步）

> 50% 的崩溃来自这里。**永远不要假设**前端类型注解和服务端注入一致。

### 1.1 找 handler

```bash
# 服务端路由名 → handler 类 → get() 注入的字段
grep -rn "ctx.Route('problem_create'\|class ProblemCreateHandler" packages/hydrooj/src/handler/
```

### 1.2 对照 `response.body` 字段

```bash
# handler 里 this.response.body.xxx 出现的字段，就是模板能拿到的 args
grep -A 20 "async get()" packages/hydrooj/src/handler/problem.ts | grep "this.response.body"
```

### 1.3 易踩的契约陷阱

| 看起来是 | 实际是 | 例子 |
|---------|--------|------|
| `string[]` | `Record<string, string>` | `statementLangs = i18n.langs(false)` → `{zh_CN: '简体中文', en: 'English'}` |
| 数字 docId | 字符串 docId | 路由 `/p/:pid/files` 接受两者，但前端要 `String(pdoc.docId)` |
| `pdoc.title` 必填 | 可能为 undefined | 老题目 / 跨域引用都可能没 title |
| `args` 必有 | 可能 undefined | handler 没注入时整个 args 是 undefined，**所有访问都要可选链** |

### 1.4 自适应规范字段

写一个 normalize 函数，**同时接受"看起来的样子"和"实际的样子"**：

```ts
// 例：statementLangs 服务端发 Record，测试 fixture 传 string[]
function normalizeStatementLangs(input?: Record<string, string> | string[] | null) {
  if (input && !Array.isArray(input) && typeof input === 'object') {
    return { codes: Object.keys(input), labels: input };
  }
  if (Array.isArray(input)) {
    return { codes: input, labels: Object.fromEntries(input.map((c) => [c, c])) };
  }
  return { codes: [], labels: {} as Record<string, string> };
}
```

写测试时**两种形态都覆盖**，否则契约回归没人发现。

---

## 2. 必须完成的清单

每个迁移模块都要做：

- [ ] 在 `packages/ui-next/src/pages/` 下新增 `xxx.tsx`
- [ ] 在 `packages/ui-next/src/pages/index.ts` 里 `registerPage('route_name', () => import('./xxx'))`
- [ ] **路由名要和 server `ctx.Route(...)` 第一个参数完全一致**（`buildUrl('route_name', { pid })` 依赖这个）
- [ ] 在 `packages/ui-next/src/lib/i18n.ts` 加新 key（中英两段，按字母序插入）
- [ ] 写 `xxx.test.tsx`，4 个用例起步：空数据、正常数据、缺失数据、参考/锁定状态
- [ ] 跑 `yarn workspace @hydrooj/ui-next test`，确保零回归
- [ ] 跑 `yarn lint`，新文件 0 error

---

## 3. UI 风格规范

### 3.1 设计 token（**所有**颜色 / 间距 / 字号都从这取）

`packages/ui-next/src/styles/tokens.css` 已经定义全套：

```css
/* 颜色 */
--bg-0 / --bg-1 / --bg-2 / --surface / --text / --text-soft / --text-mute
--cyan / --blue / --violet / --pink / --amber / --green / --red

/* 排版 */
--font-sans / --font-mono / --font-display
--text-xs ~ --text-4xl
--leading-tight ~ --leading-relaxed

/* 间距 */
--space-1 ~ --space-8
--radius-sm / --radius-md / --radius-lg

/* 主题 */
document.documentElement.dataset.theme === 'dark' | 'light'
window event 'hydro:theme-change'
```

**禁止**写死 `#fff` / `12px` / `margin: 16px`。全部走 CSS 变量。

### 3.2 主题响应

```tsx
function readScheme(): 'light' | 'dark' {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}
useEffect(() => {
  window.addEventListener('hydro:theme-change', () => setTheme(readScheme()));
  return () => window.removeEventListener('hydro:theme-change', ...);
}, []);
```

### 3.3 复用组件（不要重写）

| 想要 | 用 |
|------|-----|
| 按钮 | `<Button variant="primary|ghost" />` from `primitives` |
| 输入框 | `<Input label=... hint=... />` |
| 复选框 | `<Checkbox />` |
| 卡片 | `<Card variant="default" header=...>...</Card>` |
| 警告 / 成功 / 信息提示 | `<Alert variant="error|info|warning|success" message=... />` |
| 限流错误 | `<RateLimitAlert error={error} />` |
| 链接（生成 url） | `<Link to="route_name" params={{pid}}>...</Link>` |
| 文件上传 | `<ProblemAdditionalFiles pid files onChange />` |
| Markdown 渲染（含 katex / gfm / 高亮 / 样例对） | `<Article content={...} />` 或 `<MarkdownPreview source=... />` |


---

## 4. 表单 / 提交 / 重定向

### 4.1 ui-default → ui-next 的对应

| ui-default 模式 | ui-next 实现 |
|-----------------|---------------|
| `<form method="post">` | `<form onSubmit={handler}>` + `preventDefault` |
| 服务端 302 redirect | `await request.post(url, fd)` 后 `navigate(buildUrl(...))` |
| 浏览器原生 confirm | `<ConfirmDialog open onConfirm onCancel />` |
| 浏览器原生 alert | `useToast().error(...)` |

### 4.2 提交后跳转的标准写法

```ts
const submit = async (e: FormEvent) => {
  e.preventDefault();
  setSubmitting(true);
  setError(null);
  // 校验
  if (!title.trim()) { setError(...); setSubmitting(false); return; }
  try {
    const fd = new URLSearchParams();
    fd.set('title', title);
    await request.post(url, fd);
    // 创建成功 → 跳到下一步（通常是 files / detail）
    const redirectTo = pageName === 'problem_create'
      ? buildUrl('problem_files', { pid })
      : buildUrl('problem_detail', { pid });
    navigate(redirectTo);
  } catch (err) {
    if (err instanceof HydroClientError) setError(err);
  } finally {
    setSubmitting(false);
  }
};
```

### 4.3 必填校验失败时的 UX（参考 problem_edit 完成设计）

```ts
if (!title.trim()) {
  setError(...);
  window.scrollTo({ top: 0, behavior: 'smooth' });
  setTimeout(() => document.querySelector<HTMLInputElement>('input[name="title"]')?.focus(), 320);
  return;
}
```

### 4.4 文件上传（两种场景）

| 场景 | 端点 | 实现 |
|------|------|------|
| Markdown 里嵌图 | `/file` 或 `./files` | Monaco Action 触发 → `onUpload` callback → 插入 `![](url)` |
| 题目附加文件 | `/p/:pid/files` | `<ProblemAdditionalFiles pid files onChange />` |

---

## 5. Markdown 渲染一致性（详情页 / 编辑预览）

**必须复用同一套插件**，否则用户在编辑预览看到的 ≠ 详情页实际看到的。

`packages/ui-next/src/lib/markdown/plugins.tsx` 已经统一：
- `REMARK_PLUGINS` (gfm, math, highlight-mark, imageSize, media)
- `REHYPE_PLUGINS` (katex, highlight)
- `REMARK_REHYE_OPTIONS` (mark 节点映射)
- `renderArticleBlocks(source)` — 主入口，详情页 Article + 编辑预览 MarkdownPreview 都用

**禁止**直接 `import ReactMarkdown` 自己再装一遍插件，会和详情页 drift。

---

## 6. i18n 规范

### 6.1 集中位置

`packages/ui-next/src/lib/i18n.ts` —— **不要**散落到每个组件。

### 6.2 双语段落结构

```ts
// zh_CN 段（中文在前，按字母序）
'MyModule.Title': '标题',
'MyModule.Submit': '提交',

// en 段（英语在后，按字母序）
'MyModule.Title': 'Title',
'MyModule.Submit': 'Submit',
```

### 6.3 使用方式

```tsx
const t = useTranslate();
return <button>{t('MyModule.Submit')}</button>;

// 占位符
t('MyModule.Greet', { name: 'foo' })  // 'Hello, {name}' → 'Hello, foo'
```

### 6.4 测试断言兼容双语

```tsx
expect(screen.getByText(/提交|Submit/i)).toBeInTheDocument();
```

---

## 7. 路由与 URL

### 7.1 永远用 `buildUrl`，不要硬编码路径

```tsx
// ❌ 硬编码
<a href={`/p/${pid}/files`}>

// ✅ 走路由表
const buildUrl = useBuildUrl();
<a href={buildUrl('problem_files', { pid })}>
```

### 7.2 路由名注册位置

- server: `ctx.Route('route_name', '/path/:param', Handler, PERM.X)` （`packages/hydrooj/src/handler/*.ts`）
- client: `registerPage('route_name', () => import('./xxx'))` （`packages/ui-next/src/pages/index.ts`）
- 两边名字必须**完全一致**（buildUrl 靠名字查表）

---

## 8. 测试规范

### 8.1 环境

```tsx
/* @vitest-environment happy-dom */
```

### 8.2 标准结构

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

function buildPageData(args: PageData['args']): PageData {
  return { name: 'route_name', template: '', url: '/', args };
}

describe('xxx page', () => {
  test('空数据', () => { ... });
  test('正常数据', () => { ... });
  test('缺失数据', () => { ... });
  test('锁定 / 权限状态', () => { ... });
});
```

### 8.3 必须 mock 的东西

| 东西 | 怎么 mock |
|------|-----------|
| `@monaco-editor/react` | `vi.mock('@monaco-editor/react', () => ({ Editor: (props) => <textarea data-testid="..." ... />, loader: { config: vi.fn() } }))` |
| `use-api` hooks | `vi.mock('../hooks/use-api', () => ({ request: { post: vi.fn(), postFile: vi.fn() }, HydroClientError: class extends Error {} }))` |

### 8.4 真实计时器 vs 假计时器

- 默认用**真实计时器**（`await new Promise(r => setTimeout(r, 250))` 等真实时间）
- **不要**用 `vi.useFakeTimers()`——会卡住 `import('@monaco-editor/react')` 的 lazy 微任务
- 除非组件**纯函数式**且与 Monaco 等异步懒加载无关

### 8.5 跑测试

```bash
cd packages/ui-next && npx vitest run xxx    # 单文件
cd packages/ui-next && npx vitest run        # 全部
```

---

## 9. 完整示例：problem_create / problem_edit / problem_files 的迁移轨迹

这组三个页面是参考实现，记录在 `docs/superpowers/specs/2026-07-18-ui-next-markdown-live-preview-design.md` 和 `docs/superpowers/specs/2026-07-18-problem-edit-completion-design.md`。

迁移步骤：

1. **服务端契约盘点** —— 看 `ProblemEditHandler.get` / `ProblemCreateHandler.get` / `ProblemFilesHandler.get` 注入了什么字段
2. **抽出共用** —— `ProblemForm` 被 create + edit 复用（pageName 区分）
3. **契约修复** —— 把前端 `string[]` 假设改成 `Record<string, string>` + normalize 函数
4. **新增独立页** —— `problem_files.tsx`（create 后跳转目标，ui-next 原先缺失）
5. **共享 markdown 渲染管线** —— `lib/markdown/plugins.tsx` 抽出来给详情页 + 编辑预览共用
6. **CSS Grid 滚动修复** —— `min-height: 0` + `height: 100%` + `overflow: hidden` 三件套
7. **i18n 双语补齐** —— zh + en，按字母序插入
8. **测试 4 用例起步** —— 空 / 正常 / 缺失 / 锁定
9. **每个 Task 独立 commit** —— 方便回滚与 review

---

## 10. 常见错误 / 反模式

| 反模式 | 修正 |
|--------|------|
| 直接 `import ReactMarkdown` 自己装插件 | 用 `renderArticleBlocks(source)` |
| `any[]` / `as any` 满天飞 | 引入 `ProblemDoc` / `ProblemAdditionalFile` 这类领域类型 |
| 测试里 `useFakeTimers` + lazy import | 改用真实计时器 |
| `Math.random()` 作为 React key | 用稳定的 `docId` / `pid` |
| 内联 `<style jsx>` / `<style>` | 全部走 CSS Modules (`X.module.css`) |
| 硬编码 `'#fff'` / `12px` | 走 `--surface` / `--text-sm` token |
| `<a href="/path">` 跳硬编码 | `buildUrl('route_name', { params })` |
| 不写测试就提交 | 每个组件 / 页面至少 4 个用例 |
| 把第三方组件 import 又立刻注释掉 | 要么删，要么用；不要留半截 import |
| `dispatchEvent` / `window.alert` / `window.confirm` | 走 `<ConfirmDialog>` / `<Alert>` / `useToast` |
| `dangerouslySetInnerHTML` 渲染用户输入 | 用 react-markdown（默认 XSS-safe） |

---

## 11. 迁移前自检清单

开始迁移前对照：

- [ ] server handler 字段已盘点（`grep this.response.body`）
- [ ] 路由名已对齐（`grep ctx.Route`）
- [ ] 现有 ui-default 模板已读（看有哪些 partial / 哪些 jQuery 交互）
- [ ] 现有 ui-default 客户端 JS 已读（看 `page.jsx` / `page.ts`）
- [ ] 服务端会发哪些"看起来 string[] 实际是 Record"的字段
- [ ] 哪些组件可以复用（`ProblemForm` / `ProblemAdditionalFiles` / `MarkdownEditor` / `MarkdownPreview` / `Article`）
- [ ] 权限要求（PERM）已确认（路由 handler 的第 4 个参数）
- [ ] 是否需要 polyfill（如 matchMedia 已在 `src/test/setup.ts` 处理）

---

## 12. 相关文档索引

- 设计规范：参见 `packages/hydrooj/setting.yaml`
- 设计 token：`packages/ui-next/src/styles/tokens.css`
- 服务契约：`packages/hydrooj/src/handler/*.ts`
- 现有页面参考：`packages/ui-next/src/pages/` 下已迁移的 `problem_create` / `problem_edit` / `problem_files` / `problem_detail` / `contest_main` / `homepage`
- 共享 markdown 渲染：`packages/ui-next/src/lib/markdown/plugins.tsx`
- 已沉淀的设计 / 实现 spec：`docs/superpowers/specs/2026-07-*.md`
