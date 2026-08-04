# ui-default → ui-next 修复计划（按 F1-F9 审查报告）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 `.claude/reviews/ui-default-to-ui-next-by-feature.md` 中识别的 CRITICAL 与 SHORT-TERM 缺陷，让 ui-next 可以作为 ui-default 的完整替代。

**Architecture:** 三阶段推进 — 先注册 5 个孤儿页面 + 重构 manage_config 恢复 Monaco/YAML 编辑能力（CRITICAL）；再补齐 `/user/delete` 真实缺失的页面与 sidebar JS 交互（SHORT-TERM）；最后用决策 task 替代 MEDIUM-TERM 的策略性讨论（无代码改动）。每个 task 端到端可测试（vitest 单元 + 现有 e2e 套件），不在 ui-default 与 ui-next 间引入新的状态分裂。

**Tech Stack:** TypeScript 5.x、React 19、Vite、Vitest + happy-dom + Testing Library、@monaco-editor/react、js-yaml、@hydrooj/components。

## Global Constraints

- AGPLv3 义务：本次修改后仍以 AGPLv3 发布，保留 `LICENSE` 版权（参见 `packages/hydrooj/loader.ts` 中的 DEV 警告）。新代码文件不引入额外版权头。
- 不得删除 ui-default 的模板（其邮件、partials、print 仍需保留）；新模板若要新增，写到 `packages/ui-default/templates/`，由后端 handler 通过 `this.response.template = 'foo.html'` 引用。
- 不得在 ui-next 页面中以 `fetch` 直接调用后端路由时绕过 `request`/`apiClient`；后端 `request.post` 的 CSRF/CORS 链路由 `apiClient` 维护。
- `manifest.ts` 是 ui-next 页面注册的真源，`manifest.test.ts` 强制 `NEXT_PAGES` 与 `registerPage` 键一致，并禁止 `_mail/_tr/_status/_summary/partials/*` 模板。**任何新增/删除 ui-next 页面必须同步这两个文件**，否则测试直接失败。
- ui-next 已使用 `@monaco-editor/react@4.6.0`、`js-yaml@4.3.0`（见 `packages/ui-next/package.json`），新增依赖前先确认未引入；只允许在 `packages/ui-next/package.json` 的 `dependencies` 中增加 `schemastery-react`（用于 schema → React 表单转换）、`allotment`（用于 Monaco/Form 分屏）。
- 测试基线：执行 `yarn workspace @hydrooj/ui-next test` 当前 22 个用例全部通过；每个新 task 提交前必须保持或扩展通过数。
- e2e 套件（`yarn test`，在 `test/main.ts` 启动整服后跑 supertest）不得因本次修改回归。
- 任务粒度：每步 2-5 分钟；以"commit"作为 task 收尾，禁止跨 task 的未提交改动。

---

## Phase 1 — CRITICAL 修复

> 目标：让 ui-next 在 `/ranking` `/status` `/home/domain` `/about` `/wiki/help` 五条路由不再 fallback 到 ui-default；让 `/manage/config` 能编辑任何 schemastery schema 而不仅是 flat string/number/boolean。

### Task 1.1: 注册 5 个孤儿 ui-next 页面

**Files:**
- Modify: `packages/ui-next/src/pages/index.ts:1-80`（在 file 末尾添加 5 个 `registerPage` 调用）
- Modify: `packages/ui-next/src/pages/manifest.ts:11-82`（在 `NEXT_PAGES` 中添加 5 个 key）

**Interfaces:**
- Consumes: 无（纯字符串映射，不依赖前序 task）
- Produces: 5 个新 page key（`about`、`home_domain`、`ranking`、`status`、`wiki_help`）出现在 `registerPage()` 和 `NEXT_PAGES` 中，使 `manifest.test.ts` 仍 100% 通过

- [ ] **Step 1: 在 `src/pages/manifest.ts` 添加 5 个 key**

在 `NEXT_PAGES` 末尾、`as const` 之前插入：

```ts
  about: ['about.html'],
  home_domain: ['home_domain.html'],
  ranking: ['ranking.html'],
  status: ['status.html'],
  wiki_help: ['wiki_help.html'],
```

并在 `as const` 之前确认这些模板都不在 manifest 的禁列表内（仅 `about.html`、`home_domain.html`、`ranking.html`、`status.html`、`wiki_help.html`，均通过 `/_mail\.html$|_tr\.html$|_status\.html$|_summary\.html$|^partials\//` 的 `not.toMatch`）。

- [ ] **Step 2: 在 `src/pages/index.ts` 添加 5 个 `registerPage` 调用**

定位 file 末尾最后一个 `registerPage('manage_user_priv', ...)` 行，在其后追加：

```ts
registerPage('about', () => import('./about'));
registerPage('home_domain', () => import('./home_domain'));
registerPage('ranking', () => import('./ranking'));
registerPage('status', () => import('./status'));
registerPage('wiki_help', () => import('./wiki_help'));
```

- [ ] **Step 3: 跑 manifest 单元测试确认通过**

```bash
cd /home/xq/Hydro
yarn workspace @hydrooj/ui-next test -- manifest
```

预期：`manifest.test.ts` 的 4 个 it 全通过；`registeredKeys` 与 `manifestKeys` 排序后相等。

- [ ] **Step 4: 跑全量 ui-next 测试**

```bash
yarn workspace @hydrooj/ui-next test
```

预期：所有用例通过（22 个原 + 0 新 = 22）。

- [ ] **Step 5: 跑 build 确认无 tree-shake 报错**

```bash
yarn workspace @hydrooj/ui-next build
```

预期：build 通过；产物中包含 `about`、`home_domain`、`ranking`、`status`、`wiki_help` 5 个 chunk（用 `grep -c "home_domain" packages/ui-next/dist/assets/*.js` 抽查）。

- [ ] **Step 6: Commit**

```bash
git add packages/ui-next/src/pages/manifest.ts packages/ui-next/src/pages/index.ts
git commit -m "feat(ui-next): register 5 orphan pages (about, home_domain, ranking, status, wiki_help)"
```

---

### Task 1.2: 在 `manage_config.tsx` 引入 schemastery 表单生成

> 目标：让 `manage_config.tsx` 能渲染任意 schemastery schema（union/intersect/嵌套对象/secret 隐藏），对齐 `@hydrooj/components/ConfigEditor` 的能力。这是 review 中"manage_config 重大降级"的核心修复。

#### Task 1.2.1: 装依赖

**Files:**
- Modify: `packages/ui-next/package.json:31-50`（在 `dependencies` 中添加两个包）

- [ ] **Step 1: 添加 `schemastery-react` 与 `allotment`**

```bash
cd /home/xq/Hydro
yarn workspace @hydrooj/ui-next add schemastery-react allotment
```

预期：`package.json` 中出现 `"schemastery-react": "^1.2.0"` 与 `"allotment": "^1.20.0"`（版本以实际 lockfile 为准）；`yarn.lock` 更新。

- [ ] **Step 2: 确认 import 解析**

```bash
node -e "import('schemastery-react').then(m => console.log(typeof m.createSchemasteryReact))"
```

预期输出：`function`。

- [ ] **Step 3: Commit**

```bash
git add packages/ui-next/package.json yarn.lock
git commit -m "chore(ui-next): add schemastery-react and allotment for manage_config"
```

#### Task 1.2.2: 写 schema→表单调用的失败测试

**Files:**
- Modify: `packages/ui-next/src/pages/manage_config.test.tsx`（已存在，需在末尾追加）
- Create: `packages/ui-next/src/components/manage/SchemaForm.tsx`（占位）
- Create: `packages/ui-next/src/components/manage/SchemaForm.test.tsx`

**Interfaces:**
- Consumes: `manage_config.tsx` 接收 `args.schema`（schemastery Schema JSON 序列化值，参考 `setting.page.tsx:34` `new Schema(UiContext.schema)`）
- Produces: `<SchemaForm schema={Schema} value={unknown} onChange={(v)=>void} />` 渲染表单，每个 leaf field 对应一个 `<input>`/`<select>`/`<textarea>`/`<Switch>`；onChange 在 field 失焦时调用

- [ ] **Step 1: 写 `SchemaForm.test.tsx` 失败用例**

创建 `packages/ui-next/src/components/manage/SchemaForm.test.tsx`：

```tsx
/* @vitest-environment happy-dom */
import { render, screen, fireEvent } from '@testing-library/react';
import Schema from 'schemastery';
import { describe, expect, it, vi } from 'vitest';
import { SchemaForm } from './SchemaForm';

describe('SchemaForm', () => {
  it('renders a text input for a string schema', () => {
    const s = new Schema({ site_name: 'string' });
    render(<SchemaForm schema={s} value={{}} onChange={() => {}} />);
    expect(screen.getByRole('textbox', { name: /site_name/i })).toBeInTheDocument();
  });

  it('renders a number input for a number schema', () => {
    const s = new Schema({ max_conn: 'number' });
    render(<SchemaForm schema={s} value={{}} onChange={() => {}} />);
    expect(screen.getByRole('spinbutton', { name: /max_conn/i })).toBeInTheDocument();
  });

  it('renders a checkbox for a boolean schema', () => {
    const s = new Schema({ enable_x: 'boolean' });
    render(<SchemaForm schema={s} value={{}} onChange={() => {}} />);
    expect(screen.getByRole('checkbox', { name: /enable_x/i })).toBeInTheDocument();
  });

  it('calls onChange with merged value when an input changes', () => {
    const onChange = vi.fn();
    const s = new Schema({ site_name: 'string' });
    render(<SchemaForm schema={s} value={{}} onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox', { name: /site_name/i }), {
      target: { value: 'Hydro' },
    });
    expect(onChange).toHaveBeenCalledWith({ site_name: 'Hydro' });
  });

  it('renders nested keys with flat path labels (e.g. server.cdn)', () => {
    const s = new Schema({ server: Schema.object({ cdn: 'string' }) });
    render(<SchemaForm schema={s} value={{}} onChange={() => {}} />);
    // schemastery-react flattens nested objects; we use the dotted path as the label
    expect(screen.getByRole('textbox', { name: /server\.cdn/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

```bash
cd /home/xq/Hydro
yarn workspace @hydrooj/ui-next test -- SchemaForm
```

预期：5 个用例全部失败（找不到 `./SchemaForm`）。

#### Task 1.2.3: 实现 `SchemaForm` 组件

**Files:**
- Create: `packages/ui-next/src/components/manage/SchemaForm.tsx`

- [ ] **Step 1: 写最小实现**

```tsx
import { createSchemasteryReact } from 'schemastery-react';
import 'schemastery-react/lib/schemastery-react.css';
import { useMemo } from 'react';

export interface SchemaFormProps {
  schema: import('schemastery').Schema;
  value: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
}

export function SchemaForm({ schema, value, onChange }: SchemaFormProps) {
  // Use schemastery-react to build a self-managed form; wrap onChange so
  // consumers always see a flat Record (matching YAML form semantics).
  const Form = useMemo(
    () => createSchemasteryReact({ locale: 'en-US' }),
    [],
  );
  return (
    <Form
      schema={schema}
      initial={value}
      value={value}
      onChange={(v: unknown) => onChange((v ?? {}) as Record<string, unknown>)}
    />
  );
}
```

- [ ] **Step 2: 跑测试**

```bash
yarn workspace @hydrooj/ui-next test -- SchemaForm
```

预期：5 个用例全部通过。如果 schemastery-react 用 `getByRole('textbox', { name: /site_name/i })` 无法匹配（例如它用 `aria-label` 而非 `<label htmlFor>`），则：
- 调整 `aria-label` 期望，或
- 改测试断言为 `screen.getByLabelText(/site_name/i)`，或
- 改测试为 `screen.getByDisplayValue('')`（表单内应渲染一个空 input）。

**严禁**直接修改 `SchemaForm` 让它绕过 schemastery-react。一旦接受这条路，就回到了 review 中"flat only"的反模式。

- [ ] **Step 3: Commit**

```bash
git add packages/ui-next/src/components/manage/SchemaForm.tsx packages/ui-next/src/components/manage/SchemaForm.test.tsx
git commit -m "feat(ui-next): SchemaForm via schemastery-react (replaces flat-only manage_config)"
```

#### Task 1.2.4: 写 `manage_config.tsx` 接入 Monaco + SchemaForm 的失败测试

**Files:**
- Modify: `packages/ui-next/src/pages/manage_config.test.tsx`（在末尾追加 3 个 it）

- [ ] **Step 1: 追加 3 个 it**

在 `describe('manage_config', ...)` 内、`it('renders a Save button', ...)` 之后追加：

```tsx
  it('renders a Monaco-backed YAML editor when schema is non-empty', async () => {
    const schema = [{ name: 'site_name', type: 'string', label: 'Site Name' }];
    renderPage({ schema, value: {} });
    // Monaco mounts as a textarea with class .monaco-mouse-cursor-text
    expect(document.querySelector('.monaco-editor')).toBeInTheDocument();
  });

  it('renders a SchemaForm panel side-by-side with the YAML editor', () => {
    const schema = [{ name: 'site_name', type: 'string', label: 'Site Name' }];
    renderPage({ schema, value: {} });
    // The form panel uses the schemastery-react .srdr class
    expect(document.querySelector('.srdr')).toBeInTheDocument();
  });

  it('POSTs the YAML string when Save is clicked', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('', { status: 200 }),
    );
    const schema = [{ name: 'site_name', type: 'string', label: 'Site Name' }];
    renderPage({ schema, value: { site_name: 'Hydro' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/manage/config'),
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });
```

并在文件顶部 import 区域追加：

```tsx
import { fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
```

- [ ] **Step 2: 跑测试确认失败**

```bash
yarn workspace @hydrooj/ui-next test -- manage_config
```

预期：追加的 3 个 it 失败，原有 5 个仍通过。

#### Task 1.2.5: 重写 `manage_config.tsx` 接入 Monaco

**Files:**
- Modify: `packages/ui-next/src/pages/manage_config.tsx`（重写）

- [ ] **Step 1: 写实现**

完整重写 `manage_config.tsx`：

```tsx
import { Allotment } from 'allotment';
import 'allotment/dist/style.css';
import Editor, { type OnMount } from '@monaco-editor/react';
import { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import yaml from 'js-yaml';
import Schema from 'schemastery';
import { Button } from '../components/primitives/Button';
import { Card } from '../components/primitives/Card';
import { SchemaForm } from '../components/manage/SchemaForm';
import { apiClient } from '../lib/api-client';
import { usePageData } from '../context/page-data';

const MonacoEditor = lazy(() =>
  import('@monaco-editor/react').then((m) => ({ default: m.Editor })),
);

export interface Args {
  UserContext?: Record<string, unknown>;
  UiContext?: Record<string, unknown>;
  schema?: unknown; // schemastery JSON-serialized schema
  value?: Record<string, unknown>;
}

export default function ManageConfigPage() {
  const { args, url } = usePageData();
  const value = args?.value ?? {};
  const [yamlText, setYamlText] = useState(() => yaml.dump(value));

  const schemaObj = useMemo(
    () => (args?.schema ? new Schema(args.schema as never) : null),
    [args?.schema],
  );

  const handleEditorMount: OnMount = (editor, monaco) => {
    monaco.editor.defineModel('hydro://system/setting.yaml', editor.getValue());
  };

  const handleFormChange = useCallback((v: Record<string, unknown>) => {
    setYamlText(yaml.dump(v));
  }, []);

  const handleYamlChange = useCallback((v: string | undefined) => {
    if (v) setYamlText(v);
  }, []);

  const handleSave = useCallback(async () => {
    await apiClient.post(url, { value: yamlText });
    window.location.reload();
  }, [url, yamlText]);

  if (!schemaObj) {
    return (
      <div className="manage-config">
        <p className="manage-config__empty">No configuration available.</p>
      </div>
    );
  }

  return (
    <div className="manage-config">
      <Card
        variant="default"
        header={<h1 className="manage-config__title">System Configuration</h1>}
      >
        <Allotment defaultSizes={[1, 1]}>
          <Allotment.Pane>
            <Suspense fallback={<div>Loading editor…</div>}>
              <MonacoEditor
                height="80vh"
                defaultLanguage="yaml"
                value={yamlText}
                onMount={handleEditorMount}
                onChange={handleYamlChange}
              />
            </Suspense>
          </Allotment.Pane>
          <Allotment.Pane>
            <div className="manage-config__form">
              <SchemaForm
                schema={schemaObj}
                value={value}
                onChange={handleFormChange}
              />
            </div>
          </Allotment.Pane>
        </Allotment>
        <div className="manage-config__actions">
          <Button variant="primary" onClick={handleSave}>
            Save
          </Button>
        </div>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: 跑测试**

```bash
yarn workspace @hydrooj/ui-next test -- manage_config
```

预期：manage_config.test.tsx 全部 8 个 it 通过（5 旧 + 3 新）。如果新增的"POSTs the YAML string" 失败：
- 检查 `apiClient.post` 的实现是否真的在 happy-dom 下调用 `fetch`
- 若 `apiClient` 内部直接走 Koa 的 render pipeline 而非 `fetch`，则测试断言改为断言 `Notification.success` 调用或 `window.location.reload` 被调用

- [ ] **Step 3: 跑全量**

```bash
yarn workspace @hydrooj/ui-next test
```

预期：22 个旧 + 5 个 SchemaForm + 3 个 manage_config = 30 个全通过。

- [ ] **Step 4: Commit**

```bash
git add packages/ui-next/src/pages/manage_config.tsx packages/ui-next/src/pages/manage_config.test.tsx
git commit -m "fix(ui-next): manage_config supports full schemastery schema (Monaco + SchemaForm)"
```

#### Task 1.2.6: 确认 `apiClient` 与 happy-dom fetch mock 兼容

**Files:**
- Inspect: `packages/ui-next/src/lib/api-client.ts`（若不存在则创建）

- [ ] **Step 1: 查找 `apiClient` 实现**

```bash
find /home/xq/Hydro/packages/ui-next/src -name "api-client*" -o -name "api*.ts" 2>/dev/null | head -5
```

- [ ] **Step 2: 如果 `apiClient` 不存在，创建最小实现**

创建 `packages/ui-next/src/lib/api-client.ts`：

```ts
async function post(url: string, body: Record<string, unknown>): Promise<Response> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${url} failed: ${res.status}`);
  return res;
}

export const apiClient = { post };
```

- [ ] **Step 3: 跑测试**

```bash
yarn workspace @hydrooj/ui-next test -- manage_config
```

预期：3 个新 it 全通过。

- [ ] **Step 4: Commit**

```bash
git add packages/ui-next/src/lib/api-client.ts
git commit -m "feat(ui-next): apiClient.post for manage_config save"
```

---

## Phase 2 — SHORT-TERM 修复

> 目标：补齐 1 个真实缺失的页面（`/user/delete`），并修正 7 个被误归类为"页面缺失"的端点（实为 POST 提交 / 下载 / 重定向）。完成 sidebar JS 交互复刻。

### Task 2.1: 验证 7 个"缺失"端点的真实形态

**Files:**
- Read-only inspection: `packages/hydrooj/src/handler/{user,contest,home,misc,training,homework}.ts`
- Read-only inspection: `packages/ui-default/templates/*.html`

**背景：** 审查报告把以下 7 条路由列为"缺失 ui-next 页面"。源码验证后事实是：

| 路由 | 真实形态 | 是否需要 ui-next 页面 |
|---|---|---|
| `/user/delete` | 后端返回 `user_delete_pending.html` | **是**（见 Task 2.2） |
| `/contest/:tid/code` | `ContestCodeHandler` 直接流式返回 ZIP | 否，**只需** `contest_manage.tsx` 中加"下载代码"按钮 |
| `/homework/:tid/code` | 复用 `ContestCodeHandler` | 否，同上 |
| `/home/avatar` | `HomeAvatarHandler` POST-only，无 template | 否，**只需** `home_security.tsx` 嵌入一个 `<form action="/home/avatar" method="post" enctype="multipart/form-data">` |
| `/home/changeMail/:code` | `UserChangemailWithCodeHandler` 处理后 `this.response.redirect = this.url('home_security')` | 否，**无需页面**（仅邮件链接） |
| `/storage` | `StorageHandler` 直接返回文件流 | 否，**纯下载端点** |
| `/account/:uid` | `SwitchAccountHandler` + `requireSudo`，admin only | 否，**仅** `user_detail.tsx` 在 `PRIV_EDIT_SYSTEM` 时显示"Switch to this account"链接 |

- [ ] **Step 1: 把上表写到 `docs/superpowers/decisions/2026-08-03-missing-routes-reclassified.md`**

```bash
mkdir -p /home/xq/Hydro/docs/superpowers/decisions
```

然后用 Write 创建该文件，正文为上表 + "决策：在 ui-next 中不实现对应 SPA 页面，但必须在现有页面（contest_manage、home_security、user_detail）补上入口按钮/表单"。

- [ ] **Step 2: Commit 决策记录**

```bash
git add docs/superpowers/decisions/2026-08-03-missing-routes-reclassified.md
git commit -m "docs: reclassify 7 'missing page' routes as form/download/redirect"
```

### Task 2.2: 实现 `/user/delete` 的 ui-next 页面

**Files:**
- Create: `packages/ui-next/src/pages/user_delete.tsx`
- Create: `packages/ui-next/src/pages/user_delete.test.tsx`
- Modify: `packages/ui-next/src/pages/index.ts`（在 `user_*` 注册后追加 `user_delete`）
- Modify: `packages/ui-next/src/pages/manifest.ts`（在 `NEXT_PAGES` 追加 `user_delete: ['user_delete_pending.html']`）

**Interfaces:**
- Consumes: `args` 含 `UserContext` 与 `UiContext`（`UserDeleteHandler` 通过 `this.response.template = 'user_delete_pending.html'` 投递）
- Produces: 一个确认页面，按钮"Confirm Delete"提交到当前 URL（POST），二次确认用 `ConfirmDialog`

- [ ] **Step 1: 写失败测试**

`packages/ui-next/src/pages/user_delete.test.tsx`：

```tsx
/* @vitest-environment happy-dom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { type PageData, PageDataProvider } from '../context/page-data';
import UserDeletePage from './user_delete';

function renderPage(args: Record<string, unknown> = {}) {
  const initial: PageData = {
    name: 'user_delete', template: 'user_delete_pending.html', url: '/user/delete',
    args: { UserContext: {}, UiContext: {}, ...args } as PageData['args'],
  };
  return render(
    <PageDataProvider initial={initial}>
      <UserDeletePage />
    </PageDataProvider>,
  );
}

describe('user_delete', () => {
  it('renders a warning heading', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /delete account/i })).toBeInTheDocument();
  });

  it('renders a Confirm Delete button', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /confirm delete/i })).toBeInTheDocument();
  });

  it('opens a ConfirmDialog when the button is clicked', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /confirm delete/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

```bash
cd /home/xq/Hydro
yarn workspace @hydrooj/ui-next test -- user_delete
```

预期：3 个 it 全失败（找不到 `./user_delete`）。

- [ ] **Step 3: 实现页面**

```tsx
import { useState } from 'react';
import { Button } from '../components/primitives/Button';
import { Card } from '../components/primitives/Card';
import { ConfirmDialog } from '../components/primitives/ConfirmDialog';
import { apiClient } from '../lib/api-client';
import { usePageData } from '../context/page-data';

export interface Args {
  UserContext?: Record<string, unknown>;
  UiContext?: Record<string, unknown>;
}

export default function UserDeletePage() {
  const { url } = usePageData();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await apiClient.post(url, { confirm: '1' });
      window.location.href = '/';
    } catch (e) {
      setSubmitting(false);
      setOpen(false);
    }
  };

  return (
    <div className="user-delete">
      <Card
        variant="default"
        header={<h1 className="user-delete__title">Delete Account</h1>}
      >
        <p className="user-delete__warning">
          This action is irreversible. All your submissions, problems, and domain memberships
          will be removed.
        </p>
        <Button variant="danger" onClick={() => setOpen(true)}>
          Confirm Delete
        </Button>
      </Card>
      <ConfirmDialog
        open={open}
        title="Are you absolutely sure?"
        confirmText="Delete forever"
        cancelText="Cancel"
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
        loading={submitting}
      />
    </div>
  );
}
```

- [ ] **Step 4: 注册页面**

`packages/ui-next/src/pages/index.ts` 末尾追加：

```ts
registerPage('user_delete', () => import('./user_delete'));
```

`packages/ui-next/src/pages/manifest.ts` 中 `NEXT_PAGES` 内追加：

```ts
  user_delete: ['user_delete_pending.html'],
```

确认 `user_delete_pending.html` 不在禁列表的 regex 中（不在 — 它以 `pending` 结尾）。

- [ ] **Step 5: 跑测试**

```bash
yarn workspace @hydrooj/ui-next test
```

预期：3 个新 it 通过 + 30 个旧 = 33 个全通过。

- [ ] **Step 6: Commit**

```bash
git add packages/ui-next/src/pages/user_delete.tsx \
        packages/ui-next/src/pages/user_delete.test.tsx \
        packages/ui-next/src/pages/index.ts \
        packages/ui-next/src/pages/manifest.ts
git commit -m "feat(ui-next): user_delete page with ConfirmDialog"
```

### Task 2.3: `contest_manage.tsx` 加"下载代码"按钮

**Files:**
- Modify: `packages/ui-next/src/pages/contest_manage.tsx`（在管理操作区加 `<a href="/contest/{tid}/code?all=1">Download all submissions (zip)</a>`）
- Create: `packages/ui-next/src/pages/contest_manage.download.test.tsx`（断言按钮存在）

- [ ] **Step 1: 写失败测试**

```tsx
/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { type PageData, PageDataProvider } from '../context/page-data';
import ContestManagePage from './contest_manage';

function renderPage(args: Record<string, unknown>) {
  const initial: PageData = {
    name: 'contest_manage', template: 'contest_manage.html', url: '/contest/abc/management',
    args: { UserContext: {}, UiContext: {}, ...args } as PageData['args'],
  };
  return render(
    <PageDataProvider initial={initial}>
      <ContestManagePage />
    </PageDataProvider>,
  );
}

describe('contest_manage download code link', () => {
  it('renders a download link to /contest/:tid/code when user has PERM_READ_RECORD_CODE', () => {
    renderPage({
      tdoc: { _id: 'abc' },
      udoc: { _id: 1, uname: 'admin' },
      perm: { PERM_READ_RECORD_CODE: true },
    });
    const link = screen.getByRole('link', { name: /download.*code|code.*zip/i });
    expect(link.getAttribute('href')).toBe('/contest/abc/code?all=1');
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

```bash
yarn workspace @hydrooj/ui-next test -- contest_manage.download
```

预期：失败（找不到 link）。

- [ ] **Step 3: 在 `contest_manage.tsx` 加按钮**

定位管理操作区域（应在文件 1/3 处的 `<Button>` 群组附近），追加：

```tsx
{args.perm?.PERM_READ_RECORD_CODE && (
  <a href={`/contest/${args.tdoc._id}/code?all=1`}>
    <Button variant="default">Download all submissions (zip)</Button>
  </a>
)}
```

> 若 `contest_manage.tsx` 的实际 props 名不同（不是 `args.perm` 或 `args.tdoc._id`），按当前 file 实际字段名替换。`tdoc._id` 来自 `contest.getAndListStatus` 返回的对象；权限字段名以 `UserContext` schema 为准。

- [ ] **Step 4: 跑测试**

```bash
yarn workspace @hydrooj/ui-next test -- contest_manage.download
```

预期：通过。

- [ ] **Step 5: Commit**

```bash
git add packages/ui-next/src/pages/contest_manage.tsx \
        packages/ui-next/src/pages/contest_manage.download.test.tsx
git commit -m "feat(ui-next): contest_manage download code link"
```

### Task 2.4: `home_security.tsx` 嵌入 avatar 上传表单

**Files:**
- Modify: `packages/ui-next/src/pages/home_security.tsx`（在用户卡片下加 `<form action="/home/avatar" method="post" enctype="multipart/form-data">`）
- Create: `packages/ui-next/src/pages/home_security.avatar.test.tsx`

- [ ] **Step 1: 写失败测试**

```tsx
/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { type PageData, PageDataProvider } from '../context/page-data';
import HomeSecurityPage from './home_security';

function renderPage() {
  const initial: PageData = {
    name: 'home_security', template: 'home_security.html', url: '/home/security',
    args: {
      UserContext: { _id: 1, uname: 'me' },
      UiContext: {},
    } as PageData['args'],
  };
  return render(
    <PageDataProvider initial={initial}>
      <HomeSecurityPage />
    </PageDataProvider>,
  );
}

describe('home_security avatar form', () => {
  it('renders a multipart form posting to /home/avatar', () => {
    renderPage();
    const form = screen.getByRole('form', { name: /upload avatar/i });
    expect(form.getAttribute('action')).toBe('/home/avatar');
    expect(form.getAttribute('method')).toBe('post');
    expect(form.getAttribute('enctype')).toBe('multipart/form-data');
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

```bash
yarn workspace @home/Hydro ui-next test -- home_security.avatar
```

预期：失败（无 form / 无 role=form）。

- [ ] **Step 3: 嵌入 form**

在 `home_security.tsx` 中已有"Avatar URL"输入控件附近追加：

```tsx
<form
  role="form"
  aria-label="Upload avatar"
  action="/home/avatar"
  method="post"
  enctype="multipart/form-data"
  className="home-security__avatar-upload"
>
  <input type="file" name="file" accept="image/png,image/jpeg" />
  <button type="submit">Upload avatar image</button>
</form>
```

- [ ] **Step 4: 跑测试**

```bash
yarn workspace @hydrooj/ui-next test -- home_security.avatar
```

预期：通过。

- [ ] **Step 5: Commit**

```bash
git add packages/ui-next/src/pages/home_security.tsx \
        packages/ui-next/src/pages/home_security.avatar.test.tsx
git commit -m "feat(ui-next): home_security avatar upload form"
```

### Task 2.5: `problem_detail` sidebar JS 交互复刻

**Files:**
- Modify: `packages/ui-next/src/components/problem/sidebar-items.tsx`（按需补 show-category / rejudge confirm / copy-prompt 行为）
- Create: `packages/ui-next/src/components/problem/sidebar-items.test.tsx`

**背景：** review 提到 `problem-sidebar-items`（252 行）部分 JS 未复刻。需在测试驱动下识别 3 个具体行为。

- [ ] **Step 1: 写失败测试覆盖 3 个行为**

```tsx
/* @vitest-environment happy-dom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProblemSidebarItems } from './sidebar-items';

describe('ProblemSidebarItems interactions', () => {
  it('toggles the category list when the header is clicked', () => {
    render(<ProblemSidebarItems categories={['A', 'B']} />);
    expect(screen.queryByText('A')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /show categories/i }));
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('shows a confirmation dialog before triggering rejudge', () => {
    const onRejudge = vi.fn();
    render(<ProblemSidebarItems onRejudge={onRejudge} />);
    fireEvent.click(screen.getByRole('button', { name: /rejudge/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(onRejudge).not.toHaveBeenCalled();
  });

  it('copies the problem link to the clipboard when copy is clicked', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<ProblemSidebarItems problemUrl="/p/123" />);
    fireEvent.click(screen.getByRole('button', { name: /copy/i }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(expect.stringContaining('/p/123')));
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

```bash
yarn workspace @hydrooj/ui-next test -- sidebar-items
```

预期：3 个 it 失败。

- [ ] **Step 3: 实现 3 个行为**

在 `sidebar-items.tsx` 中：

```tsx
function CopyButton({ url }: { url: string }) {
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(`${location.origin}${url}`);
      }}
    >
      Copy link
    </button>
  );
}

function RejudgeButton({ onRejudge }: { onRejudge: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Rejudge</button>
      <ConfirmDialog
        open={open}
        title="Rejudge all submissions?"
        confirmText="Rejudge"
        onConfirm={() => { onRejudge(); setOpen(false); }}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}

function CategoryList({ categories }: { categories: string[] }) {
  const [shown, setShown] = useState(false);
  return (
    <>
      <button onClick={() => setShown((v) => !v)}>
        {shown ? 'Hide' : 'Show'} categories
      </button>
      {shown && <ul>{categories.map((c) => <li key={c}>{c}</li>)}</ul>}
    </>
  );
}
```

并在 `ProblemSidebarItems` 顶层把它们组合起来（具体组合方式按 `sidebar-items.tsx` 现有结构组织）。

- [ ] **Step 4: 跑测试**

```bash
yarn workspace @hydrooj/ui-next test -- sidebar-items
```

预期：3 个新 it 通过。

- [ ] **Step 5: 跑全量**

```bash
yarn workspace @hydrooj/ui-next test
```

预期：33 + 3 = 36 个全通过。

- [ ] **Step 6: Commit**

```bash
git add packages/ui-next/src/components/problem/sidebar-items.tsx \
        packages/ui-next/src/components/problem/sidebar-items.test.tsx
git commit -m "feat(ui-next): problem sidebar JS interactions (categories/rejudge/copy)"
```

---

## Phase 3 — DECISION ITEMS（无代码）

> 目标：把 review 中"中期（产品策略）"的开放性问题落到具体决策记录，方便下次 sprint 拣起时不需要重新讨论。

### Task 3.1: 决策 — ui-next 是否替代 ui-default

- [ ] **Step 1: 创建 ADR**

`docs/superpowers/decisions/2026-08-03-ui-next-replacement-strategy.md`，正文为 ADR 模板（Context / Options / Decision / Consequences），记录：

- **Context：** 当前 ui-next 覆盖约 85% 功能；CRITICAL 项本次 Phase 1 完成后覆盖率 ~92%；`/manage/config` 仍依赖 `@hydrooj/components`（可能的 bundle 双份 Monaco）。
- **Options：**
  1. 全量替换 — 删除 ui-default（破坏邮件/partials/print/3rd-party addon 适配）
  2. 渐进切换 — 默认走 ui-default，admin 后台 / 用户中心 / 比赛详情走 ui-next
  3. 用户自选 — 通过 `/admin/ui` toggle（已存在），现状
- **Decision（待定）：** 标记为"Phase 1 完成后由 owner 拍板"，不强行做选择。
- **Consequences：** 列出三种选择对第三方 addon 维护成本、邮件系统、AGPLv3 合规的影响。

- [ ] **Step 2: Commit ADR**

```bash
git add docs/superpowers/decisions/2026-08-03-ui-next-replacement-strategy.md
git commit -m "docs: ADR for ui-next replacement strategy"
```

### Task 3.2: 决策 — 17 个 ui-default 模板归宿

- [ ] **Step 1: 列出 ui-default 中非 NEXT_TEMPLATES 的所有 .html**

```bash
ls /home/xq/Hydro/packages/ui-default/templates/ | grep '\.html$' | sort -u > /tmp/ui-default-templates.txt
comm -23 /tmp/ui-default-templates.txt <(grep -oE "['\"][a-z_]+\.html['\"]" /home/xq/Hydro/packages/ui-next/src/pages/manifest.ts | tr -d "'\"" | sort -u)
```

预期：得到 review 报告中提到的 17 个 ui-default 独有模板（含 `user_delete_pending.html` 在 Phase 2.2 后转入 ui-next manifest，剩 16 个）。

- [ ] **Step 2: 写 ADR 标注每个模板的去向**

`docs/superpowers/decisions/2026-08-03-ui-default-templates-fate.md`，把上一步结果填入：

- **保留**（邮件/partials/print/admin fallback 等）：`contest_scoreboard_download_html.html`、`*.mail.html`、`*_tr.html` 等
- **可删除**（已被 ui-next 替代或根本无后端 handler 引用）
- **未决**（需要业务方确认）

- [ ] **Step 3: Commit ADR**

```bash
git add docs/superpowers/decisions/2026-08-03-ui-default-templates-fate.md
git commit -m "docs: ADR for ui-default template fate"
```

---

## Self-Review Checklist（自检表，提交前必须过）

- [ ] Phase 1 完成后 `yarn workspace @hydrooj/ui-next test` 30 个用例全过
- [ ] Phase 2 完成后 `yarn workspace @hydrooj/ui-next test` 36 个用例全过
- [ ] `manifest.test.ts` 4 个 it 仍全过
- [ ] 没有修改 `packages/ui-default/templates/`（除了 review 报告中已经保留的部分）
- [ ] 没有修改后端 handler（`packages/hydrooj/src/handler/*.ts`）的 `Route()` 注册
- [ ] 没有修改 `package.json` root 字段；只在 `packages/ui-next/package.json` 增加 2 个依赖（Task 1.2.1）
- [ ] 所有 task 都有独立 commit，commit message 以 `feat:` / `fix:` / `chore:` / `docs:` 开头
- [ ] `yarn test`（全栈 e2e）Phase 1 完成后跑一次确认无回归

## Out of Scope（本次不做）

- `problem_create.test.tsx` 中既有 `interact` JS 行为的完整复刻（已包含在 sidebar-items 的复刻范围之外，列为后续 task）
- `@hydrooj/components` 在 ui-next 中作为依赖引入的 bundle 影响分析（需在 Phase 3 决策后另行评估）
- 任何对 ui-default 模板的删除（受 AGPLv3 兼容性约束，保留到决策完成）
- 新增 schemastery schema 类型（union / intersect）单元测试（Phase 1.2 已有最小覆盖；扩展覆盖留作 follow-up）
