# ui-next problem_edit 完善设计

- **Date**: 2026-07-18
- **Status**: Draft, pending user review
- **Scope**: `packages/ui-next/src/pages/problem_edit.tsx`、`packages/ui-next/src/pages/problem_create.tsx`、`packages/ui-next/src/components/problem/` 下相关组件,以及 `packages/hydrooj/src/handler/problem.ts` 中相关 handler 的小幅扩展

## 背景

ui-next 是 Hydro 新一代 Vite + React 19 SPA 渲染器,目前通过 `next` renderer 与 ui-default 共存,优先渲染 `homepage` 与 `problem_main`。`problem_edit` / `problem_create` 页面入口已经实现,但相比 ui-default 的对应实现仍有显著功能缺失与体验降级:

- 类目(`problem.categories`)完全没有服务端注入,前端 `args.categoryTree` 始终是 `undefined`
- Markdown 编辑器是 stub,直接用原生 `<textarea>`,没有 monaco / 图片上传 / 高亮
- 删除确认用浏览器原生 `window.confirm()`,与 ui-default 自研 dialog 体验差距大
- Title 必填校验只 `setError`,没有滚动到顶 + focus 的 UX
- Polyhedron 推荐横幅缺失
- ui-next primitives 没有 `Dropdown` / `ConfirmDialog` / `Notification`,无法承载 dropdown subcategory 与模态确认
- 整页 0 测试覆盖

本次设计在 ui-default 已有实现基础上,把缺失项补齐,并引入 `@monaco-editor/react` 作为编辑器后端。

## 目标

1. **功能等价**:`problem_edit` / `problem_create` 在 ui-next 渲染路径下与 ui-default 行为一致(覆盖所有字段、所有交互、所有服务端契约)
2. **设计系统对齐**:把"用 jQuery 包装的 dropdown / 浏览器 confirm"换成 ui-next 自己的 primitive,长期不依赖浏览器原生 prompt
3. **编辑器骨架完整**:`MarkdownEditor` 真实接入 monaco,Markdown 与代码两种模式可切换
4. **测试基线**:5 个测试文件、25+ 用例,覆盖 ProblemForm 关键流程与新增 primitive

## 非目标

- 不引入 `react-monaco-editor` 之外的 monaco 生态(monaco-editor / @monaco-editor/react 已足够)
- 不做 Markdown 实时预览 split-view(后续可单独 follow-up)
- 不动 ui-default 端任何代码
- 不在本次范围内重写 `ProblemDetailHandler._prepare` 等已有逻辑
- 不引入服务端 setting schema 变更(只用现有 `problem.categories` YAML)

## 当前实现摘要

(详见前置 gap analysis 报告,此处仅列结论)

| 模块 | 状态 |
|------|------|
| `pages/problem_edit.tsx` | 41 行薄壳,作为 ProblemForm 的入口 |
| `pages/problem_create.tsx` | 19 行,同样复用 ProblemForm |
| `components/problem/ProblemForm.tsx` | 310 行,字段 / 状态机 / 提交删除基本完整 |
| `components/problem/ProblemAdditionalFiles.tsx` | 122 行,上传删除 OK |
| `components/problem/MonacoEditor.tsx` | stub,fallback 到 textarea |
| Primitives | Button / Checkbox / Input / LangTabs / Alert / Chip / Card 已存在;**Dropdown / ConfirmDialog / Toast 不存在** |
| Server `ProblemEditHandler.get` | 设置 `body.pdoc / additional_file / statementLangs / template`,**未设置 `categoryTree`** |
| 测试 | ui-next 测试目录 0 个 ProblemForm 相关文件 |

## 架构设计

### 数据流

```
Server (ProblemEditHandler.get / ProblemCreateHandler.get)
  ├── response.body.pdoc              (已有)
  ├── response.body.additional_file   (已有)
  ├── response.body.statementLangs    (已有)
  ├── response.body.categoryTree      ← 新增(parseCategorySetting())
  └── response.body.template          (已有)
              │
              ▼  renderer.serialize 注入到 __HYDRO_INJECTION__
              │
usePageData().args
              │
              ▼
<ProblemEditPage /> ─► <ProblemForm pageName="problem_edit"
                                   pdoc={args.pdoc}
                                   categoryTree={args.categoryTree}
                                   statementLangs={args.statementLangs}
                                   additionalFile={args.additional_file}
                                   canDelete={canEditProblem(...)}
                                   isReference={!!args.pdoc.reference} />
              │
              ├─► <CategoryTreePicker tree={categoryTree} onToggle={appendTag} />
              ├─► <MarkdownEditor value={contentByLang[activeLang]}
              │                       onChange={...}
              │                       onUpload={uploadHandler}
              │                       backend="monaco" />     ← 新 primitive
              ├─► <ConfirmDialog open={confirmDelOpen} ... />  ← 新 primitive
              ├─► <PolyhedronHint />                            ← 新组件
              ├─► <ToastProvider>...</ToastProvider>            ← 新 primitive
              └─► <ProblemAdditionalFiles pid={pid} files={additionalFile} />
```

### 服务端变更

**`packages/hydrooj/src/handler/problem.ts`**(两处各加 2 行):

```ts
// ProblemEditHandler.get  (约 L617 后)
this.response.body.additional_file = sortFiles(this.pdoc.additional_file || []);
this.response.body.statementLangs = this.ctx.i18n.langs(false);
+ this.response.body.categoryTree = parseCategorySetting(
+   this.ctx.setting.get('problem.categories'),
+ );

// ProblemCreateHandler.get  (约 L995 后)
this.response.body.page_name = 'problem_create';
this.response.body.additional_file = [];
this.response.body.statementLangs = this.ctx.i18n.langs(false);
+ this.response.body.categoryTree = parseCategorySetting(
+   this.ctx.setting.get('problem.categories'),
+ );
```

**新建 `packages/hydrooj/src/lib/category.ts`**(单文件,约 30 行):

```ts
import yaml from 'js-yaml';

export interface CategoryNode { name: string; children?: CategoryNode[]; }

export function parseCategorySetting(raw: string | undefined): CategoryNode[] {
  if (!raw) return [];
  const parsed = yaml.load(raw);
  if (!parsed || typeof parsed !== 'object') return [];
  return Object.entries(parsed as Record<string, string[] | undefined>).map(
    ([name, subs]) => ({
      name,
      children: Array.isArray(subs) ? subs.filter(Boolean).map((s) => ({ name: String(s) })) : undefined,
    }),
  );
}
```

为什么不复用 `partials/category.html` 的解析逻辑:那是 Nunjucks 模板内联表达式,没有独立可测函数;抽到 `lib/category.ts` 后,模板和 ui-next renderer 共用同一份解析,行为完全一致。

### Primitives 新增

| Primitive | 行为 | 复用关系 |
|-----------|------|----------|
| `Dropdown` | 受控 / 非控、点击外部关闭、Esc 关闭、键盘↑↓Enter 导航、`role="menu"`、`aria-expanded` | ui-default `vj/components/dropdown/Dropdown.js`(tether-drop)替换为原生 `<details>` + portal-free 实现 |
| `ConfirmDialog` | a11y-compliant(焦点陷阱、`role="alertdialog"`、Esc 关闭、`aria-labelledby/describedby`)| ui-default `vj/components/dialog` 的 `confirm()` 行为等价 |
| `Toast` + `ToastProvider` | 简单 inline toast,`variant: info/success/error`,默认 4s 自动关闭,可手动 dismiss | 替代浏览器 `alert/confirm/Notification.error` |
| `MarkdownEditor` | `value/onChange/onUpload?/language?/backend?`(backend: `'monaco' | 'textarea'`,默认 `monaco`);内部 lazy-load monaco | ui-default `Editor` + `MdEditor` 行为合并 |

### 编辑器接入(`@monaco-editor/react`)

```tsx
// packages/ui-next/src/components/primitives/MarkdownEditor.tsx  (骨架)
import { lazy, Suspense } from 'react';
import type { OnMount } from '@monaco-editor/react';

const MonacoEditor = lazy(() =>
  import('@monaco-editor/react').then((m) => ({ default: m.Editor })),
);

interface MarkdownEditorProps {
  value: string;
  language: 'markdown' | string;
  onChange: (val: string) => void;
  onUpload?: (files: File[]) => Promise<string[]>;   // 返回 file:// URL 列表
  height?: number | string;
}

export function MarkdownEditor({ value, language, onChange, onUpload, height = 360 }: MarkdownEditorProps) {
  const handleMount: OnMount = (editor, monaco) => {
    if (onUpload) {
      editor.addAction({
        id: 'hydro.upload-image',
        label: 'Upload Image',
        contextMenuGroupId: 'hydro',
        run: async () => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.multiple = true;
          input.onchange = async () => {
            if (!input.files?.length) return;
            const urls = await onUpload!(Array.from(input.files));
            editor.trigger('keyboard', 'type', { text: urls.map((u) => `![](${u})`).join('\n') });
          };
          input.click();
        },
      });
    }
  };

  return (
    <Suspense fallback={<textarea value={value} onChange={(e) => onChange(e.target.value)} />}>
      <MonacoEditor
        height={height}
        language={language}
        value={value}
        onChange={(v) => onChange(v ?? '')}
        onMount={handleMount}
        theme={useColorScheme() === 'dark' ? 'vs-dark' : 'light'}
        options={{
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          minimap: { enabled: false },
          wordWrap: 'on',
        }}
      />
    </Suspense>
  );
}
```

依赖:`@hydrooj/ui-next/package.json` 加 `"@monaco-editor/react": "^4.6.0"` 与 `"monaco-editor": "^0.52.0"`(monaco-editor 必须直接列为依赖,因为 `@monaco-editor/react` 只做 wrapper,实际 monaco 由 lazy import 加载)。

Vite worker 配置(`packages/ui-next/vite.config.ts`):
```ts
optimizeDeps: { include: ['monaco-editor/esm/vs/editor/editor.api'] },
worker: { format: 'es' },
```
不需要额外 plugins:`@monaco-editor/react` 内部已经处理了 worker URL。

### 提交流程

```
<form onSubmit={submit}>
  ProblemForm.submit()
    ├─ 客户端校验:title 必填 / pid 正则 / difficulty 1-10
    ├─ URLSearchParams: title, content(JSON.stringify(contentByLang)),
    │   pid?, hidden?, tag, difficulty?
    ├─ request.post(url, fd)
    │    → POST /problem/create (create) | 当前 pathname (edit)
    ├─ 成功: navigate(buildUrl('problem_files', {...}) | 'problem_detail', {...}))
    └─ 失败: setError → <Alert variant="error"> + RateLimitAlert
```

删除流程改用 `ConfirmDialog`:

```
ProblemForm.onDelete()
  ├─ setConfirmDelOpen(true)
  ├─ <ConfirmDialog>
  │     title={t('ProblemForm.DeleteTitle')}
  │     message={t('ProblemForm.DeleteConfirm', { name: title || pid })}
  │     confirmLabel={t('Delete')}
  │     variant="danger"
  │     onConfirm={async () => {
  │       await request.post(window.location.pathname,
  │         new URLSearchParams({ operation: 'delete' }));
  │       navigate(buildUrl('problem_main'));
  │     }}
  │     onCancel={() => setConfirmDelOpen(false)}
  └─ </ConfirmDialog>
```

`ProblemAdditionalFiles` 的文件删除同样替换为 `ConfirmDialog`(单文件 confirm,文字为 `ProblemAdditionalFiles.DeleteFileConfirm`)。

### Title 校验 UX 修复

```tsx
const titleRef = useRef<HTMLInputElement>(null);
...
if (!title.trim()) {
  setError(new HydroClientError({ code: 400, message: t('ProblemForm.ErrorTitleRequired') }));
  window.scrollTo({ top: 0, behavior: 'smooth' });
  setTimeout(() => titleRef.current?.focus(), 320);
  setSubmitting(false);
  return;
}
```

### Polyhedron 提示横幅

新建 `packages/ui-next/src/components/problem/PolyhedronHint.tsx`:

```tsx
const STORAGE_KEY = 'hydro.polyhedron-hint-dismissed';

export function PolyhedronHint() {
  const [open, setOpen] = useState(() =>
    typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY) !== '1'
  );
  if (!open) return null;
  return (
    <Alert variant="info" className={styles.hint}>
      <p>{t('ProblemForm.PolyhedronHintIntro')}</p>
      <p>{t('ProblemForm.PolyhedronHintFeature')}</p>
      <p>{t('ProblemForm.PolyhedronHintImport')}</p>
      <div className={styles.hintActions}>
        <a href="https://polyhedron.hydro.ac/" target="_blank" rel="noreferrer">
          {t('Open Polyhedron')}
        </a>
        <button onClick={() => setOpen(false)}>{t('Dismiss')}</button>
        <button onClick={() => { localStorage.setItem(STORAGE_KEY, '1'); setOpen(false); }}>
          {t("Don't show again")}
        </button>
      </div>
    </Alert>
  );
}
```

### 错误展示统一

所有错误优先走 `Toast` 系统(新增),inline `Alert` 仅保留 RateLimitAlert 与表单级服务端错误:

- 提交 / 删除失败:Toast.error(err.message)
- 客户端校验:inline `Alert variant="error"`(已经在 ErrorTitleRequired 用)
- 429 / 403:`RateLimitAlert`(已存在,保留)

`Toast` 设计:
- 全局单例(`<ToastProvider>` 挂在 `app.tsx` 根节点,已经存在的 Suspense 之上)
- `useToast()` hook 返回 `{ info, success, error }`
- 自动 4s 关闭,可手动 dismiss
- `role="status"` + `aria-live="polite"`(error 改 `assertive`)

## 实施计划(5 个 sprint,约 1 周)

### Sprint 1 — 服务端与数据(0.5 天)

- [ ] 新建 `packages/hydrooj/src/lib/category.ts` + 单元测试
- [ ] `ProblemEditHandler.get` / `ProblemCreateHandler.get` 注入 `categoryTree`
- [ ] `yarn build` 通过
- [ ] 端到端 smoke:`curl /p/<pid>/edit` 返回 `body.categoryTree`

### Sprint 2 — Primitives 落地(2 天)

- [ ] `primitives/Dropdown.tsx` + `Dropdown.test.tsx`(4 case:点击开关、点击外部关闭、Esc 关闭、键盘导航)
- [ ] `primitives/ConfirmDialog.tsx` + `ConfirmDialog.test.tsx`(4 case:打开/关闭、Esc 关闭、确认回调、焦点陷阱)
- [ ] `primitives/Toast.tsx` + `ToastProvider` + `useToast` + `Toast.test.tsx`(3 case)
- [ ] `primitives/index.ts` barrel 更新
- [ ] 在 `app.tsx` 挂 `<ToastProvider>`

### Sprint 3 — 表单升级(1 天)

- [ ] `ProblemForm` 接 `categoryTree`,用 `<Dropdown>` 渲染 category / subcategory
- [ ] `ProblemForm.onDelete` + `ProblemAdditionalFiles.onDeleteFile` 改用 `<ConfirmDialog>`
- [ ] Title 校验补 scroll + focus + ref
- [ ] 新增 `components/problem/PolyhedronHint.tsx` + i18n 词条
- [ ] 提交/删除失败改用 `useToast().error`

### Sprint 4 — 编辑器骨架(1.5 天)

- [ ] `packages/ui-next/package.json` 加 `@monaco-editor/react` + `monaco-editor` 依赖
- [ ] `primitives/MarkdownEditor.tsx` 实现(monaco + textarea fallback 双模式)
- [ ] `vite.config.ts` worker / optimizeDeps 配置
- [ ] 图片上传:`onUpload` 走 `request.postFile('/file', ...)`(create) / `request.postFile('./files', ...)`(edit)
- [ ] `ProblemForm` 接入 `MarkdownEditor`,把 `<textarea spellCheck="false">` 替换掉
- [ ] 主题联动:`useColorScheme()` → `vs-dark` / `light`(从 `tokens.css` 解析)

### Sprint 5 — 测试基线(0.5 天)

- [ ] `ProblemForm.test.tsx`:必填校验 / category 树形选择 / 多语言切换 / 删除 ConfirmDialog / 提交成功后跳转(5 case)
- [ ] `ProblemAdditionalFiles.test.tsx`:上传成功 / 删除 confirm(2 case)
- [ ] `problem_edit.test.tsx`:page 入口 args 透传(1 case)
- [ ] `problem_create.test.tsx`:同上(1 case)
- [ ] `MarkdownEditor.test.tsx`:textarea fallback 行为(1 case)
- [ ] `parseCategorySetting` 单测 5 case(空/null/YAML 错误/单层/嵌套)

合计 ~25 用例。

## 风险与缓解

| 风险 | 影响 | 缓解 |
|------|------|------|
| `@monaco-editor/react` 与 Vite 兼容性 | 中 | 已知的 Vite + monaco 套路:`optimizeDeps` 预构建 `editor.api`,其余语言 worker 按需加载;若失败,降级到 `textarea` backend |
| monaco-editor 包体(~3MB gzip) | 中 | lazy load + Suspense fallback 已就绪;首屏不会加载,仅在编辑器挂载时拉取 |
| 类目 setting YAML 解析格式变化 | 低 | `parseCategorySetting` 兼容空/null/数组/对象;单测覆盖 |
| ConfirmDialog 焦点陷阱 a11y 复杂度 | 中 | 复用 `focus-trap-react` 或自己写 ~30 行;若自行实现,只支持最简 `Tab` 循环,不追求完美 a11y |
| Toast 全局单例与 SSR 不兼容 | 低 | ui-next renderer 是 client-side React 19 SPA,`typeof window` 判断守护;SSR 仅在 dev mode 走通 |

## 兼容性 / 接口契约

- **服务端契约不变**:POST `/problem/create` / `/p/:pid/edit`、`operation=delete` / `upload_file` / `delete_files` 全部保持
- **请求体格式不变**:`title` / `content` / `pid` / `hidden` / `tag` / `difficulty`,`content` 仍是 JSON 序列化的多语言 map
- **响应体增量**:`body.categoryTree` 是新增字段,服务端不读取,前端也不传,向后兼容
- **i18n 增量**:`ProblemForm.*` / `ProblemAdditionalFiles.*` / 新 primitive 的 i18n key 全部加进 `lib/i18n.ts` 中英文档

## 验收标准

1. `yarn workspace @hydrooj/ui-next test` 全绿,新增 25+ 用例
2. `yarn lint:ci` 全绿
3. `tsc -b` 通过
4. 手工 smoke:`/p/<pid>/edit` 页面在 ui-next renderer 下可见类目树(2 级)、可切换语言 tab、可上传图片、可点击删除出现模态确认
5. ui-default 路由仍然工作(本设计不修改 ui-default)

## 不在范围

- monaco language server 扩展(markdown 高亮 + 行号已足够)
- Markdown 实时预览
- 类目拖拽排序
- 多用户协同编辑