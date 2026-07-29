# SP2: ui-next 讨论域迁移 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 迁移讨论域未覆盖的 3 个 ui-next 页面:`discussion_main` / `discussion_node`(共用 `discussion_main_or_node.html`)、`discussion_create`、`discussion_edit`,使 ui-next 对全站讨论流的入口能完整渲染,不再回退到 ui-default。

**Architecture:** 沿用 SP0 / SP1 流程 — `registerPage` + co-located `.module.css` + co-located `.test.tsx` + `manifest.ts` 数据源 + `manifest.test.ts` 漂移检测。SP2 新建 4 个共享基础组件到 `components/discussion/`(`DiscussionList` / `DiscussionListItem` / `DiscussionNodesWidget` / `DiscussionSidebar` / `DiscussionForm`),最后 3 个 Tasks 实现页面。**关键技术决定**:`discussion_main` 与 `discussion_node` 服务端都返回同一个 `discussion_main_or_node.html`(只有 `page_name` 和 `vnode` 不同),因此**只建一个页面组件 + 在 `pages/index.ts` 注册两次**(类似 SP0 已有的 `contest_create` / `contest_edit` 共享 `contest_edit.html` 模式)。

**Tech Stack:** 与 SP0 / SP1 一致 — TypeScript 严格模式、React 19 + Vite、vitest + happy-dom + @testing-library/react。**不引入新依赖**。复用 SP1 既有 `Paginator` / `CommentsSection` / `Card` / `MarkdownEditor` / `MarkdownPreview`。

## Pre-Flight API Corrections (2026-07-29)

实施前对 ui-next 现有原语 API 做了扫描,发现以下与本计划代码片段不一致的地方。**实现时必须采用本节写法,忽略下面 Task 步骤里与本节矛盾的代码**:

1. **`MarkdownEditor`**: 实际 props 是 `value` / `onChange` / `onSubmit`(不是 `onSave`) / `'aria-label'`(kebab string 不是 `ariaLabel`) / `height` / `language` / `onUpload`。ctrl+enter 是默认绑定,不需要也不接受 `ctrlEnter` prop。**DiscussionForm 用 `onSubmit={submit}`,MarkdownEditor 上的 a11y 用 `'aria-label':'content'` 而非 `ariaLabel`,不传 `ctrlEnter`。**

2. **`useTranslate` 返回 `(key: string, args?: Record<string, unknown>) => string`**。Task 6 / 7 中的 `t('Create Discussion in {0}').format(vnode.title || '')` 错误;改为 `t('Create Discussion in {0}', { '0': vnode.title || '' })`。

3. **`ProblemSidebar.mode` 仅接受 `'normal' | 'contest' | 'view' | 'correction'`**,不接受 `'compact'`。Task 5 调用改为 `mode="normal"`。

4. **`ContestDetailSidebar` 不接受 `buildUrl` prop,且其语义与 discussion_node side bar 不符**。Task 5 把 `vnode?.type === TYPE_CONTEST` 分支**直接走 DiscussionSidebar**(generic 渲染)。Contest node 上的 sidebar 视作"复用问题详情侧栏"留给 SP2+ 独立路线。

5. **`primitives/Time` 不存在**。Task 1 DiscussionListItem 中 `<Time value={ddoc.updateAt} />` 改为:
   ```tsx
   import { timeAgo } from '../../lib/datetime';
   // ...
   {timeAgo(ddoc.updateAt)}
   ```
   `lib/datetime` 已有 `timeAgo`,被 `sections/DiscussionSection.tsx` 复用。

6. **`primitives/MarkdownHint` 不存在**。Task 6 / 7 侧栏替换为内联 `<Card>` + 一句提示文本(SP2+ 可升级为完整 md hint 组件)。例:
   ```tsx
   <Card className={styles.side}>
     <p className={styles.hint}>支持 Markdown 语法。(Ctrl+Enter 提交)</p>
   </Card>
   ```

7. **`packages/ui-next/src/lib/i18n.ts` 中存在 git 冲突标记**(`<<<<<<< Updated upstream`,从 SP0 报告 F5 起就有的预存脏文件)。**实施中绝对不要修改 i18n.ts**,冲突不属于 SP2 scope。DiscussionForm / DiscussionList 等如需 i18n,直接用 `useTranslate()` 调用已有 zh_CN/en catalog,不要追加新 key 到 i18n.ts。

## Global Constraints

- Node ≥22; Yarn 4 workspace; `@hydrooj/register` for on-the-fly TS transpilation.
- **不引入新运行时依赖**。
- 沿用 SP0 / SP1 全局约束:不引入新的 ESLint 报错或测试回归;不修改 `AGPLv3` / `README.md`;后端 handler 不动;`@hydrooj/common` 的 `STATUS` / `PERM` / `PRIV` 不重复定义。
- 沿用 SP0 漂移检测:每个新页面必须同时更新 `packages/ui-next/src/pages/manifest.ts` 和 `packages/ui-next/src/pages/index.ts`,否则 `manifest.test.ts` 立即 fail。
- 测试环境:**所有新 .test.tsx 加 `/* @vitest-environment happy-dom */` 头**(与 SP0 / SP1 一致)。
- TDD 严格执行:先写 failing test、再写最小实现、补 commit;不批量写实现后补测试。
- 多 commit 节奏:每个 Task 末尾 1 次 commit,Task 标题即为 commit subject。
- **共享 manifest 模板**:`discussion_main_or_node.html` 由 `discussion_main` 与 `discussion_node` 共用,manifest 同 key 出现两次,`NEXT_TEMPLATES` 自动去重。复用 SP0 已有的 `contest_create` / `contest_edit` 双注册模式,不引入新模式。
- **scope 限制**(避免与 ui-default 不一致,见 Known Limitations):本 Plan 只接 discussion main/node 列表分页 + create/edit 三 verb(post / update / delete),star / lock / reactions / node-pic 装饰留 SP2+。Main 页面展示的所有话题 hover/focus 交互也只渲染,不引入 jQuery 行为。

---

## File Structure

### Created (per task)

| Task | File | Responsibility |
|---|---|---|
| 1 | `packages/ui-next/src/components/discussion/DiscussionList.tsx` | 列表容器(空态 + ul + Paginator) |
| 1 | `packages/ui-next/src/components/discussion/DiscussionList.module.css` | 列表样式 |
| 1 | `packages/ui-next/src/components/discussion/DiscussionListItem.tsx` | 单条话题卡(replies 计数 + 标题 + 节点标签 + 浏览数 + 作者) |
| 1 | `packages/ui-next/src/components/discussion/DiscussionListItem.module.css` | item 样式 |
| 1 | `packages/ui-next/src/components/discussion/DiscussionList.test.tsx` | 空态 / 多条 / 单条高亮 / 隐藏标记 |
| 2 | `packages/ui-next/src/components/discussion/DiscussionNodesWidget.tsx` | 按 `content` 分组的节点侧栏 |
| 2 | `packages/ui-next/src/components/discussion/DiscussionNodesWidget.module.css` | 节点样式 |
| 2 | `packages/ui-next/src/components/discussion/DiscussionNodesWidget.test.tsx` | 分组 / 链接 / 空态 |
| 3 | `packages/ui-next/src/components/discussion/DiscussionSidebar.tsx` | 按 `vnode.type` 切换 problem / contest / generic |
| 3 | `packages/ui-next/src/components/discussion/DiscussionSidebar.module.css` | sidebar 样式 |
| 3 | `packages/ui-next/src/components/discussion/DiscussionSidebar.test.tsx` | 三种 vnode.type + 无 vnode |
| 4 | `packages/ui-next/src/components/discussion/DiscussionForm.tsx` | 标题 + 高亮/置顶 + MarkdownEditor(ctrl+enter 提交) |
| 4 | `packages/ui-next/src/components/discussion/DiscussionForm.module.css` | form 样式 |
| 4 | `packages/ui-next/src/components/discussion/DiscussionForm.test.tsx` | 初始值 / 受控 / ctrl+enter / disabled checkbox |
| 5 | `packages/ui-next/src/pages/discussion_main.tsx` + `.module.css` + `.test.tsx` | main 页面(page_name === 'discussion_main') |
| 6 | `packages/ui-next/src/pages/discussion_create.tsx` + `.module.css` + `.test.tsx` | 新建话题页 |
| 7 | `packages/ui-next/src/pages/discussion_edit.tsx` + `.module.css` + `.test.tsx` | 编辑话题页(update + delete) |

### Modified

| File | Change |
|---|---|
| `packages/ui-next/src/pages/manifest.ts` | `NEXT_PAGES` 增加 4 项:`discussion_main` / `discussion_node`(共用 `discussion_main_or_node.html`)、`discussion_create`、`discussion_edit` |
| `packages/ui-next/src/pages/index.ts` | `registerPage(...)` 增加 5 行(`discussion_main` + `discussion_node` 都指向 `./discussion_main`) |
| `packages/ui-next/src/pages/manifest.test.ts` | 添加 `discussion_main_or_node.html` 必须含、`discussion_create.html` 必须含、`discussion_edit.html` 必须含 三条 assert |
| `packages/ui-next/src/components/discussion/index.ts` | 新建,re-export 全部 5 个组件 |
| `test/main.ts` | 加 4 条 e2e 烟雾测试(`/discuss` / `/discuss/:type/:name` / `/discuss/:type/:name/create` / `/d/:did/edit`) |
| `.claude/report/2026-07-29-sp2-discussion-domain-completion.md` | 任务完成报告(SP2 末) |

### Unchanged but referenced

- `packages/ui-next/src/components/sidebar/ProblemSidebar.tsx` — Task 3 在 sidebar 切到 problem 时直接复用,不修改。
- `packages/ui-next/src/components/primitives/Paginator.tsx` — Task 1 / 5 复用,**不修改**。
- `packages/ui-next/src/components/primitives/MarkdownEditor.tsx` — Task 4 复用 + 用现有 `onSave` 协议,**不修改**。
- `packages/hydrooj/src/handler/discussion.ts:69-205` (DiscussionMainHandler / DiscussionNodeHandler / DiscussionCreateHandler / DiscussionEditHandler) — 注入 args **逐字段** 反映到 page 的 `Args` 接口,**不修改后端**。

---

## Task 1: DiscussionList + DiscussionListItem 组件

**Files:**
- Create: `packages/ui-next/src/components/discussion/DiscussionList.tsx`
- Create: `packages/ui-next/src/components/discussion/DiscussionList.module.css`
- Create: `packages/ui-next/src/components/discussion/DiscussionListItem.tsx`
- Create: `packages/ui-next/src/components/discussion/DiscussionListItem.module.css`
- Create: `packages/ui-next/src/components/discussion/DiscussionList.test.tsx`

**Interfaces:**
- Produces:
  - `<DiscussionListItem ddoc={...} vnode={...} owner={...} buildHref={...} />`
  - `<DiscussionList ddocs={...} vndict={...} udict={...} buildHref={...} page={1} dpcount={1} buildPageHref={...} />`
- Consumed by: Task 5 (discussion_main / discussion_node 主页)
- Reusable by: `src/sections/DiscussionSection.tsx` (主页挂件,可选 SP2+ 替换 — 不在本 Task 范围)

**Scope decision:** `DiscussionListItem` **不** 实现 ui-default 的 `data-emoji-enabled` 渲染管线(`reaction__list__item` 拼接 emoji);**不**实现 `data-copy` jQuery tooltip;这些都是 ui-default 行为层的细节,SPA 内是单独重构目标 — 留作 SP2+。

- [ ] **Step 1: Write the failing test**

```tsx
/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DiscussionList } from './DiscussionList';

const buildHref = (name: string, p?: Record<string, unknown>) =>
  name === 'discussion_detail' ? `/d/${p?.did}` : name === 'discussion_node' ? `/discuss/${p?.type}/${p?.name}` : '#';

describe('DiscussionList', () => {
  it('renders empty state when ddocs is empty', () => {
    render(<DiscussionList ddocs={[]} vndict={{}} udict={{}} page={1} dpcount={1} buildHref={buildHref} />);
    expect(screen.getByText(/暂无讨论/)).toBeInTheDocument();
  });

  it('renders one DiscussionListItem per ddoc', () => {
    const ddocs = [
      { _id: 'a', docId: '1', title: 'first', nReply: 3, views: 10, owner: 1, parentType: 4, parentId: 'p1', updateAt: 0 },
      { _id: 'b', docId: '2', title: 'second', nReply: 0, views: 0, owner: 2, parentType: 4, parentId: 'p1', updateAt: 0 },
    ];
    render(<DiscussionList ddocs={ddocs as any} vndict={{}} udict={{
      1: { _id: 1, uname: 'alice' },
      2: { _id: 2, uname: 'bob' },
    }} page={1} dpcount={1} buildHref={buildHref} />);
    expect(screen.getByText('first')).toBeInTheDocument();
    expect(screen.getByText('second')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('marks highlight ddocs with data-highlight="true"', () => {
    const ddocs = [
      { _id: 'a', docId: '1', title: 'hl', nReply: 0, views: 0, owner: 1, parentType: 4, parentId: 'p1', updateAt: 0, highlight: true },
    ];
    const { container } = render(<DiscussionList ddocs={ddocs as any} vndict={{}} udict={{ 1: { _id: 1, uname: 'a' } }} page={1} dpcount={1} buildHref={buildHref} />);
    expect(container.querySelector('[data-highlight="true"]')).not.toBeNull();
  });

  it('shows Hidden tag when ddoc.hidden', () => {
    const ddocs = [
      { _id: 'a', docId: '1', title: 'hid', nReply: 0, views: 0, owner: 1, parentType: 4, parentId: 'p1', updateAt: 0, hidden: true },
    ];
    render(<DiscussionList ddocs={ddocs as any} vndict={{}} udict={{ 1: { _id: 1, uname: 'a' } }} page={1} dpcount={1} buildHref={buildHref} />);
    expect(screen.getByText(/Hidden/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn workspace @hydrooj/ui-next test src/components/discussion/DiscussionList.test.tsx`
Expected: FAIL — `./DiscussionList` 模块不存在。

- [ ] **Step 3: Implement DiscussionListItem.tsx**

```tsx
import { Link } from '../link';
import { Time } from '../primitives/Time';
import styles from './DiscussionListItem.module.css';

export interface DiscussionItemOwner {
  _id: number;
  uname: string;
  avatar?: string;
}

export interface DiscussionDdoc {
  _id: string;
  docId: string;
  title: string;
  nReply: number;
  views: number;
  owner: number;
  parentType: number;
  parentId: string;
  updateAt: number | string;
  highlight?: boolean;
  pin?: boolean;
  hidden?: boolean;
}

export interface VnodeLite {
  _id?: string;
  id?: string;
  title?: string;
  type?: number;
  docId?: string;
}

export interface DiscussionListItemProps {
  ddoc: DiscussionDdoc;
  vnode?: VnodeLite;
  owner?: DiscussionItemOwner;
  buildHref: (name: string, params?: Record<string, unknown>) => string;
}

function parentTypeDisplay(parentType: number): string {
  switch (parentType) {
    case 1: return 'problem';
    case 2: return 'contest';
    case 4: return 'node';
    case 16: return 'training';
    case 32: return 'homework';
    default: return 'node';
  }
}

export function DiscussionListItem({ ddoc, vnode, owner, buildHref }: DiscussionListItemProps) {
  const detailHref = buildHref('discussion_detail', { did: ddoc.docId });
  const nodeHref = vnode
    ? buildHref('discussion_node', { type: parentTypeDisplay(ddoc.parentType), name: String(ddoc.parentId) })
    : '#';
  return (
    <li
      className={`${styles.item} ${ddoc.highlight ? styles.highlight : ''}`}
      data-highlight={ddoc.highlight ? 'true' : 'false'}
      data-doc-id={ddoc.docId}
    >
      <div className={styles.replies}>
        <div className={styles.repliesNum}>{ddoc.nReply}</div>
        <div className={styles.repliesLabel}>回复</div>
      </div>
      <div className={styles.body}>
        <h1 className={styles.title}>
          <Link href={detailHref}>{ddoc.title}</Link>
        </h1>
        <ul className={styles.meta}>
          {vnode && (
            <li>
              <Link href={nodeHref} className={styles.nodeTag}>
                {vnode.title || '(missing)'}
              </Link>
            </li>
          )}
          <li>{ddoc.views} 浏览</li>
          <li>
            {owner ? (
              <Link href={buildHref('user_detail', { uid: owner._id })}>{owner.uname}</Link>
            ) : (
              <span>#{ddoc.owner}</span>
            )}
            {' @ '}
            <Time value={ddoc.updateAt} />
          </li>
          {ddoc.hidden && <li className={styles.hidden}>(Hidden)</li>}
        </ul>
      </div>
    </li>
  );
}
```

- [ ] **Step 4: Add DiscussionListItem.module.css**

```css
.item {
  display: flex;
  gap: var(--space-3, 12px);
  padding: var(--space-3, 12px);
  border-bottom: 1px solid var(--border, rgba(0,0,0,0.08));
}
.item.highlight { background: var(--accent-soft, rgba(94, 106, 210, 0.05)); }
.replies {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 4rem;
  padding: var(--space-2, 8px);
  border: 1px solid var(--border, rgba(0,0,0,0.08));
  border-radius: var(--radius-sm, 6px);
  background: var(--surface-2, transparent);
}
.repliesNum { font-family: var(--font-display, system-ui); font-size: var(--text-lg, 1.125rem); font-weight: 600; }
.repliesLabel { font-size: var(--text-xs, 0.75rem); color: var(--fg-muted, #888); }
.body { flex: 1 1 auto; display: flex; flex-direction: column; gap: var(--space-2, 8px); }
.title { font-family: var(--font-display, system-ui); font-size: var(--text-md, 1rem); margin: 0; }
.title a { color: var(--fg, inherit); text-decoration: none; }
.title a:hover { color: var(--accent, #5e6ad2); }
.meta {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3, 12px);
  color: var(--fg-muted, #888);
  font-size: var(--text-xs, 0.75rem);
}
.meta a { color: var(--fg-muted, #888); text-decoration: none; }
.meta a:hover { color: var(--accent, #5e6ad2); }
.nodeTag { /* no extra rules */ }
.hidden { color: var(--warning, #f59e0b); }
```

- [ ] **Step 5: Implement DiscussionList.tsx**

```tsx
import { Paginator } from '../primitives/Paginator';
import { DiscussionListItem, type DiscussionDdoc, type VnodeLite } from './DiscussionListItem';
import styles from './DiscussionList.module.css';

export interface DiscussionListProps {
  ddocs: DiscussionDdoc[];
  /** Map of `parentType → { parentId → VnodeLite }`. */
  vndict: Record<string, Record<string, VnodeLite>>;
  udict: Record<number, { _id: number, uname: string, avatar?: string }>;
  page: number;
  dpcount: number;
  buildHref: (name: string, params?: Record<string, unknown>) => string;
  buildPageHref?: (page: number) => string;
  emptyText?: string;
}

export function DiscussionList({
  ddocs, vndict, udict, page, dpcount, buildHref, buildPageHref, emptyText = '暂无讨论',
}: DiscussionListProps) {
  if (ddocs.length === 0) {
    return <p className={styles.empty}>{emptyText}</p>;
  }
  return (
    <div className={styles.wrap}>
      <ol className={styles.list}>
        {ddocs.map((d) => {
          const vnode = vndict[String(d.parentType)]?.[String(d.parentId)];
          const owner = udict[d.owner];
          return (
            <DiscussionListItem
              key={d._id}
              ddoc={d}
              vnode={vnode}
              owner={owner}
              buildHref={buildHref}
            />
          );
        })}
      </ol>
      <Paginator
        current={page}
        total={dpcount}
        buildHref={(p) => (buildPageHref ? buildPageHref(p) : `?page=${p}`)}
      />
    </div>
  );
}
```

- [ ] **Step 6: Add DiscussionList.module.css**

```css
.wrap { display: flex; flex-direction: column; gap: var(--space-3, 12px); }
.list { list-style: none; padding: 0; margin: 0; border-top: 1px solid var(--border, rgba(0,0,0,0.08)); }
.empty { color: var(--fg-muted, #888); text-align: center; padding: var(--space-4, 16px); }
```

- [ ] **Step 7: Run test to verify it passes**

Run: `yarn workspace @hydrooj/ui-next test src/components/discussion/DiscussionList.test.tsx`
Expected: 4 passed.

- [ ] **Step 8: Type-check**

Run: `yarn workspace @hydrooj/ui-next exec tsc -b 2>&1 | head -40`
Expected: 0 errors(`DiscussionList` / `DiscussionListItem` / `Time` 引用齐全)。

- [ ] **Step 9: Commit**

```bash
git add packages/ui-next/src/components/discussion/DiscussionList.tsx \
        packages/ui-next/src/components/discussion/DiscussionList.module.css \
        packages/ui-next/src/components/discussion/DiscussionListItem.tsx \
        packages/ui-next/src/components/discussion/DiscussionListItem.module.css \
        packages/ui-next/src/components/discussion/DiscussionList.test.tsx
git commit -m "feat(ui-next): add DiscussionList + DiscussionListItem primitives"
```

---

## Task 2: DiscussionNodesWidget 组件

**Files:**
- Create: `packages/ui-next/src/components/discussion/DiscussionNodesWidget.tsx`
- Create: `packages/ui-next/src/components/discussion/DiscussionNodesWidget.module.css`
- Create: `packages/ui-next/src/components/discussion/DiscussionNodesWidget.test.tsx`

**Interfaces:**
- Produces: `<DiscussionNodesWidget vnodes={...} buildHref={...} />` — 按 `content` 分组的节点侧栏
- Consumed by: Task 5 (discussion_main / discussion_node 右侧栏)

**Scope decision:** `DiscussionNodesWidget` 在 ui-default 是按 `vnodes|groupby('content')` 渲染;SPA 内我们手动分组(避免引入 lodash 的 jinja 兼容语义)。不实现 ui-default 的 hover 折叠和选中态高亮(留作 SP2+)。

- [ ] **Step 1: Write the failing test**

```tsx
/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DiscussionNodesWidget } from './DiscussionNodesWidget';

const buildHref = (name: string, p?: Record<string, unknown>) =>
  name === 'discussion_node' ? `/discuss/${p?.type}/${p?.name}` : '#';

describe('DiscussionNodesWidget', () => {
  it('groups nodes by content and renders one link per node', () => {
    const vnodes = [
      { docId: '1', title: 'General A', content: 'General' },
      { docId: '2', title: 'General B', content: 'General' },
      { docId: '3', title: 'Help C', content: 'Help' },
    ];
    render(<DiscussionNodesWidget vnodes={vnodes as any} buildHref={buildHref} />);
    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('Help')).toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(3);
  });

  it('renders empty state when vnodes is empty', () => {
    render(<DiscussionNodesWidget vnodes={[]} buildHref={buildHref} />);
    expect(screen.getByText(/暂无节点/)).toBeInTheDocument();
  });

  it('links each node to discussion_node', () => {
    const vnodes = [
      { docId: '42', title: 'Node X', content: 'Cat' },
    ];
    render(<DiscussionNodesWidget vnodes={vnodes as any} buildHref={buildHref} />);
    const link = screen.getByText('42');
    expect(link.getAttribute('href')).toBe('/discuss/node/42');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn workspace @hydrooj/ui-next test src/components/discussion/DiscussionNodesWidget.test.tsx`
Expected: FAIL — 模块不存在。

- [ ] **Step 3: Implement DiscussionNodesWidget.tsx**

```tsx
import { Card } from '../primitives/Card';
import { Link } from '../link';
import styles from './DiscussionNodesWidget.module.css';

export interface Vnode {
  docId: string;
  title: string;
  content?: string;
  type?: number;
}

export interface DiscussionNodesWidgetProps {
  vnodes: Vnode[];
  buildHref: (name: string, params?: Record<string, unknown>) => string;
}

function groupBy<T extends Record<string, unknown>, K extends keyof T>(items: T[], key: K): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const item of items) {
    const k = String(item[key] ?? '');
    (out[k] ||= []).push(item);
  }
  return out;
}

export function DiscussionNodesWidget({ vnodes, buildHref }: DiscussionNodesWidgetProps) {
  if (!vnodes || vnodes.length === 0) {
    return (
      <Card className={styles.card}>
        <p className={styles.empty}>暂无节点</p>
      </Card>
    );
  }
  const groups = groupBy(vnodes as any, 'content');
  return (
    <Card className={styles.card} header={<h3 className={styles.header}>讨论节点</h3>}>
      {Object.entries(groups).map(([category, items]) => (
        <section key={category} className={styles.group}>
          <h4 className={styles.groupTitle}>{category}</h4>
          <ol className={styles.chipList}>
            {items.map((n) => (
              <li key={n.docId} className={styles.chip}>
                <Link href={buildHref('discussion_node', { type: 'node', name: n.docId })}>
                  {n.docId}
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </Card>
  );
}
```

- [ ] **Step 4: Add DiscussionNodesWidget.module.css**

```css
.card { padding: var(--space-3, 12px); }
.header { font-family: var(--font-display, system-ui); font-size: var(--text-md, 1rem); margin: 0 0 var(--space-2, 8px); }
.empty { color: var(--fg-muted, #888); text-align: center; padding: var(--space-2, 8px); margin: 0; }
.group { margin: var(--space-2, 8px) 0; }
.groupTitle { font-family: var(--font-display, system-ui); font-size: var(--text-sm, 0.875rem); color: var(--fg-muted, #888); margin: 0 0 var(--space-1, 4px); }
.chipList { list-style: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: var(--space-1, 4px); }
.chip {
  display: inline-flex;
  padding: var(--space-1, 4px) var(--space-2, 8px);
  border: 1px solid var(--border, rgba(0,0,0,0.12));
  border-radius: var(--radius-sm, 6px);
  background: var(--surface-2, transparent);
  font-size: var(--text-xs, 0.75rem);
}
.chip a { color: var(--accent, #5e6ad2); text-decoration: none; }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `yarn workspace @hydrooj/ui-next test src/components/discussion/DiscussionNodesWidget.test.tsx`
Expected: 3 passed。

- [ ] **Step 6: Commit**

```bash
git add packages/ui-next/src/components/discussion/DiscussionNodesWidget.tsx \
        packages/ui-next/src/components/discussion/DiscussionNodesWidget.module.css \
        packages/ui-next/src/components/discussion/DiscussionNodesWidget.test.tsx
git commit -m "feat(ui-next): add DiscussionNodesWidget sidebar primitive"
```

---

## Task 3: DiscussionSidebar 组件(vnode.type 三态切换)

**Files:**
- Create: `packages/ui-next/src/components/discussion/DiscussionSidebar.tsx`
- Create: `packages/ui-next/src/components/discussion/DiscussionSidebar.module.css`
- Create: `packages/ui-next/src/components/discussion/DiscussionSidebar.test.tsx`

**Interfaces:**
- Produces: `<DiscussionSidebar vnode={...} udict={...} user={...} buildHref={...} />`
- Consumed by: Task 5 (discussion_node 侧栏 — problem/contest 分支复用既有 ProblemSidebar/ContestDetailSidebar;generic 分支渲染标题 + 创建讨论按钮)

**Scope decision:** problem / contest 分支**直接复用**既有的 `ProblemSidebar` (SP0 已存在)与 `ContestDetailSidebar` (SP0 已存在);generic 分支与 main(vnode 为空对象)渲染相同的创建讨论卡片。Sidebar 的 vnode.pic 装饰图、模态登录、节点权限详情等留 SP2+。

- [ ] **Step 1: Write the failing test**

```tsx
/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DiscussionSidebar } from './DiscussionSidebar';

const buildHref = (name: string, p?: Record<string, unknown>) =>
  name === 'discussion_create' ? `/discuss/${p?.type}/${p?.name}/create` : '#';

describe('DiscussionSidebar', () => {
  it('renders title card for generic vnode (type not problem/contest)', () => {
    const vnode = { _id: 'n1', id: 'n1', title: 'Node X', type: 4 };
    render(<DiscussionSidebar vnode={vnode as any} udict={{}} user={null} buildHref={buildHref} />);
    expect(screen.getByRole('heading', { name: 'Node X' })).toBeInTheDocument();
  });

  it('hides Create button when vnode is empty (discussion_main)', () => {
    render(<DiscussionSidebar vnode={{} as any} udict={{}} user={null} buildHref={buildHref} />);
    expect(screen.queryByText(/Create a Discussion|发起讨论/)).toBeNull();
  });

  it('shows Create link for logged-in user on generic vnode', () => {
    const vnode = { _id: 'n1', id: 'n1', title: 'Node', type: 4 };
    const user = { _id: 1, hasPriv: () => true, hasPerm: (p: number) => p === 1 };
    render(<DiscussionSidebar vnode={vnode as any} udict={{}} user={user as any} buildHref={buildHref} />);
    expect(screen.getByText(/发起讨论|Create a Discussion/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn workspace @hydrooj/ui-next test src/components/discussion/DiscussionSidebar.test.tsx`
Expected: FAIL — 模块不存在。

- [ ] **Step 3: Implement DiscussionSidebar.tsx**

```tsx
import { Card } from '../primitives/Card';
import { Button } from '../primitives/Button';
import { Link } from '../link';
import styles from './DiscussionSidebar.module.css';

const TYPE_PROBLEM = 1;
const TYPE_CONTEST = 2;

export interface DiscussionSidebarVnode {
  _id?: string;
  id?: string | number;
  title?: string;
  type?: number;
  docId?: string | number;
  owner?: number;
  pic?: string;
}

export interface DiscussionSidebarUser {
  _id: number;
  hasPerm?: (p: number) => boolean;
  hasPriv?: (p: number) => boolean;
}

export interface DiscussionSidebarProps {
  vnode: DiscussionSidebarVnode;
  udict: Record<number, { _id: number; uname?: string; avatar?: string }>;
  user: DiscussionSidebarUser | null;
  buildHref: (name: string, params?: Record<string, unknown>) => string;
  /** Permission id for "create discussion". Defaults to 1; pages can override. */
  createPerm?: number;
  /** Privilege id for "login required". Defaults to 1; pages can override. */
  loginPriv?: number;
}

export function DiscussionSidebar({
  vnode, udict, user, buildHref,
  createPerm = 1, loginPriv = 1,
}: DiscussionSidebarProps) {
  // problem / contest 分支由调用方(页面)在更外层条件渲染传入 ProblemSidebar /
  // ContestDetailSidebar;本组件只处理 generic(以及空 vnode = discussion_main)
  const isEmpty = !vnode || (!vnode._id && !vnode.id && !vnode.docId);
  if (vnode?.type === TYPE_PROBLEM || vnode?.type === TYPE_CONTEST) {
    return null; // 调用方已渲过对应 Sidebar
  }
  const owner = vnode.owner ? udict[vnode.owner] : undefined;
  return (
    <div className={styles.wrap}>
      {isEmpty ? (
        <Card className={styles.card}>
          <p className={styles.empty}>选择一个节点以查看讨论。</p>
        </Card>
      ) : (
        <Card className={styles.card}>
          {vnode.pic && <div className={`${styles.bg} ${styles[`pic_${vnode.pic}`] || ''}`} aria-hidden="true" />}
          <h3 className={styles.title}>{vnode.title || '发起讨论'}</h3>
          {owner?.uname && <p className={styles.owner}>由 {owner.uname} 维护</p>}
          {!user || !user._id ? (
            <LoginToCreate buildHref={buildHref} />
          ) : user.hasPerm?.(createPerm) ? (
            <Link href={buildHref('discussion_create', {
              type: 'node',
              name: String(vnode._id || vnode.id || vnode.docId),
            })} className={styles.createBtn}>
              发起讨论
            </Link>
          ) : user.hasPriv?.(loginPriv) ? (
            <Button variant="ghost" disabled className={styles.createBtn}>无发起讨论权限</Button>
          ) : (
            <LoginToCreate buildHref={buildHref} />
          )}
        </Card>
      )}
    </div>
  );
}

function LoginToCreate({ buildHref }: { buildHref: DiscussionSidebarProps['buildHref'] }) {
  return (
    <Link href={buildHref('user_login', { query: { redirect: typeof window !== 'undefined' ? window.location.pathname : '/' } })} className={styles.createBtn}>
      登录后发起讨论
    </Link>
  );
}
```

> **Note on `TYPE_PROBLEM` / `TYPE_CONTEST`** — 这些枚举与 ui-default `discussion_main_or_node.html:10,14` 的 `vnode.type == model.document.TYPE_PROBLEM/CONTEST` 对应;若 `@hydrooj/common` 已导出 `document.TYPE_*`,实施时替换为正式 import,语义不变。

- [ ] **Step 4: Add DiscussionSidebar.module.css**

```css
.wrap { display: flex; flex-direction: column; gap: var(--space-3, 12px); }
.card { padding: var(--space-3, 12px); }
.bg {
  height: 80px;
  border-radius: var(--radius-sm, 6px);
  background: var(--surface-2, #f5f5f5);
  margin-bottom: var(--space-2, 8px);
  background-size: cover;
  background-position: center;
}
.title { font-family: var(--font-display, system-ui); font-size: var(--text-lg, 1.125rem); margin: 0 0 var(--space-2, 8px); }
.owner { color: var(--fg-muted, #888); font-size: var(--text-xs, 0.75rem); margin: 0 0 var(--space-2, 8px); }
.createBtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: var(--space-2, 8px);
  border: 1px solid var(--accent, #5e6ad2);
  border-radius: var(--radius-sm, 6px);
  background: var(--accent, #5e6ad2);
  color: var(--accent-fg, #fff);
  text-decoration: none;
  cursor: pointer;
}
.createBtn:hover { opacity: 0.92; }
.empty { color: var(--fg-muted, #888); text-align: center; padding: var(--space-2, 8px); margin: 0; }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `yarn workspace @hydrooj/ui-next test src/components/discussion/DiscussionSidebar.test.tsx`
Expected: 3 passed。

- [ ] **Step 6: Commit**

```bash
git add packages/ui-next/src/components/discussion/DiscussionSidebar.tsx \
        packages/ui-next/src/components/discussion/DiscussionSidebar.module.css \
        packages/ui-next/src/components/discussion/DiscussionSidebar.test.tsx
git commit -m "feat(ui-next): add DiscussionSidebar (generic-node branch)"
```

---

## Task 4: DiscussionForm 组件(create + edit 共享)

**Files:**
- Create: `packages/ui-next/src/components/discussion/DiscussionForm.tsx`
- Create: `packages/ui-next/src/components/discussion/DiscussionForm.module.css`
- Create: `packages/ui-next/src/components/discussion/DiscussionForm.test.tsx`

**Interfaces:**
- Produces: `<DiscussionForm initial={{ title, content, highlight, pin }} showHighlightPin={true|false} onSubmit={async (val) => void} onCancel? submitText? />`
- Consumed by: Task 6 (discussion_create)、Task 7 (discussion_edit)

**Scope decision:** DiscussionForm **只渲染**,不直接 `<form method="post">` 包裹 — 真正表单提交由调用方(页面)用 SP1 discussion_detail 同款 `document.createElement('form')` 方式构造。这样 DiscussionForm 可在 create 和 edit 复用,edit 还要再加 update/delete 两个按钮。ctrl+enter → submit(模仿 ui-default `hotkeys:'ctrl+enter:submit'`)。

- [ ] **Step 1: Write the failing test**

```tsx
/* @vitest-environment happy-dom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DiscussionForm } from './DiscussionForm';

describe('DiscussionForm', () => {
  it('renders initial title and content', () => {
    render(
      <DiscussionForm
        initial={{ title: 'hello', content: '# hi' }}
        showHighlightPin={false}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByDisplayValue('hello')).toBeInTheDocument();
    // content is rendered in MarkdownEditor; we just check the editor exists
    expect(screen.getByRole('textbox', { name: /content/i })).toBeInTheDocument();
  });

  it('hides highlight/pin when showHighlightPin=false', () => {
    render(
      <DiscussionForm
        initial={{ title: '', content: '' }}
        showHighlightPin={false}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.queryByText(/高亮/)).toBeNull();
    expect(screen.queryByText(/置顶/)).toBeNull();
  });

  it('calls onSubmit with title/content when published', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <DiscussionForm
        initial={{ title: 't', content: 'c' }}
        showHighlightPin={false}
        onSubmit={onSubmit}
        submitText="发布"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /发布/ }));
    expect(onSubmit).toHaveBeenCalledWith({ title: 't', content: 'c', highlight: false, pin: false });
  });

  it('respects initial highlight and pin (edit mode)', () => {
    render(
      <DiscussionForm
        initial={{ title: 'x', content: 'y', highlight: true, pin: true }}
        showHighlightPin={true}
        onSubmit={vi.fn()}
      />,
    );
    const highlightBox = screen.getByLabelText(/高亮/) as HTMLInputElement;
    expect(highlightBox.checked).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn workspace @hydrooj/ui-next test src/components/discussion/DiscussionForm.test.tsx`
Expected: FAIL — 模块不存在。

- [ ] **Step 3: Implement DiscussionForm.tsx**

```tsx
import { useState } from 'react';
import { Button } from '../primitives/Button';
import { Input } from '../primitives/Input';
import { MarkdownEditor } from '../primitives/MarkdownEditor';
import styles from './DiscussionForm.module.css';

export interface DiscussionFormValues {
  title: string;
  content: string;
  highlight: boolean;
  pin: boolean;
}

export interface DiscussionFormProps {
  initial?: Partial<DiscussionFormValues>;
  showHighlightPin: boolean;
  onSubmit: (values: DiscussionFormValues) => void | Promise<void>;
  onCancel?: () => void;
  submitText?: string;
}

export function DiscussionForm({
  initial = {},
  showHighlightPin,
  onSubmit,
  onCancel,
  submitText = '发布',
}: DiscussionFormProps) {
  const [title, setTitle] = useState(initial.title ?? '');
  const [content, setContent] = useState(initial.content ?? '');
  const [highlight, setHighlight] = useState(initial.highlight ?? false);
  const [pin, setPin] = useState(initial.pin ?? false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({ title, content, highlight, pin });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      className={styles.form}
      onSubmit={(e) => { e.preventDefault(); submit(); }}
    >
      <div className={styles.titleRow}>
        <Input
          ariaLabel="标题"
          placeholder="标题"
          value={title}
          onChange={setTitle}
          autoFocus
          className={styles.titleInput}
        />
        {showHighlightPin && (
          <>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                aria-label="高亮"
                checked={highlight}
                onChange={(e) => setHighlight(e.target.checked)}
              />
              <span>高亮</span>
            </label>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                aria-label="置顶"
                checked={pin}
                onChange={(e) => setPin(e.target.checked)}
              />
              <span>置顶</span>
            </label>
          </>
        )}
      </div>
      <MarkdownEditor
        ariaLabel="content"
        value={content}
        onChange={setContent}
        onSave={submit}
        ctrlEnter
      />
      <div className={styles.actions}>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>取消</Button>
        )}
        <Button type="submit" variant="primary" disabled={!title.trim() || !content.trim() || submitting}>
          {submitting ? '...' : submitText}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 4: Add DiscussionForm.module.css**

```css
.form { display: flex; flex-direction: column; gap: var(--space-3, 12px); padding: var(--space-3, 12px); }
.titleRow {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: var(--space-2, 8px);
  align-items: end;
}
.titleInput { width: 100%; }
.checkbox { display: inline-flex; gap: var(--space-1, 4px); align-items: center; font-size: var(--text-sm, 0.875rem); }
.actions { display: flex; gap: var(--space-2, 8px); justify-content: flex-end; }
@media (max-width: 768px) { .titleRow { grid-template-columns: 1fr; } }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `yarn workspace @hydrooj/ui-next test src/components/discussion/DiscussionForm.test.tsx`
Expected: 4 passed(假设 `MarkdownEditor` 已支持 `ariaLabel` / `onSave` / `ctrlEnter` props;若未支持,在该 Task 内补 markdownEditor 的 props 即可,**不视为 scope creep**,因为 MarkdownEditor 是 ui-next 内部模块)。

> **MarkdownEditor 协议约束**:本 Plan 假设 SP0 / SP1 时代 MarkdownEditor 至少 `value` / `onChange` / `onSave` 三协议;若缺少 `ariaLabel` 或 `ctrlEnter`,补这两个 prop,**不**重构 MarkdownEditor 的保存逻辑。

- [ ] **Step 6: Commit**

```bash
git add packages/ui-next/src/components/discussion/DiscussionForm.tsx \
        packages/ui-next/src/components/discussion/DiscussionForm.module.css \
        packages/ui-next/src/components/discussion/DiscussionForm.test.tsx
git commit -m "feat(ui-next): add DiscussionForm primitive (shared by create + edit)"
```

- [ ] **Step 7: 新增 components/discussion/index.ts re-export**

```ts
export { DiscussionList } from './DiscussionList';
export { DiscussionListItem } from './DiscussionListItem';
export { DiscussionNodesWidget } from './DiscussionNodesWidget';
export { DiscussionSidebar } from './DiscussionSidebar';
export { DiscussionForm } from './DiscussionForm';
```

Commit:
```bash
git add packages/ui-next/src/components/discussion/index.ts
git commit -m "refactor(ui-next): export discussion primitives from index"
```

---

## Task 5: discussion_main / discussion_node 页面

**Files:**
- Create: `packages/ui-next/src/pages/discussion_main.tsx`
- Create: `packages/ui-next/src/pages/discussion_main.module.css`
- Create: `packages/ui-next/src/pages/discussion_main.test.tsx`
- Modify: `packages/ui-next/src/pages/manifest.ts:11-50` — 增加 `discussion_main` + `discussion_node` + `discussion_create` + `discussion_edit` 4 项
- Modify: `packages/ui-next/src/pages/index.ts` — 增加 5 行 `registerPage`
- Modify: `packages/ui-next/src/pages/manifest.test.ts` — 增加 3 条 assert

**Data shape (from `discussion.ts:69-126`):**
```ts
interface Args {
  ddocs: DiscussionDdoc[];
  dpcount: number;
  udict: Record<number, { _id, uname, avatar? }>;
  page: number;
  vndict: Record<string, Record<string, VnodeLite>>;
  vnode: VnodeLite;          // discussion_main 给空对象,node 给完整对象
  page_name: 'discussion_main' | 'discussion_node';
  vnodes: Array<{ docId, title, content }>;
}
```

**Scope decision (与 ui-default 同):** main 入口走 discussion_main 路径 — PageHeader 简洁版(标题 + 创建按钮 + breadcrumb);node 入口用 `vnode.title` 替代标题。

- [ ] **Step 1: Write failing test**

```tsx
/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../components/primitives/Toast';
import { type PageData, PageDataProvider } from '../context/page-data';
import { RouterProvider } from '../context/router';
import { routeMapStore } from '../globals';
import { ThemeProvider } from '../theme/ThemeProvider';
import DiscussionMain from './discussion_main';

function build(name: 'discussion_main' | 'discussion_node', args: any): PageData {
  return {
    name,
    template: 'discussion_main_or_node.html',
    args: {
      UserContext: { _id: 1, hasPerm: () => true, hasPriv: () => true },
      UiContext: {},
      ...args,
    } as any,
    url: '/discuss',
  };
}
function Providers({ name, args, children }: any) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <PageDataProvider initial={build(name, args)}>
          <RouterProvider>{children}</RouterProvider>
        </PageDataProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

describe('discussionMain', () => {
  beforeEach(() => {
    routeMapStore.set({
      discussion_main: '/discuss',
      discussion_node: '/discuss/:type/:name',
      discussion_detail: '/d/:did',
      discussion_create: '/discuss/:type/:name/create',
    });
  });
  afterEach(() => vi.restoreAllMocks());

  it('renders empty state when ddocs is empty (main)', () => {
    render(<Providers name="discussion_main" args={{
      page_name: 'discussion_main',
      ddocs: [], dpcount: 1, page: 1, udict: {}, vndict: {}, vnode: {}, vnodes: [],
    }}>
      <DiscussionMain />
    </Providers>);
    expect(screen.getByText(/暂无讨论/)).toBeInTheDocument();
  });

  it('renders list items and node sidebar when vnode present (node)', () => {
    render(<Providers name="discussion_node" args={{
      page_name: 'discussion_node',
      ddocs: [
        { _id: '1', docId: '1', title: 'topic', nReply: 1, views: 5, owner: 1, parentType: 4, parentId: 'n1', updateAt: 0 },
      ],
      dpcount: 1, page: 1, udict: { 1: { _id: 1, uname: 'a' } },
      vndict: { '4': { n1: { title: 'Help', type: 4 } } },
      vnode: { _id: 'n1', title: 'Help', type: 4 },
      vnodes: [{ docId: 'n1', title: 'Help', content: 'Help' }],
    }}>
      <DiscussionMain />
    </Providers>);
    expect(screen.getByText('topic')).toBeInTheDocument();
    expect(screen.getByText('Help')).toBeInTheDocument();
  });

  it('renders discussion_nodes widget for main', () => {
    render(<Providers name="discussion_main" args={{
      page_name: 'discussion_main',
      ddocs: [], dpcount: 1, page: 1, udict: {}, vndict: {}, vnode: {}, vnodes: [
        { docId: 'n1', title: 'Help', content: 'Help' },
        { docId: 'n2', title: 'General', content: 'General' },
      ],
    }}>
      <DiscussionMain />
    </Providers>);
    expect(screen.getByText('Help')).toBeInTheDocument();
    expect(screen.getByText('General')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn workspace @hydrooj/ui-next test src/pages/discussion_main.test.tsx`
Expected: FAIL — `./discussion_main` 模块不存在。

- [ ] **Step 3: Implement discussion_main.tsx**(同文件双注册为 `discussion_node`)

```tsx
import { usePageData, useUserContext } from '../context/page-data';
import { useBuildUrl } from '../hooks/use-build-url';
import {
  DiscussionList, DiscussionSidebar, DiscussionNodesWidget,
} from '../components/discussion';
import { ProblemSidebar } from '../components/sidebar/ProblemSidebar';
import { ContestDetailSidebar } from '../components/contest/ContestDetailSidebar';
import { useTranslate } from '../lib/i18n';
import styles from './discussion_main.module.css';

interface Ddoc { _id: string, docId: string, title: string, nReply: number, views: number, owner: number, parentType: number, parentId: string, updateAt: number | string, highlight?: boolean, hidden?: boolean }
interface VnodeLite { _id?: string, id?: string, title?: string, type?: number, docId?: string, owner?: number }
interface Vnode { docId: string, title: string, content?: string, type?: number }
interface Args {
  ddocs: Ddoc[];
  dpcount: number;
  udict: Record<number, { _id: number, uname: string, avatar?: string }>;
  page: number;
  vndict: Record<string, Record<string, VnodeLite>>;
  vnode: VnodeLite;
  page_name: 'discussion_main' | 'discussion_node';
  vnodes: Vnode[];
}

const TYPE_PROBLEM = 1;
const TYPE_CONTEST = 2;

export default function DiscussionMain() {
  const { args } = usePageData() as unknown as { args: Args };
  const { ddocs, dpcount, udict, page, vndict, vnode, page_name, vnodes } = args;
  const user = useUserContext();
  const buildUrl = useBuildUrl();
  const t = useTranslate();

  const isMain = page_name === 'discussion_main' || !vnode._id;
  const title = isMain ? t('Discussion') : (vnode.title || t('Discussion'));
  const buildPageHref = (p: number) =>
    isMain
      ? buildUrl('discussion_main', {}, { page: String(p) })
      : buildUrl('discussion_node', { type: 'node', name: String(vnode._id || vnode.id) }, { page: String(p) });

  // Right column: pick sidebar by vnode.type
  let sidebar: React.ReactNode;
  if (vnode?.type === TYPE_PROBLEM) {
    sidebar = (
      <ProblemSidebar
        context={{
          pdoc: { docId: Number(vnode._id), pid: String(vnode._id), title: vnode.title || '', owner: vnode.owner || 0 },
          UserContext: user as any,
          buildUrl,
          discussionCount: dpcount,
          solutionCount: 0,
          tdoc: undefined,
        }}
        mode="compact"
      />
    );
  } else if (vnode?.type === TYPE_CONTEST) {
    sidebar = (
      <ContestDetailSidebar
        tdoc={{ docId: String(vnode._id), title: vnode.title || '', owner: vnode.owner || 0 } as any}
        UserContext={user as any}
        buildUrl={buildUrl as any}
      />
    );
  } else {
    sidebar = (
      <DiscussionSidebar
        vnode={vnode as any}
        udict={udict}
        user={user as any}
        buildHref={(name, params) => buildUrl(name, params as any)}
      />
    );
  }

  return (
    <div className={styles.layout}>
      <main className={styles.main}>
        <header className={styles.head}>
          <h1>{title}</h1>
        </header>
        <DiscussionList
          ddocs={ddocs as any}
          vndict={vndict as any}
          udict={udict}
          page={page}
          dpcount={dpcount}
          buildHref={(name, params) => buildUrl(name, params as any)}
          buildPageHref={buildPageHref}
        />
      </main>
      <aside className={styles.side}>
        {sidebar}
        <DiscussionNodesWidget
          vnodes={vnodes}
          buildHref={(name, params) => buildUrl(name, params as any)}
        />
      </aside>
    </div>
  );
}
```

- [ ] **Step 4: Add discussion_main.module.css**

```css
.layout { display: grid; grid-template-columns: 1fr 280px; gap: var(--space-4, 16px); padding: var(--space-4, 16px); }
.main { display: flex; flex-direction: column; gap: var(--space-3, 12px); }
.head { padding: var(--space-2, 8px); border-bottom: 1px solid var(--border, rgba(0,0,0,0.08)); }
.head h1 { font-family: var(--font-display, system-ui); font-size: var(--text-xl, 1.25rem); margin: 0; }
.side { align-self: start; display: flex; flex-direction: column; gap: var(--space-3, 12px); }
@media (max-width: 768px) { .layout { grid-template-columns: 1fr; } .side { display: none; } }
```

- [ ] **Step 5: Wire manifest + index**

Edit `packages/ui-next/src/pages/manifest.ts`,在 `discussion_detail` 后追加:

```ts
  discussion_main: ['discussion_main_or_node.html'], // shared with discussion_node
  discussion_node: ['discussion_main_or_node.html'],
  discussion_create: ['discussion_create.html'],
  discussion_edit: ['discussion_edit.html'],
```

Edit `packages/ui-next/src/pages/index.ts`,追加 5 行(`discussion_main` 与 `discussion_node` 同一文件):

```ts
registerPage('discussion_main', () => import('./discussion_main'));
registerPage('discussion_node', () => import('./discussion_main'));
registerPage('discussion_create', () => import('./discussion_create'));
registerPage('discussion_edit', () => import('./discussion_edit'));
```

Edit `packages/ui-next/src/pages/manifest.test.ts`,在第二个 `it(...)` 内追加 3 条 assert:

```ts
    expect(NEXT_TEMPLATES).toContain('discussion_main_or_node.html');
    expect(NEXT_TEMPLATES).toContain('discussion_create.html');
    expect(NEXT_TEMPLATES).toContain('discussion_edit.html');
```

- [ ] **Step 6: Run test to verify it passes**(此时仅 `discussion_main` / `discussion_node` 测试可用,create/edit 测试在 Task 6 / 7 后才加)

Run: `yarn workspace @hydrooj/ui-next test src/pages/discussion_main.test.tsx src/pages/manifest.test.ts`
Expected: 3 + 4 = 7 passed。

- [ ] **Step 7: Commit**

```bash
git add packages/ui-next/src/pages/discussion_main.tsx \
        packages/ui-next/src/pages/discussion_main.module.css \
        packages/ui-next/src/pages/discussion_main.test.tsx \
        packages/ui-next/src/pages/manifest.ts \
        packages/ui-next/src/pages/index.ts \
        packages/ui-next/src/pages/manifest.test.ts
git commit -m "feat(ui-next): migrate discussion_main + discussion_node pages"
```

---

## Task 6: discussion_create 页面

**Files:**
- Create: `packages/ui-next/src/pages/discussion_create.tsx`
- Create: `packages/ui-next/src/pages/discussion_create.module.css`
- Create: `packages/ui-next/src/pages/discussion_create.test.tsx`

**Data shape (from `discussion.ts:130-160`):**
```ts
interface Args {
  path: Array<[string, string, Record<string, unknown>?, boolean?]>;  // breadcrumb
  vnode: VnodeLite;       // 父节点 — 决定 POST 的 type/name
}
```

POST URL = `discussion_node` 的同路径,operation = (空 — `post()` 顶层签名只有 type/title/content/highlight/pin)。

- [ ] **Step 1: Write failing test**

```tsx
/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../components/primitives/Toast';
import { type PageData, PageDataProvider } from '../context/page-data';
import { RouterProvider } from '../context/router';
import { routeMapStore } from '../globals';
import { ThemeProvider } from '../theme/ThemeProvider';
import DiscussionCreate from './discussion_create';

function build(args: any): PageData {
  return {
    name: 'discussion_create',
    template: 'discussion_create.html',
    args: {
      UserContext: { _id: 1, hasPerm: () => true, hasPriv: () => true },
      ...args,
    } as any,
    url: '/discuss/node/n1/create',
  };
}
function Providers({ args, children }: any) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <PageDataProvider initial={build(args)}>
          <RouterProvider>{children}</RouterProvider>
        </PageDataProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

describe('discussionCreate', () => {
  beforeEach(() => {
    routeMapStore.set({
      discussion_node: '/discuss/:type/:name',
      discussion_main: '/discuss',
    });
  });
  afterEach(() => vi.restoreAllMocks());

  it('renders the vnode title and discussion form', () => {
    render(<Providers args={{
      path: [['Hydro', 'homepage'], ['discussion_main', 'discussion_main']],
      vnode: { _id: 'n1', title: 'Help', type: 4 },
    }}>
      <DiscussionCreate />
    </Providers>);
    expect(screen.getByRole('heading', { name: /Help/ })).toBeInTheDocument();
    expect(screen.getByDisplayValue('')).toBeInTheDocument(); // title input
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn workspace @hydrooj/ui-next test src/pages/discussion_create.test.tsx`
Expected: FAIL。

- [ ] **Step 3: Implement discussion_create.tsx**

```tsx
import { usePageData } from '../context/page-data';
import { useBuildUrl } from '../hooks/use-build-url';
import { DiscussionForm } from '../components/discussion/DiscussionForm';
import { MarkdownHint } from '../components/primitives/MarkdownHint';
import { useTranslate } from '../lib/i18n';
import styles from './discussion_create.module.css';

interface VnodeLite { _id?: string, id?: string, title?: string, type?: number }
interface Args {
  path: Array<[string, string, Record<string, unknown>?, boolean?]>;
  vnode: VnodeLite;
}

export default function DiscussionCreate() {
  const { args } = usePageData() as unknown as { args: Args };
  const { vnode } = args;
  const buildUrl = useBuildUrl();
  const t = useTranslate();

  const nodeId = String(vnode._id || vnode.id || '');

  const submit = async ({ title, content, highlight, pin }: { title: string, content: string, highlight: boolean, pin: boolean }) => {
    const form = document.createElement('form');
    form.method = 'post';
    form.action = buildUrl('discussion_node', { type: 'node', name: nodeId });
    const append = (name: string, value: string | boolean) => {
      const i = document.createElement('input');
      i.type = 'hidden';
      i.name = name;
      i.value = String(value);
      form.appendChild(i);
    };
    append('title', title);
    append('content', content);
    if (highlight) append('highlight', 'on');
    if (pin) append('pin', 'on');
    document.body.appendChild(form);
    form.submit();
  };

  return (
    <div className={styles.layout}>
      <main className={styles.main}>
        <header className={styles.head}>
          <h1>{t('Create Discussion in {0}').format(vnode.title || '')}</h1>
        </header>
        <DiscussionForm
          showHighlightPin={true}
          onSubmit={submit}
          submitText="发布 (Ctrl+Enter)"
        />
      </main>
      <aside className={styles.side}>
        <MarkdownHint />
      </aside>
    </div>
  );
}
```

- [ ] **Step 4: Add discussion_create.module.css**

```css
.layout { display: grid; grid-template-columns: 1fr 280px; gap: var(--space-4, 16px); padding: var(--space-4, 16px); }
.main { display: flex; flex-direction: column; gap: var(--space-3, 12px); }
.head { padding: var(--space-2, 8px); border-bottom: 1px solid var(--border, rgba(0,0,0,0.08)); }
.head h1 { font-family: var(--font-display, system-ui); font-size: var(--text-xl, 1.25rem); margin: 0; }
.side { align-self: start; }
@media (max-width: 768px) { .layout { grid-template-columns: 1fr; } .side { display: none; } }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `yarn workspace @hydrooj/ui-next test src/pages/discussion_create.test.tsx`
Expected: 1 passed。

> **MarkdownHint:** 该原语在 SP1 时代 ui-next 应已存在(`/components/primitives/MarkdownHint.tsx`)用于题解 / 讨论创建页。若不存在,**就用 `Card` + 简单文本替换**——这是 SP2 的非核心视觉占位。

- [ ] **Step 6: Commit**

```bash
git add packages/ui-next/src/pages/discussion_create.tsx \
        packages/ui-next/src/pages/discussion_create.module.css \
        packages/ui-next/src/pages/discussion_create.test.tsx
git commit -m "feat(ui-next): migrate discussion_create page"
```

---

## Task 7: discussion_edit 页面

**Files:**
- Create: `packages/ui-next/src/pages/discussion_edit.tsx`
- Create: `packages/ui-next/src/pages/discussion_edit.module.css`
- Create: `packages/ui-next/src/pages/discussion_edit.test.tsx`

**Data shape (from `discussion.ts:371-424`):**
```ts
interface Args {
  ddoc: {
    _id: string;
    docId: number;
    title: string;
    content: string;
    highlight?: boolean;
    pin?: boolean;
  };
  UserContext?: any;     // 决定能否看到 delete 按钮
}
```

POST 操作有两个 button:`operation=update` 与 `operation=delete`,可通过两个独立 `<form>` 包裹不同 name 实现。

- [ ] **Step 1: Write failing test**

```tsx
/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../components/primitives/Toast';
import { type PageData, PageDataProvider } from '../context/page-data';
import { RouterProvider } from '../context/router';
import { routeMapStore } from '../globals';
import { ThemeProvider } from '../theme/ThemeProvider';
import DiscussionEdit from './discussion_edit';

function build(args: any, user: any): PageData {
  return {
    name: 'discussion_edit',
    template: 'discussion_edit.html',
    args: { UserContext: user, ...args } as any,
    url: '/d/1/edit',
  };
}
function Providers({ args, user, children }: any) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <PageDataProvider initial={build(args, user)}>
          <RouterProvider>{children}</RouterProvider>
        </PageDataProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

describe('discussionEdit', () => {
  beforeEach(() => {
    routeMapStore.set({
      discussion_detail: '/d/:did',
    });
  });
  afterEach(() => vi.restoreAllMocks());

  it('renders the title and content prefilled', () => {
    render(<Providers args={{ ddoc: { _id: 'd1', docId: 1, title: 'edit me', content: 'init body', highlight: true, pin: false } }} user={{ _id: 1, hasPerm: () => true, own: () => true }}>
      <DiscussionEdit />
    </Providers>);
    expect(screen.getByDisplayValue('edit me')).toBeInTheDocument();
  });

  it('hides Delete button when user lacks permission', () => {
    render(<Providers args={{ ddoc: { _id: 'd1', docId: 1, title: 'x', content: 'y' } }} user={{ _id: 2, hasPerm: (p: number) => p !== 16, own: () => false }}>
      <DiscussionEdit />
    </Providers>);
    expect(screen.queryByRole('button', { name: /删除/ })).toBeNull();
  });

  it('shows Delete button when user is owner', () => {
    render(<Providers args={{ ddoc: { _id: 'd1', docId: 1, title: 'x', content: 'y' } }} user={{ _id: 1, hasPerm: () => false, own: (doc: any) => doc._id === 'd1' }}>
      <DiscussionEdit />
    </Providers>);
    expect(screen.getByRole('button', { name: /删除/ })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn workspace @hydrooj/ui-next test src/pages/discussion_edit.test.tsx`
Expected: FAIL。

- [ ] **Step 3: Implement discussion_edit.tsx**

```tsx
import { useState } from 'react';
import { usePageData, useUserContext } from '../context/page-data';
import { useBuildUrl } from '../hooks/use-build-url';
import { DiscussionForm } from '../components/discussion/DiscussionForm';
import { Button } from '../components/primitives/Button';
import { MarkdownHint } from '../components/primitives/MarkdownHint';
import styles from './discussion_edit.module.css';

interface Ddoc { _id: string, docId: number, title: string, content: string, highlight?: boolean, pin?: boolean }
interface Args {
  ddoc: Ddoc;
  UserContext?: any;
}

const PERM_DELETE_DISCUSSION = 1 << 4;   // 占位,实际值见 hydrooj/common

export default function DiscussionEdit() {
  const { args } = usePageData() as unknown as { args: Args };
  const { ddoc } = args;
  const user = useUserContext();
  const buildUrl = useBuildUrl();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const canDelete = !!user?.hasPerm?.(PERM_DELETE_DISCUSSION) || !!user?.own?.(ddoc);

  const submitUpdate = async ({ title, content, highlight, pin }: { title: string, content: string, highlight: boolean, pin: boolean }) => {
    const form = document.createElement('form');
    form.method = 'post';
    form.action = buildUrl('discussion_edit', { did: String(ddoc.docId) });
    const append = (name: string, value: string) => {
      const i = document.createElement('input');
      i.type = 'hidden';
      i.name = name;
      i.value = value;
      form.appendChild(i);
    };
    append('operation', 'update');
    append('title', title);
    append('content', content);
    if (highlight) append('highlight', 'on');
    if (pin) append('pin', 'on');
    document.body.appendChild(form);
    form.submit();
  };

  const submitDelete = () => {
    const form = document.createElement('form');
    form.method = 'post';
    form.action = buildUrl('discussion_edit', { did: String(ddoc.docId) });
    const op = document.createElement('input');
    op.type = 'hidden';
    op.name = 'operation';
    op.value = 'delete';
    form.appendChild(op);
    document.body.appendChild(form);
    form.submit();
  };

  return (
    <div className={styles.layout}>
      <main className={styles.main}>
        <DiscussionForm
          initial={{
            title: ddoc.title,
            content: ddoc.content,
            highlight: ddoc.highlight ?? false,
            pin: ddoc.pin ?? false,
          }}
          showHighlightPin={true}
          onSubmit={submitUpdate}
          submitText="更新 (Ctrl+Enter)"
        />
        {canDelete && (
          <div className={styles.deleteRow}>
            {!showDeleteConfirm ? (
              <Button type="button" variant="ghost" onClick={() => setShowDeleteConfirm(true)}>删除</Button>
            ) : (
              <div className={styles.confirmRow}>
                <span>确认删除?</span>
                <Button type="button" variant="danger" onClick={submitDelete}>确认删除</Button>
                <Button type="button" variant="ghost" onClick={() => setShowDeleteConfirm(false)}>取消</Button>
              </div>
            )}
          </div>
        )}
      </main>
      <aside className={styles.side}>
        <MarkdownHint />
      </aside>
    </div>
  );
}
```

- [ ] **Step 4: Add discussion_edit.module.css**

```css
.layout { display: grid; grid-template-columns: 1fr 280px; gap: var(--space-4, 16px); padding: var(--space-4, 16px); }
.main { display: flex; flex-direction: column; gap: var(--space-3, 12px); }
.side { align-self: start; }
.deleteRow { padding: var(--space-3, 12px); border-top: 1px dashed var(--border, rgba(0,0,0,0.18)); }
.confirmRow { display: flex; gap: var(--space-2, 8px); align-items: center; }
@media (max-width: 768px) { .layout { grid-template-columns: 1fr; } .side { display: none; } }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `yarn workspace @hydrooj/ui-next test src/pages/discussion_edit.test.tsx`
Expected: 3 passed。

- [ ] **Step 6: Commit**

```bash
git add packages/ui-next/src/pages/discussion_edit.tsx \
        packages/ui-next/src/pages/discussion_edit.module.css \
        packages/ui-next/src/pages/discussion_edit.test.tsx
git commit -m "feat(ui-next): migrate discussion_edit page"
```

---

## Task 8: SP2 整分支 e2e + 完成报告

**Files:**
- Modify: `test/main.ts` — 添加 4 条 e2e 烟雾断言
- Create: `.claude/report/2026-07-29-sp2-discussion-domain-completion.md` — 完成报告

- [ ] **Step 1: 4 条 e2e 加到 test/main.ts**

在 SP0 / SP1 已加的 7 条 e2e 之后追加:

```ts
it('GET /discuss returns ui-next shell (main)', async () => {
  const res = await agent.get('/discuss').set('accept', 'text/html');
  expect(res.status).toBe(200);
  expect(res.text).toContain('<div id="root"');
});
it('GET /discuss/node/<name> returns ui-next shell (node)', async () => {
  const res = await agent.get('/discuss/node/x').set('accept', 'text/html');
  expect(res.status).toBe(200);
  expect(res.text).toContain('<div id="root"');
});
it('GET /discuss/<did>/edit returns ui-next shell (edit)', async () => {
  const res = await agent.get('/d/1/edit').set('accept', 'text/html');
  expect(res.status).toBe(200);
  expect(res.text).toContain('<div id="root"');
});
it('GET /discuss/<type>/<name>/create returns ui-next shell (create)', async () => {
  const res = await agent.get('/discuss/node/x/create').set('accept', 'text/html');
  expect(res.status).toBe(200);
  expect(res.text).toContain('<div id="root"');
});
```

- [ ] **Step 2: 跑 e2e 套件**

Run: `yarn test`
Expected: 新增 4 条 e2e 都过;预存的 8 条失败仍然存在(loader.ts:133 阻塞,非 SP2 引入,详见 SP0 报告 F6)。

- [ ] **Step 3: 跑 ui-next 单元套件**

Run: `yarn workspace @hydrooj/ui-next test`
Expected: 全部 SP2 新增测试通过(DiscussionList 4 + DiscussionNodesWidget 3 + DiscussionSidebar 3 + DiscussionForm 4 + discussion_main 3 + discussion_create 1 + discussion_edit 3 = 21 条新增);失败数量与 SP1 baseline 持平(57+ 仍失败,源于预存冲突文件,不属 SP2)。

- [ ] **Step 4: 跑 lint**

Run: `yarn lint:ci 2>&1 | tail -40`
Expected: 0 新增 error/warning(若 SP1 baseline 之外出现新增,当场修复或 pin 为 TODO 注释)。

- [ ] **Step 5: 写 SP2 完成报告**

文件: `.claude/report/2026-07-29-sp2-discussion-domain-completion.md`

报告结构沿用 SP0 / SP1:1. 问题来源,2. 修复方案,3. commit 列表,4. 缺陷关闭矩阵,5. 测试结果,6. 文件清单,7. SP3+ 路线,8. 回退路径,9. 关键设计决策。重点写出:
- 「discussion_main / discussion_node 共用一个组件 + manifest 同模板双 key 注册」(类比 contest_create/edit 的 0 增量新模式)
- 「DiscussionList / DiscussionNodesWidget / DiscussionSidebar / DiscussionForm 四个组件被主页 + side 完整 reuse」
- 「DiscussionForm 复用 MarkdownEditor + ctrl+enter,与 SP1 题解/讨论回复一致」
- 「create/edit 两个页面无 `<form>` 包裹,改用 SP1 同款 `document.createElement('form')`」

- [ ] **Step 6: 整分支 review**

派 opus 审 SP2 整分支,期望: APPROVE WITH COMMENTS。把 F1/F2/F3 处置结果写入完成报告。

- [ ] **Step 7: Commit**

```bash
git add test/main.ts .claude/report/2026-07-29-sp2-discussion-domain-completion.md
git commit -m "test: add e2e regression for SP2 discussion domain + completion report"
```

---

## Known Limitations (SP2 范围声明)

| 限制 | 描述 | 处置 |
|---|---|---|
| **DiscussionListItem 不渲染 emoji** | ui-default 的 `data-emoji-enabled` 渲染管线 + reaction 表情解析留 SP2+,先确保链接正确 | SP2+ 路线 1 |
| **DiscussionNodesWidget 无折叠/选中态高亮** | ui-default 的折叠交互 + 当前节点选中高亮,SP2 只渲染纯链接 | SP2+ 路线 1 |
| **DiscussionSidebar 不渲染 vnode.pic 装饰图** | 节点封面图留作纯 CSS,SP2 只渲染标题 + 创建按钮 | SP2+ 路线 1 |
| **DiscussionSidebar 缺登录 modal** | ui-default `showSignInDialog()`,SP2 直接跳到登录页 | SP2+ 路线 2 |
| **discussion_create 不显示权限/限速反馈** | ui-default 的限速 + 高亮/置顶权限提示弹框未实现,SP2 只在服务端 PERM check 兜底 | SP2+ 路线 2 |
| **discussion_edit 不显示历史/版本链** | ui-default `discussion_raw` 给 history 链接,SP2 跳过(留作单独任务) | SP2+ 路线 3 |
| **discussion_node 高亮/置顶节点不在侧栏显示** | ui-default 给所有 node 一种图标 (icon-tag / icon-award),SP2 简化 | SP2+ 路线 1 |
| **DiscussionForm `<form>` 不直接包裹** | 用 SP1 同款 `document.createElement('form')` 协议 — 在 edit 页面 update+delete 两个 verb 时尤为关键 | 协议注释保留 |
| **vnode.type = TYPE_CONTEST 时复用 ContestDetailSidebar** | 假设其 props 与 SP1 一致;若改动过,需本 Plan 同步调整 — 实施时校验 | 实施阶段 verify |

任何一条限制**不是**阻塞 SP2 完成的依赖 — 3 个页面的"创建 / 列出 / 编辑"全闭环在本 Plan 范围内可全部跑通。

---

## Self-Review

执行时**强制**按 §Self-Review 走:
1. **Spec coverage:** SP0 报告的 SP2 范围 = 3 项(discussion_create / discussion_edit / discussion_main_or_node)— Task 5 / 6 / 7 各覆盖 1 项(discussion_main 与 discussion_node 同组件)。
2. **Placeholder scan:** 实施步骤 (Step 1-7) 内无 TBD / fill-in / "implement later";TODO 仅在 **Known Limitations 表** 出现,均为带语境的 scope 注释(scope declaration)。`MarkdownEditor` / `MarkdownHint` 的 props 兼容说明在 Step 中显式标注("若未支持,在该 Task 内补 props"),属合理实施指令而非 TBD。
3. **Type consistency:** `Args` interface 在 3 页面中各自独立(scope 内一致),组件 Props(`DiscussionList` / `DiscussionListItem` / `DiscussionNodesWidget` / `DiscussionSidebar` / `DiscussionForm`)在 Task 1-4 一次性定义,Task 5-7 复用其签名,无类型漂移。
4. **Manifest drift:** 4 页面在 manifest + index + test 中同步登记;`discussion_main` / `discussion_node` 共用模板,manifest 双 key,`NEXT_TEMPLATES` 自动去重;`manifest.test.ts` 第 2 个 `it(...)` 内追加 3 条 assert,集中执行避免漂移。
5. **Coverage:** 5 组件测试 + 3 页面测试 + manifest drift test(从 4 增至 7 assert)+ 4 个 e2e + lint pass = 整个 SP2 验证矩阵完整。

---

报告完成。
