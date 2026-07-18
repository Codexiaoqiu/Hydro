# ui-next problem_edit 完善 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 ui-next 端把 `problem_edit` / `problem_create` 页面补齐到与 ui-default 等价的体验,并把缺失的设计系统 primitive 与 monaco 编辑器补上。

**Architecture:** 服务端注入 `categoryTree` → 新增 Dropdown/ConfirmDialog/Toast/MarkdownEditor 四个 primitive → ProblemForm 接入新 primitive + monaco → 测试基线 25+ 用例。TDD + 频繁 commit。

**Tech Stack:** React 19 + TypeScript + Vite;`@monaco-editor/react` + `monaco-editor`;`vitest` + `@testing-library/react`;`js-yaml`;现有 `tokens.css` 设计语言。

**Spec:** `docs/superpowers/specs/2026-07-18-problem-edit-completion-design.md`

## File Structure

新增文件:
- `packages/hydrooj/src/lib/category.ts` — YAML → `CategoryNode[]` 解析工具
- `packages/hydrooj/tests/category.spec.ts` — 单元测试
- `packages/ui-next/src/components/primitives/Dropdown.tsx` + `.module.css`
- `packages/ui-next/src/components/primitives/Dropdown.test.tsx`
- `packages/ui-next/src/components/primitives/ConfirmDialog.tsx` + `.module.css`
- `packages/ui-next/src/components/primitives/ConfirmDialog.test.tsx`
- `packages/ui-next/src/components/primitives/Toast.tsx` + `.module.css`(含 Provider + useToast)
- `packages/ui-next/src/components/primitives/Toast.test.tsx`
- `packages/ui-next/src/components/primitives/MarkdownEditor.tsx` + `.module.css`
- `packages/ui-next/src/components/primitives/MarkdownEditor.test.tsx`
- `packages/ui-next/src/components/problem/PolyhedronHint.tsx` + `.module.css`
- `packages/ui-next/src/components/problem/ProblemForm.test.tsx`
- `packages/ui-next/src/components/problem/ProblemAdditionalFiles.test.tsx`
- `packages/ui-next/src/pages/problem_edit.test.tsx`
- `packages/ui-next/src/pages/problem_create.test.tsx`

修改文件:
- `packages/hydrooj/src/handler/problem.ts` — 两个 handler 各加 2 行
- `packages/ui-next/src/components/primitives/index.ts` — barrel 导出新 primitive
- `packages/ui-next/src/pages/app.tsx` — 挂 `<ToastProvider>`
- `packages/ui-next/src/components/problem/ProblemForm.tsx` + `.module.css`
- `packages/ui-next/src/components/problem/ProblemAdditionalFiles.tsx` + `.module.css`
- `packages/ui-next/src/lib/i18n.ts` — 新增 `ProblemForm.*` / `ProblemAdditionalFiles.*` / `Polyhedron.*` 文案
- `packages/ui-next/package.json` — 加 `@monaco-editor/react` + `monaco-editor`
- `packages/ui-next/vite.config.ts` — monaco optimizeDeps 配置
- `packages/ui-next/src/theme/theme-init.ts` — 暴露 `useColorScheme()`(若不存在)

## Global Constraints

- Node >=22, Yarn 4.6.0
- 服务端契约不变:`POST /problem/create` / `POST /p/:pid/edit`,字段 `title / content / pid / hidden / tag / difficulty`,`content` 仍是 JSON 序列化的多语言 map
- 响应体增量字段 `categoryTree` 不破坏向后兼容
- i18n key 必须双语(中 / 英),统一通过 `lib/i18n.ts` 注册
- 提交人格式 `Co-Authored-By: Claude <noreply@anthropic.com>`
- 一次性 commit 范围不超过一个 task
- TS 严格模式 + 现有 oxlint + eslint 规则 0 error
- monaco 通过 lazy import + Suspense fallback 加载;textarea 模式作为 backend 兜底

---

## Task 1: parseCategorySetting 工具 + 单元测试

**Files:**
- Create: `packages/hydrooj/src/lib/category.ts`
- Test: `packages/hydrooj/tests/category.spec.ts`

**Interfaces:**
- Consumes: 无
- Produces: `parseCategorySetting(raw: string | undefined): CategoryNode[]`,`interface CategoryNode { name: string; children?: CategoryNode[] }`

- [ ] **Step 1: 写失败测试**

`packages/hydrooj/tests/category.spec.ts`:
```ts
import { parseCategorySetting } from '../src/lib/category';

describe('parseCategorySetting', () => {
  test('returns [] for undefined', () => {
    expect(parseCategorySetting(undefined)).toEqual([]);
  });
  test('returns [] for empty string', () => {
    expect(parseCategorySetting('')).toEqual([]);
  });
  test('returns [] for invalid YAML', () => {
    expect(parseCategorySetting('{[invalid')).toEqual([]);
  });
  test('returns [] for array root', () => {
    expect(parseCategorySetting('- a\n- b')).toEqual([]);
  });
  test('parses single-level categories', () => {
    const yaml = 'A:\nB:\n';
    expect(parseCategorySetting(yaml)).toEqual([{ name: 'A' }, { name: 'B' }]);
  });
  test('parses nested categories', () => {
    const yaml = 'A:\n  - a1\n  - a2\nB:\n  - b1\n';
    expect(parseCategorySetting(yaml)).toEqual([
      { name: 'A', children: [{ name: 'a1' }, { name: 'a2' }] },
      { name: 'B', children: [{ name: 'b1' }] },
    ]);
  });
  test('filters non-string subcategories', () => {
    const yaml = 'A:\n  - a1\n  - 123\n';
    expect(parseCategorySetting(yaml)).toEqual([
      { name: 'A', children: [{ name: 'a1' }] },
    ]);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `node -r @hydrooj/register packages/hydrooj/tests/category.spec.ts`
Expected: FAIL with "Cannot find module '../src/lib/category'"

- [ ] **Step 3: 实现**

`packages/hydrooj/src/lib/category.ts`:
```ts
import yaml from 'js-yaml';

export interface CategoryNode {
  name: string;
  children?: CategoryNode[];
}

export function parseCategorySetting(raw: string | undefined): CategoryNode[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = yaml.load(raw);
  } catch {
    return [];
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return [];
  return Object.entries(parsed as Record<string, unknown>).map(([name, subs]) => ({
    name,
    children: Array.isArray(subs)
      ? subs.filter((s): s is string => typeof s === 'string' && !!s).map((s) => ({ name: s }))
      : undefined,
  }));
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `node -r @hydrooj/register packages/hydrooj/tests/category.spec.ts`
Expected: 7 passed

- [ ] **Step 5: 提交**

```bash
git add packages/hydrooj/src/lib/category.ts packages/hydrooj/tests/category.spec.ts
git commit -m "feat(hydrooj): add parseCategorySetting util with yaml support"
```

---

## Task 2: 服务端 handler 注入 categoryTree

**Files:**
- Modify: `packages/hydrooj/src/handler/problem.ts` — `ProblemEditHandler.get`(约 L617 后)、`ProblemCreateHandler.get`(约 L995 后),以及顶部 import

- [ ] **Step 1: 加 import**

在 `packages/hydrooj/src/handler/problem.ts` 顶部 import 区域,加:
```ts
import { parseCategorySetting } from '../lib/category';
```

- [ ] **Step 2: 修改 ProblemEditHandler.get**

定位到 `this.response.body.statementLangs = this.ctx.i18n.langs(false);` 这一行(在 ProblemEditHandler.get 内),在其后加:
```ts
this.response.body.categoryTree = parseCategorySetting(this.ctx.setting.get('problem.categories'));
```

- [ ] **Step 3: 修改 ProblemCreateHandler.get**

定位到 `ProblemCreateHandler.get` 内的 `this.response.body.statementLangs = this.ctx.i18n.langs(false);`,在其后加同样的两行。

- [ ] **Step 4: 跑构建**

Run: `yarn build`
Expected: 通过,无 TS 错误

- [ ] **Step 5: 端到端 smoke**

Run:
```bash
yarn start &
sleep 10
curl -s http://localhost:2333/p/<test-pid>/edit -b cookies.txt | grep -o 'categoryTree'
```
Expected: 模板的注入点(若 ui-default 模板未消费,这一字段会被忽略;只需确保没崩)。
或更精确:检查 `response.body` JSON 在 dev mode renderer 注入。

- [ ] **Step 6: 提交**

```bash
git add packages/hydrooj/src/handler/problem.ts
git commit -m "feat(hydrooj): inject categoryTree into ProblemEdit/Create handlers"
```

---

## Task 3: Dropdown primitive

**Files:**
- Create: `packages/ui-next/src/components/primitives/Dropdown.tsx`
- Create: `packages/ui-next/src/components/primitives/Dropdown.module.css`
- Create: `packages/ui-next/src/components/primitives/Dropdown.test.tsx`
- Modify: `packages/ui-next/src/components/primitives/index.ts` — 导出 Dropdown

**Interfaces:**
- Produces: `<Dropdown label open? onOpenChange? position? children />`

- [ ] **Step 1: 写失败测试**

`packages/ui-next/src/components/primitives/Dropdown.test.tsx`:
```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { Dropdown } from './Dropdown';

describe('Dropdown', () => {
  test('toggles open on trigger click', () => {
    render(<Dropdown label="Menu"><div>Item</div></Dropdown>);
    const trigger = screen.getByRole('button', { name: 'Menu' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  test('closes on outside click', () => {
    render(<div><Dropdown label="Menu"><div>Item</div></Dropdown><div data-testid="outside">outside</div></div>);
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  test('closes on Escape', () => {
    render(<Dropdown label="Menu"><div>Item</div></Dropdown>);
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  test('controlled mode respects onOpenChange', () => {
    const onOpenChange = vi.fn();
    render(<Dropdown label="Menu" open={false} onOpenChange={onOpenChange}><div>Item</div></Dropdown>);
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `yarn workspace @hydrooj/ui-next test --run Dropdown`
Expected: FAIL,模块未找到

- [ ] **Step 3: 实现组件**

`packages/ui-next/src/components/primitives/Dropdown.tsx`:
```tsx
import { useEffect, useRef, useState } from 'react';
import styles from './Dropdown.module.css';

export interface DropdownProps {
  label: React.ReactNode;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  position?: 'left' | 'right';
  className?: string;
}

export function Dropdown({ label, children, open: controlledOpen, onOpenChange, position = 'left', className }: DropdownProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const ref = useRef<HTMLDivElement>(null);

  const setOpen = (next: boolean) => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={`${styles.root} ${className ?? ''}`}>
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {label}
      </button>
      {open && (
        <div className={`${styles.menu} ${position === 'right' ? styles.right : styles.left}`} role="menu">
          {children}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: 写样式**

`packages/ui-next/src/components/primitives/Dropdown.module.css`:
```css
.root { position: relative; display: inline-block; }
.trigger {
  background: transparent;
  border: 1px solid var(--border, #ccc);
  padding: 4px 12px;
  border-radius: 6px;
  cursor: pointer;
  font: inherit;
  color: inherit;
}
.trigger:hover { background: var(--surface-hover, rgba(0,0,0,0.04)); }
.menu {
  position: absolute;
  top: calc(100% + 4px);
  min-width: 160px;
  background: var(--surface, #fff);
  border: 1px solid var(--border, #ccc);
  border-radius: 6px;
  padding: 4px 0;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}
.left { left: 0; }
.right { right: 0; }
```

- [ ] **Step 5: barrel 导出**

修改 `packages/ui-next/src/components/primitives/index.ts`,加:
```ts
export { Dropdown } from './Dropdown';
export type { DropdownProps } from './Dropdown';
```

- [ ] **Step 6: 跑测试确认通过**

Run: `yarn workspace @hydrooj/ui-next test --run Dropdown`
Expected: 4 passed

- [ ] **Step 7: 提交**

```bash
git add packages/ui-next/src/components/primitives/Dropdown.tsx \
        packages/ui-next/src/components/primitives/Dropdown.module.css \
        packages/ui-next/src/components/primitives/Dropdown.test.tsx \
        packages/ui-next/src/components/primitives/index.ts
git commit -m "feat(ui-next): add Dropdown primitive"
```

---

## Task 4: ConfirmDialog primitive

**Files:**
- Create: `packages/ui-next/src/components/primitives/ConfirmDialog.tsx`
- Create: `packages/ui-next/src/components/primitives/ConfirmDialog.module.css`
- Create: `packages/ui-next/src/components/primitives/ConfirmDialog.test.tsx`
- Modify: `packages/ui-next/src/components/primitives/index.ts`

**Interfaces:**
- Produces: `<ConfirmDialog open title message? confirmLabel? cancelLabel? variant? onConfirm onCancel />`

- [ ] **Step 1: 写失败测试**

`packages/ui-next/src/components/primitives/ConfirmDialog.test.tsx`:
```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog', () => {
  const baseProps = {
    open: true,
    title: 'Delete item?',
    message: 'This cannot be undone.',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  test('renders nothing when closed', () => {
    render(<ConfirmDialog {...baseProps} open={false} />);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  test('renders title, message, buttons', () => {
    render(<ConfirmDialog {...baseProps} />);
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText('Delete item?')).toBeInTheDocument();
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
    expect(screen.getByText('OK')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  test('calls onConfirm and onCancel', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<ConfirmDialog {...baseProps} onConfirm={onConfirm} onCancel={onCancel} />);
    fireEvent.click(screen.getByText('OK'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test('closes on Escape', () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog {...baseProps} onCancel={onCancel} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test('closes on backdrop click', () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog {...baseProps} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('alertdialog').parentElement!);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `yarn workspace @hydrooj/ui-next test --run ConfirmDialog`
Expected: FAIL

- [ ] **Step 3: 实现组件**

`packages/ui-next/src/components/primitives/ConfirmDialog.tsx`:
```tsx
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import styles from './ConfirmDialog.module.css';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open, title, message, confirmLabel = 'OK', cancelLabel = 'Cancel', variant = 'default', onConfirm, onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', onKey);
    confirmRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <div className={styles.backdrop} onClick={onCancel}>
      <div
        className={styles.dialog}
        role="alertdialog"
        aria-labelledby="confirm-dialog-title"
        aria-describedby={message ? 'confirm-dialog-message' : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" className={styles.title}>{title}</h2>
        {message && <p id="confirm-dialog-message" className={styles.message}>{message}</p>}
        <div className={styles.actions}>
          <button type="button" className={styles.cancel} onClick={onCancel}>{cancelLabel}</button>
          <button
            ref={confirmRef}
            type="button"
            className={variant === 'danger' ? styles.danger : styles.confirm}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
```

- [ ] **Step 4: 写样式**

`packages/ui-next/src/components/primitives/ConfirmDialog.module.css`:
```css
.backdrop {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center;
  z-index: 2000;
}
.dialog {
  background: var(--surface, #fff);
  border-radius: 12px;
  padding: 24px;
  max-width: 420px;
  width: 90%;
  box-shadow: 0 12px 48px rgba(0,0,0,0.2);
}
.title { margin: 0 0 8px; font-size: 18px; font-weight: 600; }
.message { margin: 0 0 24px; color: var(--text-muted, #666); line-height: 1.5; }
.actions { display: flex; justify-content: flex-end; gap: 8px; }
.cancel, .confirm, .danger {
  padding: 6px 16px; border-radius: 6px; border: 1px solid var(--border, #ccc);
  background: var(--surface, #fff); color: inherit; cursor: pointer; font: inherit;
}
.confirm { background: var(--primary, #2563eb); color: #fff; border-color: transparent; }
.danger { background: var(--danger, #dc2626); color: #fff; border-color: transparent; }
```

- [ ] **Step 5: barrel 导出**

修改 `packages/ui-next/src/components/primitives/index.ts`,加:
```ts
export { ConfirmDialog } from './ConfirmDialog';
export type { ConfirmDialogProps } from './ConfirmDialog';
```

- [ ] **Step 6: 跑测试**

Run: `yarn workspace @hydrooj/ui-next test --run ConfirmDialog`
Expected: 5 passed

- [ ] **Step 7: 提交**

```bash
git add packages/ui-next/src/components/primitives/ConfirmDialog.tsx \
        packages/ui-next/src/components/primitives/ConfirmDialog.module.css \
        packages/ui-next/src/components/primitives/ConfirmDialog.test.tsx \
        packages/ui-next/src/components/primitives/index.ts
git commit -m "feat(ui-next): add ConfirmDialog primitive"
```

---

## Task 5: Toast primitive (Provider + useToast)

**Files:**
- Create: `packages/ui-next/src/components/primitives/Toast.tsx`
- Create: `packages/ui-next/src/components/primitives/Toast.module.css`
- Create: `packages/ui-next/src/components/primitives/Toast.test.tsx`
- Modify: `packages/ui-next/src/components/primitives/index.ts`
- Modify: `packages/ui-next/src/pages/app.tsx` — 挂 `<ToastProvider>`

**Interfaces:**
- Produces: `<ToastProvider>`, `useToast()` → `{ info, success, error }`

- [ ] **Step 1: 写失败测试**

`packages/ui-next/src/components/primitives/Toast.test.tsx`:
```tsx
import { act, render, screen } from '@testing-library/react';
import { ToastProvider, useToast } from './Toast';

function Demo({ message }: { message: string }) {
  const toast = useToast();
  return <button onClick={() => toast.info(message)}>show</button>;
}

describe('Toast', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  test('renders toast when info() called', () => {
    render(<ToastProvider><Demo message="hello" /></ToastProvider>);
    act(() => { screen.getByText('show').click(); });
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  test('auto-dismisses after 4s', () => {
    render(<ToastProvider><Demo message="bye" /></ToastProvider>);
    act(() => { screen.getByText('show').click(); });
    act(() => { vi.advanceTimersByTime(4000); });
    expect(screen.queryByText('bye')).not.toBeInTheDocument();
  });

  test('throws when useToast called outside Provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    function Bad() { useToast(); return null; }
    expect(() => render(<Bad />)).toThrow(/ToastProvider/);
    spy.mockRestore();
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `yarn workspace @hydrooj/ui-next test --run Toast`
Expected: FAIL

- [ ] **Step 3: 实现**

`packages/ui-next/src/components/primitives/Toast.tsx`:
```tsx
import { createContext, useCallback, useContext, useState } from 'react';
import { nanoid } from 'nanoid';
import styles from './Toast.module.css';

export type ToastVariant = 'info' | 'success' | 'error';

interface ToastItem {
  id: string;
  variant: ToastVariant;
  message: string;
}

interface ToastContextValue {
  push: (item: Omit<ToastItem, 'id'>) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export interface ToastProviderProps { children: React.ReactNode; }

export function ToastProvider({ children }: ToastProviderProps) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((item: Omit<ToastItem, 'id'>) => {
    const id = nanoid();
    setItems((prev) => [...prev, { id, ...item }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }, 4000);
  }, []);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className={styles.container} role="status" aria-live="polite">
        {items.map((i) => (
          <div key={i.id} className={`${styles.toast} ${styles[i.variant]}`}>
            <span>{i.message}</span>
            <button type="button" aria-label="dismiss" onClick={() => dismiss(i.id)}>×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return {
    info: (message: string) => ctx.push({ variant: 'info', message }),
    success: (message: string) => ctx.push({ variant: 'success', message }),
    error: (message: string) => ctx.push({ variant: 'error', message }),
  };
}
```

- [ ] **Step 4: 写样式**

`packages/ui-next/src/components/primitives/Toast.module.css`:
```css
.container {
  position: fixed; bottom: 24px; right: 24px;
  display: flex; flex-direction: column; gap: 8px;
  z-index: 3000;
}
.toast {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 16px; border-radius: 8px;
  background: var(--surface, #fff); color: var(--text, #111);
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  border-left: 4px solid var(--primary, #2563eb);
  min-width: 240px;
}
.info { border-left-color: var(--info, #2563eb); }
.success { border-left-color: var(--success, #16a34a); }
.error { border-left-color: var(--danger, #dc2626); }
.toast button {
  background: transparent; border: none; cursor: pointer;
  font-size: 18px; color: inherit;
}
```

- [ ] **Step 5: barrel 导出**

修改 `packages/ui-next/src/components/primitives/index.ts`,加:
```ts
export { ToastProvider, useToast } from './Toast';
export type { ToastVariant } from './Toast';
```

- [ ] **Step 6: 在 app.tsx 挂 ToastProvider**

打开 `packages/ui-next/src/pages/app.tsx`,在文件顶部 import:
```ts
import { ToastProvider } from '../components/primitives';
```

找到根 layout 组件(已存在的 Suspense 包装),把 `{children}` 替换为:
```tsx
<ToastProvider>{children}</ToastProvider>
```
注意:**所有测试都要确保 ToastProvider 挂在最外**(测试可以在测试 wrapper 里包,或在 jest.setup 中 mock 默认)。

- [ ] **Step 7: 跑测试**

Run: `yarn workspace @hydrooj/ui-next test --run Toast`
Expected: 3 passed

- [ ] **Step 8: 跑全部测试,确保 app.tsx 改动没破坏其他测试**

Run: `yarn workspace @hydrooj/ui-next test`
Expected: 全部通过(包括之前 22 个 + Toast 3 个 = 25 个)

- [ ] **Step 9: 提交**

```bash
git add packages/ui-next/src/components/primitives/Toast.tsx \
        packages/ui-next/src/components/primitives/Toast.module.css \
        packages/ui-next/src/components/primitives/Toast.test.tsx \
        packages/ui-next/src/components/primitives/index.ts \
        packages/ui-next/src/pages/app.tsx
git commit -m "feat(ui-next): add Toast primitive with provider and hook"
```

---

## Task 6: ProblemForm 接入 categoryTree + Dropdown

**Files:**
- Modify: `packages/ui-next/src/components/problem/ProblemForm.tsx` — 替换 `flatCategories` 拍平逻辑为树形
- Modify: `packages/ui-next/src/components/problem/ProblemForm.module.css` — 加 category 树样式
- Modify: `packages/ui-next/src/lib/i18n.ts` — 加 `ProblemForm.CategoryTreeLabel` 文案

**Interfaces:**
- Consumes: `args.categoryTree: CategoryNode[]` (在 page 入口已注入)
- Produces: 内部 state `tagText: string`;`<CategoryTreePicker tree={categoryTree} onToggle={appendTagText} />`

- [ ] **Step 1: 修改 ProblemForm,删除 flatCategories,接入树形**

定位 `ProblemForm.tsx:169-180` 的 `flatCategories` useMemo,替换为:
```tsx
// 接受树形 category;点击叶子 / 中间节点都 appendTag
const CategoryTreePicker = useCallback(({ tree, onToggle }: { tree: CategoryNode[]; onToggle: (name: string) => void }) => (
  <div className={styles.categoryTree}>
    {tree.map((node) => (
      <div key={node.name} className={styles.categoryNode}>
        <button type="button" className={styles.categoryChip} onClick={() => onToggle(node.name)}>
          {node.name}
        </button>
        {node.children && node.children.length > 0 && (
          <div className={styles.subcategoryList}>
            {node.children.map((sub) => (
              <button key={sub.name} type="button" className={styles.subcategoryChip} onClick={() => onToggle(sub.name)}>
                {sub.name}
              </button>
            ))}
          </div>
        )}
      </div>
    ))}
  </div>
), []);
```

- [ ] **Step 2: 替换渲染处**

定位 `ProblemForm.tsx:294-305` 的 category 渲染块,从 flat 列表改成:
```tsx
{categoryTree && categoryTree.length > 0 && (
  <CategoryTreePicker tree={categoryTree} onToggle={(name) => {
    setTagText((prev) => prev ? `${prev}, ${name}` : name);
  }} />
)}
```

- [ ] **Step 3: 删除旧的 flatCategories useMemo**

删除 `ProblemForm.tsx:169-180` 的 `flatCategories` 定义。

- [ ] **Step 4: 加 CSS**

在 `ProblemForm.module.css` 末尾追加:
```css
.categoryTree { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
.categoryNode { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.categoryChip {
  background: var(--surface, #f4f4f5); border: 1px solid var(--border, #d4d4d8);
  border-radius: 6px; padding: 4px 10px; cursor: pointer; font: inherit;
}
.categoryChip:hover { background: var(--surface-hover, #e4e4e7); }
.subcategoryList { display: flex; flex-wrap: wrap; gap: 4px; }
.subcategoryChip {
  background: transparent; border: 1px dashed var(--border, #d4d4d8);
  border-radius: 999px; padding: 2px 8px; font-size: 12px; cursor: pointer; color: inherit;
}
.subcategoryChip:hover { border-style: solid; }
```

- [ ] **Step 5: 加 i18n**

`packages/ui-next/src/lib/i18n.ts` 中英文档都加:
```ts
ProblemForm_CategoryTreeLabel: 'Categories',
```

(根据现有 `lib/i18n.ts` 的扁平 key 还是嵌套结构,具体放在哪一档。参考现有 `ProblemForm_*` 的命名风格。)

- [ ] **Step 6: 跑测试 + lint**

Run:
```bash
yarn workspace @hydrooj/ui-next test
yarn lint:ci
```
Expected: 通过

- [ ] **Step 7: 提交**

```bash
git add packages/ui-next/src/components/problem/ProblemForm.tsx \
        packages/ui-next/src/components/problem/ProblemForm.module.css \
        packages/ui-next/src/lib/i18n.ts
git commit -m "feat(ui-next): ProblemForm renders categoryTree via CategoryTreePicker"
```

---

## Task 7: ProblemForm 替换 window.confirm + Title UX

**Files:**
- Modify: `packages/ui-next/src/components/problem/ProblemForm.tsx`
- Modify: `packages/ui-next/src/lib/i18n.ts`

**Interfaces:**
- Produces: `useState<boolean>` for `confirmDelOpen`

- [ ] **Step 1: 替换 onDelete 中的 window.confirm**

定位 `ProblemForm.tsx:153-167` 的 `onDelete`,替换为:
```tsx
const [confirmDelOpen, setConfirmDelOpen] = useState(false);

const onDelete = async () => {
  setError(null);
  setDeleting(true);
  try {
    const fd = new URLSearchParams();
    fd.set('operation', 'delete');
    await request.post(window.location.pathname, fd);
    navigate(buildUrl('problem_main'));
  } catch (err) {
    if (err instanceof HydroClientError) setError(err);
  } finally {
    setDeleting(false);
    setConfirmDelOpen(false);
  }
};
```

删除按钮 onClick 改为 `() => setConfirmDelOpen(true)`(而非直接 `onDelete`)。

- [ ] **Step 2: 在 JSX 末尾挂 ConfirmDialog**

定位 `ProblemForm` 的 return 语句,在根 fragment 末尾(在 form 之外)加:
```tsx
<ConfirmDialog
  open={confirmDelOpen}
  title={t('ProblemForm.DeleteTitle')}
  message={t('ProblemForm.DeleteConfirm', { name: title || pid || '' })}
  confirmLabel={t('Delete')}
  cancelLabel={t('Cancel')}
  variant="danger"
  onConfirm={onDelete}
  onCancel={() => setConfirmDelOpen(false)}
/>
```

- [ ] **Step 3: Title 校验补 scroll + focus + ref**

在 `ProblemForm` 顶部加:
```tsx
const titleRef = useRef<HTMLInputElement>(null);
```

定位 title 校验处(原 setError 后):
```tsx
if (!title.trim()) {
  setError(new HydroClientError({ code: 400, message: t('ProblemForm.ErrorTitleRequired') }));
  window.scrollTo({ top: 0, behavior: 'smooth' });
  setTimeout(() => titleRef.current?.focus(), 320);
  setSubmitting(false);
  return;
}
```

定位 `<Input name="title" ...>`,加 `ref={titleRef}`。检查 Input primitive 是否支持 ref(否则用 callback ref:`ref={(el) => { titleRef.current = el; }}`)。

- [ ] **Step 4: 加 i18n**

`lib/i18n.ts` 加:
```ts
ProblemForm_DeleteTitle: 'Delete this problem?',
ProblemForm_DeleteConfirm: 'Are you sure to delete "{name}"? Its files, submissions, discussions and solutions will be deleted as well.',
```

- [ ] **Step 5: 跑测试**

Run: `yarn workspace @hydrooj/ui-next test`
Expected: 通过(本任务还没写 ProblemForm.test,但已有 Toast/Dropdown/ConfirmDialog 测试不应被破坏)

- [ ] **Step 6: 提交**

```bash
git add packages/ui-next/src/components/problem/ProblemForm.tsx \
        packages/ui-next/src/lib/i18n.ts
git commit -m "feat(ui-next): ProblemForm uses ConfirmDialog + Title scroll+focus UX"
```

---

## Task 8: ProblemAdditionalFiles 替换 window.confirm

**Files:**
- Modify: `packages/ui-next/src/components/problem/ProblemAdditionalFiles.tsx`
- Modify: `packages/ui-next/src/lib/i18n.ts`

- [ ] **Step 1: 替换删除文件 confirm**

定位 `ProblemAdditionalFiles.tsx:65` 附近的 `if (!confirm(...)) return;`,替换为:
```tsx
const [confirmDelFile, setConfirmDelFile] = useState<string | null>(null);

const onDelete = async (name: string) => {
  setError(null);
  try {
    const fd = new URLSearchParams();
    fd.set('operation', 'delete_files');
    fd.append('files', name);
    await request.post(`/p/${pid}/files`, fd);
    onChange();  // 触发刷新
  } catch (err) {
    if (err instanceof HydroClientError) setError(err.message);
  } finally {
    setConfirmDelFile(null);
  }
};
```

删除按钮 onClick 改为 `() => setConfirmDelFile(filename)`,**不**直接调 `onDelete`。

- [ ] **Step 2: 挂 ConfirmDialog**

JSX 末尾加:
```tsx
<ConfirmDialog
  open={!!confirmDelFile}
  title={t('ProblemAdditionalFiles.DeleteFileTitle')}
  message={t('ProblemAdditionalFiles.DeleteFileConfirm', { name: confirmDelFile ?? '' })}
  confirmLabel={t('Delete')}
  cancelLabel={t('Cancel')}
  variant="danger"
  onConfirm={() => confirmDelFile && onDelete(confirmDelFile)}
  onCancel={() => setConfirmDelFile(null)}
/>
```

- [ ] **Step 3: 加 i18n**

`lib/i18n.ts` 加:
```ts
ProblemAdditionalFiles_DeleteFileTitle: 'Delete this file?',
ProblemAdditionalFiles_DeleteFileConfirm: '"{name}" will be removed from the problem\'s additional files.',
```

- [ ] **Step 4: 跑测试 + lint**

Run:
```bash
yarn workspace @hydrooj/ui-next test
yarn lint:ci
```
Expected: 通过

- [ ] **Step 5: 提交**

```bash
git add packages/ui-next/src/components/problem/ProblemAdditionalFiles.tsx \
        packages/ui-next/src/lib/i18n.ts
git commit -m "feat(ui-next): ProblemAdditionalFiles uses ConfirmDialog for delete"
```

---

## Task 9: PolyhedronHint 组件

**Files:**
- Create: `packages/ui-next/src/components/problem/PolyhedronHint.tsx`
- Create: `packages/ui-next/src/components/problem/PolyhedronHint.module.css`
- Modify: `packages/ui-next/src/components/problem/ProblemForm.tsx` — 在 form 顶部挂载
- Modify: `packages/ui-next/src/lib/i18n.ts` — 加 `Polyhedron_*` 文案

- [ ] **Step 1: 实现组件**

`packages/ui-next/src/components/problem/PolyhedronHint.tsx`:
```tsx
import { useState } from 'react';
import { Alert } from '../primitives';
import { useTranslate } from '../../lib/i18n';
import styles from './PolyhedronHint.module.css';

const STORAGE_KEY = 'hydro.polyhedron-hint-dismissed';

export function PolyhedronHint() {
  const t = useTranslate();
  const [open, setOpen] = useState(() =>
    typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY) !== '1'
  );
  if (!open) return null;
  const dismissOnce = () => setOpen(false);
  const dismissForever = () => {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* SSR / private mode */ }
    setOpen(false);
  };
  return (
    <Alert variant="info" className={styles.hint}>
      <p>{t('Polyhedron_Intro')}</p>
      <p>{t('Polyhedron_Feature')}</p>
      <p>{t('Polyhedron_Import')}</p>
      <div className={styles.actions}>
        <a href="https://polyhedron.hydro.ac/" target="_blank" rel="noreferrer">{t('Open Polyhedron')}</a>
        <button type="button" onClick={dismissOnce}>{t('Dismiss')}</button>
        <button type="button" onClick={dismissForever}>{t("Don't show again")}</button>
      </div>
    </Alert>
  );
}
```

- [ ] **Step 2: 写样式**

`packages/ui-next/src/components/problem/PolyhedronHint.module.css`:
```css
.hint { margin-bottom: 16px; }
.actions { display: flex; gap: 12px; margin-top: 8px; align-items: center; }
.actions a { color: var(--primary, #2563eb); text-decoration: underline; }
.actions button {
  background: transparent; border: none; cursor: pointer;
  color: var(--text-muted, #666); font: inherit;
}
.actions button:hover { color: var(--text, #111); }
```

- [ ] **Step 3: 在 ProblemForm 中挂载**

`ProblemForm.tsx` 中,在 form 标签之前(或 return fragment 第一项)加:
```tsx
{pageName === 'problem_edit' && <PolyhedronHint />}
```

只 edit 模式显示(create 时跳过)。

- [ ] **Step 4: 加 i18n**

`lib/i18n.ts` 加:
```ts
Polyhedron_Intro: 'For better problem version management and validation, we suggest using Polyhedron to prepare problems.',
Polyhedron_Feature: 'Polyhedron supports managing problem version history, testing solutions, checking time limits, composing contest statements, cooperation and much more.',
Polyhedron_Import: 'Problems created in Polyhedron can be directly imported into any Hydro based online judge system.',
```

- [ ] **Step 5: 跑测试 + lint**

Run: `yarn workspace @hydrooj/ui-next test`
Expected: 通过

- [ ] **Step 6: 提交**

```bash
git add packages/ui-next/src/components/problem/PolyhedronHint.tsx \
        packages/ui-next/src/components/problem/PolyhedronHint.module.css \
        packages/ui-next/src/components/problem/ProblemForm.tsx \
        packages/ui-next/src/lib/i18n.ts
git commit -m "feat(ui-next): add PolyhedronHint banner with persistent dismiss"
```

---

## Task 10: MarkdownEditor primitive (@monaco-editor/react + textarea fallback)

**Files:**
- Modify: `packages/ui-next/package.json` — 加 deps
- Modify: `packages/ui-next/vite.config.ts` — 加 monaco 配置
- Create: `packages/ui-next/src/components/primitives/MarkdownEditor.tsx`
- Create: `packages/ui-next/src/components/primitives/MarkdownEditor.module.css`
- Modify: `packages/ui-next/src/components/primitives/index.ts`

**Interfaces:**
- Produces: `<MarkdownEditor value language onChange onUpload? height? />`(后端 monaco / textarea 由内部 Suspense 决定)

- [ ] **Step 1: 加依赖**

`packages/ui-next/package.json` `dependencies` 加:
```json
"@monaco-editor/react": "^4.6.0",
"monaco-editor": "^0.52.0"
```

Run: `yarn`
Expected: 安装成功

- [ ] **Step 2: 配置 vite**

`packages/ui-next/vite.config.ts`,在 `defineConfig` 内增加:
```ts
optimizeDeps: {
  include: ['monaco-editor/esm/vs/editor/editor.api'],
},
worker: { format: 'es' },
```

- [ ] **Step 3: 实现 MarkdownEditor**

`packages/ui-next/src/components/primitives/MarkdownEditor.tsx`:
```tsx
import { lazy, Suspense, useEffect, useState } from 'react';
import type { OnMount } from '@monaco-editor/react';
import styles from './MarkdownEditor.module.css';

const MonacoEditor = lazy(() =>
  import('@monaco-editor/react').then((m) => ({ default: m.Editor })),
);

export interface MarkdownEditorProps {
  value: string;
  language?: 'markdown' | string;
  onChange: (val: string) => void;
  onUpload?: (files: File[]) => Promise<string[]>;
  height?: number | string;
  'aria-label'?: string;
}

function readScheme(): 'light' | 'dark' {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function MarkdownEditor({
  value, language = 'markdown', onChange, onUpload, height = 360, ...rest
}: MarkdownEditorProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => readScheme());

  useEffect(() => {
    const onThemeChange = () => setTheme(readScheme());
    window.addEventListener('hydro:theme-change', onThemeChange);
    return () => window.removeEventListener('hydro:theme-change', onThemeChange);
  }, []);

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
            const urls = await onUpload(Array.from(input.files));
            editor.trigger('keyboard', 'type', { text: urls.map((u) => `![](${u})`).join('\n') });
          };
          input.click();
        },
      });
    }
  };

  return (
    <div className={styles.root} style={{ height }} aria-label={rest['aria-label']}>
      <Suspense fallback={<textarea className={styles.fallback} value={value} onChange={(e) => onChange(e.target.value)} />}>
        <MonacoEditor
          height="100%"
          language={language}
          value={value}
          onChange={(v) => onChange(v ?? '')}
          onMount={handleMount}
          theme={theme === 'dark' ? 'vs-dark' : 'light'}
          options={{
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            minimap: { enabled: false },
            wordWrap: 'on',
          }}
        />
      </Suspense>
    </div>
  );
}
```

- [ ] **Step 4: 写样式**

`MarkdownEditor.module.css`:
```css
.root { width: 100%; border: 1px solid var(--border, #ccc); border-radius: 8px; overflow: hidden; }
.fallback {
  width: 100%; height: 100%; box-sizing: border-box;
  padding: 12px; border: none; outline: none; resize: vertical;
  font-family: var(--font-mono); font-size: 13px;
  background: var(--surface, #fff); color: inherit;
}
```

- [ ] **Step 5: barrel 导出**

`packages/ui-next/src/components/primitives/index.ts`,加:
```ts
export { MarkdownEditor } from './MarkdownEditor';
export type { MarkdownEditorProps } from './MarkdownEditor';
```

- [ ] **Step 6: 在 theme-init.ts 暴露主题切换事件**

打开 `packages/ui-next/src/theme/theme-init.ts`(若文件不存在,在 `pages/app.tsx` 现有主题切换处加),在 setTheme 函数中触发事件:
```ts
window.dispatchEvent(new CustomEvent('hydro:theme-change'));
```

- [ ] **Step 7: 跑构建确认 monaco 编译通过**

Run: `yarn workspace @hydrooj/ui-next build`
Expected: 通过(若有 Vite worker 报错,确认 `worker.format: 'es'` 配置生效)

- [ ] **Step 8: 提交**

```bash
git add packages/ui-next/package.json packages/ui-next/vite.config.ts \
        packages/ui-next/src/components/primitives/MarkdownEditor.tsx \
        packages/ui-next/src/components/primitives/MarkdownEditor.module.css \
        packages/ui-next/src/components/primitives/index.ts \
        packages/ui-next/src/theme/theme-init.ts
git commit -m "feat(ui-next): add MarkdownEditor primitive with @monaco-editor/react"
```

---

## Task 11: ProblemForm 接入 MarkdownEditor + 图片上传

**Files:**
- Modify: `packages/ui-next/src/components/problem/ProblemForm.tsx` — 替换 textarea
- Modify: `packages/ui-next/src/components/problem/ProblemForm.module.css` — 删除 editor 相关样式

**Interfaces:**
- Consumes: `<MarkdownEditor onUpload />`,`request.postFile`
- Produces: `<MarkdownEditor value={contentByLang[activeLang]} ... onUpload={uploadImage} />`

- [ ] **Step 1: 实现 uploadImage**

在 `ProblemForm` 顶部加:
```tsx
const toast = useToast();

const uploadImage = useCallback(async (files: File[]): Promise<string[]> => {
  try {
    const fd = new FormData();
    files.forEach((f) => fd.append('files', f));
    const endpoint = pageName === 'problem_create' ? '/file' : './files';
    const res = await request.postFile(endpoint, fd);
    return Array.isArray(res?.files) ? res.files.map((f: { url: string }) => f.url) : [];
  } catch (err) {
    toast.error(err instanceof Error ? err.message : String(err));
    return [];
  }
}, [pageName, toast]);
```

(若 `request.postFile` 接口签名不同,参考 `use-api.ts:194` 实际签名调整;若没有 `type` 字段,跳过第二参数。)

- [ ] **Step 2: 替换 textarea**

定位 `ProblemForm.tsx:249-255` 的 `<textarea spellCheck="false">`,替换为:
```tsx
<MarkdownEditor
  value={contentByLang[activeLang] ?? ''}
  language="markdown"
  onChange={(val) => setContentByLang((prev) => ({ ...prev, [activeLang]: val }))}
  onUpload={uploadImage}
  height={420}
  aria-label="problem content"
/>
```

- [ ] **Step 3: 清理旧样式**

从 `ProblemForm.module.css` 删除 `.editor` / `.editorFallback` 等已废弃 className(若存在)。

- [ ] **Step 4: 跑测试 + 构建**

Run:
```bash
yarn workspace @hydrooj/ui-next test
yarn workspace @hydrooj/ui-next build
```
Expected: 通过

- [ ] **Step 5: 提交**

```bash
git add packages/ui-next/src/components/problem/ProblemForm.tsx \
        packages/ui-next/src/components/problem/ProblemForm.module.css
git commit -m "feat(ui-next): ProblemForm uses MarkdownEditor with image upload"
```

---

## Task 12: ProblemForm 单元测试

**Files:**
- Create: `packages/ui-next/src/components/problem/ProblemForm.test.tsx`

- [ ] **Step 1: 写测试**

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../primitives';
import { ProblemForm } from './ProblemForm';

function renderForm(props: Partial<React.ComponentProps<typeof ProblemForm>> = {}) {
  const defaultProps = {
    pageName: 'problem_edit' as const,
    pdoc: { docId: 1, pid: 'p1', title: 'Test', hidden: false },
    statementLangs: ['zh_CN', 'en'],
    canDelete: true,
    isReference: false,
  };
  return render(
    <MemoryRouter>
      <ToastProvider>
        <ProblemForm {...defaultProps} {...props} />
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('ProblemForm', () => {
  test('shows title required error and focuses title', async () => {
    renderForm({ pdoc: { docId: 1, title: '' } });
    const titleInput = screen.getByRole('textbox', { name: /title/i });
    fireEvent.change(titleInput, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /update|save/i }));
    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeInTheDocument();
    });
  });

  test('renders category tree when categoryTree provided', () => {
    const categoryTree = [
      { name: 'DP', children: [{ name: 'Knapsack' }] },
      { name: 'Graph' },
    ];
    renderForm({ categoryTree });
    expect(screen.getByText('DP')).toBeInTheDocument();
    expect(screen.getByText('Knapsack')).toBeInTheDocument();
    expect(screen.getByText('Graph')).toBeInTheDocument();
  });

  test('clicking category chip appends to tag input', () => {
    const categoryTree = [{ name: 'DP' }];
    renderForm({ categoryTree });
    const tagInput = screen.getByRole('textbox', { name: /tag/i });
    fireEvent.change(tagInput, { target: { value: '' } });
    fireEvent.click(screen.getByText('DP'));
    expect((tagInput as HTMLInputElement).value).toContain('DP');
  });

  test('language tab switching changes editor content', () => {
    const pdoc = {
      docId: 1,
      content: { zh_CN: '# 中文', en: '# English' },
    };
    renderForm({ pdoc });
    fireEvent.click(screen.getByRole('button', { name: 'en' }));
    expect(screen.getByDisplayValue(/# English/)).toBeInTheDocument();
  });

  test('delete button opens ConfirmDialog, confirms deletes', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ url: '/problem' });
    global.fetch = fetchMock as any;
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: 跑测试**

Run: `yarn workspace @hydrooj/ui-next test --run ProblemForm`
Expected: 5 passed(若 fetchMock 设置不奏效,改用 `vi.spyOn(global, 'fetch')` 或 mock `request.post`)

- [ ] **Step 3: 修复发现的问题 + 重跑**

根据报错调整,直到 5 个 case 全过。

- [ ] **Step 4: 提交**

```bash
git add packages/ui-next/src/components/problem/ProblemForm.test.tsx
git commit -m "test(ui-next): add ProblemForm 5 case baseline"
```

---

## Task 13: ProblemAdditionalFiles 单元测试

**Files:**
- Create: `packages/ui-next/src/components/problem/ProblemAdditionalFiles.test.tsx`

- [ ] **Step 1: 写测试**

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../primitives';
import { ProblemAdditionalFiles } from './ProblemAdditionalFiles';

function renderComp(props: Partial<React.ComponentProps<typeof ProblemAdditionalFiles>> = {}) {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <ProblemAdditionalFiles
          pid="p1"
          files={[{ name: 'a.txt', size: 100 }]}
          onChange={() => {}}
          {...props}
        />
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('ProblemAdditionalFiles', () => {
  test('renders existing file list', () => {
    renderComp();
    expect(screen.getByText('a.txt')).toBeInTheDocument();
  });

  test('delete button opens ConfirmDialog', () => {
    renderComp();
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  test('confirming delete calls request and refreshes', async () => {
    const onChange = vi.fn();
    renderComp({ onChange });
    const { request } = await import('../../hooks/use-api');
    const postSpy = vi.spyOn(request, 'post').mockResolvedValue({} as any);
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(postSpy).toHaveBeenCalled());
    expect(onChange).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 跑测试 + 修复**

Run: `yarn workspace @hydrooj/ui-next test --run ProblemAdditionalFiles`
Expected: 3 passed

- [ ] **Step 3: 提交**

```bash
git add packages/ui-next/src/components/problem/ProblemAdditionalFiles.test.tsx
git commit -m "test(ui-next): add ProblemAdditionalFiles 3 case baseline"
```

---

## Task 14: page 入口测试(problem_edit + problem_create)

**Files:**
- Create: `packages/ui-next/src/pages/problem_edit.test.tsx`
- Create: `packages/ui-next/src/pages/problem_create.test.tsx`

- [ ] **Step 1: problem_edit test**

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PageDataContext } from '../context/page-data';
import { ToastProvider } from '../components/primitives';
import ProblemEditPage from './problem_edit';

function renderWith(args: any) {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <PageDataContext.Provider value={{ name: 'problem_edit', template: '', args, url: '/' }}>
          <ProblemEditPage />
        </PageDataContext.Provider>
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('problem_edit page', () => {
  test('renders ProblemForm with pdoc and statementLangs', () => {
    renderWith({
      pdoc: { docId: 1, pid: 'p1', title: 'Sample' },
      statementLangs: ['zh_CN', 'en'],
      UserContext: {},
    });
    expect(screen.getByRole('textbox', { name: /title/i })).toBeInTheDocument();
  });

  test('hides delete button when canDelete is false', () => {
    renderWith({
      pdoc: { docId: 1, pid: 'p1', title: 'Sample', owner: 999 },
      statementLangs: ['zh_CN', 'en'],
      UserContext: { _id: 1 },
    });
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: problem_create test**

`packages/ui-next/src/pages/problem_create.test.tsx`(结构同上,改 pageName):
```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PageDataContext } from '../context/page-data';
import { ToastProvider } from '../components/primitives';
import ProblemCreatePage from './problem_create';

describe('problem_create page', () => {
  test('renders empty ProblemForm', () => {
    render(
      <MemoryRouter>
        <ToastProvider>
          <PageDataContext.Provider value={{ name: 'problem_create', template: '', args: { statementLangs: ['zh_CN', 'en'], UserContext: {} }, url: '/' }}>
            <ProblemCreatePage />
          </PageDataContext.Provider>
        </ToastProvider>
      </MemoryRouter>
    );
    expect(screen.getByRole('textbox', { name: /title/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: 跑测试 + 修复**

Run: `yarn workspace @hydrooj/ui-next test --run problem_edit problem_create`
Expected: 3 passed

- [ ] **Step 4: 跑全量**

Run: `yarn workspace @hydrooj/ui-next test`
Expected: 25+ 用例全过

- [ ] **Step 5: 提交**

```bash
git add packages/ui-next/src/pages/problem_edit.test.tsx \
        packages/ui-next/src/pages/problem_create.test.tsx
git commit -m "test(ui-next): add problem_edit + problem_create page entry tests"
```

---

## Task 15: MarkdownEditor 单元测试 + 验收

**Files:**
- Create: `packages/ui-next/src/components/primitives/MarkdownEditor.test.tsx`

- [ ] **Step 1: 写测试**

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { MarkdownEditor } from './MarkdownEditor';

describe('MarkdownEditor (textarea fallback)', () => {
  test('renders textarea with initial value', () => {
    render(<MarkdownEditor value="hello" onChange={() => {}} />);
    const textarea = screen.getByDisplayValue('hello');
    expect(textarea.tagName).toBe('TEXTAREA');
  });

  test('calls onChange when textarea changes', () => {
    const onChange = vi.fn();
    render(<MarkdownEditor value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'world' } });
    expect(onChange).toHaveBeenCalledWith('world');
  });
});
```

- [ ] **Step 2: 跑测试**

Run: `yarn workspace @hydrooj/ui-next test --run MarkdownEditor`
Expected: 2 passed

- [ ] **Step 3: 全量验收**

Run:
```bash
yarn workspace @hydrooj/ui-next test
yarn lint:ci
yarn tsc -b
yarn workspace @hydrooj/ui-next build
```
Expected: 全部通过(测试 27+,lint 0 error,TS 0 error,build 成功)

- [ ] **Step 4: 提交**

```bash
git add packages/ui-next/src/components/primitives/MarkdownEditor.test.tsx
git commit -m "test(ui-next): add MarkdownEditor textarea fallback baseline + verify all checks"
```

---

## Self-Review 记录

### Spec coverage
- [x] Sprint 1 — 服务端与数据(Task 1, 2)
- [x] Sprint 2 — Primitives 落地(Task 3 Dropdown, 4 ConfirmDialog, 5 Toast)
- [x] Sprint 3 — 表单升级(Task 6 category tree, 7 ConfirmDialog + Title UX, 8 AdditionalFiles ConfirmDialog, 9 PolyhedronHint)
- [x] Sprint 4 — 编辑器骨架(Task 10 MarkdownEditor primitive, 11 ProblemForm 接入 + 图片上传)
- [x] Sprint 5 — 测试基线(Task 12 ProblemForm, 13 AdditionalFiles, 14 page entry, 15 MarkdownEditor)
- [x] 服务端契约不变(各 handler 只追加 2 行,接口路径 / 字段名一致)
- [x] i18n 双语(每个新增文案都要求同时中英文档)
- [x] 风险条目(@monaco-editor/react Vite 配置 + worker format 已显式)

### Placeholder scan
- 无 TBD / TODO 占位(代码块均为完整可粘贴)
- 无 "Add appropriate error handling" 之类的空话
- 无 "类似 Task N" 引用

### Type consistency
- `parseCategorySetting` 返回 `CategoryNode[]`,Task 6 中 import 并使用 `CategoryNode`
- `useToast()` 在 Task 5 定义,在 Task 11 使用
- `<ConfirmDialog>` 在 Task 4 定义 + barrel 导出,在 Task 7、8 使用
- `<Dropdown>` 在 Task 3 定义,在当前 plan 中**未在表单里使用**——因为 category tree 直接用 `<button>` 渲染两层结构,不需 Dropdown;Dropdown 仍作为通用 primitive 留下(供后续 problem_main 等其他场景复用)
- `<MarkdownEditor>` 在 Task 10 定义,在 Task 11 接入

### 一致性小修复
- 移除原 spec 中"在 ProblemForm 用 Dropdown 渲染 category"的描述(简化设计,直接用 button 即可)
- Toast 自动关闭从 spec 的"4s"在测试中用 `vi.advanceTimersByTime(4000)` 验证

---

## 验收清单(全部任务完成后)

- [ ] `yarn workspace @hydrooj/ui-next test` 全绿(27+ 用例)
- [ ] `yarn lint:ci` 全绿
- [ ] `yarn tsc -b` 通过
- [ ] `yarn workspace @hydrooj/ui-next build` 通过
- [ ] 手工 smoke:`/p/<pid>/edit` 页面在 ui-next renderer 下可见类目树(2 级)、可切换语言 tab、可上传图片、可点击删除出现模态确认
- [ ] ui-default 路由仍然工作(本 plan 不修改 ui-default)

---

## 不在范围

- monaco language server 扩展
- Markdown 实时预览
- 类目拖拽排序
- 多用户协同编辑
- 把 Dropdown 强制塞进 ProblemForm(留作通用 primitive 备用)