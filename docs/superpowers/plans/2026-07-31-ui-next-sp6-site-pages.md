# Hydro ui-next SP6 Site Pages Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 6 个站点页面(ranking / status / about / wiki_help / home_domain / home_files)从 ui-default 迁移到 ui-next。

**Architecture:** 6 个独立 Track(每页一个),按复杂度递进——简单页(about/home_files)→ 中等页(home_domain/status/ranking)→ 复杂页(wiki_help)。每 Track 自包含:新 `.tsx` + 新 `.test.tsx` + `manifest.ts` +1 行 + `index.ts` +1 行。不引入新 primitives;复用 SP0–SP4 已建的。

**Tech Stack:** TypeScript、React 19、CSS Modules、Vitest 4、happy-dom、`@hydrooj/common`。

---

## Global Constraints

- 不动 SP0 引入的 manifest / renderer / 站点级回退;`ui.next = false` 保持不变
- 仅修改 `packages/ui-next/src/pages/` 下的文件 + `manifest.ts` + `index.ts` + 必要时 `lib/` 已有 primitives
- 每页 commit 独立,可单独 revert
- 后端 handler 实读字段为真源:`/home/xq/Hydro/packages/hydrooj/src/handler/{misc,home,status}.ts`
- 不引入新 primitives;复用已有(`Card`、`Button`、`Markdown`、 `MarkdownEditor` 等)
- 任务中所有 `git commit` 步骤是流程检查点,**仅在用户明确要求时才执行**
- 共享运行命令:
  ```bash
  # 单元测试
  yarn workspace @hydrooj/ui-next test <path>
  # 全量测试
  yarn workspace @hydrooj/ui-next test
  # lint
  yarn lint:ci
  # manifest drift
  yarn workspace @hydrooj/ui-next test src/pages/manifest.test.ts
  ```

---

## File Map

### Task 1: about
- Create: `packages/ui-next/src/pages/about.tsx`
- Create: `packages/ui-next/src/pages/about.test.tsx`
- Modify: `packages/ui-next/src/pages/manifest.ts` (+1 line)
- Modify: `packages/ui-next/src/pages/index.ts` (+1 line)

### Task 2: home_files
- Create: `packages/ui-next/src/pages/home_files.tsx`
- Create: `packages/ui-next/src/pages/home_files.test.tsx`
- Modify: `packages/ui-next/src/pages/manifest.ts` (+1 line)
- Modify: `packages/ui-next/src/pages/index.ts` (+1 line)

### Task 3: home_domain
- Create: `packages/ui-next/src/pages/home_domain.tsx`
- Create: `packages/ui-next/src/pages/home_domain.test.tsx`
- Modify: `packages/ui-next/src/pages/manifest.ts` (+1 line)
- Modify: `packages/ui-next/src/pages/index.ts` (+1 line)

### Task 4: status
- Create: `packages/ui-next/src/pages/status.tsx`
- Create: `packages/ui-next/src/pages/status.test.tsx`
- Modify: `packages/ui-next/src/pages/manifest.ts` (+1 line)
- Modify: `packages/ui-next/src/pages/index.ts` (+1 line)

### Task 5: ranking
- Create: `packages/ui-next/src/pages/ranking.tsx`
- Create: `packages/ui-next/src/pages/ranking.test.tsx`
- Modify: `packages/ui-next/src/pages/manifest.ts` (+1 line)
- Modify: `packages/ui-next/src/pages/index.ts` (+1 line)

### Task 6: wiki_help
- Create: `packages/ui-next/src/pages/wiki_help.tsx`
- Create: `packages/ui-next/src/pages/wiki_help.test.tsx`
- Modify: `packages/ui-next/src/pages/manifest.ts` (+1 line)
- Modify: `packages/ui-next/src/pages/index.ts` (+1 line)

---

## Task 1: about 页面

**Files:**
- Create: `packages/ui-next/src/pages/about.tsx`
- Create: `packages/ui-next/src/pages/about.test.tsx`
- Modify: `packages/ui-next/src/pages/manifest.ts`(加 1 行:`about: ['about.html'],`)
- Modify: `packages/ui-next/src/pages/index.ts`(加 1 行:`registerPage('about', () => import('./about'));`)

**目标:** 移植 ui-default `about.html`(13 行 wiki content 渲染)到 React。

### Step 1:写失败测试

文件 `packages/ui-next/src/pages/about.test.tsx`(新建):

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AboutPage from './about';

describe('about', () => {
  it('renders wiki sections with anchor ids', () => {
    render(<AboutPage args={{
      sections: [
        { id: 'intro', title: '介绍', content: '本站是...' },
        { id: 'usage', title: '使用', content: '注册...' },
      ],
    }} />);
    expect(screen.getByText('介绍')).toBeInTheDocument();
    expect(screen.getByText('使用')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: '介绍' })).toHaveAttribute('id', 'intro');
  });

  it('renders empty state when no sections', () => {
    render(<AboutPage args={{ sections: [] }} />);
    expect(screen.queryByRole('heading')).toBeNull();
  });
});
```

- [ ] 创建测试

### Step 2:跑测试,验证失败

```bash
yarn workspace @hydrooj/ui-next test src/pages/about.test.tsx 2>&1 | tail -10
```

期望:FAIL("Cannot find module")。

### Step 3:实现最小组件

文件 `packages/ui-next/src/pages/about.tsx`:

```tsx
import { usePageData } from '../context/page-data';
import { Markdown } from '../components/markdown/Markdown';

interface Section { id: string; title: string; content: string }
interface Args { sections: Section[] }

export default function AboutPage() {
  const { args } = usePageData() as unknown as { args: Args };
  return (
    <div className="section">
      {args.sections.map((s) => (
        <div className="section__body typo richmedia" key={s.id}>
          <h1 className="section__title" id={s.id} data-heading>{s.title}</h1>
          <Markdown content={s.content} />
        </div>
      ))}
    </div>
  );
}
```

如 `Markdown` 组件不存在于 `components/markdown/Markdown.tsx`,改用纯文本 fallback:

```tsx
<div dangerouslySetInnerHTML={{ __html: s.content }} />
```

- [ ] 创建实现

### Step 4:manifest + registerPage

`manifest.ts` 在 `error` 行附近加 `about: ['about.html'],`

`index.ts` 在已有 `registerPage` 行附近加:

```ts
registerPage('about', () => import('./about'));
```

- [ ] 修改 manifest + index

### Step 5:跑测试,验证通过

```bash
yarn workspace @hydrooj/ui-next test src/pages/about.test.tsx 2>&1 | tail -5
```

期望:PASS。

### Step 6:跑 manifest drift 测试

```bash
yarn workspace @hydrooj/ui-next test src/pages/manifest.test.ts 2>&1 | tail -5
```

期望:PASS(自动覆盖新增 about 条目)。

---

## Task 2: home_files 页面

**Files:**
- Create: `packages/ui-next/src/pages/home_files.tsx`
- Create: `packages/ui-next/src/pages/home_files.test.tsx`
- Modify: `manifest.ts` + `index.ts`(各 +1 行)

**目标:** 移植 `home_files.html`(15 行 files 列表 + 上传按钮占位)。

### Step 1:写失败测试

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HomeFilesPage from './home_files';

describe('home_files', () => {
  it('renders file list with names and sizes', () => {
    render(<HomeFilesPage args={{
      files: [
        { name: 'a.txt', size: 1024, mtime: 1700000000 },
        { name: 'b.png', size: 2048, mtime: 1700000001 },
      ],
    }} />);
    expect(screen.getByText('a.txt')).toBeInTheDocument();
    expect(screen.getByText('b.png')).toBeInTheDocument();
  });

  it('renders empty state', () => {
    render(<HomeFilesPage args={{ files: [] }} />);
    expect(screen.getByText(/no files|empty/i)).toBeInTheDocument();
  });

  it('shows upload button', () => {
    render(<HomeFilesPage args={{ files: [] }} />);
    expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument();
  });
});
```

- [ ] 创建测试

### Step 2:跑测试,验证失败

```bash
yarn workspace @hydrooj/ui-next test src/pages/home_files.test.tsx 2>&1 | tail -5
```

### Step 3:实现

```tsx
import { usePageData } from '../context/page-data';
import { Button } from '../components/primitives/Button';

interface FileEntry { name: string; size: number; mtime: number }
interface Args { files: FileEntry[] }

export default function HomeFilesPage() {
  const { args } = usePageData() as unknown as { args: Args };
  return (
    <div className="section">
      <div className="section__header">
        <h1 className="section__title">Files</h1>
        <Button variant="primary" disabled>Upload File</Button>
      </div>
      {args.files.length === 0 ? (
        <p className="empty">No files.</p>
      ) : (
        <table className="data-table">
          <thead><tr><th>Name</th><th>Size</th><th>Modified</th></tr></thead>
          <tbody>
            {args.files.map((f) => (
              <tr key={f.name}>
                <td>{f.name}</td>
                <td>{f.size}</td>
                <td>{new Date(f.mtime * 1000).toISOString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

- [ ] 创建实现

### Step 4:manifest + registerPage

```ts
home_files: ['home_files.html'],
```

```ts
registerPage('home_files', () => import('./home_files'));
```

- [ ] 修改

### Step 5:跑测试,验证通过

```bash
yarn workspace @hydrooj/ui-next test src/pages/home_files.test.tsx src/pages/manifest.test.ts 2>&1 | tail -5
```

期望:PASS。

---

## Task 3: home_domain 页面

**Files:**
- Create: `packages/ui-next/src/pages/home_domain.tsx`
- Create: `packages/ui-next/src/pages/home_domain.test.tsx`
- Modify: `manifest.ts` + `index.ts`

**目标:** 移植 `home_domain.html`(63 行 domain table + 权限门控)。

### Step 1:写失败测试

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HomeDomainPage from './home_domain';

describe('home_domain', () => {
  it('renders domain table with role column', () => {
    render(<HomeDomainPage args={{
      domains: [
        { _id: 'd1', name: 'My Domain', role: 'owner' },
        { _id: 'd2', name: 'Other', role: 'guest' },
      ],
      hasCreatePriv: true, hasJoinPriv: true,
    }} />);
    expect(screen.getByText('My Domain')).toBeInTheDocument();
    expect(screen.getByText('owner')).toBeInTheDocument();
  });

  it('hides create button without PRIV_CREATE_DOMAIN', () => {
    render(<HomeDomainPage args={{
      domains: [], hasCreatePriv: false, hasJoinPriv: false,
    }} />);
    expect(screen.queryByRole('button', { name: /create/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /join/i })).toBeNull();
  });

  it('renders empty state', () => {
    render(<HomeDomainPage args={{
      domains: [], hasCreatePriv: false, hasJoinPriv: false,
    }} />);
    expect(screen.getByText(/no domain|empty/i)).toBeInTheDocument();
  });
});
```

- [ ] 创建测试

### Step 2:跑测试,验证失败

### Step 3:实现

```tsx
import { Link } from '../components/Link';
import { usePageData } from '../context/page-data';
import { Button } from '../components/primitives/Button';

interface Domain { _id: string; name: string; role: string }
interface Args {
  domains: Domain[];
  hasCreatePriv: boolean;
  hasJoinPriv: boolean;
}

export default function HomeDomainPage() {
  const { args } = usePageData() as unknown as { args: Args };
  return (
    <div className="section">
      <div className="section__header">
        <h1 className="section__title">My Domains</h1>
        <div className="section__tools">
          {args.hasCreatePriv && (
            <Link to="home_domain_create"><Button variant="primary">Create Domain</Button></Link>
          )}
          {args.hasJoinPriv && (
            <Button variant="primary" disabled>Join Domain</Button>
          )}
        </div>
      </div>
      {args.domains.length === 0 ? (
        <p className="empty">No domains yet.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr><th>Name</th><th>ID</th><th>My Role</th><th>Action</th></tr>
          </thead>
          <tbody>
            {args.domains.map((d) => (
              <tr key={d._id}>
                <td>{d.name}</td>
                <td><code>{d._id}</code></td>
                <td>{d.role}</td>
                <td><Link to="home_domain" params={{ did: d._id }}>View</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

如 `Link` 组件不存在,改用 `<a href>` 占位。

- [ ] 创建实现

### Step 4:manifest + registerPage

- [ ] 修改

### Step 5:跑测试,验证通过

```bash
yarn workspace @hydrooj/ui-next test src/pages/home_domain.test.tsx src/pages/manifest.test.ts 2>&1 | tail -5
```

---

## Task 4: status 页面

**Files:**
- Create: `packages/ui-next/src/pages/status.tsx`
- Create: `packages/ui-next/src/pages/status.test.tsx`
- Modify: `manifest.ts` + `index.ts`

**目标:** 移植 `status.html`(74 行 journal log)。

### Step 1:写失败测试

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import StatusPage from './status';

describe('status', () => {
  it('renders journal entries in reverse chronological order', () => {
    render(<StatusPage args={{
      journals: [
        { time: 1700000000, level: 'info', message: 'Started' },
        { time: 1700000100, level: 'warn', message: 'Slow query' },
      ],
    }} />);
    expect(screen.getByText('Started')).toBeInTheDocument();
    expect(screen.getByText('Slow query')).toBeInTheDocument();
  });

  it('colors warn-level entries differently', () => {
    const { container } = render(<StatusPage args={{
      journals: [{ time: 1, level: 'error', message: 'Oops' }],
    }} />);
    expect(container.querySelector('[data-level="error"]')).toBeInTheDocument();
  });

  it('renders empty state', () => {
    render(<StatusPage args={{ journals: [] }} />);
    expect(screen.getByText(/no journal|empty/i)).toBeInTheDocument();
  });
});
```

- [ ] 创建测试

### Step 2:跑测试,验证失败

### Step 3:实现

```tsx
import { usePageData } from '../context/page-data';

interface Journal { time: number; level: 'info' | 'warn' | 'error' | string; message: string }
interface Args { journals: Journal[] }

export default function StatusPage() {
  const { args } = usePageData() as unknown as { args: Args };
  const sorted = [...args.journals].sort((a, b) => b.time - a.time);
  return (
    <div className="section">
      <div className="section__header">
        <h1 className="section__title">System Status</h1>
      </div>
      {sorted.length === 0 ? (
        <p className="empty">No journal entries.</p>
      ) : (
        <ul className="journal">
          {sorted.map((j, i) => (
            <li key={i} data-level={j.level} className={`journal__item journal__item--${j.level}`}>
              <time>{new Date(j.time * 1000).toISOString()}</time>
              <span className="journal__message">{j.message}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] 创建实现

### Step 4:manifest + registerPage

### Step 5:跑测试,验证通过

---

## Task 5: ranking 页面

**Files:**
- Create: `packages/ui-next/src/pages/ranking.tsx`
- Create: `packages/ui-next/src/pages/ranking.test.tsx`
- Modify: `manifest.ts` + `index.ts`

**目标:** 移植 `ranking.html`(80 行 user ranking)。

### Step 1:写失败测试

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import RankingPage from './ranking';

describe('ranking', () => {
  it('renders ranking list with ranks and scores', () => {
    render(<RankingPage args={{
      ranking: [
        { rank: 1, score: 1000, udoc: { _id: 1, uname: 'alice', avatar: '' } },
        { rank: 2, score: 900, udoc: { _id: 2, uname: 'bob', avatar: '' } },
      ],
    }} />);
    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.getByText('bob')).toBeInTheDocument();
    expect(screen.getByText('1000')).toBeInTheDocument();
  });

  it('highlights top-3 entries', () => {
    const { container } = render(<RankingPage args={{
      ranking: [
        { rank: 1, score: 100, udoc: { _id: 1, uname: 'a', avatar: '' } },
        { rank: 2, score: 90, udoc: { _id: 2, uname: 'b', avatar: '' } },
        { rank: 3, score: 80, udoc: { _id: 3, uname: 'c', avatar: '' } },
        { rank: 4, score: 70, udoc: { _id: 4, uname: 'd', avatar: '' } },
      ],
    }} />);
    const top3 = container.querySelectorAll('[data-top]');
    expect(top3.length).toBe(3);
  });

  it('renders empty state', () => {
    render(<RankingPage args={{ ranking: [] }} />);
    expect(screen.getByText(/no ranking|empty/i)).toBeInTheDocument();
  });
});
```

- [ ] 创建测试

### Step 2:跑测试,验证失败

### Step 3:实现

```tsx
import { usePageData } from '../context/page-data';

interface UserLite { _id: number; uname: string; avatar: string }
interface Entry { rank: number; score: number; udoc: UserLite }
interface Args { ranking: Entry[] }

export default function RankingPage() {
  const { args } = usePageData() as unknown as { args: Args };
  return (
    <div className="section">
      <div className="section__header">
        <h1 className="section__title">Ranking</h1>
      </div>
      {args.ranking.length === 0 ? (
        <p className="empty">No ranking data.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr><th>Rank</th><th>User</th><th>Score</th></tr>
          </thead>
          <tbody>
            {args.ranking.map((e) => (
              <tr key={e.udoc._id} data-top={e.rank <= 3 ? 'true' : undefined}>
                <td>{e.rank}</td>
                <td>{e.udoc.uname}</td>
                <td>{e.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

- [ ] 创建实现

### Step 4:manifest + registerPage

### Step 5:跑测试,验证通过

---

## Task 6: wiki_help 页面(最复杂)

**Files:**
- Create: `packages/ui-next/src/pages/wiki_help.tsx`
- Create: `packages/ui-next/src/pages/wiki_help.test.tsx`
- Modify: `manifest.ts` + `index.ts`

**目标:** 移植 `wiki_help.html`(189 行,左侧 TOC + 右侧 sections)。

### Step 1:写失败测试

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import WikiHelpPage from './wiki_help';

describe('wiki_help', () => {
  it('renders left TOC and right sections', () => {
    render(<WikiHelpPage args={{
      sections: [
        { id: 'intro', title: 'Intro', content: 'Welcome' },
        { id: 'usage', title: 'Usage', content: 'How to use' },
      ],
    }} />);
    expect(screen.getByText('Intro')).toBeInTheDocument();
    expect(screen.getByText('Usage')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /intro/i })).toHaveAttribute('href', '#intro');
    expect(screen.getByRole('link', { name: /usage/i })).toHaveAttribute('href', '#usage');
  });

  it('renders sections with anchor ids', () => {
    render(<WikiHelpPage args={{
      sections: [{ id: 'a', title: 'A', content: 'a content' }],
    }} />);
    expect(screen.getByRole('heading', { level: 1, name: 'A' })).toHaveAttribute('id', 'a');
  });

  it('renders empty state', () => {
    render(<WikiHelpPage args={{ sections: [] }} />);
    expect(screen.getByText(/no content|empty/i)).toBeInTheDocument();
  });
});
```

- [ ] 创建测试

### Step 2:跑测试,验证失败

### Step 3:实现

```tsx
import { usePageData } from '../context/page-data';

interface Section { id: string; title: string; content: string }
interface Args { sections: Section[] }

export default function WikiHelpPage() {
  const { args } = usePageData() as unknown as { args: Args };
  return (
    <div className="wiki-layout">
      <aside className="wiki-toc">
        <h2>Contents</h2>
        <ul>
          {args.sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`}>{s.title}</a>
            </li>
          ))}
        </ul>
      </aside>
      <main className="wiki-content">
        {args.sections.length === 0 ? (
          <p className="empty">No content.</p>
        ) : (
          args.sections.map((s) => (
            <section key={s.id} data-heading-extract-to="#menu-item-wiki_help">
              <h1 id={s.id} data-heading>{s.title}</h1>
              <div className="typo richmedia">{s.content}</div>
            </section>
          ))
        )}
      </main>
    </div>
  );
}
```

- [ ] 创建实现

### Step 4:manifest + registerPage

```ts
wiki_help: ['wiki_help.html'],
```

```ts
registerPage('wiki_help', () => import('./wiki_help'));
```

### Step 5:跑测试,验证通过

```bash
yarn workspace @hydrooj/ui-next test src/pages/wiki_help.test.tsx src/pages/manifest.test.ts 2>&1 | tail -5
```

---

## Task 7:综合回归

**目标:** 验证 6 个新页面 + 全量测试 + manifest 不新增 failures。

### Step 1:定向回归 6 个新页面

```bash
yarn workspace @hydrooj/ui-next test \
  src/pages/about.test.tsx \
  src/pages/home_files.test.tsx \
  src/pages/home_domain.test.tsx \
  src/pages/status.test.tsx \
  src/pages/ranking.test.tsx \
  src/pages/wiki_help.test.tsx \
  src/pages/manifest.test.ts 2>&1 | tail -10
```

期望:全部通过。

- [ ] 记录结果

### Step 2:全量 vitest

```bash
yarn workspace @hydrooj/ui-next test 2>&1 | tail -5
```

期望:不新增 failures。

- [ ] 记录 passed / failed

### Step 3:lint

```bash
yarn lint:ci 2>&1 | tail -3
```

期望:不新增 errors(允许 0 errors / ≤ 138 warnings)。

- [ ] 记录

### Step 4:e2e harness(可选)

```bash
CI=true yarn test 2>&1 | tail -10
```

期望:6 个新页面 URL(`/about`, `/file`, `/home/domain`, `/status`, `/ranking`, `/wiki/help`)返回 ui-next shell。

- [ ] 记录 e2e 实际状态

### Step 5:完成报告

写入 `/home/xq/Hydro/.claude/report/2026-07-31-sp6-site-pages-completion.md`,涵盖:
- 6 个页面的 commit 列表(未提交)
- 缺陷关闭矩阵
- 测试结果
- 已知限制(外壳渲染,功能 follow-up)

- [ ] 写完成报告

---

## Self-Review

1. **Spec coverage**:6 个页面全部映射到 Task 1–6 + Task 7 综合回归。
2. **Placeholder scan**:全文无 `TBD`/`TODO`/`add appropriate`;`Markdown` / `Link` 组件有 fallback 路径(如不存在)。
3. **Type consistency**:`usePageData() as unknown as { args: Args }` 在 6 个页面一致;`Section` / `FileEntry` / `Domain` / `Journal` / `Entry` 类型互不冲突。
4. **Global constraints**:未改 renderer / manifest 注册机制;仅加 6 行 `manifest.ts` + 6 行 `index.ts`;沿用已有 primitives。
5. **Commit checkpoints**:每 Task 含可选 `git commit` 检查点。
6. **Risk Tier**:Task 6 wiki_help 最大(189 行模板,但代码本身 ~30 行),其余 5 个简单。整体可分批、独立回退。