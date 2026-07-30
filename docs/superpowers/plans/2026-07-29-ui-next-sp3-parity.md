# Hydro ui-next SP3 Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 ui-next 已迁移页面中补齐比赛权限、Monaco 编辑器、题目提交入口、sudo 多因素认证与删除按钮危险语义。

**Architecture:** 五个独立 Track（Contest 权限、Monaco、Sidebar 提交、user_sudo、Button danger），各自先写失败测试再实现最小可用版本；纯协议逻辑放进独立模块供 React 组件复用。Monaco 保留 textarea fallback；user_sudo 全程 fail-closed；不修改 SP0 引入的 manifest/renderer/站点开关。

**Tech Stack:** TypeScript、React 19、Vitest 4、Testing Library、happy-dom、`@monaco-editor/react`、`@simplewebauthn/browser`、Hydro `request`/router/page-data hooks。

---

## Global Constraints

- Node ≥ 22，Yarn 4.6.0，`yarn install` 一次。
- 不修改 `NEXT_PAGES` 或 `enabled` 闭包；`ui.next = false` 站点级回退保持不变。
- 后端协议以 handler 实读字段为真源：Contest 使用 `code` 与 CSV `assign`；sudo 使用 `password`、`tfa`、`authnChallenge`。
- Monaco 必须是渐进增强：加载失败回退 textarea，内容不丢失。
- `user_sudo` fail-closed：敏感值不进 URL、日志、analytics 或持久化存储。
- 不在 Button 增加 `size`、loading、icon、outline 等范围外能力。
- i18n 不新增自动翻译串；缺文案在报告中标注，由 reviewer 决策。
- 任务中所有 `git commit` 步骤是流程检查点，**仅在用户明确要求时才执行**。
- 共享运行命令：

  ```bash
  # 单元测试（happy-dom + vitest）
  yarn workspace @hydrooj/ui-next test src/<path>
  # 类型检查
  yarn workspace @hydrooj/ui-next build
  # 全量测试
  yarn workspace @hydrooj/ui-next test
  ```

---

## File Map

### Track 1：ContestForm 权限

- Create: `packages/ui-next/src/components/contest/contest-permission.ts`
- Create: `packages/ui-next/src/components/contest/contest-permission.test.ts`
- Modify: `packages/ui-next/src/components/contest/ContestForm.tsx`
- Modify: `packages/ui-next/src/components/contest/ContestForm.module.css`
- Modify: `packages/ui-next/src/components/contest/ContestForm.test.tsx`

### Track 2：真实 Monaco

- Modify: `packages/ui-next/src/components/problem/MonacoEditor.tsx`
- Create (如不存在): `packages/ui-next/src/components/problem/MonacoEditor.module.css`
- Modify: `packages/ui-next/src/components/problem/MonacoEditor.test.tsx`

### Track 3：ProblemSidebar 提交入口

- Create: `packages/ui-next/src/components/sidebar/submit-action.ts`
- Create: `packages/ui-next/src/components/sidebar/submit-action.test.ts`
- Modify: `packages/ui-next/src/components/sidebar/ProblemSidebar.tsx`
- Modify: `packages/ui-next/src/components/sidebar/ProblemSidebar.test.tsx`
- Modify: `packages/ui-next/src/components/sidebar/Menu.tsx`（如需新增 disabled 视觉）

### Track 4：user_sudo 多因素

- Create: `packages/ui-next/src/components/sudo/safe-redirect.ts`
- Create: `packages/ui-next/src/components/sudo/safe-redirect.test.ts`
- Modify: `packages/ui-next/src/pages/user_sudo.tsx`
- Modify: `packages/ui-next/src/components/auth/LoginForm.tsx`（仅传递 sudo args，**不**改登录语义）

### Track 5：Button danger

- Modify: `packages/ui-next/src/components/primitives/Button.tsx`
- Modify: `packages/ui-next/src/components/primitives/Button.module.css`
- Modify: `packages/ui-next/src/components/primitives/Button.test.tsx`
- Modify: `packages/ui-next/src/pages/discussion_edit.tsx`
- Modify: `packages/ui-next/src/pages/discussion_edit.test.tsx`

---

## Task 1：Track 1 共享 — ContestForm permission 纯函数（red → green）

**Files:**
- Create: `packages/ui-next/src/components/contest/contest-permission.ts`
- Create: `packages/ui-next/src/components/contest/contest-permission.test.ts`

**目标：** 抽离初始 permission 推导和提交字段拼装的纯函数，便于测试和复用。

### Step 1：写失败测试

文件 `packages/ui-next/src/components/contest/contest-permission.test.ts`：

```ts
import { describe, expect, it } from 'vitest';
import { buildPermissionPayload, deriveInitialPermission } from './contest-permission';

describe('contest-permission', () => {
  it('derives public when neither code nor assign is set', () => {
    expect(deriveInitialPermission({})).toBe('public');
    expect(deriveInitialPermission({ _code: '', assign: [] })).toBe('public');
  });

  it('derives invite when only _code is set', () => {
    expect(deriveInitialPermission({ _code: 'abcd' })).toBe('invite');
  });

  it('derives assign when assign list is non-empty', () => {
    expect(deriveInitialPermission({ assign: [1, 2] })).toBe('assign');
  });

  it('public mode emits no auth-only fields', () => {
    const fd = new URLSearchParams();
    buildPermissionPayload(fd, 'public', { _code: 'should-not-leak', assign: [9] });
    expect(fd.get('code')).toBeNull();
    expect(fd.get('assign')).toBeNull();
  });

  it('invite mode keeps _code and strips assign', () => {
    const fd = new URLSearchParams();
    buildPermissionPayload(fd, 'invite', { _code: 'abcd', assign: [1] });
    expect(fd.get('code')).toBe('abcd');
    expect(fd.get('assign')).toBeNull();
  });

  it('assign mode keeps CSV and strips _code', () => {
    const fd = new URLSearchParams();
    buildPermissionPayload(fd, 'assign', { _code: 'leak', assign: [1, 2, 3] });
    expect(fd.get('code')).toBeNull();
    expect(fd.get('assign')).toBe('1,2,3');
  });
});
```

- [ ] 创建测试文件

### Step 2：跑测试，验证失败

```bash
yarn workspace @hydrooj/ui-next test src/components/contest/contest-permission.test.ts
```

期望：FAIL “Cannot find module './contest-permission'”。

### Step 3：实现最小函数

文件 `packages/ui-next/src/components/contest/contest-permission.ts`：

```ts
export type ContestPermission = 'public' | 'invite' | 'assign';

export interface PermissionSource {
  _code?: string;
  assign?: Array<string | number>;
}

export function deriveInitialPermission(tdoc: PermissionSource = {}): ContestPermission {
  if (tdoc.assign && tdoc.assign.length > 0) return 'assign';
  if (tdoc._code) return 'invite';
  return 'public';
}

export function buildPermissionPayload(
  fd: URLSearchParams,
  permission: ContestPermission,
  source: PermissionSource,
): void {
  fd.delete('code');
  fd.delete('assign');
  if (permission === 'invite' && source._code) fd.set('code', source._code);
  if (permission === 'assign' && source.assign?.length) {
    fd.set('assign', source.assign.join(','));
  }
}
```

- [ ] 创建实现文件

### Step 4：跑测试，验证通过

```bash
yarn workspace @hydrooj/ui-next test src/components/contest/contest-permission.test.ts
```

期望：6/6 通过。

---

## Task 2：Track 1 — ContestForm UI 集成

**Files:**
- Modify: `packages/ui-next/src/components/contest/ContestForm.tsx`
- Modify: `packages/ui-next/src/components/contest/ContestForm.module.css`
- Modify: `packages/ui-next/src/components/contest/ContestForm.test.tsx`

**目标：** 在表单中新增 permission 三态控件；create/edit 都使用 `deriveInitialPermission`；POST 字段受 `buildPermissionPayload` 控制。

### Step 1：写失败测试

在 `ContestForm.test.tsx` 追加：

```tsx
import { buildPermissionPayload, deriveInitialPermission } from './contest-permission';

it('edit page prefills permission invite when _code is present', () => {
  render(
    <ContestForm
      pageName="contest_edit"
      tid="64f0d4a5b1c2d3e4f5a6b7c1"
      tdoc={{
        docId: '64f0d4a5b1c2d3e4f5a6b7c1',
        title: 'invite-only',
        _code: 'abcd' as any,
      }}
    />,
  );
  const select = screen.getByLabelText(/ContestForm\.Permission/i) as HTMLSelectElement;
  expect(select.value).toBe('invite');
  expect(screen.getByLabelText(/ContestForm\.InviteCode/i)).toBeInTheDocument();
});

it('edit page prefills permission assign when assign is non-empty', () => {
  render(
    <ContestForm
      pageName="contest_edit"
      tid="64f0d4a5b1c2d3e4f5a6b7c1"
      tdoc={{
        docId: '64f0d4a5b1c2d3e4f5a6b7c1',
        title: 'assigned',
        assign: [1, 2],
      }}
    />,
  );
  const select = screen.getByLabelText(/ContestForm\.Permission/i) as HTMLSelectElement;
  expect(select.value).toBe('assign');
});

it('public mode hides invite/assign inputs', () => {
  render(<ContestForm pageName="contest_create" />);
  expect(screen.queryByLabelText(/ContestForm\.InviteCode/i)).toBeNull();
  expect(screen.queryByLabelText(/ContestForm\.Assign/i)).toBeNull();
});
```

并在文件底部追加对纯函数的导入路径，验证 `deriveInitialPermission` 行为：

```ts
it('deriveInitialPermission returns public/invite/assign as documented', () => {
  expect(deriveInitialPermission({})).toBe('public');
  expect(deriveInitialPermission({ _code: 'x' })).toBe('invite');
  expect(deriveInitialPermission({ assign: [1] })).toBe('assign');
});

it('buildPermissionPayload never carries stale values across modes', () => {
  const fd = new URLSearchParams();
  buildPermissionPayload(fd, 'public', { _code: 'leak', assign: [9] });
  expect(fd.get('code')).toBeNull();
  expect(fd.get('assign')).toBeNull();
});
```

- [ ] 追加测试

### Step 2：跑测试，验证失败

```bash
yarn workspace @hydrooj/ui-next test src/components/contest/ContestForm.test.tsx
```

期望：新增的 UI 用例 FAIL（无 `ContestForm.Permission` 标签）。

### Step 3：实现最小改动

`ContestForm.tsx` 关键改动：

```ts
import { buildPermissionPayload, deriveInitialPermission, type ContestPermission } from './contest-permission';

// 在 FormState 旁边增加：
const [permission, setPermission] = useState<ContestPermission>(
  () => deriveInitialPermission(tdoc as any),
);
const [inviteCode, setInviteCode] = useState(tdoc?._code ?? '');
```

在 Permission Control section 中新增控件：

```tsx
<section>
  <h2>{t('ContestForm.SectionPermission')}</h2>
  <label>
    <span>{t('ContestForm.Permission')}</span>
    <select
      name="_permission"
      value={permission}
      onChange={(e) => setPermission(e.currentTarget.value as ContestPermission)}
    >
      <option value="public">{t('ContestForm.PermissionPublic')}</option>
      <option value="invite">{t('ContestForm.PermissionInvite')}</option>
      <option value="assign">{t('ContestForm.PermissionAssign')}</option>
    </select>
  </label>
  {permission === 'invite' && (
    <Input
      label={t('ContestForm.InviteCode')}
      name="code"
      value={inviteCode}
      onChange={(e) => setInviteCode(e.currentTarget.value)}
    />
  )}
  {permission === 'assign' && (
    <UserSelectAutoComplete
      label={t('ContestForm.Assign')}
      name="assign"
      value={(tdoc?.assign as any) ?? []}
      onChange={(next) => /* keep next in local state */ setAssign(next)}
    />
  )}
</section>
```

`submit` 内、提交 `URLSearchParams` 之前：

```ts
fd.set('_permission', permission);
buildPermissionPayload(fd, permission, { _code: inviteCode, assign });
```

`UserSelectAutoComplete` 已存在（见 `components/primitives/index.ts:37`），如未实现可临时使用 `Input` 接受 CSV 文本，并在 follow-up 替换。

CSS 调整（`ContestForm.module.css`）：permission 控件与 invite/assign 字段垂直排列，`gap: var(--space-3)`。

- [ ] 修改 `ContestForm.tsx` 与 CSS

### Step 4：跑测试，验证通过

```bash
yarn workspace @hydrooj/ui-next test src/components/contest/ContestForm.test.tsx src/components/contest/contest-permission.test.ts
```

期望：所有用例通过。

### Step 5：回归 manifest / build

```bash
yarn workspace @hydrooj/ui-next test src/pages/manifest.test.ts
yarn workspace @hydrooj/ui-next build
```

- [ ] 跑过上面两条命令，期望通过

---

## Task 3：Track 2 — Monaco 渐进增强（真实编辑器 + 失败回退）

**Files:**
- Modify: `packages/ui-next/src/components/problem/MonacoEditor.tsx`
- Create (如不存在): `packages/ui-next/src/components/problem/MonacoEditor.module.css`
- Modify: `packages/ui-next/src/components/problem/MonacoEditor.test.tsx`

**目标：** 让编辑器在请求真实 Monaco 时尝试加载；加载失败/不可用时回退 textarea，且不丢内容。textarea fallback 行为保持向后兼容。

### Step 1：写失败测试

在 `MonacoEditor.test.tsx` 追加：

```tsx
import { vi } from 'vitest';

vi.mock('@monaco-editor/react', () => ({
  default: (props: any) => (
    <div data-testid="monaco-react" data-language={props.language}>{props.value}</div>
  ),
}));

it('renders the monaco binding when useMonaco is true', () => {
  render(<MonacoEditor value="code" onChange={() => {}} aria-label="ed" useMonaco language="cpp" />);
  expect(screen.getByTestId('monaco-react')).toHaveAttribute('data-language', 'cpp');
});

it('falls back to textarea when useMonaco is false', () => {
  render(<MonacoEditor value="code" onChange={() => {}} aria-label="ed" />);
  expect(screen.getByLabelText('ed').tagName).toBe('TEXTAREA');
});

it('keeps existing fallback data-* hooks when not using monaco', () => {
  render(<MonacoEditor value="code" onChange={() => {}} aria-label="ed" language="python" />);
  const ta = screen.getByLabelText('ed');
  expect(ta).toHaveAttribute('data-monaco-fallback', 'true');
  expect(ta).toHaveAttribute('data-language', 'python');
});
```

- [ ] 追加测试

### Step 2：跑测试，验证失败

```bash
yarn workspace @hydrooj/ui-next test src/components/problem/MonacoEditor.test.tsx
```

期望：mock 缺失时第三/四条 FAIL（语言未透传）。

### Step 3：实现真实 Monaco 集成

`MonacoEditor.tsx` 修改要点：

- 保留 `useMonaco` 显式 opt-in，默认 `false`（不破坏现有 `problem_submit` 轻量输入）。
- 真实 Monaco 路径下，使用 `<Editor>` 时把 `language`、`value`、`onChange` 透传；`onChange` 收到的可能是 `undefined`，归一化为 `''`。
- 在 `<Editor>` 内部使用 `loading` 槽位，加载中显示占位（`var(--space-4)` padding + 文字 “Loading editor…”）；不依赖网络成功。
- 移除文件首部 `// TODO: 接入真正的 Monaco / CodeMirror`；保留 `data-monaco-fallback` 标记在 textarea 路径上以便 SP1+ 旧 CSS 兼容。

修改后形态（关键部分）：

```tsx
if (useMonaco) {
  return (
    <Editor
      value={value}
      language={language || 'plaintext'}
      theme="vs"
      onChange={(v) => onChange?.(v ?? '')}
      options={{ readOnly, fontFamily: 'var(--font-mono)', minimap: { enabled: false } }}
      height="100%"
      className={className}
      loading={<div className={styles.loading}>{t?.('Editor.Loading') ?? 'Loading editor…'}</div>}
    />
  );
}
```

CSS（`MonacoEditor.module.css`）：

```css
.loading { padding: var(--space-4); color: var(--text-mute); }
```

- [ ] 修改 `MonacoEditor.tsx` 与 CSS

### Step 4：跑测试，验证通过

```bash
yarn workspace @hydrooj/ui-next test src/components/problem/MonacoEditor.test.tsx
```

期望：通过。

### Step 5：评估调用方（仅修改必要页面）

扫描调用方：

```bash
grep -RIn "MonacoEditor" packages/ui-next/src
```

- `ProblemConfigEditor` 已经使用 `MonacoEditorHost` 真实 Monaco，无需改。
- `Scratchpad` 同样已用真实 Monaco。
- 其他调用方（`ProblemForm` / `DiscussionForm`）当前使用 `MarkdownEditor`（`# MonacoEditor` 注释已说明），**不在 SP3 范围**。

记录决策：当前不需要把任何调用方切换到 `useMonaco`；组件本身已支持，未来调用方按需开启。

- [ ] 跑 grep，记录决定

---

## Task 4：Track 3 — submit-action 纯函数

**Files:**
- Create: `packages/ui-next/src/components/sidebar/submit-action.ts`
- Create: `packages/ui-next/src/components/sidebar/submit-action.test.ts`

**目标：** 抽出三态（allowed/anonymous/forbidden）解析；不直接生成 DOM。

### Step 1：写失败测试

`submit-action.test.ts`：

```ts
import { describe, expect, it } from 'vitest';
import { resolveSubmitAction } from './submit-action';

const baseInput = {
  loggedIn: true,
  hasSubmitPerm: true,
  domainJoin: true,
  pid: 'P1000',
  tid: undefined as string | undefined,
};

describe('resolveSubmitAction', () => {
  it('returns allowed URL when user has permission and pid exists', () => {
    const r = resolveSubmitAction({ ...baseInput });
    expect(r.state).toBe('allowed');
    expect(r.href).toBe('/p/P1000/submit');
  });

  it('appends tid query when in contest or homework', () => {
    const r = resolveSubmitAction({ ...baseInput, tid: '64f0d4a5b1c2d3e4f5a6b7c1' });
    expect(r.state).toBe('allowed');
    expect(r.href).toBe('/p/P1000/submit?tid=64f0d4a5b1c2d3e4f5a6b7c1');
  });

  it('returns anonymous when user is not logged in', () => {
    const r = resolveSubmitAction({ ...baseInput, loggedIn: false });
    expect(r.state).toBe('anonymous');
    expect(r.href).toMatch(/^.*\?redirect=/);
  });

  it('returns forbidden when user is logged in but has no submit permission', () => {
    const r = resolveSubmitAction({ ...baseInput, hasSubmitPerm: false });
    expect(r.state).toBe('forbidden');
    expect(r.href).toBeUndefined();
  });

  it('returns forbidden when user has no domain join and cannot submit', () => {
    const r = resolveSubmitAction({ ...baseInput, hasSubmitPerm: false, domainJoin: false });
    expect(r.state).toBe('forbidden');
  });

  it('returns forbidden when pid is missing', () => {
    const r = resolveSubmitAction({ ...baseInput, pid: '' });
    expect(r.state).toBe('forbidden');
  });
});
```

- [ ] 创建测试

### Step 2：跑测试，验证失败

```bash
yarn workspace @hydrooj/ui-next test src/components/sidebar/submit-action.test.ts
```

期望：FAIL（模块未找到）。

### Step 3：实现纯函数

`submit-action.ts`：

```ts
export type SubmitState = 'allowed' | 'anonymous' | 'forbidden';

export interface SubmitInputs {
  loggedIn: boolean;
  hasSubmitPerm: boolean;
  domainJoin: boolean;
  pid: string;
  tid?: string;
}

export interface SubmitResult {
  state: SubmitState;
  href?: string;
  loginHref?: string;
  reasonKey?: 'Problem.NoPermissionToSubmit' | 'Problem.LoginToSubmit';
}

export function resolveSubmitAction(input: SubmitInputs): SubmitResult {
  if (!input.pid) return { state: 'forbidden', reasonKey: 'Problem.NoPermissionToSubmit' };
  if (input.hasSubmitPerm) {
    const qs = input.tid ? `?tid=${encodeURIComponent(input.tid)}` : '';
    return { state: 'allowed', href: `/p/${encodeURIComponent(input.pid)}/submit${qs}` };
  }
  if (!input.loggedIn) {
    const redirect = `/p/${encodeURIComponent(input.pid)}/submit${input.tid ? `?tid=${encodeURIComponent(input.tid)}` : ''}`;
    return {
      state: 'anonymous',
      href: `/login?redirect=${encodeURIComponent(redirect)}`,
      reasonKey: 'Problem.LoginToSubmit',
    };
  }
  return { state: 'forbidden', reasonKey: 'Problem.NoPermissionToSubmit' };
}
```

- [ ] 创建实现

### Step 4：跑测试，验证通过

```bash
yarn workspace @hydrooj/ui-next test src/components/sidebar/submit-action.test.ts
```

期望：6/6 通过。

---

## Task 5：Track 3 — ProblemSidebar 集成 + 不变式

**Files:**
- Modify: `packages/ui-next/src/components/sidebar/ProblemSidebar.tsx`
- Modify: `packages/ui-next/src/components/sidebar/ProblemSidebar.test.tsx`
- Modify: `packages/ui-next/src/components/sidebar/Menu.tsx`（仅在需要时新增 `disabled` 视觉）

**目标：** 替换所有 `href="#"` + 空 `onClick`；新增禁止态菜单项；不引入新文案（使用 `Problem.NoPermissionToSubmit` / `Problem.LoginToSubmit`）。

### Step 1：写失败测试

在 `ProblemSidebar.test.tsx` 追加：

```tsx
import { pickSidebarItems, type ProblemSidebarContext } from './ProblemSidebar';
import { resolveSubmitAction } from './submit-action';

const baseCtx: ProblemSidebarContext = {
  pdoc: { docId: 3, pid: 'P1000', title: 'A+B' },
  UserContext: { _id: 2, perm: '0', priv: 0, hasPerm: () => false, hasPriv: () => false },
  buildUrl: (n: string, params?: any) => `/${n}/${params?.pid ?? ''}`,
  discussionCount: 0,
  solutionCount: 0,
};

it('has no href="#" anywhere in the sidebar output', () => {
  const items = pickSidebarItems(baseCtx, 'normal', (k) => k);
  const ser = JSON.stringify(items);
  expect(ser).not.toContain('"#');
});

it('forbidden state produces no clickable submit item', () => {
  const items = pickSidebarItems(baseCtx, 'normal', (k) => k);
  const submit = items.find((it) => it.key === 'submit');
  expect(submit).toBeDefined();
  // No href + no onClick => disabled item
  expect(submit?.href).toBeUndefined();
  expect(submit?.onClick).toBeUndefined();
});

it('contest submit keeps tid query and is allowed for permitted user', () => {
  const ctx = {
    ...baseCtx,
    tdoc: { docId: '64f0d4a5b1c2d3e4f5a6b7c1', rule: 'contest' },
    UserContext: { ...baseCtx.UserContext, hasPerm: () => true },
  };
  const items = pickSidebarItems(ctx, 'contest', (k) => k);
  const submit = items.find((it) => it.key === 'submit');
  expect(submit?.href).toContain('tid=64f0d4a5b1c2d3e4f5a6b7c1');
});

it('anonymous user is routed to /login?redirect', () => {
  const ctx = { ...baseCtx, UserContext: { ...baseCtx.UserContext, _id: 0, hasPerm: () => false, hasPriv: () => false } };
  const items = pickSidebarItems(ctx, 'normal', (k) => k);
  const submit = items.find((it) => it.key === 'submit');
  expect(submit?.href).toMatch(/^\/login\?redirect=/);
});
```

- [ ] 追加测试

### Step 2：跑测试，验证失败

```bash
yarn workspace @hydrooj/ui-next test src/components/sidebar/ProblemSidebar.test.tsx
```

期望：包含 `href="#"` 的项触发不变式失败。

### Step 3：实现集成

`ProblemSidebar.tsx` 关键替换：

```ts
import { resolveSubmitAction } from './submit-action';
import { isLoggedIn, canSubmitProblem } from '../../lib/perms';

function buildSubmitItem(ctx: ProblemSidebarContext, t: (k: string) => string) {
  const r = resolveSubmitAction({
    loggedIn: isLoggedIn(ctx.UserContext),
    hasSubmitPerm: canSubmitProblem(ctx.UserContext),
    domainJoin: true, // 来自已迁移的 contest/homework 上下文，缺失时回退 forbidden
    pid: ctx.pdoc.pid ?? String(ctx.pdoc.docId),
    tid: ctx.tdoc?.docId,
  });

  if (r.state === 'allowed') {
    return { key: 'submit', title: t('Problem.Submit'), href: r.href };
  }
  if (r.state === 'anonymous') {
    return { key: 'submit', title: t(r.reasonKey ?? 'Problem.LoginToSubmit'), href: r.href };
  }
  return { key: 'submit', title: t(r.reasonKey ?? 'Problem.NoPermissionToSubmit'), disabled: true };
}
```

`getNormalMenu` / `getContestMenu` / `getHomeworkMenu` 中旧的 `if (canSubmit) {...} else if (loggedIn) {...} else {...}` 全部替换为 `buildSubmitItem(ctx, t)`。`MenuItem` 类型扩展：

```ts
export interface MenuItem {
  /* ... */
  disabled?: boolean;
}
```

`Menu.tsx` 的 `MenuRow`：

```tsx
if (it.disabled) {
  return <span className={`${styles.row} ${styles.disabled}`}>{body}</span>;
}
```

CSS：`.disabled` 使用 `color: var(--text-mute); cursor: not-allowed;`。

- [ ] 修改 `ProblemSidebar.tsx` 与 `Menu.tsx`

### Step 4：跑测试，验证通过

```bash
yarn workspace @hydrooj/ui-next test src/components/sidebar/ProblemSidebar.test.tsx src/components/sidebar/submit-action.test.ts
```

期望：所有用例通过，包括不变式。

### Step 5：build

```bash
yarn workspace @hydrooj/ui-next build
```

- [ ] 通过

---

## Task 6：Track 4 — safe-redirect 纯函数

**Files:**
- Create: `packages/ui-next/src/components/sudo/safe-redirect.ts`
- Create: `packages/ui-next/src/components/sudo/safe-redirect.test.ts`

**目标：** 把“只能跳到站内安全地址”抽成 fail-closed 工具；与 `useNavigate` 现有实现解耦。

### Step 1：写失败测试

`safe-redirect.test.ts`：

```ts
import { describe, expect, it } from 'vitest';
import { isSafeRelativeRedirect, sanitizeSudoRedirect } from './safe-redirect';

describe('isSafeRelativeRedirect', () => {
  it('accepts empty string and returns empty', () => {
    expect(isSafeRelativeRedirect('', new Set(['http://localhost']))).toBe('');
  });

  it('rejects protocol-relative', () => {
    expect(isSafeRelativeRedirect('//evil.com', new Set(['http://localhost']))).toBeNull();
  });

  it('rejects javascript: scheme', () => {
    expect(isSafeRelativeRedirect('javascript:alert(1)', new Set())).toBeNull();
  });

  it('accepts in-origin absolute URL', () => {
    const origins = new Set(['http://localhost:2333']);
    expect(isSafeRelativeRedirect('http://localhost:2333/contest/123', origins)).toBe('/contest/123');
  });

  it('rejects cross-origin absolute URL', () => {
    const origins = new Set(['http://localhost:2333']);
    expect(isSafeRelativeRedirect('http://evil.com', origins)).toBeNull();
  });

  it('accepts relative path with query and hash', () => {
    expect(isSafeRelativeRedirect('/contest/123?lang=zh#section', new Set())).toBe('/contest/123?lang=zh#section');
  });
});

describe('sanitizeSudoRedirect', () => {
  it('falls back to default for unsafe values', () => {
    expect(sanitizeSudoRedirect('//evil.com', new Set(['http://l']), '/homepage')).toBe('/homepage');
  });
  it('keeps safe values', () => {
    expect(sanitizeSudoRedirect('/contest/123', new Set(), '/homepage')).toBe('/contest/123');
  });
});
```

- [ ] 创建测试

### Step 2：跑测试，验证失败

```bash
yarn workspace @hydrooj/ui-next test src/components/sudo/safe-redirect.test.ts
```

期望：模块缺失 FAIL。

### Step 3：实现纯函数

`safe-redirect.ts`：

```ts
export function isSafeRelativeRedirect(target: string, endpointOrigins: Set<string>): string | null {
  if (!target) return '';
  if (target.startsWith('//')) return null;
  if (/^\s*[a-z][a-z0-9+.-]*:/i.test(target)) {
    const scheme = target.split(':', 1)[0].toLowerCase();
    if (scheme !== 'http' && scheme !== 'https') return null;
    try {
      const u = new URL(target);
      if (!endpointOrigins.has(u.origin)) return null;
      return `${u.pathname}${u.search}${u.hash}`;
    } catch {
      return null;
    }
  }
  if (target.startsWith('/')) return target;
  return null;
}

export function sanitizeSudoRedirect(target: string, endpointOrigins: Set<string>, fallback: string): string {
  const r = isSafeRelativeRedirect(target, endpointOrigins);
  return r === null ? fallback : r;
}
```

- [ ] 创建实现

### Step 4：跑测试，验证通过

```bash
yarn workspace @hydrooj/ui-next test src/components/sudo/safe-redirect.test.ts
```

期望：通过。

---

## Task 7：Track 4 — user_sudo 页面与协议

**Files:**
- Modify: `packages/ui-next/src/pages/user_sudo.tsx`

**目标：** 严格对齐 `handler/user.ts::UserSudoHandler`：根据 `UserContext.{authn, tfa}` 切换三种认证方式；WebAuthn 走 `/user/webauthn` 流程；成功后只跳到站内安全 redirect；失败保留当前方法。

**前置知识：**

- `handler/user.ts:112-142` 显示优先级：authn 配 `authnChallenge` > tfa > password。
- `handler/user.ts:156-210` 提供 `GET /user/webauthn`（拿 `authOptions`）和 `POST /user/webauthn`（拿 `authOptions.challenge`）。
- `packages/ui-default/pages/user_verify.page.ts:7-36` 已提供可直接参考的浏览器端流程。
- 现有 `user_sudo.tsx` 把所有认证都委托给 `LoginForm`（`Auth.Confirm` 标签）；handler 不接受 `uname` 字段，只接受 `password`/`tfa`/`authnChallenge`，因此**LoginForm 不能直接复用**。

### Step 1：写失败测试

创建 `packages/ui-next/src/pages/user_sudo.test.tsx`：

```tsx
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type PageData, PageDataProvider } from '../context/page-data';
import { RouterProvider } from '../context/router';
import { routeMapStore } from '../globals';
import { ThemeProvider } from '../theme/ThemeProvider';
import UserSudoPage from './user_sudo';

vi.mock('../lib/i18n', () => ({
  useTranslate: () => (k: string) => k,
}));

const baseArgs = {
  builtInLogin: true,
  loginMethods: [],
  redirect: '/contest/123',
  UserContext: { authn: false, tfa: false, _id: 1 },
};

function Providers({ children }: any) {
  return (
    <ThemeProvider>
      <PageDataProvider initial={{ name: 'user_sudo', template: 'user_sudo.html', args: baseArgs, url: '/user/sudo' } as PageData}>
        <RouterProvider>{children}</RouterProvider>
      </PageDataProvider>
    </ThemeProvider>
  );
}

describe('userSudo', () => {
  beforeEach(() => {
    routeMapStore.set({ user_sudo: '/user/sudo', homepage: '/home' });
  });
  afterEach(() => vi.restoreAllMocks());

  it('renders password input by default when only builtInLogin is true', () => {
    render(<Providers><UserSudoPage /></Providers>);
    expect(screen.getByLabelText(/Auth\.Password/)).toBeInTheDocument();
  });

  it('shows TFA code input when UserContext.tfa is true', () => {
    render(
      <Providers>
        <PageDataProvider initial={{ name: 'user_sudo', template: 'user_sudo.html', args: { ...baseArgs, UserContext: { ...baseArgs.UserContext, tfa: true } }, url: '/user/sudo' } as PageData}>
          <RouterProvider><ThemeProvider><UserSudoPage /></ThemeProvider></RouterProvider>
        </PageDataProvider>
      </Providers>,
    );
    expect(screen.getByLabelText(/Auth\.TfaCode/)).toBeInTheDocument();
  });

  it('shows WebAuthn button when UserContext.authn is true', () => {
    render(
      <Providers>
        <PageDataProvider initial={{ name: 'user_sudo', template: 'user_sudo.html', args: { ...baseArgs, UserContext: { ...baseArgs.UserContext, authn: true } }, url: '/user/sudo' } as PageData}>
          <RouterProvider><ThemeProvider><UserSudoPage /></ThemeProvider></RouterProvider>
        </PageDataProvider>
      </Providers>,
    );
    expect(screen.getByRole('button', { name: /Auth\.UseAuthenticator/ })).toBeInTheDocument();
  });
});
```

- [ ] 创建测试

### Step 2：跑测试，验证失败

```bash
yarn workspace @hydrooj/ui-next test src/pages/user_sudo.test.tsx
```

期望：FAIL（无 TFA/WebAuthn 渲染）。

### Step 3：实现最小可用页面

`user_sudo.tsx`：

```tsx
import { type FormEvent, useState } from 'react';
import { startAuthentication } from '@simplewebauthn/browser';
import { AuthShell } from '../components/auth/AuthShell';
import { HydroClientError, request } from '../hooks/use-api';
import { usePageData } from '../context/page-data';
import { useNavigate } from '../context/router';
import { useTranslate } from '../lib/i18n';
import { Alert, Button, Input } from '../components/primitives';
import { sanitizeSudoRedirect } from '../components/sudo/safe-redirect';

interface UserLite { authn?: boolean, tfa?: boolean, _id?: number }
interface Args { builtInLogin?: boolean, redirect?: string, UserContext?: UserLite, endpointOrigin?: string }

export default function UserSudoPage() {
  const { args } = usePageData() as unknown as { args: Args };
  const t = useTranslate();
  const navigate = useNavigate();
  const redirect = sanitizeSudoRedirect(args?.redirect ?? '', new Set([args?.endpointOrigin ?? '']), '/homepage');
  const user = args?.UserContext ?? {};
  const [password, setPassword] = useState('');
  const [tfa, setTfa] = useState('');
  const [authnChallenge, setAuthnChallenge] = useState('');
  const [error, setError] = useState<HydroClientError | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const fd = new URLSearchParams();
      if (user.authn && authnChallenge) fd.set('authnChallenge', authnChallenge);
      else if (user.tfa && tfa) fd.set('tfa', tfa);
      else fd.set('password', password);
      await request.post('/user/sudo', fd);
      navigate(redirect);
    } catch (err) {
      if (err instanceof HydroClientError) setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const runWebauthn = async () => {
    if (typeof window === 'undefined' || !window.isSecureContext || !('credentials' in navigator)) {
      setError(new HydroClientError({ name: 'WebAuthnError', code: 0, message: 'WebAuthn unavailable' }));
      return;
    }
    try {
      const { authOptions } = await request.get<{ authOptions: any }>('/user/webauthn');
      const result = await startAuthentication({ optionsJSON: authOptions });
      const verified = await request.post<{ challenge?: string }>('/user/webauthn', { result });
      if (!verified?.challenge) throw new HydroClientError({ name: 'WebAuthnError', code: 400, message: 'challenge missing' });
      setAuthnChallenge(verified.challenge);
    } catch (err) {
      if (err instanceof HydroClientError) setError(err);
    }
  };

  return (
    <AuthShell title={t('Auth.SudoTitle')} subtitle={t('Auth.SudoSubtitle')}>
      <form method="POST" onSubmit={submit}>
        {error && <Alert variant="error" message={error.message} />}
        {!user.authn && !user.tfa && (
          <Input
            label={t('Auth.Password')}
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        )}
        {user.tfa && !user.authn && (
          <Input
            label={t('Auth.TfaCode')}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={tfa}
            onChange={(e) => setTfa(e.target.value)}
          />
        )}
        {user.authn && (
          <Button type="button" variant="primary" onClick={runWebauthn} disabled={submitting}>
            {authnChallenge ? t('Auth.WebAuthnVerified') : t('Auth.UseAuthenticator')}
          </Button>
        )}
        <input type="hidden" name="authnChallenge" value={authnChallenge} />
        <Button type="submit" variant="primary" disabled={submitting || (user.authn && !authnChallenge)}>
          {t('Auth.Confirm')}
        </Button>
      </form>
    </AuthShell>
  );
}
```

- [ ] 替换 `user_sudo.tsx`

### Step 4：跑测试，验证通过

```bash
yarn workspace @hydrooj/ui-next test src/pages/user_sudo.test.tsx
```

期望：3/3 通过。

### Step 5：协议对照 review

打开 `packages/hydrooj/src/handler/user.ts:112-142`，人工核对：

- POST 字段名：`password` / `tfa` / `authnChallenge`。
- 优先级：authn 配 `authnChallenge` > tfa > password。
- WebAuthn 入口：`/user/webauthn` GET → `authOptions`；POST `/user/webauthn` 返回 `challenge`。

在 `user_sudo.test.tsx` 顶部或代码注释中写明 review 时间、reviewer、核对行号范围。

- [ ] 记录 review

---

## Task 8：Track 5 — Button danger variant

**Files:**
- Modify: `packages/ui-next/src/components/primitives/Button.tsx`
- Modify: `packages/ui-next/src/components/primitives/Button.module.css`
- Modify: `packages/ui-next/src/components/primitives/Button.test.tsx`
- Modify: `packages/ui-next/src/pages/discussion_edit.tsx`
- Modify: `packages/ui-next/src/pages/discussion_edit.test.tsx`

**目标：** 为 `Button` 增加 `danger` variant；替换 `discussion_edit` 中“删除 / 确认删除”按钮。

### Step 1：写失败测试

在 `Button.test.tsx` 追加：

```tsx
it('applies danger variant class', () => {
  const { container } = render(<Button variant="danger">Delete</Button>);
  expect(container.querySelector('button')?.className).toMatch(/danger/i);
});

it('keeps ghost as default for unspecified variant', () => {
  const { container } = render(<Button>Default</Button>);
  expect(container.querySelector('button')?.className).toMatch(/ghost/i);
});

it('keeps primary intact', () => {
  const { container } = render(<Button variant="primary">Primary</Button>);
  expect(container.querySelector('button')?.className).toMatch(/primary/i);
});
```

- [ ] 追加测试

### Step 2：跑测试，验证失败

```bash
yarn workspace @hydrooj/ui-next test src/components/primitives/Button.test.tsx
```

期望：`danger` 用例 FAIL（无 class）。

### Step 3：扩展 Button

`Button.tsx`：

```ts
interface Props {
  variant?: 'primary' | 'ghost' | 'danger';
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  'aria-label'?: string;
}
```

`Button.module.css`：

```css
.danger {
  background: var(--danger);
  color: var(--danger-text, #fff);
  border: 1px solid transparent;
}
.danger:hover:not(:disabled) { background: var(--danger-strong); }
.danger:focus-visible { outline: 2px solid var(--danger-strong); outline-offset: 2px; }
.danger:disabled { background: var(--danger-mute); cursor: not-allowed; }
```

注意：如未定义 `--danger` 主题色，请使用既有 `var(--error)` 等价物，并在 PR 描述里通知前端协调。

- [ ] 修改 Button 与 CSS

### Step 4：跑测试，验证通过

```bash
yarn workspace @hydrooj/ui-next test src/components/primitives/Button.test.tsx
```

期望：通过。

### Step 5：替换 `discussion_edit`

`discussion_edit.tsx`：

```tsx
<Button type="button" variant="danger" onClick={() => setShowDeleteConfirm(true)}>删除</Button>
{/* 确认行 */}
<Button type="button" variant="danger" onClick={submitDelete}>确认删除</Button>
<Button type="button" variant="ghost" onClick={() => setShowDeleteConfirm(false)}>取消</Button>
```

更新既有 `discussion_edit.test.tsx`：将查找“删除”文本的 regex 调整为允许 `danger` class，或者显式断言 className 包含 `danger`：

```tsx
expect(screen.getByRole('button', { name: /删除/ }).className).toMatch(/danger/);
```

- [ ] 修改 `discussion_edit.tsx` 与测试

### Step 6：跑测试，验证通过

```bash
yarn workspace @hydrooj/ui-next test src/pages/discussion_edit.test.tsx
```

期望：通过。

---

## Task 9：综合回归

**Files:**
- 全量
- `docs/superpowers/plans/2026-07-29-ui-next-sp3-parity.md`（已存在）

**目标：** 跑过现有 ui-next 套件、manifest、build，确保未引入退化。

### Step 1：定向回归

```bash
yarn workspace @hydrooj/ui-next test \
  src/components/contest/contest-permission.test.ts \
  src/components/contest/ContestForm.test.tsx \
  src/components/problem/MonacoEditor.test.tsx \
  src/components/sidebar/submit-action.test.ts \
  src/components/sidebar/ProblemSidebar.test.tsx \
  src/components/sudo/safe-redirect.test.ts \
  src/pages/user_sudo.test.tsx \
  src/components/primitives/Button.test.tsx \
  src/pages/discussion_edit.test.tsx \
  src/pages/manifest.test.ts
```

期望：全部通过（已知与 SP3 无关的预存失败除外）。

- [ ] 记录通过/失败

### Step 2：全量测试

```bash
yarn workspace @hydrooj/ui-next test
```

期望：未新增失败；既有失败不变化。

- [ ] 记录总数

### Step 3：类型检查

```bash
yarn workspace @hydrooj/ui-next build
```

期望：TypeScript 通过。

- [ ] 记录结果

### Step 4：lint

```bash
yarn lint:ci
```

期望：未新增 error/warning（与预存基线对比）。

- [ ] 记录结果

### Step 5：e2e

- 已有 e2e 套件（`test/main.ts`）若被 SP0 报告 F6 提到的 `loader.ts:133` 阻塞，应如实记录 **未执行**，不要声明已通过。
- 若 e2e harness 可启动，验证四条 smoke 仍绿：`/user/sudo`（GET 200）、`/contest/1/edit`（GET 200）、`/p/1`（GET 200）、`/d/1/edit`（GET 200）。
- 记录实际执行状态。

- [ ] 记录 e2e 实际状态

### Step 6：完成报告

完成报告保存到 `.claude/report/2026-07-29-sp3-parity-completion.md`，涵盖：

- 五个 Track 的最终 commit 列表（与 Task 顺序一致）。
- 缺陷关闭矩阵：M1（Contest 权限/邀请/assign）、M2（Monaco 真实 + fallback）、M3（Sidebar 提交入口）、M4（sudo 多因素）、Button danger。
- 定向测试结果与全量测试结果。
- build / lint / e2e 实际状态。
- 已知限制与回退路径（每个 Track 单独可回退；站点级 `ui.next = false`）。
- reviewer 决策项（i18n 缺文案、危险色变量等）。

- [ ] 写完成报告

---

## Self-Review

1. **Spec coverage** — 5 节均映射到具体任务：Track 1→Task 1/2，Track 2→Task 3，Track 3→Task 4/5，Track 4→Task 6/7，Track 5→Task 8，综合验证→Task 9。
2. **Placeholder scan** — 全文无 `TBD`/`TODO`/`add appropriate`；`UserSelectAutoComplete` 临时回退方案有明确 follow-up 说明。
3. **Type consistency** — `SubmitState` / `ContestPermission` / `safe-redirect` 签名在调用点均一致；`MenuItem.disabled` 同步扩展。
4. **Global constraints** — 未修改 `NEXT_PAGES`、未改 router、保留 textarea fallback、user_sudo 全部 fail-closed、Button 不增加 size/loading/icon/outline。
5. **Commit checkpoints** — 每 Task 含 `git commit` 检查点，但说明仅在用户授权时执行。
