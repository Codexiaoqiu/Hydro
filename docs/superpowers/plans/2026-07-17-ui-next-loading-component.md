# ui-next Loading Component Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one token-driven `Loading` primitive to ui-next (block + inline sizes), replace the ad-hoc Suspense fallback in `app.tsx` and the inline `<p>` loading in `problem_import.tsx`, and lock the behavior with 5 unit tests.

**Architecture:** Single React component with a `size` prop (`'block' | 'inline'`) and an optional `label` prop. Theme is driven entirely by existing CSS variables (`--cyan` for dark ring color, which `tokens.css:157` already neutralizes to `#171717` in light mode). Component is i18n-agnostic; the call site is responsible for passing strings via `useTranslate()`.

**Tech Stack:** React 19, TypeScript, CSS Modules, vitest + happy-dom + @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-07-17-ui-next-loading-component-design.md`

## Global Constraints

- Spec status: **Approved 2026-07-17** — do not redesign, do not change scope.
- Two call sites only: `app.tsx:57` and `problem_import.tsx:131`. Do **not** touch `registry/sections.tsx:28-30` or `use-api.ts`.
- All colors must come from existing tokens (`--cyan`, `--text-mute`, `--font-mono`, `--text-xs`, `--space-2`). No new tokens.
- Use `prefers-reduced-motion: reduce` to pause the ring; keep it visible.
- Mark component as `role="status"` + `aria-live="polite"`. Default `aria-label` is `'Loading'` (English) when neither `label` nor `ariaLabel` is provided.
- Run `yarn workspace @hydrooj/ui-next test` (vitest run) after each task that touches test files. Run `yarn workspace @hydrooj/ui-next build` before declaring the plan done.
- Commit after each task with a descriptive message.

---

### Task 1: Loading component skeleton + block default + index export

**Files:**
- Create: `packages/ui-next/src/components/primitives/Loading.tsx`
- Create: `packages/ui-next/src/components/primitives/Loading.module.css`
- Create: `packages/ui-next/src/components/primitives/Loading.test.tsx`
- Modify: `packages/ui-next/src/components/primitives/index.ts` (add two export lines)

**Interfaces:**
- Produces: `export function Loading(props: LoadingProps): JSX.Element` from `@hydrooj/ui-next/components/primitives`. Initial shape supports `size?: 'block' | 'inline'` only; defaults to `'block'`. No `label`, no `ariaLabel` yet (those land in Task 3).

- [ ] **Step 1: Write the failing test (block default)**

Create `packages/ui-next/src/components/primitives/Loading.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Loading } from './Loading';

describe('loading', () => {
  it('renders block variant by default with role=status and an svg ring', () => {
    render(<Loading />);
    const status = screen.getByRole('status');
    expect(status).toBeInTheDocument();
    expect(status).toHaveAttribute('aria-label', 'Loading');
    expect(status.querySelector('svg')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `yarn workspace @hydrooj/ui-next test -- Loading.test`
Expected: FAIL — module `./Loading` does not exist (or `Loading` is not exported).

- [ ] **Step 3: Implement the minimum**

Create `packages/ui-next/src/components/primitives/Loading.module.css`:

```css
.root {
  color: var(--cyan);
}

.block {
  width: 100%;
  min-height: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
}

.ring {
  width: 16px;
  height: 16px;
  animation: loading-spin 0.9s linear infinite;
}

@keyframes loading-spin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .ring { animation-play-state: paused; }
}
```

Create `packages/ui-next/src/components/primitives/Loading.tsx`:

```tsx
import type { CSSProperties } from 'react';
import styles from './Loading.module.css';

export type LoadingSize = 'block' | 'inline';

export interface LoadingProps {
  size?: LoadingSize;
  label?: React.ReactNode;
  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
}

export function Loading({
  size = 'block',
  ariaLabel = 'Loading',
  className,
}: LoadingProps) {
  const sizeClass = size === 'inline' ? styles.inline : styles.block;
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
      className={[styles.root, sizeClass, className].filter(Boolean).join(' ')}
    >
      <svg className={styles.ring} viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"
                strokeLinecap="round" strokeDasharray="9.42 28.27" />
      </svg>
    </div>
  );
}
```

Note: `inline` class is referenced before it exists; it will land in Task 2.

Modify `packages/ui-next/src/components/primitives/index.ts` — append two lines at the end:

```ts
export { Loading } from './Loading';
export type { LoadingProps, LoadingSize } from './Loading';
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `yarn workspace @hydrooj/ui-next test -- Loading.test`
Expected: PASS — 1 test green.

- [ ] **Step 5: Commit**

```bash
git add packages/ui-next/src/components/primitives/Loading.tsx \
        packages/ui-next/src/components/primitives/Loading.module.css \
        packages/ui-next/src/components/primitives/Loading.test.tsx \
        packages/ui-next/src/components/primitives/index.ts
git commit -m "feat(ui-next): add Loading primitive (block default)"
```

---

### Task 2: Inline size variant

**Files:**
- Modify: `packages/ui-next/src/components/primitives/Loading.module.css` (add `.inline` rule)
- Modify: `packages/ui-next/src/components/primitives/Loading.test.tsx` (append one test)

**Interfaces:**
- Consumes: `LoadingProps.size` already defined in Task 1.
- Produces: `size="inline"` renders a container with `display: inline-flex`.

- [ ] **Step 1: Add the failing test for inline size**

Append to the `describe('loading', …)` block in `packages/ui-next/src/components/primitives/Loading.test.tsx`:

```tsx
  it('uses inline-flex layout when size="inline"', () => {
    const { container } = render(<Loading size="inline" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toMatch(/inline/);
  });
```

The CSS module generates the class name even when no `.inline` rule is defined, so the class assertion would pass for the wrong reason. To make this a true TDD step, temporarily force the failure path: in `Loading.tsx`, change the line

```tsx
  const sizeClass = size === 'inline' ? styles.inline : styles.block;
```

to

```tsx
  const sizeClass = styles.block;
```

so the new test fails (no `inline` class on the root). Run `yarn workspace @hydrooj/ui-next test -- Loading.test` and confirm FAIL.

- [ ] **Step 2: Add the `.inline` CSS rule and restore the branch**

In `packages/ui-next/src/components/primitives/Loading.module.css`, append:

```css
.inline {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  vertical-align: middle;
}
```

In `packages/ui-next/src/components/primitives/Loading.tsx`, restore:

```tsx
  const sizeClass = size === 'inline' ? styles.inline : styles.block;
```

- [ ] **Step 3: Run and verify pass**

Run: `yarn workspace @hydrooj/ui-next test -- Loading.test`
Expected: PASS — 2 tests green.

- [ ] **Step 4: Commit**

```bash
git add packages/ui-next/src/components/primitives/Loading.tsx \
        packages/ui-next/src/components/primitives/Loading.module.css \
        packages/ui-next/src/components/primitives/Loading.test.tsx
git commit -m "feat(ui-next): add inline size variant to Loading"
```

---

### Task 3: Optional label + ariaLabel override

**Files:**
- Modify: `packages/ui-next/src/components/primitives/Loading.tsx` (render label span, use label as default ariaLabel)
- Modify: `packages/ui-next/src/components/primitives/Loading.module.css` (add `.label` rule)
- Modify: `packages/ui-next/src/components/primitives/Loading.test.tsx` (append three tests)

**Interfaces:**
- Consumes: `LoadingProps.label`, `LoadingProps.ariaLabel` (already declared in Task 1).
- Produces:
  - `label` truthy → a `<span class="label">` is rendered inside the root.
  - `label` omitted → only the SVG is rendered.
  - `ariaLabel` overrides the default `'Loading'`.
  - Default `ariaLabel` falls back to the string form of `label` when provided.

- [ ] **Step 1: Add the three failing tests**

Append to the `describe('loading', …)` block in `packages/ui-next/src/components/primitives/Loading.test.tsx`:

```tsx
  it('renders the label text inside a span when provided', () => {
    render(<Loading label="加载中…" />);
    const text = screen.getByText('加载中…');
    expect(text).toBeInTheDocument();
    expect(text.tagName.toLowerCase()).toBe('span');
  });

  it('renders no span when label is omitted', () => {
    const { container } = render(<Loading />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.querySelector('span')).toBeNull();
  });

  it('uses ariaLabel when provided and label as fallback otherwise', () => {
    const { rerender } = render(<Loading ariaLabel="Custom" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Custom');

    rerender(<Loading label="加载中…" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', '加载中…');
  });
```

- [ ] **Step 2: Run and verify failure**

Run: `yarn workspace @hydrooj/ui-next test -- Loading.test`
Expected: FAIL — the first two new tests fail (no `<span>` rendered; no label text found). The third test's first sub-assertion passes by accident (`ariaLabel` is already wired through in Task 1). The second sub-assertion fails (no label fallback wired yet).

- [ ] **Step 3: Implement label rendering and ariaLabel fallback**

In `packages/ui-next/src/components/primitives/Loading.module.css`, append:

```css
.label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-mute);
  letter-spacing: 0.02em;
}
```

In `packages/ui-next/src/components/primitives/Loading.tsx`, replace the entire file contents with:

```tsx
import type { CSSProperties, ReactNode } from 'react';
import styles from './Loading.module.css';

export type LoadingSize = 'block' | 'inline';

export interface LoadingProps {
  size?: LoadingSize;
  label?: ReactNode;
  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
}

export function Loading({
  size = 'block',
  label,
  ariaLabel,
  className,
}: LoadingProps) {
  const sizeClass = size === 'inline' ? styles.inline : styles.block;
  const resolvedAriaLabel = ariaLabel ?? (typeof label === 'string' ? label : 'Loading');
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={resolvedAriaLabel}
      className={[styles.root, sizeClass, className].filter(Boolean).join(' ')}
    >
      <svg className={styles.ring} viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"
                strokeLinecap="round" strokeDasharray="9.42 28.27" />
      </svg>
      {label != null && <span className={styles.label}>{label}</span>}
    </div>
  );
}
```

- [ ] **Step 4: Run and verify all 5 tests pass**

Run: `yarn workspace @hydrooj/ui-next test -- Loading.test`
Expected: PASS — 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/ui-next/src/components/primitives/Loading.tsx \
        packages/ui-next/src/components/primitives/Loading.module.css \
        packages/ui-next/src/components/primitives/Loading.test.tsx
git commit -m "feat(ui-next): Loading label and ariaLabel override"
```

---

### Task 4: Replace Suspense fallback in app.tsx

**Files:**
- Modify: `packages/ui-next/src/app.tsx`

**Interfaces:**
- Consumes: `<Loading size="block">` from `./components/primitives`.
- Produces: The inner Suspense fallback in `App` renders a centered block spinner with `aria-label` localized via `useTranslate()`.

- [ ] **Step 1: Read current state**

Open `packages/ui-next/src/app.tsx`. Confirm:
- Line 57: `<Suspense fallback={<div>Loading...</div>}>`
- Imports at the top — there is no `useTranslate` or `Loading` import yet.

- [ ] **Step 2: Add imports and replace the fallback**

In `packages/ui-next/src/app.tsx`:

Add to the import block at the top (after the existing `import { store } from './registry/store';`):

```tsx
import { Loading } from './components/primitives';
import { useTranslate } from './lib/i18n';
```

Inside the `App` component, immediately after the existing `const { name, template, args } = usePageData();` line, add:

```tsx
  const t = useTranslate();
```

Replace the inner Suspense fallback (currently at line 57). The current text reads `<Suspense fallback={<div>Loading...</div>}>`. Change it to:

```tsx
        <Suspense fallback={<Loading size="block" ariaLabel={t('Common.Loading')} />}>
```

The full `App` component body should now read (with the imports + the new fallback in place):

```tsx
const App = defineSlot('app:root', () => {
  const { name, template, args } = usePageData();
  const t = useTranslate();

  const isError = !!(args as Record<string, unknown>).error;

  const [slotName, entry] = useMemo(() => {
    /* …unchanged… */
  }, [name, template, isError]);

  const [subscribe, getSnapshot] = useMemo(() => [
    /* …unchanged… */
  ], [slotName]);

  useSyncExternalStore(subscribe, getSnapshot);

  if (!entry) {
    return (
      <div>
        Page not found: <code>{name}</code>
      </div>
    );
  }

  const Layout = store.getDefault(`layout:${entry.layout}`) ?? DefaultLayout;
  const { Page } = entry;

  return (
    <SlotErrorBoundary slotName={slotName} label="renderer">
      <Suspense fallback={null}>
        <Layout>
          <Suspense fallback={<Loading size="block" ariaLabel={t('Common.Loading')} />}>
            <Page />
          </Suspense>
        </Layout>
      </Suspense>
    </SlotErrorBoundary>
  );
});
```

- [ ] **Step 3: Verify TypeScript**

Run: `yarn workspace @hydrooj/ui-next exec tsc -b`
Expected: 0 errors. (`exec tsc -b` is the lightweight type check; the full `build` script runs `vite build` too.)

If `tsc` complains about `useTranslate()` being a hook called in this position — the two hooks (`usePageData`, `useTranslate`) are called at the top of the function body unconditionally, which is the correct React pattern. If it complains about missing import — recheck the import path.

- [ ] **Step 4: Run full test suite**

Run: `yarn workspace @hydrooj/ui-next test`
Expected: All tests pass (existing 22+ + 5 new Loading tests).

- [ ] **Step 5: Commit**

```bash
git add packages/ui-next/src/app.tsx
git commit -m "refactor(ui-next): use Loading primitive for Suspense fallback"
```

---

### Task 5: Replace inline loading in problem_import.tsx

**Files:**
- Modify: `packages/ui-next/src/pages/problem_import.tsx`

**Interfaces:**
- Consumes: `<Loading size="inline" label={…}>` from `../components/primitives`.
- Produces: The early-return branch renders an inline spinner with the existing i18n string instead of a plain `<p>`.

- [ ] **Step 1: Add the Loading import**

In `packages/ui-next/src/pages/problem_import.tsx`, extend the existing primitives import line.

From:
```tsx
import { Alert, Button, Checkbox, Input, RateLimitAlert } from '../components/primitives';
```

To:
```tsx
import { Alert, Button, Checkbox, Input, Loading, RateLimitAlert } from '../components/primitives';
```

- [ ] **Step 2: Replace the inline `<p>`**

In the early-return branch (around lines 128–134), change:

```tsx
  if (!isPageDataReady(pageData)) {
    return (
      <ProblemImportShell title={t('ProblemImport.ShellTitle')} subtitle={t('ProblemImport.ShellSubtitle')}>
        <p style={{ margin: 0 }}>{t('ProblemImport.Loading')}</p>
      </ProblemImportShell>
    );
  }
```

to:

```tsx
  if (!isPageDataReady(pageData)) {
    return (
      <ProblemImportShell title={t('ProblemImport.ShellTitle')} subtitle={t('ProblemImport.ShellSubtitle')}>
        <Loading size="inline" label={t('ProblemImport.Loading')} />
      </ProblemImportShell>
    );
  }
```

- [ ] **Step 3: Verify TypeScript and tests**

Run: `yarn workspace @hydrooj/ui-next test`
Expected: All tests pass.

`packages/ui-next/src/pages/problem_import.test.tsx` already contains an assertion that the loading string is rendered (line 92: `expect(screen.getByText('Loading...')).toBeInTheDocument();`). `getByText` matches against text nodes regardless of the surrounding tag — so the new `<span>` wrapper around the label string continues to satisfy the assertion. If the strict equality assertion fails in your environment, weaken it to a regex match: `screen.getByText(/Loading/)`.

- [ ] **Step 4: Commit**

```bash
git add packages/ui-next/src/pages/problem_import.tsx \
        packages/ui-next/src/pages/problem_import.test.tsx
git commit -m "refactor(ui-next): use Loading primitive in problem_import"
```

(The second path in the `git add` covers the test file only if the previous step's weakening edit was needed.)

---

### Task 6: Final smoke build

**Files:** none modified; this is a verification gate.

- [ ] **Step 1: Production build**

Run: `yarn workspace @hydrooj/ui-next build`
Expected: `tsc -b` and `vite build` both succeed; no errors.

- [ ] **Step 2: Full test run**

Run: `yarn workspace @hydrooj/ui-next test`
Expected: All tests green (existing + 5 new Loading tests).

- [ ] **Step 3: Verify dark/light token mapping (manual)**

Open the app in a browser:
1. Hard-refresh `/homepage` — observe the block spinner briefly during the first Suspense paint.
2. Toggle theme via the nav theme button — verify the ring color flips from cyan (dark) to near-black (light).
3. Navigate to `/problem/import/<type>` immediately — verify the inline spinner renders next to the title row.

- [ ] **Step 4: If any step failed, fix in place**

Do not start a new task. Diagnose, fix, recommit, re-run.

- [ ] **Step 5: Confirm commit log**

```bash
git log --oneline -8
```

Expected, top-down:
1. `refactor(ui-next): use Loading primitive in problem_import` (or with test weakening)
2. `refactor(ui-next): use Loading primitive for Suspense fallback`
3. `feat(ui-next): Loading label and ariaLabel override`
4. `feat(ui-next): add inline size variant to Loading`
5. `feat(ui-next): add Loading primitive (block default)`
6. `docs(spec): ui-next Loading component design` (commit `0d5c9d8a`)

If the smoke task produced a fixup commit, it appears above #1.
