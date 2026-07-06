# ui-next Style Refactor — Design Spec

**Date:** 2026-07-07
**Status:** Draft (pre-implementation)
**Owner:** @hydro-dev
**Visual reference:** `.claude/1.html` (Hydra problem-detail mock)
**Scope:** `packages/ui-next` only — no changes to `ui-default` or backend

---

## 1. Goal

Bring ui-next from "bare scaffolding with 2 placeholder pages" to a state where its existing pages (homepage + problem_main, plus problem_detail once backend integration is added) render with the visual language defined in `.claude/1.html`:

- Dark-first theme, with a clean Geist-inspired light alternative.
- A consistent design-token system (colors, type, spacing, radius, shadow, motion).
- A small set of reusable global components (Nav, ThemeToggle, Card, Ring, Trend, IDE, etc.).
- An SSR-safe theme provider that prevents flash-of-wrong-theme.
- All visual work goes into ui-next — ui-default keeps shipping unchanged.

## 2. Non-goals

- No page coverage expansion beyond what currently exists in ui-next (homepage, problem_main). Problem-detail-style pages will be wired only if a backend page slot becomes available; this spec treats them as future work.
- No removal or refactor of existing slot/registry/plugin internals — they are the right shape.
- No Mantine / no Tailwind / no UI framework introduction — the visual stack stays pure CSS + CSS variables, matching the mock.
- No i18n additions beyond `__id` — translations are scoped to the default languages already shipped.

## 3. Architecture overview

```
ui-next/src/
├── styles/
│   ├── tokens.css       # :root CSS variables (dark default, light override)
│   ├── reset.css        # small normalize-style reset
│   └── globals.css      # base typography, body, scrollbar
├── theme/
│   ├── ThemeProvider.tsx  # context: theme + setTheme + system pref
│   ├── useTheme.ts        # hook
│   ├── theme-init.ts      # inline pre-hydration script for SSR safety
│   └── ThemeToggle.tsx
├── components/
│   ├── layout.tsx          # (existing) wraps DefaultLayout + applies html data-theme
│   ├── link.tsx            # (existing, untouched)
│   ├── nav/
│   │   ├── TopNav.tsx
│   │   ├── BrandMark.tsx
│   │   ├── NavLink.tsx
│   │   └── LangPill.tsx
│   ├── primitives/
│   │   ├── Button.tsx      # ghost + primary variants
│   │   ├── Card.tsx        # .card, .side-card, .stat-card variants
│   │   ├── Chip.tsx        # .chip, with .diff / .tag variants
│   │   ├── Eyebrow.tsx     # .eyebrow
│   │   ├── LangTabs.tsx    # .lang-tabs
│   │   └── TagCloud.tsx
│   ├── charts/
│   │   ├── Ring.tsx        # SVG progress ring (CSS variable driven)
│   │   └── Trend.tsx       # bar trend (linear-gradient driven)
│   ├── ide/
│   │   ├── IDEFrame.tsx    # .ide + .ide-bar + .ide-body
│   │   └── SamplePair.tsx  # .samples layout
│   ├── article/
│   │   └── Article.tsx     # wraps problem markdown with .article styles
│   ├── sidebar/
│   │   ├── Sidebar.tsx
│   │   ├── CtaCard.tsx     # .cta
│   │   ├── Menu.tsx        # .menu
│   │   ├── ContestList.tsx # .contest list item
│   │   ├── Author.tsx      # .author + avatar
│   │   └── TagCard.tsx     # wrapper for side-card with h4 + accent-dot
│   └── Avatar.tsx
├── pages/
│   ├── index.ts        # (existing) page registry
│   ├── homepage.tsx    # rewritten to use new components
│   └── problem_main.tsx# rewritten to use new components
└── main.tsx            # wrap root in <ThemeProvider>, import global styles
```

Visual rules:

- Tokens live in a single `tokens.css` file and are imported once in `main.tsx`.
- Component CSS lives next to the component as `*.module.css` (Vite native). Each module exports typed `styles` object.
- No inline styles for visual concerns — only for dynamic layout (e.g. trend bar height).
- All charts use pure SVG (no chart library).

## 4. Design tokens

Mirrors `.claude/1.html` `:root` block, with one addition: a CSS class-driven light theme via `[data-theme="light"]`.

### 4.1 Color tokens

Dark (default) — copied verbatim from the mock:

```
--bg-0: #07080d;
--bg-1: #0c0f1a;
--bg-2: #121728;
--surface: rgba(255,255,255,0.03);
--surface-2: rgba(255,255,255,0.06);
--border: rgba(255,255,255,0.08);
--border-strong: rgba(255,255,255,0.16);
--text: #e8ecf3;
--text-soft: #a7b0c2;
--text-mute: #6b748a;
--cyan: #5eead4;
--blue: #7dd3fc;
--violet: #c4b5fd;
--pink: #f0abfc;
--amber: #fcd34d;
--green: #86efac;
--red: #fca5a5;
```

Light (`[data-theme="light"]`) — copied verbatim from the mock, neutralizing accents to monochrome.

### 4.2 Typography tokens

```
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
--font-mono: 'JetBrains Mono', ui-monospace, 'SFMono-Regular', monospace;
--font-display: 'Space Grotesk', 'Inter', sans-serif;

--text-xs: 11px;
--text-sm: 13px;
--text-base: 14px;
--text-md: 15.5px;
--text-lg: 16px;
--text-xl: 17px;
--text-2xl: 22px;
--text-3xl: 36px;
--text-4xl: 64px;

--leading-tight: 1.05;
--leading-snug: 1.3;
--leading-normal: 1.55;
--leading-relaxed: 1.75;
```

Font loading strategy:

- Use `<link rel="preconnect">` + Google Fonts in `index.html` (same as mock).
- Provide local `font-display: swap` fallback to `-apple-system` and `ui-monospace`.

### 4.3 Spacing, radius, shadow, motion

```
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 22px;
--space-6: 28px;
--space-7: 36px;
--space-8: 56px;

--radius-sm: 6px;
--radius-md: 10px;
--radius-lg: 16px;
--radius-xl: 22px;
--radius-pill: 999px;

--shadow-1: 0 1px 3px rgba(0,0,0,0.06);
--shadow-2: 0 6px 24px -8px rgba(94,234,212,0.6);
--shadow-3: 0 12px 30px -16px rgba(0,0,0,0.6);

--motion-fast: 150ms ease;
--motion-base: 200ms ease;
--motion-slow: 350ms ease;

--shell-max: 1320px;
--shell-padding: 28px;
```

### 4.4 Background ornament (dark only)

The mock has `body::before` (radial-gradient glows) and `body::after` (faded grid). These are kept but scoped:

- `body::before` and `body::after` apply only when `html[data-theme="dark"]` (or unset).
- Light theme sets them to `background: none` (per the mock).

## 5. Theme provider

### 5.1 State machine

`ThemeProvider` exposes:

```ts
type Theme = 'dark' | 'light';
interface ThemeContextValue {
  theme: Theme;
  setTheme: (next: Theme) => void;
  toggle: () => void;
}
```

`theme` is the **resolved** theme (never `'system'`). The provider tracks `'system'` internally only if needed for hint logic; the public API is just the resolved value.

### 5.2 Persistence + system preference

Resolution order (on first render and on every `prefers-color-scheme` change):

1. `localStorage.getItem('hydro.theme')` — explicit user choice.
2. `window.matchMedia('(prefers-color-scheme: light)').matches` → `'light'`, else `'dark'`.
3. Default: `'dark'`.

A `MediaQueryList` listener on `prefers-color-scheme` updates `theme` if no explicit choice is stored.

### 5.3 SSR safety — no flash

The `'next'` renderer in `packages/ui-next/index.ts` already inlines `<script id="__HYDRO_INJECTION__">`. We add **one additional inline script** to `index.html` (or to the renderer output) that runs **before React hydrates**:

```html
<script>
  (function () {
    var saved = null;
    try { saved = localStorage.getItem('hydro.theme'); } catch (e) {}
    var initial = saved
      || (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    document.documentElement.setAttribute('data-theme', initial);
  })();
</script>
```

This sets `data-theme` synchronously before any stylesheet-driven rule resolves, so first paint is correct.

### 5.4 `data-theme` source of truth

All themed styling reads from `html[data-theme="light"]` (selector) or the default. **No JS-side class toggling**, only attribute toggling. `ThemeProvider` reads the attribute and reacts to changes via `MutationObserver`.

## 6. Global components — API contracts

Each component is a default-exported React component (or named export for primitives). They are imported by pages, not registered as slots — slots remain the addon extension surface.

### 6.1 Nav

```tsx
<TopNav brand="Hydra" currentRoute="problem_main">
  <NavLink to="homepage">首页</NavLink>
  <NavLink to="problem_main">题库</NavLink>
  ...
</TopNav>
```

Behavior: sticky, `backdrop-filter: blur(18px)`, scroll-aware shadow on scroll. Current route determined by `useRouteMap()` + `useLocation()` from existing `RouterProvider`.

### 6.2 ThemeToggle

```tsx
<ThemeToggle />
```

Renders the moon icon when dark, sun icon when light (per mock). Calls `toggle()` from theme context. Persists to `localStorage`.

### 6.3 Card variants

```tsx
<Card variant="default">      // .card
<Card variant="side">         // .side-card
<Card variant="stat">         // .stat-card
```

Children + optional `header` prop. No built-in padding logic — caller controls.

### 6.4 Chip

```tsx
<Chip icon={<TimeIcon />}>1000<strong>ms</strong></Chip>
<Chip variant="diff" icon={<StarIcon />}>难度 1/10</Chip>
<Chip variant="tag" icon={<TagIcon />}>入门 · IO</Chip>
```

Inline-flex, with optional icon prop. Variants: `default`, `diff` (green border), `tag` (violet border).

### 6.5 Ring

```tsx
<Ring percent={45} size={86} strokeWidth={10} gradientId="g1" label="AC" />
```

Pure SVG. `percent` is 0–100. Gradient stops defined in CSS using `--cyan` and `--violet`. `label` rendered centered as `<b>{label}</b>`.

### 6.6 Trend

```tsx
<Trend values={[30, 55, 42, 70, 60, 85, 78]} />
```

Renders a flex row of bars; height proportional to max. Bars use `linear-gradient(180deg, var(--cyan), rgba(94,234,212,0.2))` by default. Optional `color="blue"` for second trend in mock.

### 6.7 IDEFrame

```tsx
<IDEFrame filename="stdin.txt" actions={[<a>Copy</a>, <a>填充到自测</a>]}>
  <span className="lineNo">1</span><span>1 2</span>
</IDEFrame>
```

Renders `.ide` + `.ide-bar` with red/yellow/green dots + filename + actions, then `.ide-body` with the children. **Pure presentation** — does not handle file input or syntax highlighting (that lives in the page that uses it).

### 6.8 SamplePair

```tsx
<SamplePair
  num={1}
  input={{ filename: 'stdin.txt', lineNo: 1, value: '1 2', actions: [...] }}
  output={{ filename: 'stdout.txt', lineNo: 1, value: '3', actions: [...] }}
/>
```

Lays out two `IDEFrame` instances side-by-side with an arrow.

### 6.9 Article

```tsx
<Article langTabs={<LangTabs ... />}>
  <MarkdownRenderer html={...} />  {/* backend-rendered markdown HTML */}
</Article>
```

Wraps the markdown HTML in `.article` and applies the H2 / paragraph / code / em styles from the mock. **Does not** parse markdown — caller passes already-rendered HTML.

### 6.10 CtaCard / Menu / ContestList / Author / TagCard

Side-specific layouts. Each is a thin component around its `.side-card h4 + accent-dot` or `.cta` / `.menu` / `.contest` / `.author` / `.tag-cloud` markup.

## 7. Page rewrites

### 7.1 `homepage.tsx`

Currently a 5-line placeholder. New version:

- Uses the existing `DefaultLayout` for `<Outlet />`.
- Renders a `TopNav` at the top, a `Footer` at the bottom.
- Body is a `.shell` container with a minimal hero section (not as elaborate as the problem-detail mock — that mock is for problem_detail, not homepage).
- Goal: prove the design system works end-to-end with non-trivial content.

### 7.2 `problem_main.tsx`

Currently a 5-line placeholder. New version:

- TopNav + Footer.
- `.shell` container.
- Two-column main area: left = problem list (table or grid), right = sidebar with filters.
- Problem list rows show: ID, title, tags (chips), AC rate (Ring mini), difficulty (Chip variant=diff).
- Sidebar has: search input, tag cloud (`TagCloud`), recent authors.
- This page is **not** the problem-detail mock — but it exercises the same primitives so the visual system gets real-world validation.

### 7.3 `problem_detail` (future)

Out of scope for this spec — but the design tokens and component API are designed so that a future `problem_detail.tsx` slot can be added by porting `.claude/1.html` markup directly into React. Mentioned here as the natural follow-up.

## 8. Plugin / addon compatibility

- No changes to `registry/*`. Existing slot and plugin contracts are preserved.
- A new global slot key `app:theme:toggle` is documented (informally) so addons can replace or extend the `ThemeToggle`.
- Addon UI entry remains `addon/ui/index.tsx` with default export `{ name, install }` — unchanged.

## 9. Build & dev workflow

- `yarn workspace @hydrooj/ui-next dev` — Vite dev server with HMR. ThemeProvider works correctly because `data-theme` is set by the inline script.
- `yarn build:ui-next` — `tsc --noEmit` + `vite build`. Output goes to `packages/ui-next/public/`.
- In hydrooj process: `yarn debug` — the existing 'next' renderer picks up the bundle and serves it on DEV middleware.

## 10. Testing

Manual visual verification (no automated visual tests in ui-next today):

- Run `yarn debug`, open `http://localhost:2333/` and `/p`.
- Verify:
  - First paint has correct theme (no flash).
  - Toggle via `ThemeToggle` persists across reloads.
  - System theme change updates when no explicit choice is stored.
  - All chips / cards / rings render with correct colors in both themes.
  - Mobile breakpoint (≤ 600px) collapses gracefully (topnav links wrap or hide, columns stack).
- Compare side-by-side with `.claude/1.html` mock in browser.

Future (out of scope): add `vitest` + `@testing-library/react` + a Playwright visual-regression suite.

## 11. Risk register

| Risk | Mitigation |
|---|---|
| FOUC (flash of unstyled content) on first paint | Inline pre-hydration script sets `data-theme` before stylesheets resolve. |
| Hydration mismatch when theme differs between server-rendered HTML and client | Renderer outputs `data-theme` matching what the inline script will set; ThemeProvider re-reads on mount and only updates DOM, never re-renders mismatchy children. |
| Existing `useRouteMap` / `RouterProvider` don't expose enough to drive `TopNav`'s "active" state | TopNav derives active state from `path-to-regexp` match against route map. If a route lacks a `:name`, fall back to comparing with `usePageData().name`. |
| Google Fonts blocked / slow in CN region | Provide local fallback fonts (`-apple-system`, system-ui). `font-display: swap` so text shows with fallback before custom font loads. |
| `data-theme` attribute mutation doesn't trigger React re-render | `ThemeProvider` uses `MutationObserver` on `<html>` and exposes the value via context, so consumers re-render correctly. |

## 12. Out of scope (explicit)

- Porting additional pages from ui-default to ui-next.
- Problem-detail page implementation (only the visual primitives needed for it are built).
- Removing or replacing `ui-default`.
- Backend changes (the 'next' renderer is untouched).
- i18n additions.
- Automated visual regression tests.
- Animation library (Framer Motion etc.) — all motion is pure CSS transitions.

## 13. Open questions

None — proceeding per user direction (2026-07-07: user authorized direct work on `packages/ui-next` with visual reference `.claude/1.html` and explicitly waived the brainstorming "ask questions" and "user review" gates).

## 14. Implementation phases

For the writing-plans skill to expand into concrete PR-sized steps:

1. **Token & theme foundation** — `styles/tokens.css`, `styles/reset.css`, `styles/globals.css`, `theme/ThemeProvider.tsx`, `theme/theme-init.ts`, `theme/ThemeToggle.tsx`, integrate inline pre-hydration script into `index.ts` renderer.
2. **Primitives** — `Button`, `Card`, `Chip`, `Eyebrow`, `LangTabs`, `TagCloud`, `Avatar`.
3. **Charts** — `Ring`, `Trend`.
4. **Content components** — `IDEFrame`, `SamplePair`, `Article`, `CtaCard`, `Menu`, `ContestList`, `Author`, `TagCard`.
5. **Nav** — `TopNav`, `BrandMark`, `NavLink`, `LangPill`.
6. **Page rewrites** — `homepage.tsx` then `problem_main.tsx`, exercising every primitive at least once.
7. **Manual visual regression** — capture screenshots in dark + light, both pages, both breakpoints; compare against `.claude/1.html`.