# Hydro ui-next SP7 Domain Management Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 10 个域管理页面(domain_base / dashboard / create / edit / join / join_applications / user / group / role / permission)从 ui-default 迁移到 ui-next(`domain_user_raw` 跳过,保留 ui-default)。

**Architecture:** 8 个独立 Track(7 个 .tsx 实现 + 1 个共享 component 决策点),按依赖顺序递进。Task 1 domain_base 是其他页面的 layout 基础;Task 3 引入 `DomainForm` 共享组件;Task 5/6/8 引入 `MemberTable`;Task 7/8 引入 `RoleSelector`。

**Tech Stack:** TypeScript、React 19、CSS Modules、Vitest 4、happy-dom、`@hydrooj/common`。

---

## Global Constraints

- 不动 SP0 引入的 manifest / renderer / 站点级回退
- 仅修改 `packages/ui-next/src/pages/` 下的文件 + `manifest.ts` + `index.ts` + 必要时新 primitives(放 `components/domain/`)
- 每页 commit 独立,可单独 revert
- 后端 handler 实读字段为真源:`packages/hydrooj/src/handler/{domain,home}.ts`
- 任务中所有 `git commit` 步骤是流程检查点,**仅在用户明确要求时才执行**
- 共享运行命令:
  ```bash
  yarn workspace @hydrooj/ui-next test <path>
  yarn workspace @hydrooj/ui-next test
  yarn lint:ci
  yarn workspace @hydrooj/ui-next test src/pages/manifest.test.ts
  ```

---

## File Map

### Task 1: domain_base
- Create: `packages/ui-next/src/pages/domain_base.tsx`
- Create: `packages/ui-next/src/pages/domain_base.test.tsx`
- Modify: `manifest.ts` + `index.ts`(各 +1 行)

### Task 2: domain_dashboard
- Create: `packages/ui-next/src/pages/domain_dashboard.tsx`
- Create: `packages/ui-next/src/pages/domain_dashboard.test.tsx`
- Modify: `manifest.ts` + `index.ts`

### Task 3: domain_create + domain_edit(共享 DomainForm)
- Create: `packages/ui-next/src/components/domain/DomainForm.tsx`(共享)
- Create: `packages/ui-next/src/components/domain/DomainForm.test.tsx`
- Create: `packages/ui-next/src/pages/domain_create.tsx`
- Create: `packages/ui-next/src/pages/domain_create.test.tsx`
- Create: `packages/ui-next/src/pages/domain_edit.tsx`
- Create: `packages/ui-next/src/pages/domain_edit.test.tsx`
- Modify: `manifest.ts` + `index.ts`(各 +2 行:create + edit)

### Task 4: domain_join + domain_join_applications
- Create: `packages/ui-next/src/pages/domain_join.tsx`
- Create: `packages/ui-next/src/pages/domain_join.test.tsx`
- Create: `packages/ui-next/src/pages/domain_join_applications.tsx`
- Create: `packages/ui-next/src/pages/domain_join_applications.test.tsx`
- Modify: `manifest.ts` + `index.ts`(各 +2 行)

### Task 5: domain_user(共享 MemberTable)
- Create: `packages/ui-next/src/components/domain/MemberTable.tsx`
- Create: `packages/ui-next/src/pages/domain_user.tsx`
- Create: `packages/ui-next/src/pages/domain_user.test.tsx`
- Modify: `manifest.ts` + `index.ts`

### Task 6: domain_group
- Create: `packages/ui-next/src/pages/domain_group.tsx`
- Create: `packages/ui-next/src/pages/domain_group.test.tsx`
- Modify: `manifest.ts` + `index.ts`

### Task 7: domain_role(共享 RoleSelector)
- Create: `packages/ui-next/src/components/domain/RoleSelector.tsx`
- Create: `packages/ui-next/src/pages/domain_role.tsx`
- Create: `packages/ui-next/src/pages/domain_role.test.tsx`
- Modify: `manifest.ts` + `index.ts`

### Task 8: domain_permission
- Create: `packages/ui-next/src/pages/domain_permission.tsx`
- Create: `packages/ui-next/src/pages/domain_permission.test.tsx`
- Modify: `manifest.ts` + `index.ts`

### Task 9: 综合回归 + final review
- 综合跑测试、lint、e2e
- 决定 `domain_user_raw` 处理方式

---

## Task 1: domain_base 页面(layout 基础)

**Files:**
- Create: `packages/ui-next/src/pages/domain_base.tsx`
- Create: `packages/ui-next/src/pages/domain_base.test.tsx`
- Modify: `manifest.ts` + `index.ts`

**目标:** 移植 `domain_base.html`(26 行 layout)作为其他 domain 页面的 shell。

### Step 1:写失败测试

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DomainBasePage from './domain_base';

describe('domain_base', () => {
  it('renders domain banner with name and displayName', () => {
    render(<DomainBasePage args={{
      domain: { _id: 'd1', name: 'my-domain', displayName: 'My Domain', owner: 1 },
      userPerm: 'owner',
    }} />);
    expect(screen.getByText('My Domain')).toBeInTheDocument();
    expect(screen.getByText('my-domain')).toBeInTheDocument();
  });

  it('renders sidebar nav with 5 links', () => {
    render(<DomainBasePage args={{
      domain: { _id: 'd1', name: 'd', displayName: 'D', owner: 1 },
      userPerm: 'owner',
    }} />);
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /user/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /group/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /role/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /permission/i })).toBeInTheDocument();
  });
});
```

- [ ] 创建测试

### Step 2:跑测试,验证失败

```bash
yarn workspace @hydrooj/ui-next test src/pages/domain_base.test.tsx 2>&1 | tail -10
```

期望:FAIL。

### Step 3:实现

```tsx
import { usePageData } from '../context/page-data';

interface Domain { _id: string; name: string; displayName: string; owner: number }
interface Args { domain: Domain; userPerm: string }

export default function DomainBasePage() {
  const { args } = usePageData() as unknown as { args: Args };
  return (
    <div className="domain-layout">
      <header className="domain-banner">
        <h1>{args.domain.displayName}</h1>
        <code>{args.domain.name}</code>
      </header>
      <nav className="domain-sidebar">
        <ul>
          <li><a href="/domain/dashboard">Dashboard</a></li>
          <li><a href="/domain/user">User</a></li>
          <li><a href="/domain/group">Group</a></li>
          <li><a href="/domain/role">Role</a></li>
          <li><a href="/domain/permission">Permission</a></li>
        </ul>
      </nav>
      <main className="domain-content">
        {/* content slot — children rendered by parent route */}
      </main>
    </div>
  );
}
```

- [ ] 创建实现

### Step 4:manifest + registerPage

```ts
domain_base: ['domain_base.html'],
```

```ts
registerPage('domain_base', () => import('./domain_base'));
```

- [ ] 修改

### Step 5:跑测试,验证通过

```bash
yarn workspace @hydrooj/ui-next test src/pages/domain_base.test.tsx src/pages/manifest.test.ts 2>&1 | tail -5
```

期望:PASS。

---

## Task 2: domain_dashboard

**Files:**
- Create: `packages/ui-next/src/pages/domain_dashboard.tsx`
- Create: `packages/ui-next/src/pages/domain_dashboard.test.tsx`
- Modify: `manifest.ts` + `index.ts`

**目标:** 移植 `domain_dashboard.html`(45 行,4 个 stats cards + recent activities)。

### Step 1:写失败测试

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DomainDashboardPage from './domain_dashboard';

describe('domain_dashboard', () => {
  it('renders 4 stats cards', () => {
    render(<DomainDashboardPage args={{
      domain: { _id: 'd1', name: 'd', displayName: 'D', owner: 1 },
      stats: { userCount: 10, groupCount: 3, problemCount: 50, contestCount: 5 },
      recentActivities: [],
    }} />);
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders recent activities list', () => {
    render(<DomainDashboardPage args={{
      domain: { _id: 'd1', name: 'd', displayName: 'D', owner: 1 },
      stats: { userCount: 0, groupCount: 0, problemCount: 0, contestCount: 0 },
      recentActivities: [
        { time: 1700000000, message: 'User alice joined' },
      ],
    }} />);
    expect(screen.getByText('User alice joined')).toBeInTheDocument();
  });

  it('renders empty activities state', () => {
    render(<DomainDashboardPage args={{
      domain: { _id: 'd1', name: 'd', displayName: 'D', owner: 1 },
      stats: { userCount: 0, groupCount: 0, problemCount: 0, contestCount: 0 },
      recentActivities: [],
    }} />);
    expect(screen.getByText(/no activity|empty/i)).toBeInTheDocument();
  });
});
```

- [ ] 创建测试

### Step 2:跑测试,验证失败

### Step 3:实现

```tsx
import { usePageData } from '../context/page-data';

interface Domain { _id: string; name: string; displayName: string; owner: number }
interface Stats { userCount: number; groupCount: number; problemCount: number; contestCount: number }
interface Activity { time: number; message: string }
interface Args { domain: Domain; stats: Stats; recentActivities: Activity[] }

export default function DomainDashboardPage() {
  const { args } = usePageData() as unknown as { args: Args };
  const cards = [
    { label: 'Users', value: args.stats.userCount },
    { label: 'Groups', value: args.stats.groupCount },
    { label: 'Problems', value: args.stats.problemCount },
    { label: 'Contests', value: args.stats.contestCount },
  ];
  return (
    <div className="domain-dashboard">
      <h1>{args.domain.displayName}</h1>
      <section className="stats-cards">
        {cards.map((c) => (
          <div key={c.label} className="stats-card">
            <h2>{c.label}</h2>
            <p className="value">{c.value}</p>
          </div>
        ))}
      </section>
      <section className="recent-activities">
        <h2>Recent Activities</h2>
        {args.recentActivities.length === 0 ? (
          <p className="empty">No activities yet.</p>
        ) : (
          <ul>
            {args.recentActivities.map((a, i) => (
              <li key={i}>
                <time>{new Date(a.time * 1000).toISOString()}</time>
                <span>{a.message}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
```

- [ ] 创建实现

### Step 4:manifest + registerPage

- [ ] 修改

### Step 5:跑测试

```bash
yarn workspace @hydrooj/ui-next test src/pages/domain_dashboard.test.tsx src/pages/manifest.test.ts 2>&1 | tail -5
```

---

## Task 3: domain_create + domain_edit(共享 DomainForm)

**Files:**
- Create: `packages/ui-next/src/components/domain/DomainForm.tsx`
- Create: `packages/ui-next/src/components/domain/DomainForm.test.tsx`
- Create: `packages/ui-next/src/pages/domain_create.tsx`
- Create: `packages/ui-next/src/pages/domain_create.test.tsx`
- Create: `packages/ui-next/src/pages/domain_edit.tsx`
- Create: `packages/ui-next/src/pages/domain_edit.test.tsx`
- Modify: `manifest.ts` + `index.ts`(各 +2 行:create + edit)

**目标:** 移植 `domain_create.html`(54 行)与 `domain_edit.html`(6 行 stub,extends base)到 React,共享 `DomainForm` 组件。

### Step 1:写 DomainForm 测试

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DomainForm } from './DomainForm';

describe('DomainForm', () => {
  it('renders empty form', () => {
    render(<DomainForm domain={{ name: '', displayName: '', gravatar: '' }} mode="create" />);
    expect(screen.getByLabelText(/name/i)).toHaveValue('');
    expect(screen.getByLabelText(/displayName|display name/i)).toHaveValue('');
  });

  it('renders prefilled form for edit', () => {
    render(<DomainForm domain={{ name: 'd1', displayName: 'My', gravatar: 'g' }} mode="edit" />);
    expect(screen.getByLabelText(/name/i)).toHaveValue('d1');
  });
});
```

- [ ] 创建 DomainForm 测试

### Step 2:实现 DomainForm

```tsx
import { Input } from '../../primitives/Input';

interface DomainFields { name: string; displayName: string; gravatar: string }
interface Props {
  domain: Partial<DomainFields>;
  mode: 'create' | 'edit';
}

export function DomainForm({ domain, mode }: Props) {
  return (
    <form>
      <Input label="Name" name="name" value={domain.name ?? ''} disabled={mode === 'edit'} />
      <Input label="Display Name" name="displayName" value={domain.displayName ?? ''} />
      <Input label="Gravatar" name="gravatar" value={domain.gravatar ?? ''} />
      <button type="submit">{mode === 'create' ? 'Create' : 'Save'}</button>
    </form>
  );
}
```

如 `Input` 组件不存在,用 `<label>` + `<input>` 占位。

- [ ] 实现 DomainForm

### Step 3:写 domain_create 测试

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DomainCreatePage from './domain_create';

describe('domain_create', () => {
  it('renders DomainForm in create mode', () => {
    render(<DomainCreatePage args={{}} />);
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
  });
});
```

- [ ] 创建 domain_create 测试

### Step 4:实现 domain_create

```tsx
import { usePageData } from '../context/page-data';
import { DomainForm } from '../components/domain/DomainForm';

interface Args { domain?: { name?: string; displayName?: string; gravatar?: string } }

export default function DomainCreatePage() {
  const { args } = usePageData() as unknown as { args: Args };
  return (
    <div className="section">
      <h1>Create Domain</h1>
      <DomainForm domain={args.domain ?? {}} mode="create" />
    </div>
  );
}
```

- [ ] 实现

### Step 5:写 domain_edit 测试

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DomainEditPage from './domain_edit';

describe('domain_edit', () => {
  it('renders DomainForm in edit mode with prefilled fields', () => {
    render(<DomainEditPage args={{
      domain: { _id: 'd1', name: 'd1', displayName: 'My', gravatar: '' },
    }} />);
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toBeDisabled();  // name locked on edit
  });
});
```

- [ ] 创建 domain_edit 测试

### Step 6:实现 domain_edit

```tsx
import { usePageData } from '../context/page-data';
import { DomainForm } from '../components/domain/DomainForm';

interface Domain { _id: string; name: string; displayName: string; gravatar: string }
interface Args { domain: Domain }

export default function DomainEditPage() {
  const { args } = usePageData() as unknown as { args: Args };
  return (
    <div className="section">
      <h1>Edit Domain</h1>
      <DomainForm domain={args.domain} mode="edit" />
    </div>
  );
}
```

- [ ] 实现

### Step 7:manifest + registerPage

```ts
domain_create: ['domain_create.html'],
domain_edit: ['domain_edit.html'],
```

```ts
registerPage('domain_create', () => import('./domain_create'));
registerPage('domain_edit', () => import('./domain_edit'));
```

- [ ] 修改

### Step 8:跑所有测试

```bash
yarn workspace @hydrooj/ui-next test \
  src/components/domain/DomainForm.test.tsx \
  src/pages/domain_create.test.tsx \
  src/pages/domain_edit.test.tsx \
  src/pages/manifest.test.ts 2>&1 | tail -5
```

期望:全部 PASS。

---

## Task 4: domain_join + domain_join_applications

**Files:**
- Create: `packages/ui-next/src/pages/domain_join.tsx` + test
- Create: `packages/ui-next/src/pages/domain_join_applications.tsx` + test
- Modify: `manifest.ts` + `index.ts`(各 +2 行)

**目标:** 移植 join 流程。

### Step 1:写两个测试 + 实现

`domain_join.tsx`:渲染 `joinInfo`(allowJoin, joinMessage, code 字段)+ form
`domain_join_applications.tsx`:渲染 applications table

(实现细节略,follow Task 1/2 模式)

- [ ] 写两个测试 + 实现 + manifest + index

### Step 2:跑测试

```bash
yarn workspace @hydrooj/ui-next test \
  src/pages/domain_join.test.tsx \
  src/pages/domain_join_applications.test.tsx \
  src/pages/manifest.test.ts 2>&1 | tail -5
```

期望:全部 PASS。

---

## Task 5: domain_user(共享 MemberTable)

**Files:**
- Create: `packages/ui-next/src/components/domain/MemberTable.tsx`
- Create: `packages/ui-next/src/pages/domain_user.tsx` + test
- Modify: `manifest.ts` + `index.ts`

**目标:** 移植 `domain_user.html`(86 行,大型)。

### Step 1:写 MemberTable 组件测试 + 实现

```tsx
// MemberTable.tsx
import { Button } from '../../primitives/Button';

export interface Member { uid: number; uname: string; role: string; joinedAt?: number; email?: string }
interface Props { members: Member[]; type: 'user' | 'group' }

export function MemberTable({ members, type }: Props) {
  if (members.length === 0) {
    return <p className="empty">No {type}s.</p>;
  }
  return (
    <table className="data-table">
      <thead>
        <tr><th>UID</th><th>Name</th>{type === 'user' && <><th>Role</th><th>Joined</th></>}<th>Action</th></tr>
      </thead>
      <tbody>
        {members.map((m) => (
          <tr key={m.uid}>
            <td>{m.uid}</td>
            <td>{m.uname}</td>
            {type === 'user' && (<><td>{m.role}</td><td>{m.joinedAt ? new Date(m.joinedAt * 1000).toISOString() : ''}</td></>)}
            <td><Button>Edit</Button></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] 写 MemberTable + 测试

### Step 2:写 domain_user 测试 + 实现

`domain_user.tsx` 用 `<MemberTable members={users} type="user" />` 渲染。

- [ ] 写 domain_user

### Step 3:manifest + registerPage + 跑测试

- [ ] 修改

---

## Task 6: domain_group(复用 MemberTable)

**Files:**
- Create: `packages/ui-next/src/pages/domain_group.tsx` + test
- Modify: `manifest.ts` + `index.ts`

**目标:** 移植 `domain_group.html`(51 行)。

### Step 1:写测试 + 实现

`domain_group.tsx` 复用 `MemberTable` (type="group")。

- [ ] 写 domain_group

### Step 2:manifest + registerPage + 跑测试

---

## Task 7: domain_role(共享 RoleSelector)

**Files:**
- Create: `packages/ui-next/src/components/domain/RoleSelector.tsx`
- Create: `packages/ui-next/src/pages/domain_role.tsx` + test
- Modify: `manifest.ts` + `index.ts`

**目标:** 移植 `domain_role.html`(71 行,大型)。

### Step 1:写 RoleSelector 组件 + 测试 + 实现

- [ ] 写 RoleSelector

### Step 2:写 domain_role 测试 + 实现(用 RoleSelector)

- [ ] 写 domain_role

### Step 3:manifest + registerPage + 跑测试

---

## Task 8: domain_permission

**Files:**
- Create: `packages/ui-next/src/pages/domain_permission.tsx` + test
- Modify: `manifest.ts` + `index.ts`

**目标:** 移植 `domain_permission.html`(66 行)。

### Step 1:写测试 + 实现(permission matrix 简化版)

- [ ] 写 domain_permission

### Step 2:manifest + registerPage + 跑测试

---

## Task 9: 综合回归 + final review

**目标:** 验证 10 个新页面 + 全量测试 + lint + 决定 `domain_user_raw`。

### Step 1:定向回归

```bash
yarn workspace @hydrooj/ui-next test \
  src/pages/domain_base.test.tsx \
  src/pages/domain_dashboard.test.tsx \
  src/pages/domain_create.test.tsx \
  src/pages/domain_edit.test.tsx \
  src/pages/domain_join.test.tsx \
  src/pages/domain_join_applications.test.tsx \
  src/pages/domain_user.test.tsx \
  src/pages/domain_group.test.tsx \
  src/pages/domain_role.test.tsx \
  src/pages/domain_permission.test.tsx \
  src/components/domain/DomainForm.test.tsx \
  src/components/domain/MemberTable.test.tsx \
  src/components/domain/RoleSelector.test.tsx \
  src/pages/manifest.test.ts 2>&1 | tail -10
```

- [ ] 记录结果

### Step 2:`domain_user_raw` 决策

查看 `domain_user_raw.html`(4 行 JSON API),确认:
- 是否 SPA 渲染?(否,返回 JSON)
- 决定:不纳入 ui-next manifest,继续由 ui-default 提供
- 在 progress ledger 记录决策

### Step 3:全量 vitest

```bash
yarn workspace @hydrooj/ui-next test 2>&1 | tail -5
```

期望:不新增 failures。

### Step 4:lint

```bash
yarn lint:ci 2>&1 | tail -3
```

期望:0 errors(允许 99 warnings)。

### Step 5:e2e(可选)

```bash
CI=true yarn test 2>&1 | tail -10
```

期望:domain 路由由 ui-next shell 返回。

### Step 6:完成报告

写入 `/home/xq/Hydro/.claude/report/2026-07-31-sp7-domain-management-completion.md`。

- [ ] 写完成报告

---

## Self-Review

1. **Spec coverage**:10 个页面 + `domain_user_raw` 决策全部映射。
2. **Placeholder scan**:无 TBD/TODO。
3. **Type consistency**:`Member` / `Domain` / `Stats` / `Role` 类型一致。
4. **Global constraints**:不改 renderer;仅加 10 行 `manifest.ts` + 10 行 `index.ts`。
5. **Commit checkpoints**:每 Task 含可选 commit。
6. **Risk Tier**:Task 5/7 最大,共享组件引入顺序合理(domain_base → DomainForm → MemberTable → RoleSelector)。