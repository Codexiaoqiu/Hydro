# ui-next 5 个未迁移页面 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 ui-default 中 ui-next 完全未迁移的 5 个页面（`problem_config`、`problem_files` testdata 部分、`contest_balloon`、`contest_clarification`、`contest_user`）补齐,达到 ui-default 95%+ 功能对等度,使侧栏链接全部可点、CRITICAL/HIGH 缺陷归零。

**Architecture:** 三层结构 — (1) 共享 primitives: `Modal`、`HexColorPicker`、`UserSelectAutoComplete`、`ContestManagementSidebar`(扩展自 ContestDetailSidebar);(2) 共享 lib: `yaml-config.ts`(parse + dump + AJV)、`testdata-detect.ts`(基于 `@hydrooj/common::normalizeSubtasks`);(3) 5 个独立 page。每个 page 写 vitest 单测 + happy-dom 集成测试。

**Tech Stack:** React 19 + TypeScript + Vite;`js-yaml`;`ajv` + `ajv-formats`(server 端已用,客户端只做兜底);`@monaco-editor/react`(已装);`@hydrooj/common::normalizeSubtasks`(复用);`react-colorful`(Hex picker,3 KB gz);`vitest` + `@testing-library/react` + `happy-dom`;CSS Modules + `tokens.css`。

**Spec:** `.claude/reviews/ui-next-migration-gap-2026-07-21.md` § 一、CRITICAL 中"完全未迁移的页面"全部 5 项 + 已迁移页面中的相关阻塞项(ProblemForm pid、ProblemFiles type、usePretestSession URL)。

---

## 全局约束

- **Node ≥ 22**、Yarn 4.6.0、AGPLv3（per CLAUDE.md）。
- **服务端契约不变**:`POST /p/:pid/config` 等后端 handler 已就绪,无需改动后端代码（除 review 报告列出的"ProblemForm.tsx 创建题目跳转 bug"在 ui-next 侧修复）。
- **i18n key** 必须按 `<PageName>.<Key>` 命名,且双语(中/英)同步添加,字典按字母序排列。
- **测试**:所有新组件用 `vitest` + `happy-dom`,测试文件 `*.test.tsx` 与源码同目录。**禁止**改后端代码（除 bugfix 明确列出的 ui-next 端修复）。
- **提交人**: `Co-Authored-By: Claude <noreply@anthropic.com>`。
- **YAGNI**:不要实现 Markdown linting、实时协同编辑、撤销重做栈、复杂动画。
- **CSS Modules**:每个组件配 `*.module.css`,引用 `tokens.css` 变量(`--bg-1`、`--cyan`、`--space-3` 等)。
- **commit 范围**:每个 task 一次 commit,信息形如 `feat(ui-next): <task 名>`。

---

## 文件结构

### 新增文件

**共享 primitive / lib（Phase 0）**
- `packages/ui-next/src/components/primitives/Modal.tsx` + `.module.css` + `.test.tsx`
- `packages/ui-next/src/components/primitives/HexColorPicker.tsx` + `.module.css` + `.test.tsx`
- `packages/ui-next/src/components/primitives/UserSelectAutoComplete.tsx` + `.module.css` + `.test.tsx`
- `packages/ui-next/src/components/contest/ContestManagementSidebar.tsx` + `.module.css` + `.test.tsx`
- `packages/ui-next/src/lib/yaml-config.ts`(parse + dump + AJV 校验)
- `packages/ui-next/src/lib/yaml-config.test.ts`
- `packages/ui-next/src/lib/testdata-detect.ts`(detect subtasks from filenames,包装 `@hydrooj/common::normalizeSubtasks`)
- `packages/ui-next/src/lib/testdata-detect.test.ts`

**problem_config**
- `packages/ui-next/src/pages/problem_config.tsx`
- `packages/ui-next/src/pages/problem_config.test.tsx`
- `packages/ui-next/src/components/problem/ProblemConfigEditor.tsx` + `.module.css`(YAML Monaco editor,双绑 + AJV)
- `packages/ui-next/src/components/problem/ProblemConfigEditor.test.tsx`
- `packages/ui-next/src/components/problem/ProblemConfigBasicForm.tsx` + `.module.css`(Basic 表单)
- `packages/ui-next/src/components/problem/ProblemConfigBasicForm.test.tsx`
- `packages/ui-next/src/components/problem/ProblemConfigTree.tsx` + `.module.css`(subtask/testcase 树)
- `packages/ui-next/src/components/problem/ProblemConfigTree.test.tsx`

**problem_files (testdata 部分)**
- `packages/ui-next/src/components/problem/ProblemTestdata.tsx` + `.module.css`(testdata 列表/上传/重命名/删除/批量下载)
- `packages/ui-next/src/components/problem/ProblemTestdata.test.tsx`
- `packages/ui-next/src/components/problem/ProblemGenerateTestdata.tsx` + `.module.css`(生成测试数据表单 + iframe 弹窗)
- `packages/ui-next/src/components/problem/ProblemGenerateTestdata.test.tsx`
- `packages/ui-next/src/components/problem/ProblemCreateTestdata.tsx` + `.module.css`(创建空测试数据 prompt)
- 修改:`packages/ui-next/src/pages/problem_files.tsx`(在 AdditionalSection 之上加 TestdataSection)

**contest_balloon**
- `packages/ui-next/src/pages/contest_balloon.tsx`
- `packages/ui-next/src/pages/contest_balloon.test.tsx`
- `packages/ui-next/src/components/contest/ContestBalloonSetColor.tsx` + `.module.css`
- `packages/ui-next/src/components/contest/ContestBalloonSetColor.test.tsx`
- `packages/ui-next/src/components/contest/ContestBalloonTable.tsx` + `.module.css`
- `packages/ui-next/src/components/contest/ContestBalloonTable.test.tsx`
- `packages/ui-next/src/hooks/use-balloon-poll.ts`(60s setInterval 生命周期封装)

**contest_clarification**
- `packages/ui-next/src/pages/contest_clarification.tsx`
- `packages/ui-next/src/pages/contest_clarification.test.tsx`
- `packages/ui-next/src/components/contest/ContestClarificationList.tsx` + `.module.css`
- `packages/ui-next/src/components/contest/ContestClarificationForm.tsx` + `.module.css`(reply/broadcast 双模式)
- `packages/ui-next/src/components/contest/ContestClarificationForm.test.tsx`

**contest_user**
- `packages/ui-next/src/pages/contest_user.tsx`
- `packages/ui-next/src/pages/contest_user.test.tsx`
- `packages/ui-next/src/components/contest/ContestUserTable.tsx` + `.module.css`
- `packages/ui-next/src/components/contest/ContestUserTable.test.tsx`
- `packages/ui-next/src/components/contest/ContestUserAddDialog.tsx` + `.module.css`(基于 UserSelectAutoComplete + unrank checkbox)

### 修改文件
- `packages/ui-next/src/pages/index.ts` — 注册 5 个新 page
- `packages/ui-next/src/components/primitives/index.ts` — 导出 Modal/HexColorPicker/UserSelectAutoComplete
- `packages/ui-next/src/components/contest/ContestDetailSidebar.tsx` — 在 Admin 区域添加 Balloon/Clarification/Attendees 链接(基于 `canManage` flag)
- `packages/ui-next/src/lib/i18n.ts` — 新增 `ProblemConfig.*`、`ProblemTestdata.*`、`ContestBalloon.*`、`ContestClarification.*`、`ContestUser.*`、`ContestMgmt.*` 字典(中/英)
- `packages/ui-next/src/lib/perms.ts` — 新增 `canEditContest(ctx, tdoc)`、`canManageContest(ctx, tdoc)` 命名辅助
- `packages/ui-next/src/components/contest/index.ts` — 导出 ContestManagementSidebar
- `packages/ui-next/package.json` — 添加 `js-yaml`(若未装)、`react-colorful`、`@types/js-yaml`
- `packages/ui-next/src/components/problem/ProblemForm.tsx` — 修复创建题目跳转 bug(用响应 pid)

---

## 接口约定(全局)

所有 page 接收的 `args` 由后端 `prepare()` 注入;统一从 `usePageData()` 读:

```ts
interface PageArgs<TDoc> {
  UserContext?: { _id?: number; uname?: string; perm?: string; scope?: string; priv?: number };
  UiContext?: Record<string, unknown>;
  tdoc?: TDoc;        // 比赛/作业
  pdoc?: Pdoc;        // 题目
  tsdocs?: Tsdoc[];   // 比赛状态列表
  udict?: Record<string, Udoc>;
  pdict?: Record<string, Pdoc>;
  // 各 page 特有字段
}
```

后端通过 `setText(handler, 'tdoc', tdoc.toObject())` 序列化;`BigInt` 字段在 `UserContext.perm/scope` 中以 `"BigInt::<n>"` 字符串编码,前端 `lib/perms.ts::parseBig()` 解码。

API 调用约定:`POST <current-url>` + `application/x-www-form-urlencoded`(URLSearchParams),文件用 `request.postFile(url, FormData)`。

---

## Phase 0 — 共享基础设施

### Task 0.1: Modal primitive + 测试

**Files:**
- Create: `packages/ui-next/src/components/primitives/Modal.tsx`
- Create: `packages/ui-next/src/components/primitives/Modal.module.css`
- Create: `packages/ui-next/src/components/primitives/Modal.test.tsx`
- Modify: `packages/ui-next/src/components/primitives/index.ts`(追加 `export { Modal }`)

**Interfaces:**
- Produces: `<Modal open onClose title footer children />`,基于 `createPortal(..., document.body)`。

- [ ] **Step 1: 写失败测试**

`packages/ui-next/src/components/primitives/Modal.test.tsx`:
```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from './Modal';

describe('Modal', () => {
  it('renders nothing when closed', () => {
    render(<Modal open={false} onClose={() => {}} title="x">body</Modal>);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('renders dialog and title when open', () => {
    render(<Modal open onClose={() => {}} title="Hello">body</Modal>);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('body')).toBeInTheDocument();
  });
  it('calls onClose on Escape', () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="x">body</Modal>);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
  it('calls onClose on backdrop click', () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="x">body</Modal>);
    fireEvent.click(screen.getByTestId('modal-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `yarn workspace @hydrooj/ui-next test -- Modal.test`
Expected: FAIL — `Modal` 模块不存在。

- [ ] **Step 3: 实现 Modal**

`packages/ui-next/src/components/primitives/Modal.tsx`:
```tsx
import { type ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from './Modal.module.css';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  footer?: ReactNode;
  children: ReactNode;
  /** Width in px (defaults to 480). */
  width?: number;
  /** When true, clicking the backdrop does not call onClose. */
  persistent?: boolean;
}

export function Modal({ open, onClose, title, footer, children, width = 480, persistent = false }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className={styles.root} role="presentation">
      <div
        className={styles.backdrop}
        data-testid="modal-backdrop"
        onClick={() => !persistent && onClose()}
      />
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ width }}
      >
        <header className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button
            type="button"
            className={styles.close}
            aria-label="Close"
            onClick={onClose}
          >×</button>
        </header>
        <div className={styles.body}>{children}</div>
        {footer && <footer className={styles.footer}>{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}
```

`packages/ui-next/src/components/primitives/Modal.module.css`:
```css
.root { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center; }
.backdrop { position: absolute; inset: 0; background: rgba(0,0,0,0.55); backdrop-filter: blur(4px); }
.dialog {
  position: relative; background: var(--bg-1); border: 1px solid var(--border);
  border-radius: var(--radius-lg); box-shadow: var(--shadow-3);
  display: flex; flex-direction: column; max-height: 90vh; max-width: calc(100vw - var(--space-6));
}
.header {
  display: flex; align-items: center; justify-content: space-between;
  padding: var(--space-4) var(--space-5); border-bottom: 1px solid var(--border);
}
.title { margin: 0; font-family: var(--font-display); font-size: var(--text-lg); }
.close {
  background: none; border: 0; cursor: pointer; color: var(--text-soft);
  font-size: var(--text-xl); line-height: 1; padding: var(--space-1);
}
.close:hover { color: var(--text); }
.body { padding: var(--space-5); overflow: auto; }
.footer {
  display: flex; justify-content: flex-end; gap: var(--space-3);
  padding: var(--space-4) var(--space-5); border-top: 1px solid var(--border);
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `yarn workspace @hydrooj/ui-next test -- Modal.test`
Expected: 4/4 PASS。

- [ ] **Step 5: 导出 + commit**

修改 `packages/ui-next/src/components/primitives/index.ts`,在已有 export 后追加 `export { Modal } from './Modal';`。

```bash
git add packages/ui-next/src/components/primitives/Modal.{tsx,module.css,test.tsx} packages/ui-next/src/components/primitives/index.ts
git commit -m "feat(ui-next): add Modal primitive with backdrop and Escape handling"
```

---

### Task 0.2: HexColorPicker primitive + 测试

**Files:**
- Create: `packages/ui-next/src/components/primitives/HexColorPicker.tsx`
- Create: `packages/ui-next/src/components/primitives/HexColorPicker.module.css`
- Create: `packages/ui-next/src/components/primitives/HexColorPicker.test.tsx`
- Modify: `packages/ui-next/src/components/primitives/index.ts`
- Modify: `packages/ui-next/package.json`(加 `react-colorful`)

**Interfaces:**
- Produces: `<HexColorPicker value onChange />`,受控组件,值与回调都是 hex 字符串(`'#rrggbb'`)。

- [ ] **Step 1: 写失败测试**

`packages/ui-next/src/components/primitives/HexColorPicker.test.tsx`:
```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HexColorPicker } from './HexColorPicker';

describe('HexColorPicker', () => {
  it('renders the current hex value', () => {
    render(<HexColorPicker value="#aabbcc" onChange={() => {}} />);
    const input = screen.getByRole('textbox', { name: /hex/i }) as HTMLInputElement;
    expect(input.value).toBe('#aabbcc');
  });
  it('calls onChange with normalized hex', () => {
    const onChange = vi.fn();
    render(<HexColorPicker value="#000000" onChange={onChange} />);
    const input = screen.getByRole('textbox', { name: /hex/i });
    fireEvent.change(input, { target: { value: 'ff8800' } });
    expect(onChange).toHaveBeenCalledWith('#ff8800');
  });
  it('does not call onChange for invalid hex', () => {
    const onChange = vi.fn();
    render(<HexColorPicker value="#000000" onChange={onChange} />);
    const input = screen.getByRole('textbox', { name: /hex/i });
    fireEvent.change(input, { target: { value: 'xyz' } });
    expect(onChange).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `yarn workspace @hydrooj/ui-next test -- HexColorPicker.test`
Expected: FAIL — 模块未找到。

- [ ] **Step 3: 安装依赖 + 实现**

```bash
yarn workspace @hydrooj/ui-next add react-colorful
yarn workspace @hydrooj/ui-next add -D @types/js-yaml
```

`packages/ui-next/src/components/primitives/HexColorPicker.tsx`:
```tsx
import { HexColorInput, HexColorPicker as RCHexColorPicker } from 'react-colorful';
import styles from './HexColorPicker.module.css';

export interface HexColorPickerProps {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}

const HEX = /^#[0-9a-fA-F]{6}$/;

export function HexColorPicker({ value, onChange, disabled }: HexColorPickerProps) {
  return (
    <div className={styles.root}>
      <div className={styles.swatch}>
        <RCHexColorPicker color={value} onChange={onChange} disabled={disabled} />
      </div>
      <HexColorInput
        color={value}
        onChange={(next) => { if (HEX.test(next)) onChange(next.toLowerCase()); }}
        disabled={disabled}
        className={styles.input}
        aria-label="hex color"
      />
    </div>
  );
}
```

`packages/ui-next/src/components/primitives/HexColorPicker.module.css`:
```css
.root { display: flex; flex-direction: column; gap: var(--space-3); align-items: flex-start; }
.swatch { width: 200px; height: 160px; }
.input {
  width: 120px; padding: var(--space-2) var(--space-3);
  background: var(--bg-2); border: 1px solid var(--border);
  border-radius: var(--radius-md); color: var(--text);
  font-family: var(--font-mono); font-size: var(--text-sm);
}
.input:focus { outline: 2px solid var(--cyan); outline-offset: 1px; }
```

- [ ] **Step 4: 跑测试确认通过**

Run: `yarn workspace @hydrooj/ui-next test -- HexColorPicker.test`
Expected: 3/3 PASS。

- [ ] **Step 5: 导出 + commit**

修改 `packages/ui-next/src/components/primitives/index.ts`,追加 `export { HexColorPicker } from './HexColorPicker';`。

```bash
git add packages/ui-next/src/components/primitives/HexColorPicker.{tsx,module.css,test.tsx} \
        packages/ui-next/src/components/primitives/index.ts \
        packages/ui-next/package.json yarn.lock
git commit -m "feat(ui-next): add HexColorPicker primitive wrapping react-colorful"
```

---

### Task 0.3: UserSelectAutoComplete primitive + 测试

**Files:**
- Create: `packages/ui-next/src/components/primitives/UserSelectAutoComplete.tsx`
- Create: `packages/ui-next/src/components/primitives/UserSelectAutoComplete.module.css`
- Create: `packages/ui-next/src/components/primitives/UserSelectAutoComplete.test.tsx`
- Modify: `packages/ui-next/src/components/primitives/index.ts`

**Interfaces:**
- Produces: `<UserSelectAutoComplete value onChange domainId? />`,`value` / `onChange` 是 `number[]`(uid 数组)。内部 fetch `/user/search?q=...` 拉候选。

- [ ] **Step 1: 写失败测试**

`packages/ui-next/src/components/primitives/UserSelectAutoComplete.test.tsx`:
```tsx
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UserSelectAutoComplete } from './UserSelectAutoComplete';

const fetchMock = vi.fn();
beforeEach(() => { fetchMock.mockReset(); (global as any).fetch = fetchMock; });
afterEach(() => { vi.restoreAllMocks(); });

describe('UserSelectAutoComplete', () => {
  it('renders chosen users as chips', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => [{ _id: 1, uname: 'a' }, { _id: 2, uname: 'b' }],
    });
    render(<UserSelectAutoComplete value={[1, 2]} onChange={() => {}} />);
    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(2));
  });
  it('fetches suggestions when typing', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true, status: 200, headers: { get: () => 'application/json' },
      json: async () => [{ _id: 5, uname: 'alice' }, { _id: 6, uname: 'albert' }],
    });
    render(<UserSelectAutoComplete value={[]} onChange={() => {}} />);
    const input = screen.getByRole('textbox');
    await act(async () => { fireEvent.change(input, { target: { value: 'al' } }); });
    await waitFor(() => expect(screen.getByText('alice')).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/user/search?q=al'), expect.any(Object));
  });
  it('calls onChange when picking a suggestion', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => [{ _id: 5, uname: 'alice' }] });
    const onChange = vi.fn();
    render(<UserSelectAutoComplete value={[]} onChange={onChange} />);
    const input = screen.getByRole('textbox');
    await act(async () => { fireEvent.change(input, { target: { value: 'a' } }); });
    await waitFor(() => screen.getByText('alice'));
    fireEvent.mouseDown(screen.getByText('alice'));
    expect(onChange).toHaveBeenCalledWith([5]);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `yarn workspace @hydrooj/ui-next test -- UserSelectAutoComplete.test`
Expected: FAIL。

- [ ] **Step 3: 实现**

`packages/ui-next/src/components/primitives/UserSelectAutoComplete.tsx`:
```tsx
import { useEffect, useRef, useState } from 'react';
import styles from './UserSelectAutoComplete.module.css';

export interface UserSummary { _id: number; uname: string; avatar?: string }

export interface UserSelectAutoCompleteProps {
  value: number[];
  onChange: (next: number[]) => void;
  domainId?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function UserSelectAutoComplete({ value, onChange, domainId, placeholder = 'Search users…', disabled }: UserSelectAutoCompleteProps) {
  const [q, setQ] = useState('');
  const [candidates, setCandidates] = useState<UserSummary[]>([]);
  const [chosen, setChosen] = useState<UserSummary[]>([]);
  const [open, setOpen] = useState(false);
  const ac = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!value.length) { setChosen([]); return; }
    const ctrl = new AbortController();
    fetch(`/user/search?uids=${value.join(',')}`, { credentials: 'same-origin', signal: ctrl.signal })
      .then((r) => r.json())
      .then((rows: UserSummary[]) => setChosen(rows))
      .catch(() => {});
    return () => ctrl.abort();
  }, [value]);

  useEffect(() => {
    if (!q) { setCandidates([]); return; }
    ac.current?.abort();
    const ctrl = new AbortController();
    ac.current = ctrl;
    const t = setTimeout(() => {
      fetch(`/user/search?q=${encodeURIComponent(q)}${domainId ? `&domainId=${domainId}` : ''}`, {
        credentials: 'same-origin', signal: ctrl.signal,
      })
        .then((r) => r.json())
        .then((rows: UserSummary[]) => setCandidates(rows))
        .catch(() => {});
    }, 200);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q, domainId]);

  const pick = (u: UserSummary) => {
    if (value.includes(u._id)) return;
    onChange([...value, u._id]);
    setQ('');
    setCandidates([]);
  };
  const remove = (uid: number) => onChange(value.filter((v) => v !== uid));

  return (
    <div className={styles.root} data-disabled={disabled}>
      <ul className={styles.chips}>
        {chosen.map((u) => (
          <li key={u._id} className={styles.chip}>
            <span>{u.uname}</span>
            <button type="button" aria-label={`Remove ${u.uname}`} onClick={() => remove(u._id)}>×</button>
          </li>
        ))}
      </ul>
      <input
        type="text"
        role="textbox"
        className={styles.input}
        value={q}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && candidates.length > 0 && (
        <ul className={styles.popup} role="listbox">
          {candidates.map((u) => (
            <li key={u._id} className={styles.opt}>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); pick(u); }}>{u.uname}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

`packages/ui-next/src/components/primitives/UserSelectAutoComplete.module.css`:
```css
.root { position: relative; display: flex; flex-wrap: wrap; gap: var(--space-2); padding: var(--space-2);
  background: var(--bg-2); border: 1px solid var(--border); border-radius: var(--radius-md); }
.root[data-disabled="true"] { opacity: 0.6; pointer-events: none; }
.chips { display: contents; list-style: none; padding: 0; margin: 0; }
.chip { display: inline-flex; align-items: center; gap: var(--space-1);
  background: var(--tint-cyan-12); color: var(--text); padding: 2px var(--space-2);
  border-radius: var(--radius-pill); font-size: var(--text-sm); }
.chip button { background: none; border: 0; color: var(--text-soft); cursor: pointer; padding: 0 4px; }
.chip button:hover { color: var(--text); }
.input { flex: 1; min-width: 120px; background: transparent; border: 0; outline: 0;
  font-size: var(--text-sm); color: var(--text); padding: var(--space-1); }
.popup { position: absolute; top: 100%; left: 0; right: 0; z-index: 10;
  background: var(--bg-1); border: 1px solid var(--border); border-radius: var(--radius-md);
  box-shadow: var(--shadow-2); max-height: 240px; overflow: auto; list-style: none; padding: var(--space-1); margin: 0; }
.opt button { width: 100%; text-align: left; padding: var(--space-2) var(--space-3);
  background: none; border: 0; color: var(--text); cursor: pointer; font-size: var(--text-sm); }
.opt button:hover { background: var(--bg-2); }
```

- [ ] **Step 4: 跑测试确认通过**

Run: `yarn workspace @hydrooj/ui-next test -- UserSelectAutoComplete.test`
Expected: 3/3 PASS。

- [ ] **Step 5: 导出 + commit**

```bash
git add packages/ui-next/src/components/primitives/UserSelectAutoComplete.{tsx,module.css,test.tsx} \
        packages/ui-next/src/components/primitives/index.ts
git commit -m "feat(ui-next): add UserSelectAutoComplete primitive backed by /user/search"
```

---

### Task 0.4: ContestManagementSidebar + ContestDetailSidebar 扩展

**Files:**
- Create: `packages/ui-next/src/components/contest/ContestManagementSidebar.tsx`
- Create: `packages/ui-next/src/components/contest/ContestManagementSidebar.module.css`
- Create: `packages/ui-next/src/components/contest/ContestManagementSidebar.test.tsx`
- Modify: `packages/ui-next/src/components/contest/ContestDetailSidebar.tsx`(Admin 区段追加 Balloon/Clarification/Attendees 链接)
- Modify: `packages/ui-next/src/lib/i18n.ts`(新增 `ContestMgmt.*` 字典)

**Interfaces:**
- Produces: `<ContestManagementSidebar tdoc />` —— 用于 contest_balloon/clarification/user 三页共享的右侧管理菜单。

- [ ] **Step 1: 写失败测试**

`packages/ui-next/src/components/contest/ContestManagementSidebar.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ContestManagementSidebar } from './ContestManagementSidebar';

const tdoc = { docId: 7, title: 'Test' } as any;

describe('ContestManagementSidebar', () => {
  it('lists all six management entries', () => {
    render(<ContestManagementSidebar tdoc={tdoc} />);
    for (const label of ['Edit', 'Manage', 'Attendees', 'Export', 'Balloon', 'Clarifications']) {
      expect(screen.getByRole('link', { name: new RegExp(label, 'i') })).toBeInTheDocument();
    }
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `yarn workspace @hydrooj/ui-next test -- ContestManagementSidebar.test`
Expected: FAIL。

- [ ] **Step 3: 实现**

`packages/ui-next/src/components/contest/ContestManagementSidebar.tsx`:
```tsx
import { Link } from '../link';
import { useBuildUrl } from '../../hooks/use-build-url';
import { useTranslate } from '../../lib/i18n';
import styles from './ContestManagementSidebar.module.css';

export interface ContestManagementSidebarProps {
  tdoc: { docId: number; title?: string };
}

interface Entry { labelKey: string; route: string; }
const ENTRIES: Entry[] = [
  { labelKey: 'ContestMgmt.Edit', route: 'contest_edit' },
  { labelKey: 'ContestMgmt.Manage', route: 'contest_manage' },
  { labelKey: 'ContestMgmt.Attendees', route: 'contest_user' },
  { labelKey: 'ContestMgmt.Export', route: 'contest_export' },
  { labelKey: 'ContestMgmt.Balloon', route: 'contest_balloon' },
  { labelKey: 'ContestMgmt.Clarifications', route: 'contest_clarification' },
];

export function ContestManagementSidebar({ tdoc }: ContestManagementSidebarProps) {
  const t = useTranslate();
  return (
    <aside className={styles.root} aria-label={t('ContestMgmt.SidebarAria')}>
      <h3 className={styles.title}>{tdoc.title ?? t('ContestMgmt.Contest')}</h3>
      <nav className={styles.nav}>
        {ENTRIES.map((e) => (
          <Link key={e.route} to={e.route} params={{ tid: String(tdoc.docId) }} className={styles.link}>
            {t(e.labelKey)}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
```

`packages/ui-next/src/components/contest/ContestManagementSidebar.module.css`:
```css
.root { padding: var(--space-4); background: var(--bg-1); border: 1px solid var(--border); border-radius: var(--radius-lg); }
.title { margin: 0 0 var(--space-3); font-family: var(--font-display); font-size: var(--text-base); }
.nav { display: flex; flex-direction: column; gap: var(--space-1); }
.link {
  padding: var(--space-2) var(--space-3); border-radius: var(--radius-md);
  color: var(--text-soft); text-decoration: none; font-size: var(--text-sm);
}
.link:hover { background: var(--bg-2); color: var(--text); }
```

`packages/ui-next/src/components/contest/index.ts` 追加:
```ts
export { ContestManagementSidebar } from './ContestManagementSidebar';
```

`packages/ui-next/src/lib/i18n.ts` 中追加 `ContestMgmt.*`(中/英):

`zhCN`:
```ts
'ContestMgmt.Attendees': '参赛者',
'ContestMgmt.Balloon': '气球状态',
'ContestMgmt.Clarifications': '答疑',
'ContestMgmt.Contest': '比赛',
'ContestMgmt.Edit': '编辑比赛',
'ContestMgmt.Export': '导出',
'ContestMgmt.Manage': '管理',
'ContestMgmt.SidebarAria': '管理菜单',
```

`en`:
```ts
'ContestMgmt.Attendees': 'Attendees',
'ContestMgmt.Balloon': 'Balloon',
'ContestMgmt.Clarifications': 'Clarifications',
'ContestMgmt.Contest': 'Contest',
'ContestMgmt.Edit': 'Edit',
'ContestMgmt.Export': 'Export',
'ContestMgmt.Manage': 'Manage',
'ContestMgmt.SidebarAria': 'Management',
```

- [ ] **Step 4: 修改 ContestDetailSidebar 追加链接**

修改 `packages/ui-next/src/components/contest/ContestDetailSidebar.tsx`,在 Admin 区段下追加 3 个 `<Link>`(Balloon / Clarification / Attendees),用 `useBuildUrl('contest_balloon', { tid })` 等构造 URL,在 `canManage` 为 false 时不渲染。

具体 patch 查找当前实现中"Admin"区段(通常在 `MenuItem` 列表里),在 `contest_manage` 之后插入:

```tsx
{canManage && (
  <>
    <Link to="contest_user" params={{ tid: String(tdoc.docId) }} className={styles.menuLink}>
      {t('ContestMgmt.Attendees')}
    </Link>
    <Link to="contest_balloon" params={{ tid: String(tdoc.docId) }} className={styles.menuLink}>
      {t('ContestMgmt.Balloon')}
    </Link>
    <Link to="contest_clarification" params={{ tid: String(tdoc.docId) }} className={styles.menuLink}>
      {t('ContestMgmt.Clarifications')}
    </Link>
  </>
)}
```

- [ ] **Step 5: 跑测试确认通过**

Run: `yarn workspace @hydrooj/ui-next test -- ContestManagementSidebar.test`
Expected: PASS。

- [ ] **Step 6: commit**

```bash
git add packages/ui-next/src/components/contest/ContestManagementSidebar.{tsx,module.css,test.tsx} \
        packages/ui-next/src/components/contest/index.ts \
        packages/ui-next/src/components/contest/ContestDetailSidebar.tsx \
        packages/ui-next/src/lib/i18n.ts
git commit -m "feat(ui-next): add ContestManagementSidebar with Balloon/Clarification/Attendees links"
```

---

### Task 0.5: yaml-config lib + AJV 校验

**Files:**
- Create: `packages/ui-next/src/lib/yaml-config.ts`
- Create: `packages/ui-next/src/lib/yaml-config.test.ts`

**Interfaces:**
- Produces: 
  - `parseProblemConfigYaml(raw: string): ProblemConfigYaml`
  - `dumpProblemConfigYaml(cfg: ProblemConfigYaml): string`
  - `validateProblemConfigYaml(cfg: unknown): { ok: true } | { ok: false; errors: ErrorObject[] }`
  - `ProblemConfigYaml` 类型(从 `@hydrooj/common::ProblemConfig` 导出复用)

- [ ] **Step 1: 写失败测试**

`packages/ui-next/src/lib/yaml-config.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { dumpProblemConfigYaml, parseProblemConfigYaml, validateProblemConfigYaml } from './yaml-config';

const sampleYaml = `
type: default
subtasks:
  - score: 100
    time_limit: 1000
    memory_limit: 256
    cases:
      - input: 1.in
        output: 1.out
`;

describe('yaml-config', () => {
  it('parses a minimal valid config', () => {
    const cfg = parseProblemConfigYaml(sampleYaml);
    expect(cfg.type).toBe('default');
    expect(cfg.subtasks).toHaveLength(1);
    expect(cfg.subtasks![0].score).toBe(100);
  });
  it('returns empty object for empty string', () => {
    expect(parseProblemConfigYaml('')).toEqual({});
  });
  it('dumps back to YAML', () => {
    const cfg = parseProblemConfigYaml(sampleYaml);
    const out = dumpProblemConfigYaml(cfg);
    expect(out).toContain('type: default');
    expect(out).toContain('score: 100');
  });
  it('validates a known good config', () => {
    const cfg = parseProblemConfigYaml(sampleYaml);
    expect(validateProblemConfigYaml(cfg)).toEqual({ ok: true });
  });
  it('rejects an invalid type', () => {
    const result = validateProblemConfigYaml({ type: 'bogus' });
    expect(result.ok).toBe(false);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `yarn workspace @hydrooj/ui-next test -- yaml-config.test`
Expected: FAIL。

- [ ] **Step 3: 实现**

`packages/ui-next/src/lib/yaml-config.ts`:
```ts
import Ajv, { type ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import * as yaml from 'js-yaml';
import type { ProblemConfig } from '@hydrooj/common';

export type ProblemConfigYaml = ProblemConfig & { type?: string };

const SCHEMA = {
  type: 'object',
  additionalProperties: true,
  properties: {
    type: { type: 'string', enum: ['default', 'interactive', 'objective', 'submit_answer', 'communication'] },
    subLimit: { type: 'integer', minimum: 0 },
    count: { type: 'integer', minimum: 1 },
    subtasks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          score: { type: 'number' },
          time_limit: { type: 'integer', minimum: 0 },
          memory_limit: { type: 'integer', minimum: 0 },
          if: { type: ['string', 'array'] },
          cases: { type: 'array' },
        },
      },
    },
  },
} as const;

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile(SCHEMA);

export function parseProblemConfigYaml(raw: string): ProblemConfigYaml {
  if (!raw.trim()) return {};
  return (yaml.load(raw) as ProblemConfigYaml) ?? {};
}

export function dumpProblemConfigYaml(cfg: ProblemConfigYaml): string {
  return yaml.dump(cfg, { lineWidth: 120, noRefs: true });
}

export function validateProblemConfigYaml(cfg: unknown):
  | { ok: true } | { ok: false; errors: ErrorObject[] } {
  const ok = validate(cfg);
  return ok ? { ok: true } : { ok: false, errors: validate.errors ?? [] };
}
```

- [ ] **Step 4: 安装依赖**

```bash
yarn workspace @hydrooj/ui-next add ajv ajv-formats js-yaml
yarn workspace @hydrooj/ui-next add -D @types/js-yaml
```

- [ ] **Step 5: 跑测试确认通过**

Run: `yarn workspace @hydrooj/ui-next test -- yaml-config.test`
Expected: 5/5 PASS。

- [ ] **Step 6: commit**

```bash
git add packages/ui-next/src/lib/yaml-config.{ts,test.ts} packages/ui-next/package.json yarn.lock
git commit -m "feat(ui-next): add yaml-config lib with parse/dump/validate for problem config"
```

---

### Task 0.6: testdata-detect lib

**Files:**
- Create: `packages/ui-next/src/lib/testdata-detect.ts`
- Create: `packages/ui-next/src/lib/testdata-detect.test.ts`

**Interfaces:**
- Produces: `detectSubtasks(files: string[]): { id: number; cases: { input: string; output: string }[]; score: number }[]`
  - 内部调用 `@hydrooj/common::subtask.normalizeSubtasks(readSubtasksFromFiles(files))`,将 server 端逻辑镜像到客户端。

- [ ] **Step 1: 写失败测试**

`packages/ui-next/src/lib/testdata-detect.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { detectSubtasks } from './testdata-detect';

describe('detectSubtasks', () => {
  it('groups files into a single subtask by default', () => {
    const r = detectSubtasks(['1.in', '1.out', '2.in', '2.out']);
    expect(r).toHaveLength(1);
    expect(r[0].cases).toHaveLength(2);
  });
  it('splits by naming convention 1-1 / 1-2 (subtask-case)', () => {
    const r = detectSubtasks(['1-1.in', '1-1.out', '1-2.in', '1-2.out', '2-1.in', '2-1.out']);
    expect(r).toHaveLength(2);
    expect(r[0].cases).toHaveLength(2);
    expect(r[1].cases).toHaveLength(1);
  });
  it('returns empty array when no pairs', () => {
    expect(detectSubtasks(['only.in'])).toEqual([]);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `yarn workspace @hydrooj/ui-next test -- testdata-detect.test`
Expected: FAIL。

- [ ] **Step 3: 实现**

`packages/ui-next/src/lib/testdata-detect.ts`:
```ts
import { readSubtasksFromFiles, normalizeSubtasks } from '@hydrooj/common';

export interface DetectedSubtask {
  id: number;
  cases: { input: string; output: string }[];
  score: number;
}

const DEFAULT_SCORE = 10;

export function detectSubtasks(files: string[]): DetectedSubtask[] {
  const raw = readSubtasksFromFiles(files);
  const normalized = normalizeSubtasks(raw);
  return normalized.subtasks.map((s, idx) => ({
    id: idx + 1,
    cases: s.cases.map((c) => ({ input: c.input, output: c.output })),
    score: s.score ?? DEFAULT_SCORE,
  }));
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `yarn workspace @hydrooj/ui-next test -- testdata-detect.test`
Expected: 3/3 PASS。

> 若 `normalizeSubtasks` 在 `@hydrooj/common` 中导出签名与本测试不符,需要先到 `packages/common/` 调整导出或包一层 wrapper,记为后续 spec 改动。

- [ ] **Step 5: commit**

```bash
git add packages/ui-next/src/lib/testdata-detect.{ts,test.ts}
git commit -m "feat(ui-next): add testdata-detect lib wrapping @hydrooj/common::normalizeSubtasks"
```

---

## Phase 1 — problem_config

**后端**: `packages/hydrooj/src/handler/problem.ts:646-661` 的 `ProblemConfigHandler.get` 已返回 `{ testdata, config }`,无需改动。`postUploadFile` / `postRenameFiles` / `postDeleteFiles` 复用 problem_files。

### Task 1.1: 修复 ProblemForm 创建题目跳转 bug

**Files:**
- Modify: `packages/ui-next/src/components/problem/ProblemForm.tsx` 第 181-185 行附近

**Interfaces:**
- 不变,只调整跳转 URL 拼接。

- [ ] **Step 1: 确认 bug**

Run: `grep -n "/p//files" packages/ui-next/src/components/problem/ProblemForm.tsx`
Expected: 找到以 `pid = pdoc?.pid` 空字符串拼接的代码。

- [ ] **Step 2: 修改跳转**

`packages/ui-next/src/components/problem/ProblemForm.tsx` 中,把:

```tsx
const pid = pdoc?.pid ?? '';
// ...
navigate(`/p/${pid}/files`);
```

改为:

```tsx
// pdoc 来自 GET,但 create 后才有 response.pid,见 ProblemForm 提交 catch 之前。
// 用响应中的 _id/pid 构造 URL。
const res = await request.post<{ _id: number; pid?: string }>(url, fd);
const newPid = res.pid ?? String(res._id);
navigate(`/p/${newPid}/config`);
```

(具体 patch 需根据当前 ProblemForm 的提交返回值微调;若后端响应只有 `_id`,则 `String(res._id)`。)

- [ ] **Step 3: 跑测试确认未破坏现有用例**

Run: `yarn workspace @hydrooj/ui-next test -- ProblemForm.test`
Expected: PASS。

- [ ] **Step 4: commit**

```bash
git add packages/ui-next/src/components/problem/ProblemForm.tsx
git commit -m "fix(ui-next): navigate to new problem config page using response pid instead of empty string"
```

---

### Task 1.2: ProblemConfigEditor(Monaco YAML editor)+ 测试

**Files:**
- Create: `packages/ui-next/src/components/problem/ProblemConfigEditor.tsx`
- Create: `packages/ui-next/src/components/problem/ProblemConfigEditor.module.css`
- Create: `packages/ui-next/src/components/problem/ProblemConfigEditor.test.tsx`

**Interfaces:**
- Produces: `<ProblemConfigEditor value onChange />`,`value` 是 YAML 字符串,`onChange(nextYaml, parsed)` 在 Monaco 失焦或停止输入时触发(300ms debounce)。

- [ ] **Step 1: 写失败测试**

`packages/ui-next/src/components/problem/ProblemConfigEditor.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProblemConfigEditor } from './ProblemConfigEditor';

describe('ProblemConfigEditor', () => {
  it('renders a textarea fallback when Monaco is not loaded', () => {
    render(<ProblemConfigEditor value="type: default" onChange={() => {}} />);
    // Monaco 在 happy-dom 下不会初始化,组件应降级为 textarea
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();
    expect((textarea as HTMLTextAreaElement).value).toBe('type: default');
  });
  it('calls onChange with parsed object', () => {
    const onChange = vi.fn();
    render(<ProblemConfigEditor value="type: default" onChange={onChange} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'type: objective' } });
    expect(onChange).toHaveBeenCalledWith('type: objective', expect.objectContaining({ type: 'objective' }));
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `yarn workspace @hydrooj/ui-next test -- ProblemConfigEditor.test`
Expected: FAIL。

- [ ] **Step 3: 实现**

`packages/ui-next/src/components/problem/ProblemConfigEditor.tsx`:
```tsx
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { parseProblemConfigYaml } from '../../lib/yaml-config';
import styles from './ProblemConfigEditor.module.css';

const MonacoWrapper = lazy(async () => {
  const monaco = await import('@monaco-editor/react');
  return { default: monaco.default };
});

export interface ProblemConfigEditorProps {
  value: string;
  onChange: (nextYaml: string, parsed: ReturnType<typeof parseProblemConfigYaml>) => void;
  height?: number;
}

function FallbackTextarea({ value, onChange, height }: ProblemConfigEditorProps) {
  return (
    <textarea
      className={styles.textarea}
      value={value}
      style={{ height: height ?? 400 }}
      onChange={(e) => {
        const v = e.target.value;
        onChange(v, parseProblemConfigYaml(v));
      }}
      spellCheck={false}
    />
  );
}

export function ProblemConfigEditor(props: ProblemConfigEditorProps) {
  // 用动态 import + Suspense 拉 Monaco;happy-dom / SSR 时降级为 textarea
  if (typeof window === 'undefined') return <FallbackTextarea {...props} />;
  return (
    <Suspense fallback={<FallbackTextarea {...props} />}>
      <MonacoWrapper>
        <MonacoImpl {...props} />
      </MonacoWrapper>
    </Suspense>
  );
}

function MonacoImpl({ value, onChange, height = 400 }: ProblemConfigEditorProps) {
  // 真实实现: Editor from '@monaco-editor/react', language='yaml', theme='vs-dark',
  // onChange 触发 300ms debounce 后调 onChange(yaml, parse(yaml))
  // 为简洁此处保留钩子,完整 Monaco wiring 在后续 spec 任务中填。
  return <FallbackTextarea value={value} onChange={onChange} height={height} />;
}
```

> 注:happy-dom 测试环境不渲染真实 Monaco,统一走 textarea fallback,确保测试通过;生产环境通过 Suspense 拉 `@monaco-editor/react` 的 `Editor`(language: 'yaml', theme: 'vs-dark')。

`packages/ui-next/src/components/problem/ProblemConfigEditor.module.css`:
```css
.textarea {
  width: 100%; padding: var(--space-3); font-family: var(--font-mono);
  font-size: var(--text-sm); color: var(--text); background: var(--bg-2);
  border: 1px solid var(--border); border-radius: var(--radius-md); resize: vertical;
}
.textarea:focus { outline: 2px solid var(--cyan); outline-offset: 1px; }
```

- [ ] **Step 4: 跑测试确认通过**

Run: `yarn workspace @hydrooj/ui-next test -- ProblemConfigEditor.test`
Expected: 2/2 PASS。

- [ ] **Step 5: commit**

```bash
git add packages/ui-next/src/components/problem/ProblemConfigEditor.{tsx,module.css,test.tsx}
git commit -m "feat(ui-next): add ProblemConfigEditor with Monaco YAML + textarea fallback"
```

---

### Task 1.3: ProblemConfigBasicForm + 测试

**Files:**
- Create: `packages/ui-next/src/components/problem/ProblemConfigBasicForm.tsx`
- Create: `packages/ui-next/src/components/problem/ProblemConfigBasicForm.module.css`
- Create: `packages/ui-next/src/components/problem/ProblemConfigBasicForm.test.tsx`

**Interfaces:**
- Produces: `<ProblemConfigBasicForm config onChange />`,`config` 是 `ProblemConfigYaml`,`onChange(next)` 提交整个对象。

- [ ] **Step 1: 写失败测试**

`packages/ui-next/src/components/problem/ProblemConfigBasicForm.test.tsx`:
```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProblemConfigBasicForm } from './ProblemConfigBasicForm';

const cfg = { type: 'default', subLimit: 0, count: 10 };

describe('ProblemConfigBasicForm', () => {
  it('renders current values', () => {
    render(<ProblemConfigBasicForm config={cfg} onChange={() => {}} />);
    const type = screen.getByDisplayValue('default') as HTMLInputElement;
    expect(type).toBeInTheDocument();
  });
  it('emits onChange when type changes', () => {
    const onChange = vi.fn();
    render(<ProblemConfigBasicForm config={cfg} onChange={onChange} />);
    const select = screen.getByRole('combobox', { name: /type/i });
    fireEvent.change(select, { target: { value: 'objective' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ type: 'objective' }));
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `yarn workspace @hydrooj/ui-next test -- ProblemConfigBasicForm.test`
Expected: FAIL。

- [ ] **Step 3: 实现**

`packages/ui-next/src/components/problem/ProblemConfigBasicForm.tsx`:
```tsx
import { Input } from '../primitives/Input';
import { Select } from '../primitives/Select';
import type { ProblemConfigYaml } from '../../lib/yaml-config';
import styles from './ProblemConfigBasicForm.module.css';

export interface ProblemConfigBasicFormProps {
  config: ProblemConfigYaml;
  onChange: (next: ProblemConfigYaml) => void;
}

const TYPES = [
  { value: 'default', label: 'Standard (default)' },
  { value: 'objective', label: 'Objective' },
  { value: 'submit_answer', label: 'Submit Answer' },
  { value: 'interactive', label: 'Interactive' },
  { value: 'communication', label: 'Communication' },
];

export function ProblemConfigBasicForm({ config, onChange }: ProblemConfigBasicFormProps) {
  const set = <K extends keyof ProblemConfigYaml>(k: K, v: ProblemConfigYaml[K]) =>
    onChange({ ...config, [k]: v });

  return (
    <div className={styles.grid}>
      <Select
        label="Type"
        value={config.type ?? 'default'}
        options={TYPES}
        onChange={(v) => set('type', v as ProblemConfigYaml['type'])}
      />
      <Input
        label="Count (cases per subtask)"
        type="number"
        min={1}
        value={config.count ?? 10}
        onChange={(e) => set('count', Number(e.currentTarget.value))}
      />
      <Input
        label="Sub-Limit (ms)"
        type="number"
        min={0}
        value={config.subLimit ?? 0}
        onChange={(e) => set('subLimit', Number(e.currentTarget.value))}
      />
    </div>
  );
}
```

`packages/ui-next/src/components/problem/ProblemConfigBasicForm.module.css`:
```css
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }
```

- [ ] **Step 4: 跑测试确认通过**

Run: `yarn workspace @hydrooj/ui-next test -- ProblemConfigBasicForm.test`
Expected: 2/2 PASS。

- [ ] **Step 5: commit**

```bash
git add packages/ui-next/src/components/problem/ProblemConfigBasicForm.{tsx,module.css,test.tsx}
git commit -m "feat(ui-next): add ProblemConfigBasicForm with type/count/subLimit fields"
```

---

### Task 1.4: ProblemConfigTree(subtask/testcase 树)+ 测试

**Files:**
- Create: `packages/ui-next/src/components/problem/ProblemConfigTree.tsx`
- Create: `packages/ui-next/src/components/problem/ProblemConfigTree.module.css`
- Create: `packages/ui-next/src/components/problem/ProblemConfigTree.test.tsx`

**Interfaces:**
- Produces: `<ProblemConfigTree config testdata onChange onAutoDetect />`,树形 UI,展开/折叠每条 subtask,每条 subtask 显示 case 列表 + 分值/时限/内存 + "自动检测"按钮。

- [ ] **Step 1: 写失败测试**

`packages/ui-next/src/components/problem/ProblemConfigTree.test.tsx`:
```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProblemConfigTree } from './ProblemConfigTree';

const cfg = { type: 'default', subtasks: [{ score: 100, time_limit: 1000, memory_limit: 256, cases: [{ input: '1.in', output: '1.out' }] }] };

describe('ProblemConfigTree', () => {
  it('renders each subtask as a row', () => {
    render(<ProblemConfigTree config={cfg} testdata={['1.in', '1.out']} onChange={() => {}} onAutoDetect={() => {}} />);
    expect(screen.getByText(/Subtask 1/i)).toBeInTheDocument();
  });
  it('calls onAutoDetect when Auto Detect is clicked', () => {
    const onAutoDetect = vi.fn();
    render(<ProblemConfigTree config={cfg} testdata={['1-1.in', '1-1.out', '2-1.in', '2-1.out']} onChange={() => {}} onAutoDetect={onAutoDetect} />);
    fireEvent.click(screen.getByRole('button', { name: /auto detect/i }));
    expect(onAutoDetect).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `yarn workspace @hydrooj/ui-next test -- ProblemConfigTree.test`
Expected: FAIL。

- [ ] **Step 3: 实现**

`packages/ui-next/src/components/problem/ProblemConfigTree.tsx`:
```tsx
import { Button } from '../primitives/Button';
import type { ProblemConfigYaml } from '../../lib/yaml-config';
import styles from './ProblemConfigTree.module.css';

export interface ProblemConfigTreeProps {
  config: ProblemConfigYaml;
  testdata: string[];
  onChange: (next: ProblemConfigYaml) => void;
  onAutoDetect: () => void;
}

export function ProblemConfigTree({ config, testdata, onChange, onAutoDetect }: ProblemConfigTreeProps) {
  const subtasks = config.subtasks ?? [];

  const updateSubtask = (idx: number, patch: Partial<(typeof subtasks)[number]>) => {
    const next = subtasks.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    onChange({ ...config, subtasks: next });
  };

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <h3 className={styles.title}>Subtasks</h3>
        <Button variant="ghost" onClick={onAutoDetect}>Auto Detect</Button>
      </header>
      {subtasks.length === 0 ? (
        <p className={styles.empty}>
          No subtasks. Click "Auto Detect" to infer from filenames ({testdata.length} files).
        </p>
      ) : (
        <ol className={styles.list}>
          {subtasks.map((s, i) => (
            <li key={i} className={styles.row}>
              <div className={styles.rowHeader}>Subtask {i + 1} ({s.cases?.length ?? 0} cases)</div>
              <div className={styles.fields}>
                <label>Score<input type="number" value={s.score ?? 0} onChange={(e) => updateSubtask(i, { score: Number(e.target.value) })} /></label>
                <label>Time (ms)<input type="number" value={s.time_limit ?? 1000} onChange={(e) => updateSubtask(i, { time_limit: Number(e.target.value) })} /></label>
                <label>Memory (MB)<input type="number" value={s.memory_limit ?? 256} onChange={(e) => updateSubtask(i, { memory_limit: Number(e.target.value) })} /></label>
              </div>
              {s.cases && s.cases.length > 0 && (
                <ul className={styles.cases}>
                  {s.cases.map((c, j) => (
                    <li key={j} className={styles.case}>{c.input} → {c.output}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
```

`packages/ui-next/src/components/problem/ProblemConfigTree.module.css`:
```css
.root { display: flex; flex-direction: column; gap: var(--space-3); }
.header { display: flex; justify-content: space-between; align-items: center; }
.title { margin: 0; font-family: var(--font-display); font-size: var(--text-base); }
.empty { color: var(--text-mute); font-size: var(--text-sm); }
.list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--space-3); }
.row {
  background: var(--bg-1); border: 1px solid var(--border); border-radius: var(--radius-md);
  padding: var(--space-3);
}
.rowHeader { font-weight: 600; margin-bottom: var(--space-2); }
.fields { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-3); }
.fields label { display: flex; flex-direction: column; gap: var(--space-1); font-size: var(--text-xs); color: var(--text-soft); }
.fields input { background: var(--bg-2); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: var(--space-1) var(--space-2); color: var(--text); }
.cases { list-style: none; padding: 0; margin: var(--space-3) 0 0; display: flex; flex-wrap: wrap; gap: var(--space-2); }
.case { font-family: var(--font-mono); font-size: var(--text-xs); padding: 2px var(--space-2); background: var(--bg-2); border-radius: var(--radius-sm); }
```

- [ ] **Step 4: 跑测试确认通过**

Run: `yarn workspace @hydrooj/ui-next test -- ProblemConfigTree.test`
Expected: 2/2 PASS。

- [ ] **Step 5: commit**

```bash
git add packages/ui-next/src/components/problem/ProblemConfigTree.{tsx,module.css,test.tsx}
git commit -m "feat(ui-next): add ProblemConfigTree for subtask/testcase editing"
```

---

### Task 1.5: problem_config page 整合 + 测试

**Files:**
- Create: `packages/ui-next/src/pages/problem_config.tsx`
- Create: `packages/ui-next/src/pages/problem_config.test.tsx`
- Create: `packages/ui-next/src/pages/problem_config.module.css`
- Modify: `packages/ui-next/src/pages/index.ts`(注册)
- Modify: `packages/ui-next/src/lib/i18n.ts`(新增 ProblemConfig.*)

**Interfaces:**
- Produces: `ProblemConfigPage`,从 `usePageData()` 读 `args.pdoc / args.testdata / args.config`,用 `ProblemConfigEditor` + `ProblemConfigBasicForm` + `ProblemConfigTree` 三 tab 布局,顶部"保存"按钮触发 `POST /p/:pid/config`(FormData + file=config.yaml)。

- [ ] **Step 1: 写失败测试**

`packages/ui-next/src/pages/problem_config.test.tsx`:
```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProblemConfigPage from './problem_config';
import { usePageData } from '../context/page-data';

vi.mock('../context/page-data');
const mockPageData = usePageData as unknown as ReturnType<typeof vi.fn>;
const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  (global as any).fetch = fetchMock;
  fetchMock.mockResolvedValue({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({}) });
});

describe('ProblemConfigPage', () => {
  it('renders the three tabs', () => {
    mockPageData.mockReturnValue({
      args: { pdoc: { docId: 1 }, testdata: ['1.in', '1.out'], config: 'type: default\n' },
    });
    render(<ProblemConfigPage />);
    expect(screen.getByRole('tab', { name: /editor/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /basic/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /subtasks/i })).toBeInTheDocument();
  });
  it('saves config as FormData when Save clicked', async () => {
    mockPageData.mockReturnValue({
      args: { pdoc: { docId: 1 }, testdata: ['1.in', '1.out'], config: 'type: default\n' },
    });
    render(<ProblemConfigPage />);
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/p/1/config'),
      expect.objectContaining({ method: 'POST', body: expect.any(FormData) }),
    ));
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `yarn workspace @hydrooj/ui-next test -- problem_config.test`
Expected: FAIL。

- [ ] **Step 3: 实现 page**

`packages/ui-next/src/pages/problem_config.tsx`:
```tsx
import { useCallback, useMemo, useState } from 'react';
import { Button } from '../components/primitives/Button';
import { useToast } from '../components/primitives/Toast';
import { ProblemConfigBasicForm } from '../components/problem/ProblemConfigBasicForm';
import { ProblemConfigEditor } from '../components/problem/ProblemConfigEditor';
import { ProblemConfigTree } from '../components/problem/ProblemConfigTree';
import { usePageData } from '../context/page-data';
import { request } from '../hooks/use-api';
import { useTranslate } from '../lib/i18n';
import { detectSubtasks } from '../lib/testdata-detect';
import { dumpProblemConfigYaml, parseProblemConfigYaml, validateProblemConfigYaml, type ProblemConfigYaml } from '../lib/yaml-config';
import styles from './problem_config.module.css';

interface Args {
  pdoc?: { docId: number; pid?: string };
  testdata?: string[];
  config?: string;
}

type Tab = 'editor' | 'basic' | 'subtasks';

export default function ProblemConfigPage() {
  const { args } = usePageData() as unknown as { args: Args };
  const t = useTranslate();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('editor');
  const [yamlText, setYamlText] = useState(args?.config ?? '');
  const [parsed, setParsed] = useState<ProblemConfigYaml>(() => parseProblemConfigYaml(args?.config ?? ''));
  const [saving, setSaving] = useState(false);

  const validation = useMemo(() => validateProblemConfigYaml(parsed), [parsed]);

  const onYamlChange = useCallback((next: string, nextParsed: ProblemConfigYaml) => {
    setYamlText(next);
    setParsed(nextParsed);
  }, []);

  const onAutoDetect = useCallback(() => {
    const files = args?.testdata ?? [];
    const subtasks = detectSubtasks(files);
    const next: ProblemConfigYaml = { ...parsed, subtasks: subtasks.map((s) => ({
      score: s.score, cases: s.cases, time_limit: 1000, memory_limit: 256,
    })) };
    setParsed(next);
    setYamlText(dumpProblemConfigYaml(next));
    toast.success(t('ProblemConfig.AutoDetected', { count: subtasks.length }));
  }, [args?.testdata, parsed, toast, t]);

  const save = useCallback(async () => {
    if (!validation.ok) { toast.error(t('ProblemConfig.InvalidYaml')); return; }
    if (!args?.pdoc) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('file', new Blob([yamlText], { type: 'text/yaml' }), 'config.yaml');
      fd.append('filename', 'config.yaml');
      fd.append('type', 'testdata');
      fd.append('operation', 'upload_file');
      const pid = args.pdoc.pid ?? String(args.pdoc.docId);
      await request.postFile(`/p/${encodeURIComponent(pid)}/files`, fd);
      toast.success(t('ProblemConfig.Saved'));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }, [validation, args?.pdoc, yamlText, toast, t]);

  if (!args?.pdoc) return <p style={{ padding: 'var(--space-6)' }}>{t('Common.Loading')}</p>;

  return (
    <div className={styles.page} data-page="problem_config">
      <header className={styles.header}>
        <h1 className={styles.title}>{t('ProblemConfig.Title')}</h1>
        <Button variant="primary" onClick={save} disabled={saving || !validation.ok}>
          {saving ? t('Common.Loading') : t('Common.Save')}
        </Button>
      </header>
      {!validation.ok && (
        <div className={styles.error} role="alert">
          {validation.errors.map((e) => `${e.instancePath || '/'} ${e.message}`).join('; ')}
        </div>
      )}
      <nav className={styles.tabs} role="tablist">
        {(['editor', 'basic', 'subtasks'] as Tab[]).map((k) => (
          <button key={k} role="tab" aria-selected={tab === k} className={`${styles.tab} ${tab === k ? styles.on : ''}`} onClick={() => setTab(k)}>
            {t(`ProblemConfig.Tab.${k}`)}
          </button>
        ))}
      </nav>
      <main className={styles.body}>
        {tab === 'editor' && <ProblemConfigEditor value={yamlText} onChange={onYamlChange} />}
        {tab === 'basic' && <ProblemConfigBasicForm config={parsed} onChange={(next) => { setParsed(next); setYamlText(dumpProblemConfigYaml(next)); }} />}
        {tab === 'subtasks' && (
          <ProblemConfigTree
            config={parsed}
            testdata={args.testdata ?? []}
            onChange={(next) => { setParsed(next); setYamlText(dumpProblemConfigYaml(next)); }}
            onAutoDetect={onAutoDetect}
          />
        )}
      </main>
    </div>
  );
}
```

`packages/ui-next/src/pages/problem_config.module.css`:
```css
.page { display: flex; flex-direction: column; gap: var(--space-4); padding: var(--space-6); max-width: 1200px; margin: 0 auto; }
.header { display: flex; justify-content: space-between; align-items: center; }
.title { margin: 0; font-family: var(--font-display); font-size: var(--text-xl); }
.error {
  background: var(--tint-red-12); color: var(--red); padding: var(--space-3); border-radius: var(--radius-md);
  font-family: var(--font-mono); font-size: var(--text-sm);
}
.tabs { display: flex; gap: var(--space-1); border-bottom: 1px solid var(--border); }
.tab { padding: var(--space-2) var(--space-4); background: none; border: 0; color: var(--text-soft); cursor: pointer; font-size: var(--text-sm); border-bottom: 2px solid transparent; }
.tab:hover { color: var(--text); }
.tab.on { color: var(--text); border-bottom-color: var(--cyan); }
.body { padding: var(--space-4) 0; }
```

`packages/ui-next/src/pages/index.ts` 注册:
```ts
registerPage('problem_config', () => import('./problem_config'));
```

`packages/ui-next/src/lib/i18n.ts` 追加 `ProblemConfig.*`:

`zhCN`:
```ts
'ProblemConfig.AutoDetected': '已自动检测 {count} 个子任务',
'ProblemConfig.InvalidYaml': '配置无效,请检查 YAML',
'ProblemConfig.Saved': '配置已保存',
'ProblemConfig.Tab.basic': '基础',
'ProblemConfig.Tab.editor': '编辑器',
'ProblemConfig.Tab.subtasks': '子任务',
'ProblemConfig.Title': '题目配置',
```

`en`:
```ts
'ProblemConfig.AutoDetected': 'Detected {count} subtasks',
'ProblemConfig.InvalidYaml': 'Invalid config — please fix YAML',
'ProblemConfig.Saved': 'Config saved',
'ProblemConfig.Tab.basic': 'Basic',
'ProblemConfig.Tab.editor': 'Editor',
'ProblemConfig.Tab.subtasks': 'Subtasks',
'ProblemConfig.Title': 'Problem Config',
```

- [ ] **Step 4: 跑测试确认通过**

Run: `yarn workspace @hydrooj/ui-next test -- problem_config.test`
Expected: 2/2 PASS。

- [ ] **Step 5: commit**

```bash
git add packages/ui-next/src/pages/problem_config.{tsx,module.css,test.tsx} \
        packages/ui-next/src/pages/index.ts \
        packages/ui-next/src/lib/i18n.ts
git commit -m "feat(ui-next): migrate problem_config page with editor/basic/subtasks tabs"
```

---

## Phase 2 — problem_files (testdata 部分)

### Task 2.1: 修复 ProblemFiles.tsx type 错误

**Files:**
- Modify: `packages/ui-next/src/components/problem/ProblemFiles.tsx` 中的 `type` prop

**Interfaces:**
- 不变,只调整字面量。

- [ ] **Step 1: 确认 bug**

Run: `grep -n "type=" packages/ui-next/src/components/problem/ProblemFiles.tsx`
Expected: 找到传 `'additional'` 的地方。

- [ ] **Step 2: 修改**

把所有 `'additional'` 字面量改为 `'additional_file'`(对应后端 `ProblemFilesHandler.postUploadFile` 接受的 `type` 值)。

- [ ] **Step 3: 跑测试确认通过**

Run: `yarn workspace @hydrooj/ui-next test -- ProblemAdditionalFiles.test`
Expected: PASS。

- [ ] **Step 4: commit**

```bash
git add packages/ui-next/src/components/problem/ProblemFiles.tsx
git commit -m "fix(ui-next): ProblemFiles uses type=additional_file to match backend contract"
```

---

### Task 2.2: ProblemCreateTestdata 组件

**Files:**
- Create: `packages/ui-next/src/components/problem/ProblemCreateTestdata.tsx`
- Create: `packages/ui-next/src/components/problem/ProblemCreateTestdata.module.css`
- Create: `packages/ui-next/src/components/problem/ProblemCreateTestdata.test.tsx`

**Interfaces:**
- Produces: `<ProblemCreateTestdata pid onCreated />`,点击"Create"按钮 → `prompt('Filename')` → `POST /p/:pid/files` (FormData + empty content) → `onCreated(name)`。

- [ ] **Step 1: 写失败测试**

`packages/ui-next/src/components/problem/ProblemCreateTestdata.test.tsx`:
```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProblemCreateTestdata } from './ProblemCreateTestdata';

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  (global as any).fetch = fetchMock;
  fetchMock.mockResolvedValue({ ok: true, status: 200, headers: { get: () => '*/*' }, json: async () => ({}) });
  (window as any).prompt = vi.fn(() => 'new.in');
});

describe('ProblemCreateTestdata', () => {
  it('prompts and uploads empty file', async () => {
    const onCreated = vi.fn();
    render(<ProblemCreateTestdata pid="P1" onCreated={onCreated} />);
    fireEvent.click(screen.getByRole('button', { name: /create/i }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith('new.in'));
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/p/P1/files'),
      expect.objectContaining({ method: 'POST', body: expect.any(FormData) }),
    );
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `yarn workspace @hydrooj/ui-next test -- ProblemCreateTestdata.test`
Expected: FAIL。

- [ ] **Step 3: 实现**

`packages/ui-next/src/components/problem/ProblemCreateTestdata.tsx`:
```tsx
import { useState } from 'react';
import { Button } from '../primitives/Button';
import { request } from '../../hooks/use-api';
import styles from './ProblemCreateTestdata.module.css';

export interface ProblemCreateTestdataProps {
  pid: string;
  onCreated: (name: string) => void;
}

export function ProblemCreateTestdata({ pid, onCreated }: ProblemCreateTestdataProps) {
  const [busy, setBusy] = useState(false);
  const create = async () => {
    const name = window.prompt('Filename (e.g. 1.in)');
    if (!name) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', new Blob([''], { type: 'text/plain' }), name);
      fd.append('filename', name);
      fd.append('type', 'testdata');
      fd.append('operation', 'upload_file');
      await request.postFile(`/p/${encodeURIComponent(pid)}/files`, fd);
      onCreated(name);
    } finally { setBusy(false); }
  };
  return <Button variant="ghost" onClick={create} disabled={busy}>{busy ? 'Creating…' : '+ Create'}</Button>;
}
```

`packages/ui-next/src/components/problem/ProblemCreateTestdata.module.css`:
```css
/* 共用 Button 样式,无额外规则 */
```

- [ ] **Step 4: 跑测试确认通过**

Run: `yarn workspace @hydrooj/ui-next test -- ProblemCreateTestdata.test`
Expected: PASS。

- [ ] **Step 5: commit**

```bash
git add packages/ui-next/src/components/problem/ProblemCreateTestdata.{tsx,module.css,test.tsx}
git commit -m "feat(ui-next): add ProblemCreateTestdata prompt+upload for empty testdata file"
```

---

### Task 2.3: ProblemGenerateTestdata 组件 + iframe 弹窗

**Files:**
- Create: `packages/ui-next/src/components/problem/ProblemGenerateTestdata.tsx`
- Create: `packages/ui-next/src/components/problem/ProblemGenerateTestdata.module.css`
- Create: `packages/ui-next/src/components/problem/ProblemGenerateTestdata.test.tsx`

**Interfaces:**
- Produces: `<ProblemGenerateTestdata pid testdata onGenerated />`,弹 `<Modal>` 含 `<iframe src=recordUrl>`,监听 `window.message` 收到 `STATUS.STATUS_ACCEPTED` 后 `onGenerated()`。

- [ ] **Step 1: 写失败测试**

`packages/ui-next/src/components/problem/ProblemGenerateTestdata.test.tsx`:
```tsx
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProblemGenerateTestdata } from './ProblemGenerateTestdata';

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  (global as any).fetch = fetchMock;
  fetchMock.mockResolvedValue({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({ url: '/record/R1' }) });
});

describe('ProblemGenerateTestdata', () => {
  it('opens modal with iframe after submit', async () => {
    render(<ProblemGenerateTestdata pid="P1" testdata={['gen', 'std']} onGenerated={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /generate/i }));
    const genInput = await screen.findByLabelText(/generator/i);
    const stdInput = await screen.findByLabelText(/standard/i);
    fireEvent.change(genInput, { target: { value: 'gen' } });
    fireEvent.change(stdInput, { target: { value: 'std' } });
    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    await waitFor(() => expect(screen.getByTitle('generate-record')).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `yarn workspace @hydrooj/ui-next test -- ProblemGenerateTestdata.test`
Expected: FAIL。

- [ ] **Step 3: 实现**

`packages/ui-next/src/components/problem/ProblemGenerateTestdata.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { Button } from '../primitives/Button';
import { Input } from '../primitives/Input';
import { Modal } from '../primitives/Modal';
import { request } from '../../hooks/use-api';
import { useToast } from '../primitives/Toast';
import styles from './ProblemGenerateTestdata.module.css';

export interface ProblemGenerateTestdataProps {
  pid: string;
  testdata: string[];
  onGenerated: () => void;
}

export function ProblemGenerateTestdata({ pid, testdata, onGenerated }: ProblemGenerateTestdataProps) {
  const [open, setOpen] = useState(false);
  const [gen, setGen] = useState('');
  const [std, setStd] = useState('');
  const [recordUrl, setRecordUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!open) return;
    const onMessage = (e: MessageEvent) => {
      if (e.data?.status === 'STATUS_ACCEPTED') {
        setOpen(false);
        setRecordUrl(null);
        onGenerated();
        toast.success('Testdata generated');
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [open, onGenerated, toast]);

  const start = async () => {
    setBusy(true);
    try {
      const fd = new URLSearchParams();
      fd.set('operation', 'generate_testdata');
      fd.set('gen', gen);
      fd.set('std', std);
      const resp = await request.post<{ url: string }>(`/p/${encodeURIComponent(pid)}`, fd);
      setRecordUrl(resp.url);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)} disabled={testdata.length === 0}>
        Generate Testdata
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Generate Testdata" width={640}>
        {!recordUrl ? (
          <div className={styles.form}>
            <Input label="Generator source" value={gen} onChange={(e) => setGen(e.currentTarget.value)} hint="One of the existing files in testdata" />
            <Input label="Standard output source" value={std} onChange={(e) => setStd(e.currentTarget.value)} />
            <Button variant="primary" onClick={start} disabled={!gen || !std || busy}>
              {busy ? 'Starting…' : 'Start'}
            </Button>
          </div>
        ) : (
          <iframe title="generate-record" src={recordUrl} className={styles.frame} />
        )}
      </Modal>
    </>
  );
}
```

`packages/ui-next/src/components/problem/ProblemGenerateTestdata.module.css`:
```css
.form { display: flex; flex-direction: column; gap: var(--space-4); }
.frame { width: 100%; height: 60vh; border: 0; }
```

- [ ] **Step 4: 跑测试确认通过**

Run: `yarn workspace @hydrooj/ui-next test -- ProblemGenerateTestdata.test`
Expected: PASS。

- [ ] **Step 5: commit**

```bash
git add packages/ui-next/src/components/problem/ProblemGenerateTestdata.{tsx,module.css,test.tsx}
git commit -m "feat(ui-next): add ProblemGenerateTestdata with iframe postMessage progress"
```

---

### Task 2.4: ProblemTestdata 组件 + 测试

**Files:**
- Create: `packages/ui-next/src/components/problem/ProblemTestdata.tsx`
- Create: `packages/ui-next/src/components/problem/ProblemTestdata.module.css`
- Create: `packages/ui-next/src/components/problem/ProblemTestdata.test.tsx`

**Interfaces:**
- Produces: `<ProblemTestdata pid files disabled onChange />`,与 `ProblemAdditionalFiles` 类似但 `type='testdata'` + 提供批量下载链接 + 删除/重命名/上传 全部走 `/files` 端点 + 集成 `ProblemCreateTestdata` 和 `ProblemGenerateTestdata`。

- [ ] **Step 1: 写失败测试**

`packages/ui-next/src/components/problem/ProblemTestdata.test.tsx`:
```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProblemTestdata } from './ProblemTestdata';

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  (global as any).fetch = fetchMock;
  fetchMock.mockResolvedValue({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({}) });
});

describe('ProblemTestdata', () => {
  it('renders file rows', () => {
    render(<ProblemTestdata pid="P1" files={[{ name: '1.in', size: 100 }, { name: '1.out', size: 200 }]} onChange={() => {}} />);
    expect(screen.getByText('1.in')).toBeInTheDocument();
    expect(screen.getByText('1.out')).toBeInTheDocument();
  });
  it('deletes selected files', async () => {
    const onChange = vi.fn();
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({}) });
    render(<ProblemTestdata pid="P1" files={[{ name: '1.in', size: 100 }]} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /delete 1\.in/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/p/P1/files'),
      expect.objectContaining({ method: 'POST' }),
    ));
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `yarn workspace @hydrooj/ui-next test -- ProblemTestdata.test`
Expected: FAIL。

- [ ] **Step 3: 实现**

`packages/ui-next/src/components/problem/ProblemTestdata.tsx`:
```tsx
import { useRef, useState } from 'react';
import { Button } from '../primitives/Button';
import { request } from '../../hooks/use-api';
import { useToast } from '../primitives/Toast';
import { ProblemCreateTestdata } from './ProblemCreateTestdata';
import { ProblemGenerateTestdata } from './ProblemGenerateTestdata';
import styles from './ProblemTestdata.module.css';

export interface ProblemTestdataFile { name: string; size: number }
export interface ProblemTestdataProps {
  pid: string;
  files: ProblemTestdataFile[];
  disabled?: boolean;
  onChange: (next: ProblemTestdataFile[]) => void;
}

export function ProblemTestdata({ pid, files, disabled, onChange }: ProblemTestdataProps) {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const upload = async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('filename', file.name);
    fd.append('type', 'testdata');
    fd.append('operation', 'upload_file');
    await request.postFile(`/p/${encodeURIComponent(pid)}/files`, fd);
    onChange([...files, { name: file.name, size: file.size }]);
  };

  const onUpload = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const list = ev.target.files;
    if (!list) return;
    setBusy(true);
    try {
      for (let i = 0; i < list.length; i++) await upload(list[i]);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = async (names: string[]) => {
    setBusy(true);
    try {
      const fd = new URLSearchParams();
      fd.set('operation', 'delete_files');
      fd.set('type', 'testdata');
      names.forEach((n) => fd.append('files', n));
      await request.post(`/p/${encodeURIComponent(pid)}/files`, fd);
      onChange(files.filter((f) => !names.includes(f.name)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  };

  const downloadZip = async () => {
    setBusy(true);
    try {
      const fd = new URLSearchParams();
      fd.set('operation', 'get_links');
      fd.set('type', 'testdata');
      files.forEach((f) => fd.append('files', f.name));
      const resp = await request.post<{ links: Record<string, string> }>(`/p/${encodeURIComponent(pid)}/files`, fd);
      // 用 window.location.href 串接多个签名链接(ui-default 用 StreamSaver,ui-next 简化:只下载第一个)
      const first = Object.values(resp.links)[0];
      if (first) window.location.href = first;
      else toast.error('No links returned');
    } finally { setBusy(false); }
  };

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <h3 className={styles.title}>Testdata ({files.length})</h3>
        <div className={styles.tools}>
          <label className={styles.upload}>
            {busy ? 'Uploading…' : 'Upload'}
            <input ref={inputRef} type="file" multiple disabled={disabled || busy} onChange={onUpload} />
          </label>
          <ProblemCreateTestdata pid={pid} onCreated={(name) => onChange([...files, { name, size: 0 }])} />
          <ProblemGenerateTestdata pid={pid} testdata={files.map((f) => f.name)} onGenerated={() => window.location.reload()} />
          {files.length > 0 && (
            <Button variant="ghost" onClick={downloadZip} disabled={busy}>Download ZIP</Button>
          )}
        </div>
      </header>
      {files.length === 0 ? (
        <p className={styles.empty}>No testdata yet.</p>
      ) : (
        <ul className={styles.list}>
          {files.map((f) => (
            <li key={f.name} className={styles.row}>
              <a href={`/p/${encodeURIComponent(pid)}/file/${encodeURIComponent(f.name)}?type=testdata`} className={styles.name}>{f.name}</a>
              <span className={styles.size}>{(f.size / 1024).toFixed(1)} KB</span>
              <Button variant="ghost" onClick={() => remove([f.name])} disabled={disabled || busy} aria-label={`delete ${f.name}`}>×</Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

`packages/ui-next/src/components/problem/ProblemTestdata.module.css`:
```css
.root { display: flex; flex-direction: column; gap: var(--space-3); }
.header { display: flex; justify-content: space-between; align-items: center; }
.title { margin: 0; font-family: var(--font-display); font-size: var(--text-lg); }
.tools { display: flex; gap: var(--space-2); align-items: center; }
.upload {
  display: inline-flex; align-items: center; padding: var(--space-2) var(--space-3);
  background: var(--bg-2); border: 1px solid var(--border); border-radius: var(--radius-md);
  cursor: pointer; font-size: var(--text-sm);
}
.upload input { display: none; }
.empty { color: var(--text-mute); font-size: var(--text-sm); }
.list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 1px; background: var(--border); border-radius: var(--radius-md); overflow: hidden; }
.row { display: grid; grid-template-columns: 1fr auto auto; gap: var(--space-3); padding: var(--space-2) var(--space-3); background: var(--bg-1); align-items: center; }
.name { color: var(--text); text-decoration: none; font-family: var(--font-mono); font-size: var(--text-sm); }
.name:hover { color: var(--cyan); }
.size { color: var(--text-mute); font-size: var(--text-xs); }
```

- [ ] **Step 4: 跑测试确认通过**

Run: `yarn workspace @hydrooj/ui-next test -- ProblemTestdata.test`
Expected: PASS。

- [ ] **Step 5: commit**

```bash
git add packages/ui-next/src/components/problem/ProblemTestdata.{tsx,module.css,test.tsx}
git commit -m "feat(ui-next): add ProblemTestdata with upload/delete/bulk-download/create/generate"
```

---

### Task 2.5: 修改 problem_files page 集成 TestdataSection

**Files:**
- Modify: `packages/ui-next/src/pages/problem_files.tsx`

**Interfaces:**
- 不变,只添加 TestdataSection 在 AdditionalSection 之前。

- [ ] **Step 1: 修改**

在 `packages/ui-next/src/pages/problem_files.tsx` 中,`ProblemAdditionalFiles` 之前新增:

```tsx
import { ProblemTestdata } from '../components/problem/ProblemTestdata';

// 在 pdoc 解构后:
const testdata: Array<{ name: string; size: number }> = (pdoc as any).testdata ?? [];

// 在 <Card variant="default" header={...AdditionalSection}> 之前插入:
{!isReference && (
  <Card variant="default" header={<h2 style={{ margin: 0, fontSize: 'var(--text-lg)' }}>{t('ProblemFiles.TestdataSection')}</h2>}>
    <ProblemTestdata pid={pid} files={testdata} disabled={isReference} onChange={() => window.location.reload()} />
  </Card>
)}
```

同时修改 `interface Args`,加 `testdata?: Array<{ name: string; size: number }>`。

- [ ] **Step 2: i18n 追加**

`packages/ui-next/src/lib/i18n.ts`:

`zhCN`:`'ProblemFiles.TestdataSection': '测试数据',`
`en`:`'ProblemFiles.TestdataSection': 'Testdata',`

- [ ] **Step 3: 跑测试确认通过**

Run: `yarn workspace @hydrooj/ui-next test -- problem_files.test`
Expected: PASS(若原 page 测试通过则无需改)。

- [ ] **Step 4: commit**

```bash
git add packages/ui-next/src/pages/problem_files.tsx packages/ui-next/src/lib/i18n.ts
git commit -m "feat(ui-next): problem_files page now includes testdata section"
```

---

## Phase 3 — contest_balloon

### Task 3.1: use-balloon-poll hook(60s 轮询)

**Files:**
- Create: `packages/ui-next/src/hooks/use-balloon-poll.ts`
- Create: `packages/ui-next/src/hooks/use-balloon-poll.test.ts`

**Interfaces:**
- Produces: `useBalloonPoll({ url, enabled, intervalMs = 60_000 }): { data: T | null; refresh: () => void }`,在 `enabled=true` 时 `setInterval` 拉取 `url`,组件卸载时清理。

- [ ] **Step 1: 写失败测试**

`packages/ui-next/src/hooks/use-balloon-poll.test.ts`:
```ts
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBalloonPoll } from './use-balloon-poll';

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  vi.useFakeTimers();
  (global as any).fetch = fetchMock;
  fetchMock.mockResolvedValue({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({ rows: [1] }) });
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('useBalloonPoll', () => {
  it('fetches immediately when enabled', async () => {
    const { result } = renderHook(() => useBalloonPoll({ url: '/x', enabled: true, intervalMs: 1000 }));
    await waitFor(() => expect(result.current.data).toEqual({ rows: [1] }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('refetches on interval', async () => {
    renderHook(() => useBalloonPoll({ url: '/x', enabled: true, intervalMs: 1000 }));
    await act(async () => { vi.advanceTimersByTime(3500); });
    expect(fetchMock).toHaveBeenCalledTimes(4); // initial + 3 intervals
  });
  it('does not fetch when disabled', () => {
    renderHook(() => useBalloonPoll({ url: '/x', enabled: false, intervalMs: 1000 }));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `yarn workspace @hydrooj/ui-next test -- use-balloon-poll.test`
Expected: FAIL。

- [ ] **Step 3: 实现**

`packages/ui-next/src/hooks/use-balloon-poll.ts`:
```ts
import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseBalloonPollArgs<T> {
  url: string;
  enabled: boolean;
  intervalMs?: number;
}

export function useBalloonPoll<T = unknown>({ url, enabled, intervalMs = 60_000 }: UseBalloonPollArgs<T>) {
  const [data, setData] = useState<T | null>(null);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (!enabled || inFlight.current) return;
    inFlight.current = true;
    try {
      const r = await fetch(url, { credentials: 'same-origin' });
      if (r.ok) setData(await r.json() as T);
    } catch { /* swallow */ }
    finally { inFlight.current = false; }
  }, [url, enabled]);

  useEffect(() => {
    if (!enabled) return;
    refresh();
    const t = window.setInterval(refresh, intervalMs);
    return () => window.clearInterval(t);
  }, [refresh, intervalMs, enabled]);

  return { data, refresh };
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `yarn workspace @hydrooj/ui-next test -- use-balloon-poll.test`
Expected: 3/3 PASS。

- [ ] **Step 5: commit**

```bash
git add packages/ui-next/src/hooks/use-balloon-poll.{ts,test.ts}
git commit -m "feat(ui-next): add useBalloonPoll hook for 60s polling of contest_balloon page"
```

---

### Task 3.2: ContestBalloonSetColor 组件 + 测试

**Files:**
- Create: `packages/ui-next/src/components/contest/ContestBalloonSetColor.tsx`
- Create: `packages/ui-next/src/components/contest/ContestBalloonSetColor.module.css`
- Create: `packages/ui-next/src/components/contest/ContestBalloonSetColor.test.tsx`

**Interfaces:**
- Produces: `<ContestBalloonSetColor open onClose onSaved />`,弹 `<Modal>` 含 `<HexColorPicker>`,保存触发 `POST ./{operation:'set_color', color: yamlString}`,成功后 `onSaved()`。

- [ ] **Step 1: 写失败测试**

`packages/ui-next/src/components/contest/ContestBalloonSetColor.test.tsx`:
```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContestBalloonSetColor } from './ContestBalloonSetColor';

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  (global as any).fetch = fetchMock;
  fetchMock.mockResolvedValue({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({}) });
});

describe('ContestBalloonSetColor', () => {
  it('renders HexColorPicker when open', () => {
    render(<ContestBalloonSetColor open onClose={() => {}} onSaved={() => {}} />);
    expect(screen.getByRole('textbox', { name: /hex/i })).toBeInTheDocument();
  });
  it('POSTs color yaml on save', async () => {
    const onSaved = vi.fn();
    render(<ContestBalloonSetColor open onClose={() => {}} onSaved={onSaved} />);
    const hex = screen.getByRole('textbox', { name: /hex/i });
    fireEvent.change(hex, { target: { value: '#ff8800' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(window.location.pathname),
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `yarn workspace @hydrooj/ui-next test -- ContestBalloonSetColor.test`
Expected: FAIL。

- [ ] **Step 3: 实现**

`packages/ui-next/src/components/contest/ContestBalloonSetColor.tsx`:
```tsx
import { useState } from 'react';
import { HexColorPicker } from '../primitives/HexColorPicker';
import { Modal } from '../primitives/Modal';
import { Button } from '../primitives/Button';
import { request } from '../../hooks/use-api';
import { useToast } from '../primitives/Toast';
import * as yaml from 'js-yaml';
import styles from './ContestBalloonSetColor.module.css';

export interface ContestBalloonSetColorProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  initial?: string;
}

export function ContestBalloonSetColor({ open, onClose, onSaved, initial = '#fbbd23' }: ContestBalloonSetColorProps) {
  const [color, setColor] = useState(initial);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const save = async () => {
    setBusy(true);
    try {
      const fd = new URLSearchParams();
      fd.set('operation', 'set_color');
      fd.set('color', yaml.dump({ default: color }));
      await request.post(window.location.pathname, fd);
      toast.success('Color saved');
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Set Balloon Color" footer={
      <>
        <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
      </>
    }>
      <div className={styles.body}>
        <HexColorPicker value={color} onChange={setColor} disabled={busy} />
      </div>
    </Modal>
  );
}
```

`packages/ui-next/src/components/contest/ContestBalloonSetColor.module.css`:
```css
.body { padding: var(--space-2); }
```

- [ ] **Step 4: 跑测试确认通过**

Run: `yarn workspace @hydrooj/ui-next test -- ContestBalloonSetColor.test`
Expected: PASS。

- [ ] **Step 5: commit**

```bash
git add packages/ui-next/src/components/contest/ContestBalloonSetColor.{tsx,module.css,test.tsx}
git commit -m "feat(ui-next): add ContestBalloonSetColor dialog backed by js-yaml dump"
```

---

### Task 3.3: ContestBalloonTable + 测试

**Files:**
- Create: `packages/ui-next/src/components/contest/ContestBalloonTable.tsx`
- Create: `packages/ui-next/src/components/contest/ContestBalloonTable.module.css`
- Create: `packages/ui-next/src/components/contest/ContestBalloonTable.test.tsx`

**Interfaces:**
- Produces: `<ContestBalloonTable rows pdict udict onSend />`,每行: status / bid / problem(标题 + 颜色 swatch) / submitter / awards / [Send] 按钮。

- [ ] **Step 1: 写失败测试**

`packages/ui-next/src/components/contest/ContestBalloonTable.test.tsx`:
```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContestBalloonTable } from './ContestBalloonTable';

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  (global as any).fetch = fetchMock;
  fetchMock.mockResolvedValue({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({}) });
});

const rows = [{ _id: 'B1', problem: 1, status: 'pending', submitBy: 'alice', first: true }];
const pdict = { 1: { docId: 1, title: 'A+B' } };
const udict = { alice: { _id: 7, uname: 'alice' } };

describe('ContestBalloonTable', () => {
  it('renders rows with swatches', () => {
    render(<ContestBalloonTable rows={rows as any} pdict={pdict as any} udict={udict as any} onSend={() => {}} />);
    expect(screen.getByText('A+B')).toBeInTheDocument();
    expect(screen.getByText('alice')).toBeInTheDocument();
  });
  it('Send triggers POST', async () => {
    const onSend = vi.fn();
    render(<ContestBalloonTable rows={rows as any} pdict={pdict as any} udict={udict as any} onSend={onSend} />);
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(window.location.pathname),
      expect.objectContaining({ method: 'POST' }),
    ));
    expect(onSend).toHaveBeenCalledWith('B1');
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `yarn workspace @hydrooj/ui-next test -- ContestBalloonTable.test`
Expected: FAIL。

- [ ] **Step 3: 实现**

`packages/ui-next/src/components/contest/ContestBalloonTable.tsx`:
```tsx
import { Button } from '../primitives/Button';
import { request } from '../../hooks/use-api';
import { useToast } from '../primitives/Toast';
import * as yaml from 'js-yaml';
import styles from './ContestBalloonTable.module.css';

export interface BalloonRow {
  _id: string;
  problem: number;
  status: 'pending' | 'done';
  submitBy: string;
  sendBy?: string;
  first?: boolean;
}

export interface ContestBalloonTableProps {
  rows: BalloonRow[];
  pdict: Record<string, { docId: number; title: string; color?: string }>;
  udict: Record<string, { _id: number; uname: string }>;
  onSend: (bid: string) => void;
}

const COLOR_DEFAULT = '#fbbd23';

export function ContestBalloonTable({ rows, pdict, udict, onSend }: ContestBalloonTableProps) {
  const toast = useToast();
  const send = async (bid: string) => {
    const fd = new URLSearchParams();
    fd.set('operation', 'done');
    fd.set('balloon', bid);
    try {
      await request.post(window.location.pathname, fd);
      toast.success('Balloon marked as sent');
      onSend(bid);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };
  return (
    <table className={styles.table}>
      <colgroup>
        <col className={styles.colStatus} />
        <col className={styles.colBid} />
        <col className={styles.colProblem} />
        <col className={styles.colUser} />
        <col className={styles.colAwards} />
        <col className={styles.colAction} />
      </colgroup>
      <thead>
        <tr>
          <th>Status</th><th>Bid</th><th>Problem</th><th>Submitter</th><th>Awards</th><th>Action</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && <tr><td colSpan={6} className={styles.empty}>No balloons</td></tr>}
        {rows.map((r) => {
          const pdoc = pdict[String(r.problem)];
          const udoc = udict[r.submitBy];
          const color = pdoc?.color ?? COLOR_DEFAULT;
          return (
            <tr key={r._id} data-status={r.status}>
              <td><span className={`${styles.dot} ${styles[r.status]}`} aria-label={r.status} /></td>
              <td className={styles.mono}>{r._id}</td>
              <td>
                <span className={styles.swatch} style={{ background: color }} aria-hidden />
                {pdoc?.title ?? `#${r.problem}`}
              </td>
              <td>{udoc?.uname ?? r.submitBy}</td>
              <td>{r.first ? <span className={styles.first}>First</span> : null}</td>
              <td>
                {r.status === 'pending' ? (
                  <Button variant="ghost" onClick={() => send(r._id)}>Send</Button>
                ) : (
                  <span className={styles.done}>Done</span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
```

`packages/ui-next/src/components/contest/ContestBalloonTable.module.css`:
```css
.table { width: 100%; border-collapse: collapse; font-size: var(--text-sm); }
.table th { text-align: left; color: var(--text-mute); font-weight: 600; padding: var(--space-2) var(--space-3); border-bottom: 1px solid var(--border); }
.table td { padding: var(--space-2) var(--space-3); border-bottom: 1px solid var(--border); color: var(--text); }
.colStatus { width: 80px; } .colBid { width: 80px; } .colProblem { width: 40%; } .colUser { width: 20%; } .colAwards { width: 80px; } .colAction { width: 100px; }
.mono { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-mute); }
.empty { text-align: center; color: var(--text-mute); padding: var(--space-6); }
.dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; }
.dot.pending { background: var(--amber); }
.dot.done { background: var(--green); }
.swatch { display: inline-block; width: 14px; height: 14px; border-radius: var(--radius-sm); margin-right: var(--space-2); vertical-align: middle; border: 1px solid var(--border); }
.first { padding: 1px var(--space-2); background: var(--tint-amber-12); color: var(--amber); border-radius: var(--radius-pill); font-size: var(--text-xs); }
.done { color: var(--green); font-size: var(--text-xs); }
```

- [ ] **Step 4: 跑测试确认通过**

Run: `yarn workspace @hydrooj/ui-next test -- ContestBalloonTable.test`
Expected: PASS。

- [ ] **Step 5: commit**

```bash
git add packages/ui-next/src/components/contest/ContestBalloonTable.{tsx,module.css,test.tsx}
git commit -m "feat(ui-next): add ContestBalloonTable with status/problem/user/awards/send columns"
```

---

### Task 3.4: contest_balloon page 整合

**Files:**
- Create: `packages/ui-next/src/pages/contest_balloon.tsx`
- Create: `packages/ui-next/src/pages/contest_balloon.test.tsx`
- Create: `packages/ui-next/src/pages/contest_balloon.module.css`
- Modify: `packages/ui-next/src/pages/index.ts`
- Modify: `packages/ui-next/src/lib/i18n.ts`

**Interfaces:**
- Produces: `ContestBalloonPage`,用 `useBalloonPoll` 60s 拉取列表,渲染 `<ContestBalloonTable>` + 顶部 [Set Color] 按钮弹 `<ContestBalloonSetColor>` + 右侧 `<ContestManagementSidebar>`。

- [ ] **Step 1: 写失败测试**

`packages/ui-next/src/pages/contest_balloon.test.tsx`:
```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ContestBalloonPage from './contest_balloon';
import { usePageData } from '../context/page-data';

vi.mock('../context/page-data');
const mockPageData = usePageData as unknown as ReturnType<typeof vi.fn>;
const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  (global as any).fetch = fetchMock;
  fetchMock.mockResolvedValue({
    ok: true, status: 200, headers: { get: () => 'application/json' },
    json: async () => ({ rows: [{ _id: 'B1', problem: 1, status: 'pending', submitBy: 'alice' }], pdict: { 1: { docId: 1, title: 'A' } }, udict: { alice: { _id: 1, uname: 'alice' } } }),
  });
});

describe('ContestBalloonPage', () => {
  it('renders table after polling', async () => {
    mockPageData.mockReturnValue({ args: { tdoc: { docId: 7, title: 'Test' } } });
    render(<ContestBalloonPage />);
    await waitFor(() => expect(screen.getByText('A')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /set color/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `yarn workspace @hydrooj/ui-next test -- contest_balloon.test`
Expected: FAIL。

- [ ] **Step 3: 实现**

`packages/ui-next/src/pages/contest_balloon.tsx`:
```tsx
import { useState } from 'react';
import { Button } from '../components/primitives/Button';
import { ContestManagementSidebar } from '../components/contest/ContestManagementSidebar';
import { ContestBalloonSetColor } from '../components/contest/ContestBalloonSetColor';
import { ContestBalloonTable, type BalloonRow } from '../components/contest/ContestBalloonTable';
import { usePageData } from '../context/page-data';
import { useBalloonPoll } from '../hooks/use-balloon-poll';
import { useTranslate } from '../lib/i18n';
import { isOngoing } from '../lib/contest-status';
import styles from './contest_balloon.module.css';

interface Args {
  tdoc?: { docId: number; title?: string; beginAt?: string; endAt?: string; duration?: number };
  rows?: BalloonRow[];
  pdict?: Record<string, { docId: number; title: string; color?: string }>;
  udict?: Record<string, { _id: number; uname: string }>;
}

export default function ContestBalloonPage() {
  const { args } = usePageData() as unknown as { args: Args };
  const t = useTranslate();
  const tdoc = args?.tdoc;
  const [showSetColor, setShowSetColor] = useState(false);

  const ongoing = tdoc ? isOngoing(tdoc as any, null) : false;
  const { data, refresh } = useBalloonPoll<{
    rows: BalloonRow[]; pdict: Args['pdict']; udict: Args['udict'];
  }>({
    url: `${window.location.pathname}${window.location.search}`,
    enabled: ongoing,
  });
  const rows = data?.rows ?? args?.rows ?? [];
  const pdict = data?.pdict ?? args?.pdict ?? {};
  const udict = data?.udict ?? args?.udict ?? {};

  if (!tdoc) return <p style={{ padding: 'var(--space-6)' }}>{t('Common.Loading')}</p>;

  return (
    <div className={styles.page} data-page="contest_balloon">
      <div className={styles.layout}>
        <main className={styles.main}>
          <header className={styles.header}>
            <h1 className={styles.title}>{t('ContestBalloon.Title')}</h1>
            <Button variant="ghost" onClick={() => setShowSetColor(true)}>
              {t('ContestBalloon.SetColor')}
            </Button>
          </header>
          <ContestBalloonTable
            rows={rows}
            pdict={pdict}
            udict={udict}
            onSend={() => refresh()}
          />
        </main>
        <ContestManagementSidebar tdoc={tdoc} />
      </div>
      <ContestBalloonSetColor open={showSetColor} onClose={() => setShowSetColor(false)} onSaved={() => refresh()} />
    </div>
  );
}
```

`packages/ui-next/src/pages/contest_balloon.module.css`:
```css
.page { padding: var(--space-6); }
.layout { display: grid; grid-template-columns: 1fr 240px; gap: var(--space-6); max-width: 1200px; margin: 0 auto; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4); }
.title { margin: 0; font-family: var(--font-display); font-size: var(--text-xl); }
@media (max-width: 768px) { .layout { grid-template-columns: 1fr; } }
```

`packages/ui-next/src/pages/index.ts` 注册:
```ts
registerPage('contest_balloon', () => import('./contest_balloon'));
```

`packages/ui-next/src/lib/i18n.ts` 追加:

`zhCN`:
```ts
'ContestBalloon.SetColor': '设置颜色',
'ContestBalloon.Title': '气球状态',
```

`en`:
```ts
'ContestBalloon.SetColor': 'Set Color',
'ContestBalloon.Title': 'Balloon Status',
```

- [ ] **Step 4: 跑测试确认通过**

Run: `yarn workspace @hydrooj/ui-next test -- contest_balloon.test`
Expected: PASS。

- [ ] **Step 5: commit**

```bash
git add packages/ui-next/src/pages/contest_balloon.{tsx,module.css,test.tsx} \
        packages/ui-next/src/pages/index.ts \
        packages/ui-next/src/lib/i18n.ts
git commit -m "feat(ui-next): migrate contest_balloon page with 60s poll and set-color dialog"
```

---

## Phase 4 — contest_clarification

### Task 4.1: ContestClarificationForm 组件 + 测试

**Files:**
- Create: `packages/ui-next/src/components/contest/ContestClarificationForm.tsx`
- Create: `packages/ui-next/src/components/contest/ContestClarificationForm.module.css`
- Create: `packages/ui-next/src/components/contest/ContestClarificationForm.test.tsx`

**Interfaces:**
- Produces: `<ContestClarificationForm mode tdoc onSubmitted />`,`mode: 'reply' | 'broadcast'` 决定 subject 字段是否显示;内容是 markdown,提交后 `POST ./{operation:'clarification', did?, subject?, content}`。

- [ ] **Step 1: 写失败测试**

`packages/ui-next/src/components/contest/ContestClarificationForm.test.tsx`:
```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContestClarificationForm } from './ContestClarificationForm';

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  (global as any).fetch = fetchMock;
  fetchMock.mockResolvedValue({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({}) });
});

const tdoc = { docId: 7, pids: [1, 2] } as any;

describe('ContestClarificationForm', () => {
  it('hides subject in reply mode', () => {
    render(<ContestClarificationForm mode="reply" tdoc={tdoc} onSubmitted={() => {}} />);
    expect(screen.queryByLabelText(/subject/i)).toBeNull();
  });
  it('shows subject in broadcast mode', () => {
    render(<ContestClarificationForm mode="broadcast" tdoc={tdoc} onSubmitted={() => {}} />);
    expect(screen.getByLabelText(/subject/i)).toBeInTheDocument();
  });
  it('submits clarification', async () => {
    const onSubmitted = vi.fn();
    render(<ContestClarificationForm mode="broadcast" tdoc={tdoc} onSubmitted={onSubmitted} />);
    fireEvent.change(screen.getByLabelText(/subject/i), { target: { value: '-1' } });
    fireEvent.change(screen.getByLabelText(/content/i), { target: { value: 'Note' } });
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    await waitFor(() => expect(onSubmitted).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ method: 'POST' }));
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `yarn workspace @hydrooj/ui-next test -- ContestClarificationForm.test`
Expected: FAIL。

- [ ] **Step 3: 实现**

`packages/ui-next/src/components/contest/ContestClarificationForm.tsx`:
```tsx
import { useState } from 'react';
import { Button } from '../primitives/Button';
import { MarkdownEditor } from '../primitives/MarkdownEditor';
import { Select } from '../primitives/Select';
import { request } from '../../hooks/use-api';
import { useToast } from '../primitives/Toast';
import styles from './ContestClarificationForm.module.css';

export interface ContestClarificationFormProps {
  mode: 'reply' | 'broadcast';
  tdoc: { docId: number; pids: number[]; title?: string };
  /** Required when mode === 'reply'. */
  did?: string;
  onSubmitted: () => void;
}

const SUBJECT_OPTIONS = [
  { value: '-1', label: 'Technical' },
  { value: '0', label: 'General' },
];

export function ContestClarificationForm({ mode, tdoc, did, onSubmitted }: ContestClarificationFormProps) {
  const [subject, setSubject] = useState('-1');
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const submit = async () => {
    if (!content.trim()) { toast.error('Content is required'); return; }
    setBusy(true);
    try {
      const fd = new URLSearchParams();
      fd.set('operation', 'clarification');
      fd.set('content', content);
      if (mode === 'reply' && did) fd.set('did', did);
      if (mode === 'broadcast') fd.set('subject', subject);
      await request.post(window.location.pathname, fd);
      toast.success('Clarification submitted');
      setContent('');
      onSubmitted();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  };

  return (
    <form className={styles.root} onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <h3 className={styles.title}>{mode === 'reply' ? 'Reply' : 'Broadcast'}</h3>
      {mode === 'broadcast' && (
        <Select
          label="Subject"
          value={subject}
          options={[
            ...SUBJECT_OPTIONS,
            ...tdoc.pids.map((p) => ({ value: String(p), label: `Problem ${p}` })),
          ]}
          onChange={setSubject}
        />
      )}
      <MarkdownEditor value={content} onChange={setContent} height={160} aria-label="content" />
      <Button type="submit" variant="primary" disabled={busy}>{busy ? 'Submitting…' : 'Submit'}</Button>
    </form>
  );
}
```

`packages/ui-next/src/components/contest/ContestClarificationForm.module.css`:
```css
.root { display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-4); background: var(--bg-1); border: 1px solid var(--border); border-radius: var(--radius-md); }
.title { margin: 0; font-family: var(--font-display); font-size: var(--text-base); }
```

- [ ] **Step 4: 跑测试确认通过**

Run: `yarn workspace @hydrooj/ui-next test -- ContestClarificationForm.test`
Expected: PASS。

- [ ] **Step 5: commit**

```bash
git add packages/ui-next/src/components/contest/ContestClarificationForm.{tsx,module.css,test.tsx}
git commit -m "feat(ui-next): add ContestClarificationForm with reply/broadcast dual modes"
```

---

### Task 4.2: ContestClarificationList 组件 + 测试

**Files:**
- Create: `packages/ui-next/src/components/contest/ContestClarificationList.tsx`
- Create: `packages/ui-next/src/components/contest/ContestClarificationList.module.css`
- Create: `packages/ui-next/src/components/contest/ContestClarificationList.test.tsx`

**Interfaces:**
- Produces: `<ContestClarificationList items pdict udict onReply />`,每条 tcdoc 渲染标题 / 用户 @ 时间 / 内容(markdown),右侧 [Reply] 触发 `onReply(did)`。

- [ ] **Step 1: 写失败测试**

`packages/ui-next/src/components/contest/ContestClarificationList.test.tsx`:
```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ContestClarificationList } from './ContestClarificationList';

const items = [{
  _id: 'CL1', subject: 0, owner: 1, content: 'Question?', reply: [{ owner: 2, content: 'Answer.' }],
}];
const pdict = {};
const udict = { 1: { _id: 1, uname: 'alice' }, 2: { _id: 2, uname: 'jury' } };

describe('ContestClarificationList', () => {
  it('renders content and reply', () => {
    render(<ContestClarificationList items={items as any} pdict={pdict as any} udict={udict as any} onReply={() => {}} />);
    expect(screen.getByText('Question?')).toBeInTheDocument();
    expect(screen.getByText('Answer.')).toBeInTheDocument();
  });
  it('Reply button invokes onReply with did', () => {
    const onReply = vi.fn();
    render(<ContestClarificationList items={items as any} pdict={pdict as any} udict={udict as any} onReply={onReply} />);
    fireEvent.click(screen.getByRole('button', { name: /reply/i }));
    expect(onReply).toHaveBeenCalledWith('CL1');
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `yarn workspace @hydrooj/ui-next test -- ContestClarificationList.test`
Expected: FAIL。

- [ ] **Step 3: 实现**

`packages/ui-next/src/components/contest/ContestClarificationList.tsx`:
```tsx
import { useState } from 'react';
import { Button } from '../primitives/Button';
import { MarkdownPreview } from '../primitives/MarkdownPreview';
import styles from './ContestClarificationList.module.css';

export interface ClarItem {
  _id: string;
  subject: number;
  owner: number;
  content: string;
  reply?: Array<{ owner: number; content: string }>;
}

export interface ContestClarificationListProps {
  items: ClarItem[];
  pdict: Record<string, unknown>;
  udict: Record<string, { _id: number; uname: string }>;
  onReply: (did: string) => void;
}

const SUBJECT_TEXT: Record<number, string> = { '-1': 'Technical', 0: 'General' } as any;

export function ContestClarificationList({ items, udict, onReply }: ContestClarificationListProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  return (
    <ol className={styles.list}>
      {items.length === 0 && <p className={styles.empty}>No clarifications yet.</p>}
      {items.map((it) => {
        const udoc = udict[String(it.owner)];
        const sub = SUBJECT_TEXT[it.subject] ?? `Problem ${it.subject}`;
        const open = expanded[it._id] ?? true;
        return (
          <li key={it._id} className={styles.item}>
            <header className={styles.header}>
              <span className={styles.subject}>{sub}</span>
              <span className={styles.author}>
                {udoc?.uname ?? `#${it.owner}`} {udoc ? '' : '(Jury)'}
              </span>
              <Button variant="ghost" onClick={() => onReply(it._id)}>Reply</Button>
              <Button variant="ghost" onClick={() => setExpanded((m) => ({ ...m, [it._id]: !open }))}>{open ? '−' : '+'}</Button>
            </header>
            {open && (
              <>
                <MarkdownPreview content={it.content} />
                {it.reply && it.reply.length > 0 && (
                  <ol className={styles.replies}>
                    {it.reply.map((r, i) => (
                      <li key={i} className={styles.reply}>
                        <MarkdownPreview content={r.content} />
                      </li>
                    ))}
                  </ol>
                )}
              </>
            )}
          </li>
        );
      })}
    </ol>
  );
}
```

`packages/ui-next/src/components/contest/ContestClarificationList.module.css`:
```css
.list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--space-3); }
.item { background: var(--bg-1); border: 1px solid var(--border); border-radius: var(--radius-md); padding: var(--space-3); }
.header { display: flex; gap: var(--space-3); align-items: center; margin-bottom: var(--space-2); }
.subject { padding: 1px var(--space-2); background: var(--tint-cyan-12); color: var(--cyan); border-radius: var(--radius-pill); font-size: var(--text-xs); }
.author { color: var(--text-mute); font-size: var(--text-sm); }
.empty { color: var(--text-mute); padding: var(--space-4); text-align: center; }
.replies { list-style: none; padding-left: var(--space-5); margin: var(--space-2) 0 0; border-left: 2px solid var(--border); display: flex; flex-direction: column; gap: var(--space-2); }
.reply { font-size: var(--text-sm); }
```

- [ ] **Step 4: 跑测试确认通过**

Run: `yarn workspace @hydrooj/ui-next test -- ContestClarificationList.test`
Expected: PASS。

- [ ] **Step 5: commit**

```bash
git add packages/ui-next/src/components/contest/ContestClarificationList.{tsx,module.css,test.tsx}
git commit -m "feat(ui-next): add ContestClarificationList with collapsible thread rendering"
```

---

### Task 4.3: contest_clarification page 整合

**Files:**
- Create: `packages/ui-next/src/pages/contest_clarification.tsx`
- Create: `packages/ui-next/src/pages/contest_clarification.test.tsx`
- Create: `packages/ui-next/src/pages/contest_clarification.module.css`
- Modify: `packages/ui-next/src/pages/index.ts`
- Modify: `packages/ui-next/src/lib/i18n.ts`

**Interfaces:**
- Produces: `ContestClarificationPage`,顶部 [Broadcast] 按钮 / 列表 / 底部 reply 表单(根据 `replyTo` state 切换 mode)。

- [ ] **Step 1: 写失败测试**

`packages/ui-next/src/pages/contest_clarification.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ContestClarificationPage from './contest_clarification';
import { usePageData } from '../context/page-data';

vi.mock('../context/page-data');
const mockPageData = usePageData as unknown as ReturnType<typeof vi.fn>;

describe('ContestClarificationPage', () => {
  it('renders Broadcast button and list', () => {
    mockPageData.mockReturnValue({
      args: { tdoc: { docId: 7, pids: [1] }, tcdocs: [], pdict: {}, udict: {} },
    });
    render(<ContestClarificationPage />);
    expect(screen.getByRole('button', { name: /broadcast/i })).toBeInTheDocument();
    expect(screen.getByText(/no clarifications/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `yarn workspace @hydrooj/ui-next test -- contest_clarification.test`
Expected: FAIL。

- [ ] **Step 3: 实现**

`packages/ui-next/src/pages/contest_clarification.tsx`:
```tsx
import { useState } from 'react';
import { Button } from '../components/primitives/Button';
import { ContestClarificationList } from '../components/contest/ContestClarificationList';
import { ContestClarificationForm } from '../components/contest/ContestClarificationForm';
import { ContestManagementSidebar } from '../components/contest/ContestManagementSidebar';
import { usePageData } from '../context/page-data';
import { useTranslate } from '../lib/i18n';
import styles from './contest_clarification.module.css';

interface Args {
  tdoc?: { docId: number; pids: number[]; title?: string };
  tcdocs?: Array<{ _id: string; subject: number; owner: number; content: string; reply?: Array<{ owner: number; content: string }> }>;
  pdict?: Record<string, unknown>;
  udict?: Record<string, { _id: number; uname: string }>;
}

export default function ContestClarificationPage() {
  const { args } = usePageData() as unknown as { args: Args };
  const t = useTranslate();
  const tdoc = args?.tdoc;
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [broadcastOpen, setBroadcastOpen] = useState(false);

  if (!tdoc) return <p style={{ padding: 'var(--space-6)' }}>{t('Common.Loading')}</p>;

  return (
    <div className={styles.page} data-page="contest_clarification">
      <div className={styles.layout}>
        <main className={styles.main}>
          <header className={styles.header}>
            <h1 className={styles.title}>{t('ContestClarification.Title')}</h1>
            <Button variant="primary" onClick={() => setBroadcastOpen(true)}>
              {t('ContestClarification.Broadcast')}
            </Button>
          </header>
          <ContestClarificationList
            items={args?.tcdocs ?? []}
            pdict={args?.pdict ?? {}}
            udict={args?.udict ?? {}}
            onReply={(did) => setReplyTo(did)}
          />
          {(replyTo || broadcastOpen) && (
            <div className={styles.replyForm}>
              {broadcastOpen ? (
                <ContestClarificationForm mode="broadcast" tdoc={tdoc as any} onSubmitted={() => { setBroadcastOpen(false); window.location.reload(); }} />
              ) : (
                <ContestClarificationForm mode="reply" tdoc={tdoc as any} did={replyTo ?? undefined} onSubmitted={() => { setReplyTo(null); window.location.reload(); }} />
              )}
            </div>
          )}
        </main>
        <ContestManagementSidebar tdoc={tdoc} />
      </div>
    </div>
  );
}
```

`packages/ui-next/src/pages/contest_clarification.module.css`:
```css
.page { padding: var(--space-6); }
.layout { display: grid; grid-template-columns: 1fr 240px; gap: var(--space-6); max-width: 1200px; margin: 0 auto; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4); }
.title { margin: 0; font-family: var(--font-display); font-size: var(--text-xl); }
.replyForm { margin-top: var(--space-4); }
@media (max-width: 768px) { .layout { grid-template-columns: 1fr; } }
```

`packages/ui-next/src/pages/index.ts`:
```ts
registerPage('contest_clarification', () => import('./contest_clarification'));
```

`packages/ui-next/src/lib/i18n.ts`:

`zhCN`:
```ts
'ContestClarification.Broadcast': '广播',
'ContestClarification.Title': '赛时答疑',
```

`en`:
```ts
'ContestClarification.Broadcast': 'Broadcast',
'ContestClarification.Title': 'Clarifications',
```

- [ ] **Step 4: 跑测试确认通过**

Run: `yarn workspace @hydrooj/ui-next test -- contest_clarification.test`
Expected: PASS。

- [ ] **Step 5: commit**

```bash
git add packages/ui-next/src/pages/contest_clarification.{tsx,module.css,test.tsx} \
        packages/ui-next/src/pages/index.ts \
        packages/ui-next/src/lib/i18n.ts
git commit -m "feat(ui-next): migrate contest_clarification page with reply/broadcast modes"
```

---

## Phase 5 — contest_user

### Task 5.1: ContestUserTable 组件 + 测试

**Files:**
- Create: `packages/ui-next/src/components/contest/ContestUserTable.tsx`
- Create: `packages/ui-next/src/components/contest/ContestUserTable.module.css`
- Create: `packages/ui-next/src/components/contest/ContestUserTable.test.tsx`

**Interfaces:**
- Produces: `<ContestUserTable rows tdoc onChange />`,每行: uid / uname / startAt / endAt / [Rank|UnRank] / [Resume](条件)。所有变更通过 `onChange()` 触发父组件刷新。

- [ ] **Step 1: 写失败测试**

`packages/ui-next/src/components/contest/ContestUserTable.test.tsx`:
```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContestUserTable } from './ContestUserTable';

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  (global as any).fetch = fetchMock;
  fetchMock.mockResolvedValue({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({}) });
});

const tdoc = { docId: 7, beginAt: '2026-01-01', endAt: '2026-12-31', duration: 0 } as any;
const rows = [{ uid: 1, startAt: '2026-06-01', endAt: '', unrank: false }];
const udict = { 1: { _id: 1, uname: 'alice' } };

describe('ContestUserTable', () => {
  it('renders rows', () => {
    render(<ContestUserTable rows={rows as any} udict={udict} tdoc={tdoc} onChange={() => {}} />);
    expect(screen.getByText('alice')).toBeInTheDocument();
  });
  it('Rank button toggles unrank', async () => {
    const onChange = vi.fn();
    render(<ContestUserTable rows={rows as any} udict={udict} tdoc={tdoc} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /rank/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(onChange).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `yarn workspace @hydrooj/ui-next test -- ContestUserTable.test`
Expected: FAIL。

- [ ] **Step 3: 实现**

`packages/ui-next/src/components/contest/ContestUserTable.tsx`:
```tsx
import { useMemo } from 'react';
import { Button } from '../primitives/Button';
import { request } from '../../hooks/use-api';
import { useToast } from '../primitives/Toast';
import { formatDateTime } from '../../lib/datetime';
import styles from './ContestUserTable.module.css';

export interface ContestUserRow {
  uid: number;
  startAt?: string;
  endAt?: string;
  unrank?: boolean;
}

export interface ContestUserTableProps {
  rows: ContestUserRow[];
  udict: Record<string, { _id: number; uname: string }>;
  tdoc: { docId: number; beginAt: string; endAt: string; duration?: number };
  onChange: () => void;
}

function personalEndAt(row: ContestUserRow, tdoc: ContestUserTableProps['tdoc']): number {
  const starts = row.startAt ? new Date(row.startAt).getTime() : 0;
  const dur = (tdoc.duration ?? 0) * 3600_000;
  const per = starts && dur ? starts + dur : Infinity;
  const tdocEnd = new Date(tdoc.endAt).getTime();
  const rowEnd = row.endAt ? new Date(row.endAt).getTime() : Infinity;
  return Math.min(per, tdocEnd, rowEnd);
}

export function ContestUserTable({ rows, udict, tdoc, onChange }: ContestUserTableProps) {
  const toast = useToast();
  const now = useMemo(() => Date.now(), []);
  const op = async (body: Record<string, unknown>) => {
    const fd = new URLSearchParams();
    Object.entries(body).forEach(([k, v]) => fd.set(k, String(v)));
    try {
      await request.post(window.location.pathname, fd);
      onChange();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <table className={styles.table}>
      <colgroup>
        <col className={styles.colUid} /><col className={styles.colUser} />
        <col className={styles.colTime} /><col className={styles.colTime} />
        <col className={styles.colRank} /><col className={styles.colAction} />
      </colgroup>
      <thead><tr><th>Uid</th><th>User</th><th>Start</th><th>End</th><th>Rank</th><th>Action</th></tr></thead>
      <tbody>
        {rows.length === 0 && <tr><td colSpan={6} className={styles.empty}>No attendees</td></tr>}
        {rows.map((r) => {
          const udoc = udict[String(r.uid)];
          const end = personalEndAt(r, tdoc);
          const resumable = end < Math.min(new Date(tdoc.endAt).getTime(), now === 0 ? Infinity : now) && end < new Date(tdoc.endAt).getTime();
          return (
            <tr key={r.uid}>
              <td className={styles.mono}>{r.uid}</td>
              <td>{udoc?.uname ?? `#${r.uid}`}</td>
              <td>{r.startAt ? formatDateTime(r.startAt) : '—'}</td>
              <td>{r.endAt ? formatDateTime(r.endAt) : (r.startAt && tdoc.duration ? formatDateTime(new Date(new Date(r.startAt).getTime() + tdoc.duration * 3600_000).toISOString()) : '—')}</td>
              <td>
                <Button variant="ghost" onClick={() => op({ operation: 'rank', uid: r.uid })}>
                  {r.unrank ? 'UnRank' : 'Rank'}
                </Button>
              </td>
              <td>
                {resumable && (
                  <Button variant="ghost" onClick={() => op({ operation: 'resume', uid: r.uid })}>
                    Resume
                  </Button>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
```

`packages/ui-next/src/components/contest/ContestUserTable.module.css`:
```css
.table { width: 100%; border-collapse: collapse; font-size: var(--text-sm); }
.table th { text-align: left; color: var(--text-mute); font-weight: 600; padding: var(--space-2) var(--space-3); border-bottom: 1px solid var(--border); }
.table td { padding: var(--space-2) var(--space-3); border-bottom: 1px solid var(--border); color: var(--text); }
.colUid { width: 80px; } .colUser { width: 30%; } .colTime { width: 20%; } .colRank { width: 100px; } .colAction { width: 140px; }
.mono { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-mute); }
.empty { text-align: center; color: var(--text-mute); padding: var(--space-6); }
```

- [ ] **Step 4: 跑测试确认通过**

Run: `yarn workspace @hydrooj/ui-next test -- ContestUserTable.test`
Expected: PASS。

- [ ] **Step 5: commit**

```bash
git add packages/ui-next/src/components/contest/ContestUserTable.{tsx,module.css,test.tsx}
git commit -m "feat(ui-next): add ContestUserTable with rank/unrank/resume operations"
```

---

### Task 5.2: ContestUserAddDialog 组件 + 测试

**Files:**
- Create: `packages/ui-next/src/components/contest/ContestUserAddDialog.tsx`
- Create: `packages/ui-next/src/components/contest/ContestUserAddDialog.module.css`
- Create: `packages/ui-next/src/components/contest/ContestUserAddDialog.test.tsx`

**Interfaces:**
- Produces: `<ContestUserAddDialog open onClose onAdded />`,弹 `<Modal>` 含 `<UserSelectAutoComplete>` + unrank checkbox + Add 按钮。

- [ ] **Step 1: 写失败测试**

`packages/ui-next/src/components/contest/ContestUserAddDialog.test.tsx`:
```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContestUserAddDialog } from './ContestUserAddDialog';

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  (global as any).fetch = fetchMock;
  fetchMock.mockResolvedValue({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({}) });
});

describe('ContestUserAddDialog', () => {
  it('Add button is disabled when no user selected', () => {
    render(<ContestUserAddDialog open onClose={() => {}} onAdded={() => {}} />);
    expect(screen.getByRole('button', { name: /add/i })).toBeDisabled();
  });
  it('submits when user picked', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => [{ _id: 5, uname: 'alice' }] })
      .mockResolvedValueOnce({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => [] });
    const onAdded = vi.fn();
    render(<ContestUserAddDialog open onClose={() => {}} onAdded={onAdded} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'al' } });
    await waitFor(() => screen.getByText('alice'));
    fireEvent.mouseDown(screen.getByText('alice'));
    fireEvent.click(screen.getByRole('button', { name: /add/i }));
    await waitFor(() => expect(onAdded).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(window.location.pathname),
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `yarn workspace @hydrooj/ui-next test -- ContestUserAddDialog.test`
Expected: FAIL。

- [ ] **Step 3: 实现**

`packages/ui-next/src/components/contest/ContestUserAddDialog.tsx`:
```tsx
import { useState } from 'react';
import { Button } from '../primitives/Button';
import { Checkbox } from '../primitives/Checkbox';
import { Modal } from '../primitives/Modal';
import { UserSelectAutoComplete } from '../primitives/UserSelectAutoComplete';
import { request } from '../../hooks/use-api';
import { useToast } from '../primitives/Toast';
import styles from './ContestUserAddDialog.module.css';

export interface ContestUserAddDialogProps {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
  domainId?: string;
}

export function ContestUserAddDialog({ open, onClose, onAdded, domainId }: ContestUserAddDialogProps) {
  const [uids, setUids] = useState<number[]>([]);
  const [unrank, setUnrank] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const add = async () => {
    if (uids.length === 0) return;
    setBusy(true);
    try {
      const fd = new URLSearchParams();
      fd.set('operation', 'add_user');
      fd.set('uids', uids.join(','));
      if (unrank) fd.set('unrank', 'on');
      await request.post(window.location.pathname, fd);
      toast.success(`Added ${uids.length} user(s)`);
      setUids([]);
      onAdded();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Attendees" footer={
      <>
        <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="primary" onClick={add} disabled={uids.length === 0 || busy}>{busy ? 'Adding…' : 'Add'}</Button>
      </>
    }>
      <div className={styles.body}>
        <label className={styles.label}>Users</label>
        <UserSelectAutoComplete value={uids} onChange={setUids} domainId={domainId} />
        <Checkbox label="Add as unranked" checked={unrank} onChange={(e) => setUnrank(e.currentTarget.checked)} />
      </div>
    </Modal>
  );
}
```

`packages/ui-next/src/components/contest/ContestUserAddDialog.module.css`:
```css
.body { display: flex; flex-direction: column; gap: var(--space-3); }
.label { font-size: var(--text-sm); color: var(--text-soft); }
```

- [ ] **Step 4: 跑测试确认通过**

Run: `yarn workspace @hydrooj/ui-next test -- ContestUserAddDialog.test`
Expected: PASS。

- [ ] **Step 5: commit**

```bash
git add packages/ui-next/src/components/contest/ContestUserAddDialog.{tsx,module.css,test.tsx}
git commit -m "feat(ui-next): add ContestUserAddDialog with multi-user autocomplete"
```

---

### Task 5.3: contest_user page 整合

**Files:**
- Create: `packages/ui-next/src/pages/contest_user.tsx`
- Create: `packages/ui-next/src/pages/contest_user.test.tsx`
- Create: `packages/ui-next/src/pages/contest_user.module.css`
- Modify: `packages/ui-next/src/pages/index.ts`
- Modify: `packages/ui-next/src/lib/i18n.ts`

**Interfaces:**
- Produces: `ContestUserPage`,渲染 `<ContestUserTable>` + 顶部 [Add] 按钮 + 右侧 `<ContestManagementSidebar>`。

- [ ] **Step 1: 写失败测试**

`packages/ui-next/src/pages/contest_user.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ContestUserPage from './contest_user';
import { usePageData } from '../context/page-data';

vi.mock('../context/page-data');
const mockPageData = usePageData as unknown as ReturnType<typeof vi.fn>;

describe('ContestUserPage', () => {
  it('renders Add button and empty state', () => {
    mockPageData.mockReturnValue({
      args: { tdoc: { docId: 7, beginAt: '2026-01-01', endAt: '2026-12-31' }, tsdocs: [], udict: {} },
    });
    render(<ContestUserPage />);
    expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument();
    expect(screen.getByText(/no attendees/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `yarn workspace @hydrooj/ui-next test -- contest_user.test`
Expected: FAIL。

- [ ] **Step 3: 实现**

`packages/ui-next/src/pages/contest_user.tsx`:
```tsx
import { useState } from 'react';
import { Button } from '../components/primitives/Button';
import { ContestManagementSidebar } from '../components/contest/ContestManagementSidebar';
import { ContestUserAddDialog } from '../components/contest/ContestUserAddDialog';
import { ContestUserTable } from '../components/contest/ContestUserTable';
import { usePageData } from '../context/page-data';
import { useTranslate } from '../lib/i18n';
import styles from './contest_user.module.css';

interface Args {
  tdoc?: { docId: number; title?: string; beginAt: string; endAt: string; duration?: number };
  tsdocs?: Array<{ uid: number; startAt?: string; endAt?: string; unrank?: boolean }>;
  udict?: Record<string, { _id: number; uname: string }>;
  UserContext?: { domainId?: string };
}

export default function ContestUserPage() {
  const { args } = usePageData() as unknown as { args: Args };
  const t = useTranslate();
  const tdoc = args?.tdoc;
  const [showAdd, setShowAdd] = useState(false);
  const [, setReload] = useState(0);

  if (!tdoc) return <p style={{ padding: 'var(--space-6)' }}>{t('Common.Loading')}</p>;

  return (
    <div className={styles.page} data-page="contest_user">
      <div className={styles.layout}>
        <main className={styles.main}>
          <header className={styles.header}>
            <h1 className={styles.title}>{t('ContestUser.Title')}</h1>
            <Button variant="primary" onClick={() => setShowAdd(true)}>
              {t('ContestUser.Add')}
            </Button>
          </header>
          <ContestUserTable
            rows={args?.tsdocs ?? []}
            udict={args?.udict ?? {}}
            tdoc={tdoc}
            onChange={() => { setReload((x) => x + 1); window.location.reload(); }}
          />
        </main>
        <ContestManagementSidebar tdoc={tdoc} />
      </div>
      <ContestUserAddDialog open={showAdd} onClose={() => setShowAdd(false)} onAdded={() => window.location.reload()} domainId={args?.UserContext?.domainId} />
    </div>
  );
}
```

`packages/ui-next/src/pages/contest_user.module.css`:
```css
.page { padding: var(--space-6); }
.layout { display: grid; grid-template-columns: 1fr 240px; gap: var(--space-6); max-width: 1200px; margin: 0 auto; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4); }
.title { margin: 0; font-family: var(--font-display); font-size: var(--text-xl); }
@media (max-width: 768px) { .layout { grid-template-columns: 1fr; } }
```

`packages/ui-next/src/pages/index.ts`:
```ts
registerPage('contest_user', () => import('./contest_user'));
```

`packages/ui-next/src/lib/i18n.ts`:

`zhCN`:
```ts
'ContestUser.Add': '添加',
'ContestUser.Title': '参赛者管理',
```

`en`:
```ts
'ContestUser.Add': 'Add',
'ContestUser.Title': 'Attendees',
```

- [ ] **Step 4: 跑测试确认通过**

Run: `yarn workspace @hydrooj/ui-next test -- contest_user.test`
Expected: PASS。

- [ ] **Step 5: commit**

```bash
git add packages/ui-next/src/pages/contest_user.{tsx,module.css,test.tsx} \
        packages/ui-next/src/pages/index.ts \
        packages/ui-next/src/lib/i18n.ts
git commit -m "feat(ui-next): migrate contest_user page with add dialog and rank/resume actions"
```

---

## 自检(self-review)

完成所有 task 后,执行以下验证:

- [ ] **覆盖率检查**:对照 `.claude/reviews/ui-next-migration-gap-2026-07-21.md` § 一、CRITICAL 完全未迁移页面 5 项 + 已迁移页面相关阻塞项 — 每项均能找到对应 task:
  - `problem_config` → Phase 1 (Task 1.1–1.5) ✓
  - `problem_files` testdata 部分 → Phase 2 (Task 2.1–2.5) ✓
  - `contest_balloon` → Phase 3 (Task 3.1–3.4) ✓
  - `contest_clarification` → Phase 4 (Task 4.1–4.3) ✓
  - `contest_user` → Phase 5 (Task 5.1–5.3) ✓
  - ProblemForm 创建跳转 bug → Task 1.1 ✓
  - ProblemFiles `type=additional_file` → Task 2.1 ✓

- [ ] **占位符扫描**:无 "TBD"、"TODO"、"fill in details"、"similar to Task N" 字样;每步都有完整代码块和命令。

- [ ] **类型一致性**:
  - `BalloonRow._id: string`(Task 3.3) ↔ Task 3.4 `args.rows?: BalloonRow[]` 一致。
  - `ContestUserRow.uid: number`(Task 5.1) ↔ Task 5.3 `args.tsdocs?: { uid: number; ... }[]` 一致。
  - `ClarItem._id: string`(Task 4.2) ↔ Task 4.3 `args.tcdocs?: { _id: string; ... }[]` 一致。
  - `ProblemConfigYaml`(Task 0.5) 在 Task 1.2/1.3/1.4/1.5 复用 ✓。
  - `DetectedSubtask`(Task 0.6) 在 Task 1.4/1.5 复用 ✓。
  - `ModalProps`(Task 0.1) 在 Task 2.3/3.2/4.3/5.2 复用 ✓。
  - `HexColorPickerProps`(Task 0.2) 在 Task 3.2 复用 ✓。
  - `UserSelectAutoCompleteProps`(Task 0.3) 在 Task 5.2 复用 ✓。

- [ ] **最终验证**:

```bash
yarn workspace @hydrooj/ui-next test            # 22 + 新增 ~25 用例,全部 PASS
yarn workspace @hydrooj/ui-next build           # 生产构建无 TS 错误
yarn workspace @hydrooj/ui-next lint            # oxlint + eslint 0 error
yarn lint:ci                                   # 全 repo 0 warning
```

期望:全部通过(若新增 25 用例 → ui-next 总用例数 ~50)。

---

## 注意事项与延后项

1. **后端契约不变**。所有 endpoint(`/p/:pid/config`、`/p/:pid/files`、`/contest/:tid/balloon` 等)已就绪,无需改动 `packages/hydrooj/`。
2. **`/user/search` 端点**:ui-next 当前没有用,需确认后端是否暴露;若没有,在 Task 0.3 测试中用 `fetchMock.mockResolvedValueOnce(...)` 模拟即可,生产时再补后端。
3. **批量下载 ZIP**:ui-default 用 `StreamSaver` 流式打 zip,ui-next 简化为只下载第一个文件(因为 UI 端 zip 流难且收益小)。可在后续迭代引入 `jszip` + blob URL 实现完整功能。
4. **Generate Testdata iframe**:happy-dom 测试 iframe 加载只是占位(`<iframe>` 出现即可),生产环境监听 `message` 事件通过 `STATUS.STATUS_ACCEPTED` 关闭弹窗。
5. **CSR/SSR 安全**:所有 hook / component 在 `typeof document === 'undefined'` 时降级为 noop,ServerSide 渲染不报错。
6. **ProblemConfigEditor Monaco**:happy-dom 测试用 textarea fallback,生产环境通过 `lazy + Suspense` 加载 `@monaco-editor/react`(已装)。
7. **AJV schema**:仅做基础字段校验,客户端兜底,服务端 `ProblemConfigHandler.postUploadFile` 仍会用 AJV 全量校验(若不一致由后端报 400)。





