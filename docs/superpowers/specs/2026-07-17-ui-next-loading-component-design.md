# ui-next Loading Component — Approved Design Spec

**Date:** 2026-07-17
**Status:** Approved (result of brainstorming on 2026-07-17; ready for implementation plan)
**Owner:** @hydro-dev
**Scope:** `packages/ui-next` only — new component + two integration sites

---

## 1. Context

`packages/ui-next` is a Vite + React 19 SPA with a dark-first design system (`src/styles/tokens.css`) where light mode neutralizes the cyan/violet/blue/pink accents to monochrome — the explicit "Geist-inspired light alternative" already shipped.

Loading is currently inconsistent across two sites:

1. `packages/ui-next/src/app.tsx:57` — top-level Suspense fallback is a plain `<div>Loading...</div>` (no styling, English-only, no dark/light adaptation, no a11y label).
2. `packages/ui-next/src/pages/problem_import.tsx:131` — `<p>{t('ProblemImport.Loading')}</p>` (i18n-aware, but typographically inconsistent with the rest of the page; no spinner).

There is no shared Loading primitive. As more pages adopt ui-next's slot system, future Suspense fallbacks and "submitting…" inline indicators will keep being written ad-hoc.

The goal: **one Loading primitive** that
- is token-driven (dark/light automatic via existing CSS variables, no theme prop),
- supports both a block (Suspense / full-section) and inline (button row / paragraph) form factor from a single component via a `size` prop,
- matches the Vercel/Geist visual register (thin rotating arc, mono-font label),
- speaks i18n through the existing `useTranslate()` hook at the call site (component itself is i18n-agnostic).

---

## 2. Decisions log (from brainstorming)

| Decision | Choice | Why |
|---|---|---|
| Form factor surface | **Two sizes via `size` prop**: `block` (fills parent, centered) + `inline` (inline-flex with surrounding text) | Matches the two existing call sites and the foreseeable ones (Button submitting state) |
| Animation | **Thin rotating arc** (1.5px stroke, 16×16, ~1/4 arc visible, 0.9s rotation) | Closest to Vercel/Geist; minimal visual weight; works on any background |
| Label | **Optional, default hidden**; mono 12px in `--text-mute` when shown | Block fallback stays clean by default; problem_import's existing i18n string preserved |
| Color source | **Token-driven**: `color: var(--cyan)` in dark, `--cyan` already maps to `#171717` in light via `tokens.css:157` | Single source of truth; no new theme logic |
| Compound API (`<Loading.Spinner/>`) | **No** | Two call sites don't justify the API surface; mirrors `Button`/`Chip`/`Alert` pattern of single component + variants |
| Hook (`useLoading`) | **No** | Would push markup into every call site; defeats "unify" goal |
| Reduced motion | **`animation-play-state: paused`** + ring stays visible | Standard a11y practice; keeps the visual signal that something is loading |
| Replace `<div>Loading...</div>` in app.tsx | **Yes** | Direct user requirement |
| Replace `<p>` in problem_import | **Yes**, using `<Loading size="inline" label={t('ProblemImport.Loading')} />` | Drop the inline `style={{ margin: 0 }}` too |
| Touch `<Suspense fallback={null}>` in `registry/sections.tsx` | **No** | Block-level silent-mount is intentional; loading would be noise |
| Add a `useApi.loading` integration | **No (this PR)** | Each page already renders its own loading state; integrating the spinner into `useApi` is a separate change |
| Visual regression baselines | **Skip for v1** | Component is tiny; manual screenshot is sufficient. Re-evaluate if Loading ever grows. |

---

## 3. Architecture

### Component surface

```
packages/ui-next/src/components/primitives/
  Loading.tsx          # React component
  Loading.module.css   # scoped styles
  Loading.test.tsx     # 5 unit tests
  index.ts             # +1 export line
```

### Props

```ts
interface LoadingProps {
  size?: 'block' | 'inline';   // default: 'block'
  label?: ReactNode;           // optional caption; omitted → no text rendered
  ariaLabel?: string;          // default: label ?? 'Loading'
  className?: string;          // optional container override
}
```

### Markup

```tsx
<div
  role="status"
  aria-live="polite"
  aria-label={ariaLabel}
  className={cn(styles.root, styles[size], className)}
>
  <svg className={styles.ring} viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"
            strokeLinecap="round" strokeDasharray="9.42 28.27" />
  </svg>
  {label != null && <span className={styles.label}>{label}</span>}
</div>
```

The SVG inherits color from `currentColor`, so the parent's `color: var(--cyan)` cascades in. Light mode auto-maps `--cyan → #171717` via `tokens.css:157`.

### Styles (sketch)

```css
.root { color: var(--cyan); }
.block {
  width: 100%; min-height: 120px;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: var(--space-2);
}
.inline {
  display: inline-flex; align-items: center;
  gap: var(--space-2); vertical-align: middle;
}
.ring {
  width: 16px; height: 16px;
  animation: spin 0.9s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.label {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-mute);
  letter-spacing: 0.02em;
}
@media (prefers-reduced-motion: reduce) {
  .ring { animation-play-state: paused; }
}
```

### Index export

```ts
// components/primitives/index.ts (add one line)
export { Loading } from './Loading';
export type { LoadingProps } from './Loading';
```

---

## 4. Integration sites

### 4.1 `app.tsx` Suspense fallback

```tsx
// before (line 57)
<Suspense fallback={<div>Loading...</div>}>

// after
<Suspense fallback={<Loading size="block" ariaLabel={t('Common.Loading')} />}>
```

New imports at top:
```tsx
import { Loading } from './components/primitives';
import { useTranslate } from './lib/i18n';
```

`useTranslate()` is called at the top of `App`, next to `usePageData()`. The existing `Common.Loading` i18n string (`lib/i18n.ts:14,363`) supplies the aria-label in zh/en; it is not rendered as visible text (the block variant defaults to no label — matching the existing terse fallback).

### 4.2 `problem_import.tsx` inline loading

```tsx
// before (line 130-133)
<ProblemImportShell title={...} subtitle={...}>
  <p style={{ margin: 0 }}>{t('ProblemImport.Loading')}</p>
</ProblemImportShell>

// after
<ProblemImportShell title={...} subtitle={...}>
  <Loading size="inline" label={t('ProblemImport.Loading')} />
</ProblemImportShell>
```

The inline label here is intentional: it gives users (especially those waiting on a slow first paint) a written confirmation that the import page is loading. `ProblemImport.Loading` i18n string is unchanged (`lib/i18n.ts:176,525`).

### 4.3 Sites explicitly NOT touched

- `registry/sections.tsx:28-30` — keeps `<Suspense fallback={null}>` (silent-mount is by design).
- `use-api.ts` — `loading: boolean` flag stays; pages that want to display it can opt in later by importing `<Loading>` themselves.

---

## 5. Testing

### Unit tests (`Loading.test.tsx`, vitest + happy-dom + @testing-library/react)

| # | Case | Assertion |
|---|---|---|
| 1 | renders block by default | container is `role="status"`, has `aria-label="Loading"`, contains exactly one `<svg>` |
| 2 | `size="inline"` | root container has `display: inline-flex` |
| 3 | `label="..."` | label text node is rendered with mono font family |
| 4 | without `label` | only the SVG is rendered, no text node in the container |
| 5 | `ariaLabel` overrides default | passing `ariaLabel="Custom"` makes `getByRole('status')` have `aria-label="Custom"` |

The test file follows the existing pattern (`Avatar.test.tsx`, `Button.test.tsx`) — no special providers needed since Loading has no context dependency.

### Manual smoke

- `yarn workspace @hydrooj/ui-next build` → no TS or Vite errors.
- `yarn workspace @hydrooj/ui-next test` → 5 new tests + existing suite all green.
- Browser: navigate to `/homepage`, hard-refresh, observe block spinner during first Suspense paint. Switch theme → ring color flips to black.
- Browser: navigate to `/problem/import/<type>` immediately after login, observe inline spinner next to the title row. i18n string renders in zh or en.

---

## 6. Out of scope

- Skeleton blocks for placeholder content (YouTube/Linear style) — different problem; not requested.
- `useApi` integration — separate change.
- Visual regression baselines — skipped (component too small to warrant).
- Animation choice beyond "thin ring" — non-goal.
