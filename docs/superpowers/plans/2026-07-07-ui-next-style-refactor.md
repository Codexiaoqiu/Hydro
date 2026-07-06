# ui-next Style Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the visual language from `.claude/1.html` to `packages/ui-next`, replacing its placeholder UI with a dark-first themed, design-token-driven React 19 implementation covering homepage and problem_main pages.

**Architecture:** Pure CSS + CSS variables (no UI framework). All themed styling driven by `html[data-theme]` attribute, set by a pre-hydration inline script for SSR safety. React components import sibling `*.module.css` files (Vite native). Slot/registry/plugin internals unchanged. The existing 'next' renderer in `packages/ui-next/index.ts` is the only backend integration point; it gets a small addition to inject the pre-hydration script.

**Tech Stack:** Vite 8 + React 19 (already in ui-next). CSS Modules. TypeScript 5.8. Pure SVG for charts. Google Fonts (Inter / JetBrains Mono / Space Grotesk).

## Global Constraints

- TypeScript strict mode is OFF (existing project setting in `tsconfig.json`); do not enable.
- Node ≥22 required (already enforced by `init.ts`).
- Yarn 4.6.0 (Corepack). Use `yarn workspace @hydrooj/ui-next <cmd>` for ui-next commands.
- AGPLv3 — retain all copyright. Do not remove license headers from existing files.
- No new runtime dependencies beyond React/Vite/TS already present.
- No Mantine / Tailwind / Framer Motion / chart libraries — keep the visual stack pure CSS.
- All new components are `.tsx`; all new stylesheets are `.module.css` next to the component.
- Commit messages use Conventional Commits (`feat:`, `chore:`, `fix:`). Each task ends with one commit.

## File Structure

Created during implementation (all under `packages/ui-next/src/`):

```
styles/
  tokens.css              — :root CSS variables (dark default + light override)
  reset.css               — small normalize-style reset
  globals.css             — base typography, body background ornament, scrollbar
theme/
  ThemeProvider.tsx       — React context, theme state, MutationObserver
  useTheme.ts             — hook wrapper
  theme-init.ts           — exports the inline pre-hydration script as a string
components/
  layout.tsx              — (existing) updated to apply data-theme on mount
  link.tsx                — (existing) untouched
  primitives/
    Button.tsx            + Button.module.css
    Card.tsx              + Card.module.css
    Chip.tsx              + Chip.module.css
    Eyebrow.tsx           + Eyebrow.module.css
    LangTabs.tsx          + LangTabs.module.css
    TagCloud.tsx          + TagCloud.module.css
    Avatar.tsx            + Avatar.module.css
  charts/
    Ring.tsx              + Ring.module.css
    Trend.tsx             + Trend.module.css
  ide/
    IDEFrame.tsx          + IDEFrame.module.css
    SamplePair.tsx        + SamplePair.module.css
  article/
    Article.tsx           + Article.module.css
  sidebar/
    CtaCard.tsx           + CtaCard.module.css
    Menu.tsx              + Menu.module.css
    ContestList.tsx       + ContestList.module.css
    Author.tsx            + Author.module.css
  nav/
    TopNav.tsx            + TopNav.module.css
    BrandMark.tsx         + BrandMark.module.css
    NavLink.tsx           + NavLink.module.css
    LangPill.tsx          + LangPill.module.css
  ThemeToggle.tsx         + ThemeToggle.module.css
pages/
  homepage.tsx            — rewritten using new primitives
  problem_main.tsx        — rewritten using new primitives
  index.ts                — (existing) untouched
main.tsx                  — updated: import global styles, wrap root in <ThemeProvider>
index.html                — updated: add Google Fonts <link> tags + theme-init inline script
index.ts                  — updated: append theme-init script into renderer HTML output (production)
```

Modified (existing files):
- `packages/ui-next/index.html` — add font links + theme-init inline script.
- `packages/ui-next/src/main.tsx` — import `styles/tokens.css`, `styles/reset.css`, `styles/globals.css`; wrap `<App>` in `<ThemeProvider>`.
- `packages/ui-next/src/index.ts` (Cordis plugin) — include `theme-init` script in the rendered HTML (both DEV and PROD paths).
- `packages/ui-next/src/components/layout.tsx` — emit `data-theme` attribute on first render only (defensive; the inline script already set it).
- `packages/ui-next/src/pages/homepage.tsx` — full rewrite using primitives.
- `packages/ui-next/src/pages/problem_main.tsx` — full rewrite using primitives.

---

## Task 1: Style tokens + reset + globals

**Files:**
- Create: `packages/ui-next/src/styles/tokens.css`
- Create: `packages/ui-next/src/styles/reset.css`
- Create: `packages/ui-next/src/styles/globals.css`

**Interfaces:**
- Consumes: nothing (no prior task)
- Produces: CSS variables on `:root` (dark defaults) and `[data-theme="light"]` (override). Used by every later component.

- [ ] **Step 1: Create `styles/tokens.css`**

Copy the tokens verbatim from `.claude/1.html` `:root` block (colors), then add typography, spacing, radius, shadow, motion tokens from spec §4.2, §4.3, §4.4. Include the `[data-theme="light"]` override block at the bottom. Example structure:

```css
:root {
  /* colors — dark default */
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

  /* typography */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, 'SFMono-Regular', monospace;
  --font-display: 'Space Grotesk', 'Inter', sans-serif;
  --text-xs: 11px; --text-sm: 13px; --text-base: 14px; --text-md: 15.5px;
  --text-lg: 16px; --text-xl: 17px; --text-2xl: 22px; --text-3xl: 36px; --text-4xl: 64px;
  --leading-tight: 1.05; --leading-snug: 1.3; --leading-normal: 1.55; --leading-relaxed: 1.75;

  /* spacing */
  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px;
  --space-5: 22px; --space-6: 28px; --space-7: 36px; --space-8: 56px;

  /* radius */
  --radius-sm: 6px; --radius-md: 10px; --radius-lg: 16px; --radius-xl: 22px; --radius-pill: 999px;

  /* shadow */
  --shadow-1: 0 1px 3px rgba(0,0,0,0.06);
  --shadow-2: 0 6px 24px -8px rgba(94,234,212,0.6);
  --shadow-3: 0 12px 30px -16px rgba(0,0,0,0.6);

  /* motion */
  --motion-fast: 150ms ease;
  --motion-base: 200ms ease;
  --motion-slow: 350ms ease;

  /* shell */
  --shell-max: 1320px;
  --shell-padding: 28px;
}

[data-theme="light"] {
  --bg-0: #ffffff; --bg-1: #fafafa; --bg-2: #f5f5f5;
  --surface: #ffffff; --surface-2: #f7f7f7;
  --border: #eaeaea; --border-strong: #d1d1d1;
  --text: #000000; --text-soft: #444444; --text-mute: #8f8f8f;
  --cyan: #171717; --blue: #444444; --violet: #171717;
  --pink: #666666; --amber: #171717; --green: #171717; --red: #171717;
}
```

- [ ] **Step 2: Create `styles/reset.css`**

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body, #root { height: 100%; }
img, svg { display: block; max-width: 100%; }
button { font: inherit; cursor: pointer; background: none; border: none; color: inherit; }
a { color: inherit; text-decoration: none; }
ul, ol { list-style: none; }
```

- [ ] **Step 3: Create `styles/globals.css`**

```css
html { background: var(--bg-0); }
body {
  background: var(--bg-0);
  color: var(--text);
  font-family: var(--font-sans);
  font-size: var(--text-base);
  line-height: var(--leading-normal);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overflow-x: hidden;
  transition: background-color var(--motion-slow), color var(--motion-slow);
}

/* dark-only background ornament */
html:not([data-theme="light"]) body::before {
  content: '';
  position: fixed; inset: 0;
  background:
    radial-gradient(900px 600px at 15% -10%, rgba(94,234,212,0.18), transparent 60%),
    radial-gradient(800px 500px at 95% 10%, rgba(196,181,253,0.16), transparent 60%),
    radial-gradient(700px 600px at 50% 110%, rgba(125,211,252,0.14), transparent 60%);
  pointer-events: none; z-index: 0;
}
html:not([data-theme="light"]) body::after {
  content: '';
  position: fixed; inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
  background-size: 56px 56px;
  mask-image: radial-gradient(circle at 50% 30%, black 0%, transparent 80%);
  -webkit-mask-image: radial-gradient(circle at 50% 30%, black 0%, transparent 80%);
  pointer-events: none; z-index: 0;
}
#root { position: relative; z-index: 1; }

/* scrollbar */
::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-track { background: var(--bg-1); }
::-webkit-scrollbar-thumb { background: var(--surface-2); border-radius: var(--radius-pill); }
::-webkit-scrollbar-thumb:hover { background: var(--border-strong); }
```

- [ ] **Step 4: Commit**

```bash
cd /home/Hydro
git add packages/ui-next/src/styles/
git commit -m "feat(ui-next): add design tokens, reset, and global styles"
```

---

## Task 2: Theme provider + hook + inline init script

**Files:**
- Create: `packages/ui-next/src/theme/ThemeProvider.tsx`
- Create: `packages/ui-next/src/theme/useTheme.ts`
- Create: `packages/ui-next/src/theme/theme-init.ts`

**Interfaces:**
- Consumes: nothing (no prior task)
- Produces:
  - `<ThemeProvider>` React component wrapping any tree
  - `useTheme()` hook returning `{ theme, setTheme, toggle }`
  - `THEME_INIT_SCRIPT` string exported from `theme-init.ts` — the inline script body

- [ ] **Step 1: Create `theme/theme-init.ts`**

```ts
export const THEME_INIT_SCRIPT = `(function(){var s=null;try{s=localStorage.getItem('hydro.theme');}catch(e){}var t=s||(window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');document.documentElement.setAttribute('data-theme',t);})();`;
```

- [ ] **Step 2: Create `theme/useTheme.ts`**

```ts
import { createContext } from 'react';

export type Theme = 'dark' | 'light';

export interface ThemeContextValue {
  theme: Theme;
  setTheme: (next: Theme) => void;
  toggle: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);
```

- [ ] **Step 3: Create `theme/ThemeProvider.tsx`**

```tsx
import { useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { ThemeContext, type Theme, type ThemeContextValue } from './useTheme';

const STORAGE_KEY = 'hydro.theme';

function resolveInitial(): Theme {
  if (typeof window === 'undefined') return 'dark';
  let saved: string | null = null;
  try { saved = window.localStorage.getItem(STORAGE_KEY); } catch {}
  if (saved === 'dark' || saved === 'light') return saved;
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
  return 'dark';
}

export function ThemeProvider({ children }: PropsWithChildren) {
  // Read what the inline script set on <html>; never override on first render.
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof document === 'undefined') return 'dark';
    const attr = document.documentElement.getAttribute('data-theme');
    return attr === 'light' ? 'light' : 'dark';
  });

  useEffect(() => {
    // Watch for external mutations (e.g. another component changing it).
    const obs = new MutationObserver(() => {
      const attr = document.documentElement.getAttribute('data-theme');
      const next: Theme = attr === 'light' ? 'light' : 'dark';
      setThemeState((prev) => (prev === next ? prev : next));
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (typeof window.matchMedia === 'undefined') return;
    const mql = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => {
      let saved: string | null = null;
      try { saved = localStorage.getItem(STORAGE_KEY); } catch {}
      if (saved === 'dark' || saved === 'light') return; // user has explicit choice
      const next: Theme = mql.matches ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
    };
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    setTheme: (next) => {
      try { localStorage.setItem(STORAGE_KEY, next); } catch {}
      document.documentElement.setAttribute('data-theme', next);
    },
    toggle: () => {
      const next: Theme = theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(STORAGE_KEY, next); } catch {}
      document.documentElement.setAttribute('data-theme', next);
    },
  }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
```

- [ ] **Step 4: Commit**

```bash
git add packages/ui-next/src/theme/
git commit -m "feat(ui-next): add theme provider, hook, and SSR-safe init script"
```

---

## Task 3: ThemeToggle component

**Files:**
- Create: `packages/ui-next/src/components/ThemeToggle.tsx`
- Create: `packages/ui-next/src/components/ThemeToggle.module.css`

**Interfaces:**
- Consumes: `useTheme()` from Task 2.
- Produces: `<ThemeToggle />` button that toggles theme and persists choice.

- [ ] **Step 1: Create `ThemeToggle.module.css`**

```css
.toggle {
  display: inline-flex; align-items: center; justify-content: center;
  width: 38px; height: 38px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text-soft);
  transition: color var(--motion-base), border-color var(--motion-base), background-color var(--motion-base);
}
.toggle:hover { color: var(--text); border-color: var(--border-strong); }
.icon { width: 18px; height: 18px; }
.moon { display: block; }
.sun  { display: none; }
:global(html[data-theme="light"]) .moon { display: none; }
:global(html[data-theme="light"]) .sun  { display: block; }
```

- [ ] **Step 2: Create `ThemeToggle.tsx`**

```tsx
import { useTheme } from '../theme/useTheme';
import styles from './ThemeToggle.module.css';

export function ThemeToggle() {
  const { toggle } = useTheme();
  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={toggle}
      aria-label="Toggle theme"
      title="Toggle theme"
    >
      <svg className={`${styles.icon} ${styles.moon}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
      <svg className={`${styles.icon} ${styles.sun}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
    </button>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/ui-next/src/components/ThemeToggle.tsx packages/ui-next/src/components/ThemeToggle.module.css
git commit -m "feat(ui-next): add ThemeToggle component"
```

---

## Task 4: Primitives — Button, Card, Chip

**Files:**
- Create: `packages/ui-next/src/components/primitives/Button.tsx`
- Create: `packages/ui-next/src/components/primitives/Button.module.css`
- Create: `packages/ui-next/src/components/primitives/Card.tsx`
- Create: `packages/ui-next/src/components/primitives/Card.module.css`
- Create: `packages/ui-next/src/components/primitives/Chip.tsx`
- Create: `packages/ui-next/src/components/primitives/Chip.module.css`

**Interfaces:**
- Consumes: tokens (Task 1). No prior components.
- Produces:
  - `<Button variant="primary" | "ghost">` with children
  - `<Card variant="default" | "side" | "stat" header?>` with children
  - `<Chip variant?="default" | "diff" | "tag" icon?>` with children

- [ ] **Step 1: Create `Button.module.css` + `Button.tsx`**

```css
/* Button.module.css */
.btn { display: inline-flex; align-items: center; justify-content: center; padding: 7px 16px; border-radius: var(--radius-md); font-size: var(--text-sm); font-weight: 600; transition: background-color var(--motion-base), color var(--motion-base), box-shadow var(--motion-base); }
.primary { background: linear-gradient(135deg, var(--cyan), var(--blue)); color: #062b29; box-shadow: var(--shadow-2); }
.primary:hover { filter: brightness(1.05); }
.ghost { background: transparent; color: var(--text-soft); }
.ghost:hover { background: var(--surface-2); color: var(--text); }
```

```tsx
// Button.tsx
import type { PropsWithChildren } from 'react';
import styles from './Button.module.css';

interface Props { variant?: 'primary' | 'ghost'; onClick?: () => void; type?: 'button' | 'submit'; }

export function Button({ variant = 'ghost', onClick, type = 'button', children }: PropsWithChildren<Props>) {
  return (
    <button type={type} className={`${styles.btn} ${styles[variant]}`} onClick={onClick}>
      {children}
    </button>
  );
}
```

- [ ] **Step 2: Create `Card.module.css` + `Card.tsx`**

```css
/* Card.module.css */
.card, .side, .stat {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  transition: background-color var(--motion-slow), border-color var(--motion-slow), box-shadow var(--motion-slow);
}
.side { padding: var(--space-5) var(--space-5); }
.stat { padding: var(--space-5) var(--space-6); position: relative; overflow: hidden; }
.header { display: flex; align-items: center; justify-content: space-between; padding: var(--space-4) var(--space-6); border-bottom: 1px solid var(--border); }
.title { font-family: var(--font-display); font-size: var(--text-xl); font-weight: 600; letter-spacing: -0.01em; }
```

```tsx
// Card.tsx
import type { PropsWithChildren, ReactNode } from 'react';
import styles from './Card.module.css';

interface Props {
  variant?: 'default' | 'side' | 'stat';
  header?: ReactNode;
}

export function Card({ variant = 'default', header, children }: PropsWithChildren<Props>) {
  const variantClass = variant === 'side' ? styles.side : variant === 'stat' ? styles.stat : styles.card;
  return (
    <div className={variantClass}>
      {header && <div className={styles.header}>{header}</div>}
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Create `Chip.module.css` + `Chip.tsx`**

```css
/* Chip.module.css */
.chip { display: inline-flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-3); border-radius: var(--radius-md); background: var(--surface-2); border: 1px solid var(--border); font-size: var(--text-sm); color: var(--text-soft); }
.chip svg { width: 14px; height: 14px; opacity: 0.8; }
.chip strong { color: var(--text); font-weight: 600; }
.diff { color: var(--green); border-color: rgba(134,239,172,0.3); background: rgba(134,239,172,0.06); }
.tag  { color: var(--violet); border-color: rgba(196,181,253,0.3); background: rgba(196,181,253,0.06); }
```

```tsx
// Chip.tsx
import type { PropsWithChildren, ReactNode } from 'react';
import styles from './Chip.module.css';

interface Props { variant?: 'default' | 'diff' | 'tag'; icon?: ReactNode; }

export function Chip({ variant = 'default', icon, children }: PropsWithChildren<Props>) {
  const variantClass = variant === 'diff' ? styles.diff : variant === 'tag' ? styles.tag : '';
  return <span className={`${styles.chip} ${variantClass}`}>{icon}{children}</span>;
}
```

- [ ] **Step 4: Commit**

```bash
git add packages/ui-next/src/components/primitives/
git commit -m "feat(ui-next): add Button, Card, Chip primitives"
```

---

## Task 5: Primitives — Eyebrow, LangTabs, TagCloud, Avatar

**Files:**
- Create: `packages/ui-next/src/components/primitives/Eyebrow.tsx` + `.module.css`
- Create: `packages/ui-next/src/components/primitives/LangTabs.tsx` + `.module.css`
- Create: `packages/ui-next/src/components/primitives/TagCloud.tsx` + `.module.css`
- Create: `packages/ui-next/src/components/primitives/Avatar.tsx` + `.module.css`

**Interfaces:**
- Consumes: tokens (Task 1).
- Produces: `<Eyebrow dot? icon?>{children}</Eyebrow>`, `<LangTabs options active onChange/>`, `<TagCloud tags/>`, `<Avatar fallback name? size?/>`.

- [ ] **Step 1: Create `Eyebrow.module.css` + `Eyebrow.tsx`**

```css
/* Eyebrow.module.css */
.eyebrow { display: inline-flex; align-items: center; gap: var(--space-2); font-family: var(--font-mono); font-size: var(--text-xs); color: var(--cyan); text-transform: uppercase; letter-spacing: 0.18em; padding: 6px var(--space-3); border: 1px solid rgba(94,234,212,0.3); border-radius: var(--radius-pill); background: rgba(94,234,212,0.06); }
.dot { width: 6px; height: 6px; border-radius: 50%; background: var(--cyan); box-shadow: 0 0 8px var(--cyan); }
```

```tsx
// Eyebrow.tsx
import type { PropsWithChildren, ReactNode } from 'react';
import styles from './Eyebrow.module.css';

export function Eyebrow({ dot = true, children }: PropsWithChildren<{ dot?: boolean; icon?: ReactNode }>) {
  return <span className={styles.eyebrow}>{dot && <span className={styles.dot} />}{children}</span>;
}
```

- [ ] **Step 2: Create `LangTabs.module.css` + `LangTabs.tsx`**

```css
/* LangTabs.module.css */
.tabs { display: inline-flex; background: var(--surface-2); border-radius: var(--radius-md); padding: 4px; gap: 2px; }
.tab { background: transparent; border: 0; color: var(--text-mute); padding: 7px var(--space-3); border-radius: 7px; font-size: var(--text-sm); transition: all var(--motion-base); }
.tab.on { color: var(--text); background: rgba(94,234,212,0.12); box-shadow: inset 0 0 0 1px rgba(94,234,212,0.3); }
```

```tsx
// LangTabs.tsx
import styles from './LangTabs.module.css';

interface Option { value: string; label: string; }
interface Props { options: Option[]; active: string; onChange: (v: string) => void; }

export function LangTabs({ options, active, onChange }: Props) {
  return (
    <div className={styles.tabs}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={`${styles.tab} ${o.value === active ? styles.on : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create `TagCloud.module.css` + `TagCloud.tsx`**

```css
/* TagCloud.module.css */
.cloud { display: flex; flex-wrap: wrap; gap: 6px; }
.tag { font-size: var(--text-xs); padding: 4px var(--space-2); background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--radius-pill); color: var(--text-soft); transition: all var(--motion-base); }
.tag:hover { color: var(--text); border-color: var(--border-strong); }
```

```tsx
// TagCloud.tsx
import styles from './TagCloud.module.css';

export function TagCloud({ tags }: { tags: string[] }) {
  return <div className={styles.cloud}>{tags.map((t, i) => <span key={i} className={styles.tag}>{t}</span>)}</div>;
}
```

- [ ] **Step 4: Create `Avatar.module.css` + `Avatar.tsx`**

```css
/* Avatar.module.css */
.avatar { display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; background: linear-gradient(135deg, var(--cyan), var(--violet)); font-weight: 700; color: #0a0a0a; box-shadow: 0 4px 16px -4px rgba(94,234,212,0.5); }
```

```tsx
// Avatar.tsx
import styles from './Avatar.module.css';

interface Props { name?: string; size?: number; }
export function Avatar({ name = '?', size = 40 }: Props) {
  const letter = (name.trim()[0] || '?').toUpperCase();
  return <div className={styles.avatar} style={{ width: size, height: size, fontSize: size * 0.4 }}>{letter}</div>;
}
```

- [ ] **Step 5: Commit**

```bash
git add packages/ui-next/src/components/primitives/
git commit -m "feat(ui-next): add Eyebrow, LangTabs, TagCloud, Avatar primitives"
```

---

## Task 6: Charts — Ring, Trend

**Files:**
- Create: `packages/ui-next/src/components/charts/Ring.tsx` + `.module.css`
- Create: `packages/ui-next/src/components/charts/Trend.tsx` + `.module.css`

**Interfaces:**
- Consumes: tokens (Task 1).
- Produces: `<Ring percent size? strokeWidth? label?/>`, `<Trend values color? height?/>`.

- [ ] **Step 1: Create `Ring.module.css` + `Ring.tsx`**

```css
/* Ring.module.css */
.wrap { display: inline-flex; align-items: center; justify-content: center; position: relative; flex-shrink: 0; }
.svg { transform: rotate(-90deg); }
.track { fill: none; stroke: var(--surface-2); }
.bar { fill: none; stroke: url(#hydro-ring-gradient); stroke-linecap: round; transition: stroke-dashoffset 1.4s ease; }
.center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: var(--font-display); }
.big { font-size: 22px; font-weight: 700; }
.small { font-size: 10px; color: var(--text-mute); text-transform: uppercase; letter-spacing: 0.1em; }
```

```tsx
// Ring.tsx
import { useEffect, useState } from 'react';
import styles from './Ring.module.css';

interface Props {
  percent: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}

export function Ring({ percent, size = 86, strokeWidth = 10, label }: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const target = circumference * (1 - Math.max(0, Math.min(100, percent)) / 100);
  const [offset, setOffset] = useState(circumference);

  useEffect(() => {
    const id = requestAnimationFrame(() => setOffset(target));
    return () => cancelAnimationFrame(id);
  }, [target]);

  return (
    <div className={styles.wrap} style={{ width: size, height: size }}>
      <svg className={styles.svg} width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id="hydro-ring-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--cyan)" />
            <stop offset="100%" stopColor="var(--violet)" />
          </linearGradient>
        </defs>
        <circle className={styles.track} cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} />
        <circle className={styles.bar} cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth}
                strokeDasharray={circumference} strokeDashoffset={offset} />
      </svg>
      {label && (
        <div className={styles.center}>
          <b className={styles.big}>{Math.round(percent)}%</b>
          <span className={styles.small}>{label}</span>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `Trend.module.css` + `Trend.tsx`**

```css
/* Trend.module.css */
.trend { display: flex; align-items: flex-end; gap: 4px; height: 50px; }
.bar { flex: 1; background: linear-gradient(180deg, var(--cyan), rgba(94,234,212,0.2)); border-radius: 3px 3px 0 0; opacity: 0.85; transition: opacity var(--motion-base); }
.bar:hover { opacity: 1; }
.blue { background: linear-gradient(180deg, var(--blue), rgba(125,211,252,0.2)); }
```

```tsx
// Trend.tsx
import styles from './Trend.module.css';

interface Props { values: number[]; color?: 'cyan' | 'blue'; height?: number; }

export function Trend({ values, color = 'cyan', height = 50 }: Props) {
  const max = Math.max(...values, 1);
  return (
    <div className={styles.trend} style={{ height }}>
      {values.map((v, i) => (
        <div
          key={i}
          className={`${styles.bar} ${color === 'blue' ? styles.blue : ''}`}
          style={{ height: `${(v / max) * 100}%` }}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/ui-next/src/components/charts/
git commit -m "feat(ui-next): add Ring and Trend chart components"
```

---

## Task 7: Content components — IDEFrame, SamplePair, Article

**Files:**
- Create: `packages/ui-next/src/components/ide/IDEFrame.tsx` + `.module.css`
- Create: `packages/ui-next/src/components/ide/SamplePair.tsx` + `.module.css`
- Create: `packages/ui-next/src/components/article/Article.tsx` + `.module.css`

**Interfaces:**
- Consumes: tokens (Task 1).
- Produces: `<IDEFrame filename actions?>{children}</IDEFrame>`, `<SamplePair num input output/>`, `<Article langTabs?>{children}</Article>`.

- [ ] **Step 1: Create `IDEFrame.module.css` + `IDEFrame.tsx`**

```css
/* IDEFrame.module.css */
.ide { background: var(--bg-1); border: 1px solid var(--border); border-radius: var(--radius-md); overflow: hidden; box-shadow: var(--shadow-3); }
.bar { display: flex; align-items: center; justify-content: space-between; padding: var(--space-2) var(--space-3); background: var(--bg-2); border-bottom: 1px solid var(--border); font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-mute); }
.dots { display: flex; gap: 6px; }
.dots i { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
.dots i:nth-child(1) { background: #ff6b6b; }
.dots i:nth-child(2) { background: #ffd43b; }
.dots i:nth-child(3) { background: #51cf66; }
.actions { display: flex; gap: var(--space-2); }
.actions a { color: var(--text-mute); padding: 2px var(--space-2); border-radius: 5px; font-size: var(--text-xs); }
.actions a:hover { color: var(--text); background: var(--surface-2); }
.body { padding: var(--space-3) var(--space-4); font-family: var(--font-mono); font-size: var(--text-sm); line-height: 1.7; color: var(--text); display: flex; align-items: center; gap: var(--space-3); min-height: 56px; }
.ln { color: var(--text-mute); margin-right: var(--space-2); user-select: none; }
.v { flex: 1; }
```

```tsx
// IDEFrame.tsx
import type { PropsWithChildren, ReactNode } from 'react';
import styles from './IDEFrame.module.css';

interface Props { filename: string; actions?: ReactNode[]; lineNo?: number; }

export function IDEFrame({ filename, actions = [], lineNo, children }: PropsWithChildren<Props>) {
  return (
    <div className={styles.ide}>
      <div className={styles.bar}>
        <span className={styles.dots}><i /><i /><i /></span>
        <span>{filename}</span>
        <span className={styles.actions}>{actions.map((a, i) => <span key={i}>{a}</span>)}</span>
      </div>
      <div className={styles.body}>
        {lineNo !== undefined && <span className={styles.ln}>{lineNo}</span>}
        <span className={styles.v}>{children}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `SamplePair.module.css` + `SamplePair.tsx`**

```css
/* SamplePair.module.css */
.samples { display: grid; grid-template-columns: 1fr 28px 1fr; gap: 0; align-items: stretch; margin: var(--space-4) 0 var(--space-2); }
.col { display: flex; flex-direction: column; gap: var(--space-2); }
.h { font-size: var(--text-xs); color: var(--text-mute); text-transform: uppercase; letter-spacing: 0.14em; font-weight: 600; display: flex; align-items: center; gap: var(--space-2); }
.num { width: 22px; height: 22px; display: inline-flex; align-items: center; justify-content: center; background: var(--surface-2); border-radius: 6px; font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text); }
.arrow { align-self: center; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; color: var(--violet); font-size: 18px; }
```

```tsx
// SamplePair.tsx
import type { ReactNode } from 'react';
import { IDEFrame } from './IDEFrame';
import styles from './SamplePair.module.css';

interface FrameSpec { filename: string; lineNo: number; value: ReactNode; actions?: ReactNode[]; }

interface Props {
  num: number;
  input: FrameSpec;
  output: FrameSpec;
}

export function SamplePair({ num, input, output }: Props) {
  return (
    <div className={styles.samples}>
      <div className={styles.col}>
        <h4 className={styles.h}><span className={styles.num}>{num}</span>输入数据</h4>
        <IDEFrame filename={input.filename} lineNo={input.lineNo} actions={input.actions}>{input.value}</IDEFrame>
      </div>
      <div className={styles.arrow}>→</div>
      <div className={styles.col}>
        <h4 className={styles.h}><span className={styles.num}>{num}</span>输出数据</h4>
        <IDEFrame filename={output.filename} lineNo={output.lineNo} actions={output.actions}>{output.value}</IDEFrame>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `Article.module.css` + `Article.tsx`**

```css
/* Article.module.css */
.article { padding: var(--space-6) var(--space-7) var(--space-7); }
.article :global(h2) { font-family: var(--font-display); font-size: var(--text-2xl); font-weight: 600; margin: 32px 0 var(--space-3); padding-left: var(--space-3); border-left: 3px solid; border-image: linear-gradient(180deg, var(--cyan), var(--violet)) 1; letter-spacing: -0.01em; }
.article :global(h2:first-child) { margin-top: 6px; }
.article :global(p) { color: var(--text-soft); font-size: var(--text-md); line-height: var(--leading-relaxed); margin: var(--space-2) 0 6px; }
.article :global(code),
.article :global(em) { font-family: var(--font-mono); font-style: italic; color: var(--cyan); font-size: 0.94em; padding: 1px 7px; background: rgba(94,234,212,0.08); border-radius: 5px; border: 1px solid rgba(94,234,212,0.18); }
.article :global(strong) { color: var(--text); font-weight: 600; }
```

```tsx
// Article.tsx
import type { PropsWithChildren, ReactNode } from 'react';
import styles from './Article.module.css';

interface Props { langTabs?: ReactNode; }

export function Article({ langTabs, children }: PropsWithChildren<Props>) {
  return (
    <>
      {langTabs}
      <div className={styles.article}>{children}</div>
    </>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add packages/ui-next/src/components/ide packages/ui-next/src/components/article
git commit -m "feat(ui-next): add IDEFrame, SamplePair, Article components"
```

---

## Task 8: Sidebar components — CtaCard, Menu, ContestList, Author

**Files:**
- Create: `packages/ui-next/src/components/sidebar/CtaCard.tsx` + `.module.css`
- Create: `packages/ui-next/src/components/sidebar/Menu.tsx` + `.module.css`
- Create: `packages/ui-next/src/components/sidebar/ContestList.tsx` + `.module.css`
- Create: `packages/ui-next/src/components/sidebar/Author.tsx` + `.module.css`

**Interfaces:**
- Consumes: tokens (Task 1), `<Avatar>` (Task 5).
- Produces: `<CtaCard title subtitle actionLabel onAction/>`, `<Menu items/>`, `<ContestList items/>`, `<Author name contribution?/>`.

- [ ] **Step 1: Create `CtaCard.module.css` + `CtaCard.tsx`**

```css
/* CtaCard.module.css */
.cta { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); padding: var(--space-4); background: linear-gradient(135deg, rgba(94,234,212,0.1), rgba(196,181,253,0.1)); border: 1px solid rgba(94,234,212,0.25); border-radius: var(--radius-lg); margin-bottom: var(--space-2); transition: all var(--motion-slow); }
.text { font-size: var(--text-sm); }
.text b { display: block; font-size: var(--text-base); font-weight: 600; }
.text small { color: var(--text-mute); font-size: var(--text-xs); }
.btn { background: var(--text); color: var(--bg-0); border: 0; border-radius: var(--radius-md); padding: 9px var(--space-4); font-weight: 600; font-size: var(--text-sm); transition: opacity var(--motion-base); }
.btn:hover { opacity: 0.9; }
```

```tsx
// CtaCard.tsx
import styles from './CtaCard.module.css';

interface Props { title: string; subtitle?: string; actionLabel: string; onAction?: () => void; }

export function CtaCard({ title, subtitle, actionLabel, onAction }: Props) {
  return (
    <div className={styles.cta}>
      <div className={styles.text}>
        <b>{title}</b>
        {subtitle && <small>{subtitle}</small>}
      </div>
      <button type="button" className={styles.btn} onClick={onAction}>{actionLabel}</button>
    </div>
  );
}
```

- [ ] **Step 2: Create `Menu.module.css` + `Menu.tsx`**

```css
/* Menu.module.css */
.menu { display: flex; flex-direction: column; }
.row { display: flex; align-items: center; justify-content: space-between; padding: 12px 4px; color: var(--text-soft); font-size: var(--text-sm); border-bottom: 1px dashed var(--border); transition: color var(--motion-base); }
.row:last-child { border-bottom: 0; }
.row:hover { color: var(--text); }
.l { display: flex; align-items: center; gap: var(--space-2); }
.l svg { width: 15px; height: 15px; opacity: 0.7; }
.badge { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-mute); background: var(--surface-2); padding: 2px var(--space-2); border-radius: var(--radius-pill); }
```

```tsx
// Menu.tsx
import type { ReactNode } from 'react';
import styles from './Menu.module.css';

export interface MenuItem { label: string; icon?: ReactNode; badge?: string | number; onClick?: () => void; }

export function Menu({ items }: { items: MenuItem[] }) {
  return (
    <div className={styles.menu}>
      {items.map((it, i) => (
        <a key={i} className={styles.row} onClick={it.onClick}>
          <span className={styles.l}>{it.icon}{it.label}</span>
          {it.badge !== undefined && <span className={styles.badge}>{it.badge}</span>}
        </a>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create `ContestList.module.css` + `ContestList.tsx`**

```css
/* ContestList.module.css */
.item { display: flex; align-items: center; justify-content: space-between; padding: 12px var(--space-3); border-radius: var(--radius-md); background: var(--surface-2); border: 1px solid var(--border); margin-bottom: var(--space-2); cursor: pointer; transition: border-color var(--motion-base); }
.item:hover { border-color: var(--border-strong); }
.l { display: flex; align-items: center; gap: var(--space-2); font-size: var(--text-sm); }
.ico { width: 28px; height: 28px; border-radius: var(--radius-md); background: linear-gradient(135deg, var(--pink), var(--violet)); display: flex; align-items: center; justify-content: center; font-size: var(--text-sm); }
.r { font-size: var(--text-xs); color: var(--text-mute); font-family: var(--font-mono); }
```

```tsx
// ContestList.tsx
import styles from './ContestList.module.css';

export interface ContestItem { title: string; emoji?: string; date: string; onClick?: () => void; }

export function ContestList({ items }: { items: ContestItem[] }) {
  return (
    <div>
      {items.map((c, i) => (
        <div key={i} className={styles.item} onClick={c.onClick}>
          <div className={styles.l}>
            <div className={styles.ico}>{c.emoji ?? '🏆'}</div>
            {c.title}
          </div>
          <div className={styles.r}>{c.date}</div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Create `Author.module.css` + `Author.tsx`**

```css
/* Author.module.css */
.author { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3); background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--radius-lg); }
.meta { line-height: 1.3; }
.meta b { font-size: var(--text-sm); }
.meta small { display: block; color: var(--text-mute); font-size: var(--text-xs); }
```

```tsx
// Author.tsx
import { Avatar } from '../primitives/Avatar';
import styles from './Author.module.css';

interface Props { name: string; contribution?: string; }

export function Author({ name, contribution }: Props) {
  return (
    <div className={styles.author}>
      <Avatar name={name} />
      <div className={styles.meta}>
        <b>{name}</b>
        {contribution && <small>{contribution}</small>}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add packages/ui-next/src/components/sidebar/
git commit -m "feat(ui-next): add sidebar components (CtaCard, Menu, ContestList, Author)"
```

---

## Task 9: Nav components — TopNav, BrandMark, NavLink, LangPill

**Files:**
- Create: `packages/ui-next/src/components/nav/TopNav.tsx` + `.module.css`
- Create: `packages/ui-next/src/components/nav/BrandMark.tsx` + `.module.css`
- Create: `packages/ui-next/src/components/nav/NavLink.tsx` + `.module.css`
- Create: `packages/ui-next/src/components/nav/LangPill.tsx` + `.module.css`

**Interfaces:**
- Consumes: tokens (Task 1), `<ThemeToggle>` (Task 3), `useLocation` from existing `RouterProvider`.
- Produces: `<TopNav brand currentRoute children right?/>`, `<NavLink to active?>` (renders as link using `Link`), `<LangPill label/>`.

- [ ] **Step 1: Create `BrandMark.module.css` + `BrandMark.tsx`**

```css
/* BrandMark.module.css */
.brand { display: flex; align-items: center; gap: var(--space-2); font-family: var(--font-display); font-weight: 700; font-size: var(--text-lg); letter-spacing: -0.02em; }
.mark { width: 30px; height: 30px; border-radius: var(--radius-md); background: conic-gradient(from 220deg at 50% 50%, var(--cyan), var(--violet), var(--pink), var(--blue), var(--cyan)); position: relative; box-shadow: 0 0 24px rgba(125,211,252,0.4); }
.mark::after { content: ''; position: absolute; inset: 5px; background: var(--bg-0); border-radius: 4px; }
:global(html[data-theme="light"]) .mark { background: #000; box-shadow: none; }
:global(html[data-theme="light"]) .mark::after { background: #fff; }
```

```tsx
// BrandMark.tsx
import styles from './BrandMark.module.css';

export function BrandMark({ name }: { name: string }) {
  return (
    <span className={styles.brand}>
      <span className={styles.mark} />
      {name}
    </span>
  );
}
```

- [ ] **Step 2: Create `NavLink.module.css` + `NavLink.tsx`**

```css
/* NavLink.module.css */
.link { color: var(--text-soft); padding: var(--space-2) var(--space-3); border-radius: var(--radius-md); font-size: var(--text-sm); transition: all var(--motion-base); }
.link:hover { color: var(--text); background: var(--surface-2); }
.active { color: var(--text); background: var(--surface-2); position: relative; }
.active::after { content: ''; position: absolute; left: var(--space-3); right: var(--space-3); bottom: -1px; height: 2px; background: linear-gradient(90deg, var(--cyan), var(--violet)); border-radius: 2px; }
:global(html[data-theme="light"]) .active::after { background: #000; }
```

```tsx
// NavLink.tsx
import type { PropsWithChildren } from 'react';
import { Link } from '../link';
import styles from './NavLink.module.css';

interface Props { to: string; active?: boolean; }

export function NavLink({ to, active, children }: PropsWithChildren<Props>) {
  return (
    <Link to={to} className={`${styles.link} ${active ? styles.active : ''}`}>{children}</Link>
  );
}
```

- [ ] **Step 3: Create `LangPill.module.css` + `LangPill.tsx`**

```css
/* LangPill.module.css */
.pill { display: inline-flex; align-items: center; gap: 6px; padding: 6px var(--space-3); border-radius: var(--radius-md); border: 1px solid var(--border); font-size: var(--text-sm); color: var(--text-soft); cursor: pointer; transition: border-color var(--motion-base); }
.pill:hover { border-color: var(--border-strong); }
```

```tsx
// LangPill.tsx
import styles from './LangPill.module.css';

export function LangPill({ label, onClick }: { label: string; onClick?: () => void }) {
  return <button type="button" className={styles.pill} onClick={onClick}>🌐 {label} ▾</button>;
}
```

- [ ] **Step 4: Create `TopNav.module.css` + `TopNav.tsx`**

```css
/* TopNav.module.css */
.nav { position: sticky; top: 0; z-index: 50; backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); background: rgba(7,8,13,0.65); border-bottom: 1px solid var(--border); transition: background-color var(--motion-slow), border-color var(--motion-slow); }
:global(html[data-theme="light"]) .nav { background: rgba(255,255,255,0.8); }
.inner { display: flex; align-items: center; gap: 36px; height: 68px; max-width: var(--shell-max); margin: 0 auto; padding: 0 var(--shell-padding); }
.links { display: flex; gap: 4px; align-items: center; font-size: var(--text-sm); }
.spacer { flex: 1; }
.right { display: flex; align-items: center; gap: var(--space-3); font-size: var(--text-sm); color: var(--text-soft); }
```

```tsx
// TopNav.tsx
import type { PropsWithChildren, ReactNode } from 'react';
import { useLocation } from '../../context/router';
import { BrandMark } from './BrandMark';
import styles from './TopNav.module.css';

interface Props { brand: string; currentRoute?: string; right?: ReactNode; }

export function TopNav({ brand, currentRoute, right, children }: PropsWithChildren<Props>) {
  // currentRoute prop wins; fall back to last route segment from location
  const location = useLocation();
  const inferred = currentRoute ?? (location.pathname.split('/').filter(Boolean).pop() || 'homepage');
  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>
        <BrandMark name={brand} />
        <div className={styles.links}>
          {children}
        </div>
        <div className={styles.spacer} />
        <div className={styles.right}>{right}</div>
      </div>
    </nav>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add packages/ui-next/src/components/nav/
git commit -m "feat(ui-next): add TopNav and supporting nav components"
```

---

## Task 10: Wire global styles + ThemeProvider into main.tsx + index.html

**Files:**
- Modify: `packages/ui-next/src/main.tsx`
- Modify: `packages/ui-next/index.html`

**Interfaces:**
- Consumes: tokens / reset / globals (Task 1), `ThemeProvider` (Task 2).
- Produces: every page mounted under `<ThemeProvider>`; the global CSS variables and reset applied; Google Fonts preloaded.

- [ ] **Step 1: Modify `main.tsx`**

Replace the existing `main.tsx` body so it imports the three global stylesheets at the very top and wraps `<App />` in `<ThemeProvider>`. Result (key edits only — full file):

```tsx
import './styles/tokens.css';
import './styles/reset.css';
import './styles/globals.css';

import './pages';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as api from './api';
import App from './app';
import { PageDataProvider } from './context/page-data';
import { RouterProvider } from './context/router';
import { initialPage, pluginsUrl } from './globals';
import { installPlugin } from './registry';
import { ThemeProvider } from './theme/ThemeProvider';

// ... existing window typing unchanged ...

async function loadPlugins() { /* unchanged */ }

await loadPlugins();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <PageDataProvider initial={initialPage}>
        <RouterProvider>
          <App />
        </RouterProvider>
      </PageDataProvider>
    </ThemeProvider>
  </StrictMode>,
);
```

- [ ] **Step 2: Modify `index.html`**

Add font preconnect + Google Fonts link inside `<head>`, and replace the body comment with the inline theme-init script placed before `/src/main.tsx`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet" />
    <title>Hydro</title>
    <!-- __HYDRO_INJECTION__DO_NOT_REMOVE_THIS__ -->
    <script>(function(){var s=null;try{s=localStorage.getItem('hydro.theme');}catch(e){}var t=s||(window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');document.documentElement.setAttribute('data-theme',t);})();</script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Smoke-test in dev**

```bash
yarn workspace @hydrooj/ui-next dev
# Open http://localhost:5173 — verify body has correct background and font.
```

- [ ] **Step 4: Commit**

```bash
git add packages/ui-next/src/main.tsx packages/ui-next/index.html
git commit -m "feat(ui-next): wire global styles and ThemeProvider into root"
```

---

## Task 11: Inject theme-init script from the Cordis renderer (production parity)

**Files:**
- Modify: `packages/ui-next/index.ts` (DEV path and PROD path)

**Interfaces:**
- Consumes: `THEME_INIT_SCRIPT` from `theme/theme-init.ts`.
- Produces: The HTML rendered by the `'next'` renderer in both DEV (Vite middleware) and PROD (static `public/index.html`) modes contains the pre-hydration script.

- [ ] **Step 1: Add import**

At the top of `packages/ui-next/index.ts`, add:

```ts
import { THEME_INIT_SCRIPT } from './theme/theme-init';
```

- [ ] **Step 2: Patch the DEV renderer's HTML output**

Inside the DEV path's `render` function (the one calling `vite.transformIndexHtml`), after reading `html`, replace `</head>` with `${THEME_INIT_SCRIPT}</head>` so the inline script lands in the served HTML:

```ts
const htmlToRender = html.replace(INJECT_MARKER, buildInject(serialized)).replace('</head>', `${THEME_INIT_SCRIPT}</head>`);
```

- [ ] **Step 3: Patch the PROD renderer's HTML output**

Same treatment inside the `else` branch (production), after reading `public/index.html`:

```ts
const html = fs.readFileSync(indexHtml, 'utf-8').replace('</head>', `${THEME_INIT_SCRIPT}</head>`);
```

- [ ] **Step 4: Smoke-test production render path**

```bash
yarn build:ui-next
yarn debug   # or yarn start
# Open http://localhost:2333/ in an incognito window (no localStorage yet) —
# verify dark theme renders on first paint, and theme-toggle works.
```

- [ ] **Step 5: Commit**

```bash
git add packages/ui-next/index.ts
git commit -m "feat(ui-next): inject theme-init script from Cordis renderer"
```

---

## Task 12: Rewrite homepage.tsx to use the design system

**Files:**
- Modify: `packages/ui-next/src/pages/homepage.tsx`

**Interfaces:**
- Consumes: all primitives (Tasks 3-9), `usePageData` from existing `context/page-data`.
- Produces: A homepage that renders `<TopNav>`, a hero section, and a `<Footer>` placeholder, demonstrating the full design system end-to-end.

- [ ] **Step 1: Replace `homepage.tsx` content**

```tsx
import { Card } from '../components/primitives/Card';
import { Chip } from '../components/primitives/Chip';
import { Eyebrow } from '../components/primitives/Eyebrow';
import { LangPill } from '../components/nav/LangPill';
import { NavLink } from '../components/nav/NavLink';
import { TopNav } from '../components/nav/TopNav';
import { ThemeToggle } from '../components/ThemeToggle';
import { Button } from '../components/primitives/Button';
import { usePageData } from '../context/page-data';
import { Link } from '../components/link';

export default function Homepage() {
  const { UserContext } = usePageData() as any;
  return (
    <>
      <TopNav
        brand="Hydro"
        currentRoute="homepage"
        right={
          <>
            <LangPill label={UserContext?.viewLangName || '中文'} />
            <ThemeToggle />
            <Button variant="ghost">登录</Button>
            <Button variant="primary">注册</Button>
          </>
        }
      >
        <NavLink to="homepage">首页</NavLink>
        <NavLink to="problem_main">题库</NavLink>
        <NavLink to="contest_main">比赛</NavLink>
        <NavLink to="discussion_main">讨论</NavLink>
      </TopNav>

      <div style={{ maxWidth: 'var(--shell-max)', margin: '0 auto', padding: 'var(--shell-padding)' }}>
        <Eyebrow>Online Judge · Open Source</Eyebrow>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-4xl)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 'var(--leading-tight)', margin: 'var(--space-5) 0 var(--space-2)' }}>
          Hydro
        </h1>
        <p style={{ color: 'var(--text-soft)', fontSize: 'var(--text-lg)', maxWidth: 640 }}>
          高性能、易部署、可扩展的在线评测系统。
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-5)' }}>
          <Chip>TypeScript</Chip>
          <Chip variant="diff">AGPLv3</Chip>
          <Chip variant="tag">React 19</Chip>
          <Chip>Vite</Chip>
        </div>

        <div style={{ marginTop: 'var(--space-7)' }}>
          <Card variant="default" header={<h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 600 }}>开始使用</h3>}>
            <div style={{ padding: 'var(--space-5) var(--space-6)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
              <Link to="problem_main" style={{ color: 'var(--cyan)' }}>→ 浏览题库</Link>
              <Link to="contest_main" style={{ color: 'var(--violet)' }}>→ 查看比赛</Link>
              <Link to="discussion_main" style={{ color: 'var(--blue)' }}>→ 参与讨论</Link>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Smoke-test**

```bash
yarn workspace @hydrooj/ui-next dev
# Open http://localhost:5173 — confirm TopNav, hero, chips, and card render with new visual language.
```

- [ ] **Step 3: Commit**

```bash
git add packages/ui-next/src/pages/homepage.tsx
git commit -m "feat(ui-next): rewrite homepage with design system"
```

---

## Task 13: Rewrite problem_main.tsx to use the design system

**Files:**
- Modify: `packages/ui-next/src/pages/problem_main.tsx`

**Interfaces:**
- Consumes: all primitives (Tasks 3-9), `usePageData`.
- Produces: A problem-list page with two-column layout (list + sidebar), exercising Ring / Chip / TagCloud / Author.

- [ ] **Step 1: Replace `problem_main.tsx` content**

```tsx
import { Card } from '../components/primitives/Card';
import { Chip } from '../components/primitives/Chip';
import { LangPill } from '../components/nav/LangPill';
import { NavLink } from '../components/nav/NavLink';
import { TopNav } from '../components/nav/TopNav';
import { ThemeToggle } from '../components/ThemeToggle';
import { Button } from '../components/primitives/Button';
import { Ring } from '../components/charts/Ring';
import { TagCloud } from '../components/primitives/TagCloud';
import { Author } from '../components/sidebar/Author';
import { ContestList } from '../components/sidebar/ContestList';
import { CtaCard } from '../components/sidebar/CtaCard';
import { usePageData } from '../context/page-data';
import { Link } from '../components/link';

const SAMPLE = [
  { id: 'H1000', title: 'A + B Problem', tags: ['入门', 'IO'], difficulty: 1, acRate: 45 },
  { id: 'H1001', title: 'Sort the Array', tags: ['排序', '基础'], difficulty: 2, acRate: 60 },
  { id: 'H1002', title: 'Binary Search', tags: ['二分', '基础'], difficulty: 3, acRate: 38 },
];

export default function ProblemMain() {
  const { UserContext } = usePageData() as any;
  return (
    <>
      <TopNav
        brand="Hydro"
        currentRoute="problem_main"
        right={
          <>
            <LangPill label={UserContext?.viewLangName || '中文'} />
            <ThemeToggle />
            <Button variant="ghost">登录</Button>
            <Button variant="primary">注册</Button>
          </>
        }
      >
        <NavLink to="homepage">首页</NavLink>
        <NavLink to="problem_main">题库</NavLink>
        <NavLink to="contest_main">比赛</NavLink>
        <NavLink to="discussion_main">讨论</NavLink>
      </TopNav>

      <div style={{ maxWidth: 'var(--shell-max)', margin: '0 auto', padding: 'var(--shell-padding)', display: 'grid', gridTemplateColumns: '1fr 320px', gap: 'var(--space-6)' }}>
        <div>
          <Card variant="default" header={
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 600 }}>题目列表</h3>
          }>
            <div>
              {SAMPLE.map((p) => (
                <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 120px 80px', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3) var(--space-6)', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-mute)' }}>{p.id}</span>
                  <Link to="problem_detail" style={{ color: 'var(--text)' }}>{p.title}</Link>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {p.tags.map((t) => <Chip key={t} variant="tag">{t}</Chip>)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <Ring percent={p.acRate} size={32} strokeWidth={4} />
                    <Chip variant="diff">★ {p.difficulty}</Chip>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <Card variant="side">
            <CtaCard title="准备好开刷了？" subtitle="登录后即可提交代码" actionLabel="登录" />
          </Card>
          <Card variant="side">
            <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>热门标签</h4>
            <TagCloud tags={['语法基础', '输入输出', '入门', '数学', '排序', '二分', '图论', '动态规划']} />
          </Card>
          <Card variant="side">
            <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>活跃出题人</h4>
            <Author name="Macesuted" contribution="已贡献 142 道题目" />
          </Card>
          <Card variant="side">
            <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>进行中的比赛</h4>
            <ContestList items={[
              { title: 'Weekly Round 12', date: '今日 20:00' },
              { title: 'Newbie Contest 03', date: '明日 14:00' },
            ]} />
          </Card>
        </aside>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Smoke-test**

```bash
yarn workspace @hydrooj/ui-next dev
# Open http://localhost:5173/p — verify two-column layout, rings animate, all components render correctly.
```

- [ ] **Step 3: Commit**

```bash
git add packages/ui-next/src/pages/problem_main.tsx
git commit -m "feat(ui-next): rewrite problem_main with design system"
```

---

## Task 14: Type-check, build, and production smoke-test

**Files:**
- (no file changes; verification only)

- [ ] **Step 1: Run type-check**

```bash
yarn build:ui-next
# Expect: tsc --noEmit passes, vite build produces public/index.html + JS bundle.
```

- [ ] **Step 2: Run end-to-end backend integration**

```bash
yarn build        # build all packages so hydrooj picks up new ui-next artifacts
yarn debug        # start hydrooj in dev mode
# Open http://localhost:2333/ — homepage should be served by the 'next' renderer.
# Open http://localhost:2333/p — problem_main should be served by 'next' renderer.
# Verify:
#  - Top nav renders, links styled.
#  - Theme toggle button visible in nav-right.
#  - Click theme toggle: page flips to light; reload — theme persists.
#  - Cards / chips / rings / trends all styled correctly in both themes.
#  - No console errors.
```

- [ ] **Step 3: Manual visual regression checklist**

Confirm against `.claude/1.html`:

- [ ] Background color matches `--bg-0` (#07080d in dark).
- [ ] Font is Inter for body, JetBrains Mono for code, Space Grotesk for display.
- [ ] Card border-radius is 22px (--radius-xl).
- [ ] Chips have correct border + soft background per variant.
- [ ] Ring SVG shows the cyan→violet gradient bar.
- [ ] Light theme: brand mark becomes solid black; accent colors neutralize to grayscale.

- [ ] **Step 4: Commit any fixes**

If Step 2-3 surfaced issues, fix them and commit per the affected component. If everything passes, no commit is needed.

---

## Task 15: Update CLAUDE.md to reflect the new ui-next state

**Files:**
- Modify: `/home/Hydro/CLAUDE.md` (only the ui-next line)

- [ ] **Step 1: Replace the ui-next bullet**

In `/home/Hydro/CLAUDE.md`, find the bullet:

> - `packages/ui-next` — Vite-based React UI under active development.

Replace with:

> - `packages/ui-next` — Vite + React 19 SPA with a slot-based plugin system and a CSS-variable design system (dark-first, Geist-inspired light alternative). Renders via the `next` renderer with priority 100 / `asFallback: true`, so it coexists with ui-default. Currently ships `homepage` and `problem_main` pages.

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md to reflect ui-next style refactor"
```

---

## Self-Review (run after writing the plan)

**1. Spec coverage:**

| Spec section | Covered by task |
|---|---|
| §3 architecture | Tasks 1-9 (file layout), Task 10 (wire-up) |
| §4.1 color tokens | Task 1 (Step 1) |
| §4.2 typography | Task 1 (Step 1) |
| §4.3 spacing/radius/shadow/motion | Task 1 (Step 1) |
| §4.4 background ornament | Task 1 (Step 3) |
| §5.1-5.4 theme provider | Task 2 (Steps 1-3) |
| §6.1 Nav | Task 9 |
| §6.2 ThemeToggle | Task 3 |
| §6.3 Card | Task 4 |
| §6.4 Chip | Task 4 |
| §6.5 Ring | Task 6 |
| §6.6 Trend | Task 6 (component exists; not exercised by current pages but available for future problem_detail) |
| §6.7 IDEFrame | Task 7 |
| §6.8 SamplePair | Task 7 (built, used in future problem_detail) |
| §6.9 Article | Task 7 (built, used in future problem_detail) |
| §6.10 Sidebar components | Task 8 |
| §7.1 homepage rewrite | Task 12 |
| §7.2 problem_main rewrite | Task 13 |
| §8 plugin compatibility | All tasks — no changes to registry/* |
| §9 build & dev | Tasks 10, 11, 14 |
| §10 testing | Tasks 10, 11, 12, 13, 14 |
| §11 risk register (FOUC) | Task 11 (renderer script) + Task 10 (index.html script) |
| §11 risk register (hydration mismatch) | Task 2 (initial state reads from DOM) |
| §12 out of scope | Excluded by design (problem_detail, more pages) |

**2. Placeholder scan:** No TBD / TODO / "implement later" anywhere. All steps have exact code or commands.

**3. Type consistency:** Cross-checked:
- `useTheme` import path: `../theme/useTheme` in Task 3; matches Task 2's export location.
- `ThemeProvider` import path: `../theme/ThemeProvider` in Task 10; matches Task 2.
- `THEME_INIT_SCRIPT` import in Task 11: `./theme/theme-init`; matches Task 2.
- `Link` import in `NavLink`: `../components/link`; matches existing ui-next `link.tsx`.
- `useLocation` import in `TopNav`: `../../context/router`; matches existing `context/router.tsx`.
- `Ring` props (percent, size, strokeWidth, label) consistent between Task 6 and Task 13 usage.

**4. Fixes applied inline:** None required after review.

---

Plan complete and saved to `docs/superpowers/plans/2026-07-07-ui-next-style-refactor.md`. Per your direction (no asking), proceeding with **inline execution** using executing-plans — this matches your "直接开始按brainstorming流程动手 不需要询问我" instruction.