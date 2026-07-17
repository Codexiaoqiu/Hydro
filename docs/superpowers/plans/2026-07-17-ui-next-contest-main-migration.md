# ui-next Contest Main Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the ui-default SSR template at `/contest` by adding a fully data-driven `contest_main` page in `packages/ui-next`. The page consumes the existing `ContestListHandler` payload (`page, tpcount, qs, rule, group, q, groups, tdocs, tsdict`), renders hero Live/Ready banners, six rule-colored chips, search + rule + group filtering, pagination, and a permission-gated `Create Contest` sidebar CTA — all using the existing ui-next design system (`tokens.css`, `Card`, `Chip`, `Select`, `Eyebrow`, `Link`, `CtaCard`).

**Architecture:**
- Add `src/pages/contest_main.tsx` (~330 LOC, with inline components: `HeaderRow`, `Toolbar`, `EmptyState`, `ContestRow`, `HeroBanner`, `Pager`, `ContestMain`).
- Add `src/pages/contest_main.module.css` (~250 LOC) mirroring `problem_main.module.css` conventions.
- Add `src/lib/perm-constants.ts` (PERM bit constants mirroring `packages/common/permission.ts`).
- Add `src/lib/perms.ts` (`hasPerm` mask-style check, never bit-shifts).
- Add `src/lib/contest-flags.ts` (`KNOWN_RULES` for the rule dropdown).
- Append contest tokens (6 `--tint-rule-*` + 2 `--gradient-contest-*`) to `src/styles/tokens.css`.
- Append `ContestMain.*` keys to `src/lib/i18n.ts` (`zhCN` catalog).
- Register the page in `src/pages/index.ts` via `registerPage('contest_main', () => import('./contest_main'))`.

**Tech Stack:**
- React 19, Vite 8, TypeScript (existing)
- Vitest 4 + happy-dom + @testing-library/react (existing)
- Existing CSS-variable design tokens — only contests-specific tokens added
- No new runtime deps
- `<Link>` from `src/components/link.tsx`, `<CtaCard>` from `src/components/sidebar/CtaCard.tsx`, helpers from `src/lib/contest-status.ts`/`src/lib/rule-text.ts`/`src/lib/datetime.tsx`

**Reference files (read these before starting Task 2):**
- `packages/ui-next/src/pages/problem_main.tsx` — full template reference
- `packages/ui-next/src/pages/problem_main.module.css` — shell/toolbar/list CSS reference
- `packages/ui-next/src/context/page-data.tsx` — `usePageData()` / `useUserContext()` API
- `packages/ui-next/src/lib/contest-status.ts` — `isOngoing/isUpcoming/isDone/renderDuration`
- `packages/ui-next/src/lib/rule-text.ts` — `ruleText(rule)` mapping
- `packages/hydrooj/src/handler/contest.ts:33-75` — shape of the args we consume
- `packages/common/permission.ts:60-68` — actual PERM bit indices

---

## Global Constraints

(Copied verbatim from the spec — every task inherits these.)

- **TypeScript strictness:** 0 TS errors. `yarn workspace @hydrooj/ui-next build` (which runs `tsc -b && vite build`) must succeed.
- **Test conventions:** Wrap with `PageDataProvider` (see `src/pages/problem_main.test.tsx`); use `screen.getByRole` / `getByText` (never className queries); mock `Date.now()` via `vi.useFakeTimers()` and `vi.setSystemTime(...)`; no snapshot tests in unit suites.
- **i18n:** hardcoded Chinese strings in `src/lib/i18n.ts` `zhCN` catalog. No i18n library.
- **New CSS variables:** exactly 6 `--tint-rule-<rule>` triples (RGB) + 2 `--gradient-contest-*`. No others.
- **No new runtime deps.** All helpers are local.
- **No backend changes.** `packages/hydrooj/src/handler/contest.ts`, `model/contest.ts`, `interface.ts`, and `setting.yaml` are out of scope.
- **No `packages/ui-default/` changes.** The existing `contest_main.html` and Stylus files remain as opt-out fallback (used when users hit `/contest?__disableNext=1`).
- **Perm parsing convention:** always use the mask-style `(big & mask) !== 0n` check (never bit-shift by an index). Only `perm-constants.ts` references the actual bit positions.
- **Don't add info-bearing comments, docstrings, or translation strings via AI without reviewer sanity-check** — per `CONTRIBUTING.md`.
- **Scope creep is forbidden.** Out-of-scope items (other contest pages, dynamic i18n, server-side rendering of React, animation library, removing ui-default fallback) live in `docs/superpowers/specs/2026-07-17-ui-next-contest-main-migration-design.md` §13.

---

## Task 0: Prerequisites check

Sanity-check the starting state. No code changes here.

- [ ] **Step 1: Confirm ui-next builds clean before any edits**

Run: `yarn workspace @hydrooj/ui-next build`
Expected: 0 TS errors, Vite build completes, `packages/ui-next/public/` populated with hashed asset bundles.

- [ ] **Step 2: Confirm existing tests pass**

Run: `yarn workspace @hydrooj/ui-next test`
Expected: 22 tests, all green (this is the current baseline before any new tests).

- [ ] **Step 3: Confirm the `ContestListHandler` is reachable via dev server**

Run (with backend running locally):
```bash
curl -s "http://localhost:2333/contest" -o /dev/null -w "%{http_code}\n"
```
Expected: `200`. (If the backend is not currently running, skip this step — visual smoke test in Task 9 will catch it.)

---

## Task 1: PERM constants (`lib/perm-constants.ts`)

Pure TypeScript constants. Must be created before the `perms.ts` helper or any perm-related test.

**Files:**
- Create: `packages/ui-next/src/lib/perm-constants.ts`

**Interfaces:**
- Produces:
  ```ts
  export const PERM: {
    PERM_VIEW_CONTEST: bigint,
    PERM_VIEW_HIDDEN_CONTEST: bigint,
    PERM_CREATE_CONTEST: bigint,
  };
  ```

- [ ] **Step 1: Verify the actual bit indices against `packages/common/permission.ts`**

Run: `grep -nE "PERM_VIEW_CONTEST:|PERM_CREATE_CONTEST:|PERM_VIEW_HIDDEN_CONTEST:" packages/common/permission.ts`
Expected output:
```
60:    PERM_VIEW_CONTEST: 1n << 41n,
61:    PERM_VIEW_CONTEST_SCOREBOARD: 1n << 42n,
...
63:    PERM_CREATE_CONTEST: 1n << 44n,
...
67:    PERM_VIEW_HIDDEN_CONTEST: 1n << 68n,
```

If the displayed bit positions differ from this baseline, **stop and report** to the user — do not invent values.

- [ ] **Step 2: Write the file**

Path: `packages/ui-next/src/lib/perm-constants.ts`

```ts
// Mirror of packages/common/permission.ts PERM block.
// Values are bit positions of the original permission bits in the user
// permission bigint. Update if backend shifts bits; ui-next consumers always
// use the mask-style (big & mask) check, never bit-shifting by an index.
export const PERM = {
  PERM_VIEW_CONTEST:        1n << 41n,
  PERM_VIEW_HIDDEN_CONTEST: 1n << 68n,
  PERM_CREATE_CONTEST:      1n << 44n,
} as const;
```

- [ ] **Step 3: Verify typecheck**

Run: `yarn workspace @hydrooj/ui-next build`
Expected: 0 errors (this file uses only TS basics; no consumers yet).

- [ ] **Step 4: Commit**

```bash
git add packages/ui-next/src/lib/perm-constants.ts
git commit -m "feat(ui-next): add PERM bit constants for contest_main perm gate"
```

---

## Task 2: `hasPerm` helper (`lib/perms.ts`) + tests

TDD: write the failing test first, then implement.

**Files:**
- Create: `packages/ui-next/src/lib/perms.ts`
- Create: `packages/ui-next/src/lib/perms.test.ts`

**Interfaces:**
- Consumes: `PERM` from `./perm-constants`
- Produces:
  ```ts
  export function hasPerm(UserContext: any, mask: bigint): boolean
  export function canViewContest(UserContext: any): boolean
  export function canCreateContest(UserContext: any): boolean
  export function canViewHiddenContest(UserContext: any): boolean
  ```

- [ ] **Step 1: Write the failing tests**

Path: `packages/ui-next/src/lib/perms.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { PERM } from './perm-constants';
import { canCreateContest, canViewContest, canViewHiddenContest, hasPerm } from './perms';

describe('hasPerm', () => {
  it('returns false when UserContext is missing', () => {
    expect(hasPerm(undefined, PERM.PERM_VIEW_CONTEST)).toBe(false);
    expect(hasPerm(null, PERM.PERM_VIEW_CONTEST)).toBe(false);
  });

  it('returns false when perm field is missing or malformed', () => {
    expect(hasPerm({}, PERM.PERM_VIEW_CONTEST)).toBe(false);
    expect(hasPerm({ perm: '' }, PERM.PERM_VIEW_CONTEST)).toBe(false);
    expect(hasPerm({ perm: 'not-a-bigint' }, PERM.PERM_VIEW_CONTEST)).toBe(false);
    expect(hasPerm({ perm: 'BigInt::abc' }, PERM.PERM_VIEW_CONTEST)).toBe(false);
  });

  it('detects exactly PERM_VIEW_CONTEST (1n<<41n)', () => {
    const only_view = `BigInt::${1n << 41n}`;
    expect(hasPerm({ perm: only_view }, PERM.PERM_VIEW_CONTEST)).toBe(true);
    expect(hasPerm({ perm: only_view }, PERM.PERM_CREATE_CONTEST)).toBe(false);
    expect(hasPerm({ perm: only_view }, PERM.PERM_VIEW_HIDDEN_CONTEST)).toBe(false);
  });

  it('detects exactly PERM_CREATE_CONTEST (1n<<44n)', () => {
    const only_create = `BigInt::${1n << 44n}`;
    expect(hasPerm({ perm: only_create }, PERM.PERM_VIEW_CONTEST)).toBe(false);
    expect(hasPerm({ perm: only_create }, PERM.PERM_CREATE_CONTEST)).toBe(true);
    expect(hasPerm({ perm: only_create }, PERM.PERM_VIEW_HIDDEN_CONTEST)).toBe(false);
  });

  it('detects a union of bits', () => {
    const both = `BigInt::${(1n << 41n) | (1n << 44n)}`;
    expect(canViewContest({ perm: both })).toBe(true);
    expect(canCreateContest({ perm: both })).toBe(true);
    expect(canViewHiddenContest({ perm: both })).toBe(false);
  });

  it('named helpers match mask semantics', () => {
    const viewCreate = { perm: `BigInt::${(1n << 41n) | (1n << 44n)}` };
    const viewOnly = { perm: `BigInt::${1n << 41n}` };
    expect(canViewContest(viewCreate)).toBe(true);
    expect(canCreateContest(viewCreate)).toBe(true);
    expect(canViewContest(viewOnly)).toBe(true);
    expect(canCreateContest(viewOnly)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the failing test**

Run: `cd packages/ui-next && yarn test --run src/lib/perms.test.ts`
Expected: FAIL with `Failed to resolve import "./perms" from "src/lib/perms.test.ts"` (or similar). This is the desired red.

- [ ] **Step 3: Implement the helper**

Path: `packages/ui-next/src/lib/perms.ts`

```ts
import { PERM } from './perm-constants';

/**
 * Mask-style permission check. Uses (big & mask) !== 0n so the bit position
 * of `mask` never leaks into runtime — callers only import the mask from
 * `perm-constants.ts`.
 *
 * Recognizes UserContext.perm in the form "BigInt::<n>" as serialized by the
 * backend's serializer. Any other shape (missing, empty, malformed) returns
 * `false` as the safe default.
 */
export function hasPerm(UserContext: any, mask: bigint): boolean {
  const permStr = (UserContext?.perm ?? '') as string;
  const m = permStr.match(/^BigInt::(\d+)$/);
  if (!m) return false;
  const big = BigInt(m[1]);
  return (big & mask) !== 0n;
}

export function canViewContest(UserContext: any): boolean {
  return hasPerm(UserContext, PERM.PERM_VIEW_CONTEST);
}

export function canCreateContest(UserContext: any): boolean {
  return hasPerm(UserContext, PERM.PERM_CREATE_CONTEST);
}

export function canViewHiddenContest(UserContext: any): boolean {
  return hasPerm(UserContext, PERM.PERM_VIEW_HIDDEN_CONTEST);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd packages/ui-next && yarn test --run src/lib/perms.test.ts`
Expected: all 6 tests pass.

- [ ] **Step 5: Typecheck**

Run: `yarn workspace @hydrooj/ui-next build`
Expected: 0 TS errors.

- [ ] **Step 6: Commit**

```bash
git add packages/ui-next/src/lib/perms.ts packages/ui-next/src/lib/perms.test.ts
git commit -m "feat(ui-next): add mask-style hasPerm helper for contest_main perm gate"
```

---

## Task 3: Contest rule catalog (`lib/contest-flags.ts`) + tests

TDD on the same pattern. The `KNOWN_RULES` array backs the Rule `<Select>` dropdown in the toolbar.

**Files:**
- Create: `packages/ui-next/src/lib/contest-flags.ts`
- Create: `packages/ui-next/src/lib/contest-flags.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const KNOWN_RULES: ReadonlyArray<{ key: string, label: string }>
  export function rulesFromTdocs(tdocs: SerializedTdoc[]): typeof KNOWN_RULES
  ```

- [ ] **Step 1: Write the failing tests**

Path: `packages/ui-next/src/lib/contest-flags.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import type { SerializedTdoc } from '../sections/types';
import { KNOWN_RULES, rulesFromTdocs } from './contest-flags';

describe('KNOWN_RULES', () => {
  it('has 6 entries matching backend RULES', () => {
    expect(KNOWN_RULES).toHaveLength(6);
    const keys = KNOWN_RULES.map((r) => r.key);
    expect(keys).toEqual(['acm', 'oi', 'ioi', 'strictioi', 'ledo', 'homework']);
  });

  it('every label is a non-empty string', () => {
    for (const r of KNOWN_RULES) {
      expect(typeof r.label).toBe('string');
      expect(r.label.length).toBeGreaterThan(0);
    }
  });
});

describe('rulesFromTdocs', () => {
  const fake = (rule: string): SerializedTdoc => ({
    _id: 'a', docId: 'b', title: 't', rule,
    beginAt: '2026-01-01T00:00:00.000Z', endAt: '2026-01-02T00:00:00.000Z',
  });

  it('returns KNOWN_RULES union when tdoc rules match', () => {
    const result = rulesFromTdocs([fake('acm'), fake('oi'), fake('acm')]);
    // duplicates collapsed; union keys exactly [acm, oi]
    const keys = result.map((r) => r.key);
    expect(keys).toEqual(['acm', 'oi']);
  });

  it('ignores unknown rules not in KNOWN_RULES', () => {
    const result = rulesFromTdocs([fake('unknown-rule')]);
    // Only known rules returned; unknown rule is dropped
    expect(result).toEqual([]);
  });

  it('returns full KNOWN_RULES when tdocs is empty', () => {
    expect(rulesFromTdocs([])).toEqual(KNOWN_RULES);
  });
});
```

- [ ] **Step 2: Run the failing tests**

Run: `cd packages/ui-next && yarn test --run src/lib/contest-flags.test.ts`
Expected: FAIL with `Failed to resolve import "./contest-flags"`.

- [ ] **Step 3: Implement the catalog**

Path: `packages/ui-next/src/lib/contest-flags.ts`

```ts
import type { SerializedTdoc } from '../sections/types';

/**
 * Source: packages/hydrooj/src/model/contest.ts — model.contest.RULES keys.
 * Manually kept in sync with the backend. If a new rule appears server-side
 * but not here, it just won't appear in the rule dropdown — filtering by URL
 * (?rule=<new>) still works.
 *
 * Labels intentionally duplicated from lib/rule-text.ts so the toolbar doesn't
 * couple to a specific label-getter for the menu (we may want short labels
 * like "XCPC" in the menu while ruleText returns long forms for body chips).
 */
export const KNOWN_RULES: ReadonlyArray<{ key: string, label: string }> = [
  { key: 'acm',       label: 'XCPC' },
  { key: 'oi',        label: 'OI' },
  { key: 'ioi',       label: 'IOI' },
  { key: 'strictioi', label: 'IOI(Strict)' },
  { key: 'ledo',      label: 'Ledo' },
  { key: 'homework',  label: '作业' },
];

/**
 * Returns the subset of KNOWN_RULES whose key appears in the supplied tdocs
 * (preserves KNOWN_RULES order). When tdocs is empty, returns the full list
 * so the dropdown still shows all rules to first-time visitors.
 */
export function rulesFromTdocs(tdocs: SerializedTdoc[]): typeof KNOWN_RULES {
  if (!tdocs.length) return KNOWN_RULES;
  const present = new Set(tdocs.map((t) => t.rule));
  return KNOWN_RULES.filter((r) => present.has(r.key));
}
```

- [ ] **Step 4: Run the tests**

Run: `cd packages/ui-next && yarn test --run src/lib/contest-flags.test.ts`
Expected: 5 tests pass.

- [ ] **Step 5: Typecheck**

Run: `yarn workspace @hydrooj/ui-next build`
Expected: 0 TS errors.

- [ ] **Step 6: Commit**

```bash
git add packages/ui-next/src/lib/contest-flags.ts packages/ui-next/src/lib/contest-flags.test.ts
git commit -m "feat(ui-next): add KNOWN_RULES catalog for contest_main toolbar"
```

---

## Task 4: i18n catalog (`lib/i18n.ts` `ContestMain.*` block)

No test — strings live in the catalog and are exercised end-to-end in Task 8.

**Files:**
- Modify: `packages/ui-next/src/lib/i18n.ts` (append `ContestMain` block before the closing `};` of the `zhCN` catalog)

**Interfaces:**
- Produces: 28 new keys under the `ContestMain.*` namespace inside `zhCN`. Mirrors `problem_main.tsx` test conventions: keys accessed via `useTranslate()` and rendered as plain strings.

- [ ] **Step 1: Locate the closing brace of `zhCN`**

Run: `grep -n "^export const zhCN\|^};" packages/ui-next/src/lib/i18n.ts | head -10`

Expected: a line like `^};` that ends the `zhCN` object. Note the file's `ProblemMain.SideTagsTitle` entry is the last `ProblemMain.*` line before the closing brace.

- [ ] **Step 2: Append the `ContestMain.*` block**

Edit `packages/ui-next/src/lib/i18n.ts`. Insert immediately before the closing `};` of `zhCN`:

```ts
  'ContestMain.Crumbs': '比赛 / Contests',
  'ContestMain.Title': '所有比赛',
  'ContestMain.SearchPlaceholder': '搜索比赛...',
  'ContestMain.SearchAria': '搜索比赛',
  'ContestMain.AllRules': '所有赛制',
  'ContestMain.AllGroups': '所有分组',
  'ContestMain.RuleAria': '按赛制筛选',
  'ContestMain.GroupAria': '按分组筛选',
  'ContestMain.LiveBadge': 'Live 进行中',
  'ContestMain.ReadyBadge': '即将开始',
  'ContestMain.RuleLabel': '赛制',
  'ContestMain.StartLabel': '开始',
  'ContestMain.DurationLabel': '时长',
  'ContestMain.ParticipantsLabel': '参赛人数',
  'ContestMain.ViewDetails': '查看详情',
  'ContestMain.Attended': '已报名',
  'ContestMain.NotAttended': '未报名',
  'ContestMain.HoursUnit': '小时',
  'ContestMain.ParticipantsShort': '人',
  'ContestMain.Ongoing': '进行中',
  'ContestMain.Upcoming': '未开始',
  'ContestMain.Ended': '已结束',
  'ContestMain.NoContests': '暂无比赛',
  'ContestMain.PagerAria': '比赛分页',
  'ContestMain.SidebarCreateTitle': '创建比赛',
  'ContestMain.SidebarCreateSubtitle': '设置赛制、时间与参赛者名单。',
  'ContestMain.SidebarCreateAction': '+ 新建比赛',
  'ContestMain.PageCountTitle': '共 {0} 场比赛',
```

- [ ] **Step 3: Verify the i18n catalog typechecks**

Run: `yarn workspace @hydrooj/ui-next build`
Expected: 0 TS errors. The `Catalog = Record<string, string>` type accepts any string keys.

- [ ] **Step 4: Commit**

```bash
git add packages/ui-next/src/lib/i18n.ts
git commit -m "feat(ui-next): add ContestMain.* i18n keys for contest_main page"
```

---

## Task 5: Design tokens (`styles/tokens.css`)

Append-only CSS. Adds 6 rule-tint RGB triples + 2 hero gradients to `:root`, plus their light-theme overrides.

**Files:**
- Modify: `packages/ui-next/src/styles/tokens.css` (append at end-of-file)

**Interfaces:**
- Produces:
  - 6 new `--tint-rule-<key>` CSS variables (RGB triples) in `:root`.
  - 2 new `--gradient-contest-<live|ready>` gradients in `:root`.
  - Same 8 variables in `[data-theme="light"]` block, with rule tints re-mapped to neutral grey (23,23,23) and gradients re-mapped to `--text → --text-soft` and `--text-soft → --text-mute`.

- [ ] **Step 1: Locate the end of `tokens.css`**

Run: `tail -5 packages/ui-next/src/styles/tokens.css`

Expected: the file ends with the last `[data-theme="light"]` rule.

- [ ] **Step 2: Append the contest token block**

Append the following block as the very last block in the file. Make sure there are **two blank lines** between the previous light-theme block and this new content:

```css

/* === Contest (migrated from ui-default) ============================== */

/* Six contest rule color families — RGB triples so we can compose alpha. */
:root {
  --tint-rule-acm:        107, 182, 122; /* green */
  --tint-rule-oi:         245, 199, 53;  /* yellow */
  --tint-rule-ioi:        46, 154, 254;  /* blue */
  --tint-rule-ledo:       128, 118, 163; /* violet */
  --tint-rule-homework:   255, 205, 205; /* pink */
  --tint-rule-strictioi:  110, 162, 199; /* cyan-ish */

  /* Hero banner gradients (Live/Ready) — dark theme keeps vivid colors. */
  --gradient-contest-live:  linear-gradient(135deg, var(--pink), var(--violet));
  --gradient-contest-ready: linear-gradient(135deg, var(--cyan), var(--blue));
}

[data-theme="light"] {
  /* Remap all rule tints to neutral grey per the existing
     "components MUST use variables, not hardcoded rgba() for light"
     convention (see tokens.css header comment). */
  --tint-rule-acm:        23, 23, 23;
  --tint-rule-oi:         23, 23, 23;
  --tint-rule-ioi:        23, 23, 23;
  --tint-rule-ledo:       23, 23, 23;
  --tint-rule-homework:   23, 23, 23;
  --tint-rule-strictioi:  23, 23, 23;

  --gradient-contest-live:  linear-gradient(135deg, var(--text), var(--text-soft));
  --gradient-contest-ready: linear-gradient(135deg, var(--text-soft), var(--text-mute));
}
```

- [ ] **Step 3: Typecheck (sanity — no JS changes)**

Run: `yarn workspace @hydrooj/ui-next build`
Expected: 0 errors (CSS-only change shouldn't affect TS).

- [ ] **Step 4: Commit**

```bash
git add packages/ui-next/src/styles/tokens.css
git commit -m "feat(ui-next): add contest tokens (rule tints + hero gradients)"
```

---

## Task 6: Stylesheet (`pages/contest_main.module.css`)

Single CSS module file. Mirrors the structure of `problem_main.module.css`. No TS, no tests — verification is visual (Task 9) and runtime (Task 8).

**Files:**
- Create: `packages/ui-next/src/pages/contest_main.module.css`

**Interfaces:**
- Exports a set of class names: `shell`, `hero`, `heroLive`, `heroReady`, `heroBadge`, `heroTitle`, `heroMeta`, `heroMetaLabel`, `heroRight`, `heroBtn`, `heroBtnLive`, `heroBtnReady`, `heroStatus`, `toolbar`, `toolbarRow`, `search`, `searchIcon`, `list`, `row`, `rule_acm`, `rule_oi`, `rule_ioi`, `rule_ledo`, `rule_homework`, `rule_strictioi`, `dateBlock`, `dateDay`, `body`, `titleLink`, `meta`, `text`, `divider`, `empty`, `sidebar`, `pager`, `pagerItem`, `pagerActive`, `pagerGap`, `crumbs`, `crumb`, `headerRow`.

- [ ] **Step 1: Write the stylesheet verbatim**

Path: `packages/ui-next/src/pages/contest_main.module.css`

```css
.shell {
  max-width: var(--shell-max);
  margin: 0 auto;
  padding: var(--shell-padding);
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: var(--space-6);
}
@media (max-width: 960px) {
  .shell { grid-template-columns: 1fr; }
}

/* ===== Hero banners (Live / Ready) ===== */
.hero {
  position: relative;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--space-5);
  padding: var(--space-5) var(--space-6);
  border-radius: var(--radius-xl);
  color: #fff;
  text-decoration: none;
  overflow: hidden;
  margin-bottom: var(--space-4);
  transition: transform var(--motion-base);
  box-shadow: var(--shadow-2);
}
.hero:hover { transform: translateY(-2px); text-decoration: none; color: #fff; }
.heroLive  { background: var(--gradient-contest-live);  }
.heroReady { background: var(--gradient-contest-ready); }

.heroBadge {
  display: inline-block;
  padding: 2px var(--space-3);
  background: rgba(0, 0, 0, 0.35);
  color: #fff;
  font-family: var(--font-display);
  font-size: var(--text-xs);
  border-radius: var(--radius-sm);
  margin-bottom: var(--space-3);
}

.heroTitle {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: 600;
  margin: 0 0 var(--space-3) 0;
  line-height: 1.2;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.heroMeta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  list-style: none;
  padding: 0;
  margin: 0;
  color: #fff;
  font-size: var(--text-sm);
}

.heroMetaLabel {
  opacity: 0.85;
  margin-right: 4px;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}

.heroRight {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-3);
}

.heroBtn {
  display: inline-block;
  padding: var(--space-2) var(--space-5);
  border-radius: var(--radius-pill);
  font-weight: 600;
  font-size: var(--text-sm);
  background: var(--surface);
  color: var(--text);
  border: 1px solid rgba(255, 255, 255, 0.4);
}
[data-theme="light"] .heroBtn {
  background: rgba(255, 255, 255, 0.85);
  color: var(--text);
  border-color: rgba(0, 0, 0, 0.15);
}

.heroStatus {
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  color: #fff;
  text-align: right;
}
[data-theme="light"] .heroStatus { color: var(--text); opacity: 0.85; }

/* ===== Toolbar (search + rule + group) ===== */
.toolbar {
  padding: var(--space-4) var(--space-6);
  border-bottom: 1px solid var(--border);
}
.toolbarRow {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
  align-items: center;
}
.search {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0 var(--space-4);
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  min-height: 38px;
  min-width: 200px;
  transition: border-color var(--motion-base);
}
.search:focus-within { border-color: var(--border-strong); }
.search input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text);
  font: inherit;
  font-size: var(--text-base);
  padding: var(--space-2) 0;
  min-width: 0;
}
.search input::placeholder { color: var(--text-mute); }
.searchIcon {
  width: 16px;
  height: 16px;
  color: var(--text-mute);
  flex-shrink: 0;
}

/* ===== List rows ===== */
.list { display: flex; flex-direction: column; }
.row {
  display: grid;
  grid-template-columns: 80px 1fr;
  gap: var(--space-5);
  align-items: center;
  padding: var(--space-4) var(--space-6);
  border-bottom: 1px solid var(--border);
  border-left: 4px solid transparent;
  transition: background-color var(--motion-base);
}
.row:last-child { border-bottom: none; }
.row:hover { background: var(--surface-2); }

.rule_acm       { border-left-color: rgba(var(--tint-rule-acm), 0.85); }
.rule_oi        { border-left-color: rgba(var(--tint-rule-oi), 0.85); }
.rule_ioi       { border-left-color: rgba(var(--tint-rule-ioi), 0.85); }
.rule_ledo      { border-left-color: rgba(var(--tint-rule-ledo), 0.85); }
.rule_homework  { border-left-color: rgba(var(--tint-rule-homework), 0.85); }
.rule_strictioi { border-left-color: rgba(var(--tint-rule-strictioi), 0.85); }

.dateBlock {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-2);
}
.dateDay {
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: 700;
  line-height: 1;
  color: var(--text);
}

.body { display: flex; flex-direction: column; gap: var(--space-2); min-width: 0; }
.titleLink {
  color: var(--text);
  font-weight: 500;
  font-size: var(--text-base);
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.titleLink:hover { color: var(--cyan); }

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: center;
  list-style: none;
  padding: 0;
  margin: 0;
}
.text {
  color: var(--text-soft);
  font-size: var(--text-sm);
  font-family: var(--font-mono);
}
.divider {
  width: 1px;
  height: 12px;
  background: var(--border);
  margin: 0 var(--space-2);
}

.empty {
  padding: var(--space-8) var(--space-6);
  text-align: center;
  color: var(--text-mute);
  font-size: var(--text-base);
}

/* Sidebar */
.sidebar { display: flex; flex-direction: column; gap: var(--space-5); }

/* Pager (port of problem_main.module.css) */
.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-5) var(--space-6);
  border-top: 1px solid var(--border);
  flex-wrap: wrap;
}
.pagerItem {
  min-width: 32px;
  height: 32px;
  padding: 0 var(--space-3);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--surface-2);
  color: var(--text-soft);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  text-decoration: none;
  transition: background-color var(--motion-base), color var(--motion-base), border-color var(--motion-base);
}
.pagerItem:hover { background: var(--surface); color: var(--text); border-color: var(--border-strong); }
.pagerActive {
  color: var(--text-on-cyan);
  background: var(--gradient-primary);
  border-color: transparent;
  font-weight: 600;
}
.pagerActive:hover { color: var(--text-on-cyan); filter: brightness(1.05); }
.pagerGap {
  color: var(--text-mute);
  padding: 0 var(--space-1);
  font-family: var(--font-mono);
}

/* Header (eyebrow + h3 inside Card header) */
.headerRow { display: flex; flex-direction: column; gap: var(--space-2); }
.crumbs { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; }
.crumb {
  font-size: var(--text-xs);
  color: var(--text-mute);
  font-family: var(--font-mono);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
```

- [ ] **Step 2: Typecheck (sanity check)**

Run: `yarn workspace @hydrooj/ui-next build`
Expected: 0 errors (CSS-only file, but Vite still scans it).

- [ ] **Step 3: Commit**

```bash
git add packages/ui-next/src/pages/contest_main.module.css
git commit -m "feat(ui-next): add contest_main module stylesheet"
```

---

## Task 7: Page component (`pages/contest_main.tsx`)

The core of the migration. This is the largest file — ~330 LOC, including all inline child components. The test in Task 9 will validate this implementation, but each piece is small enough to commit incrementally.

**Files:**
- Create: `packages/ui-next/src/pages/contest_main.tsx`

**Interfaces:**
- Consumes: `usePageData()` returns `{ args: { UserContext, UiContext, page, tpcount, qs, rule, group, q, groups, tdocs, tsdict } }`.
- Consumes helpers: `isOngoing, isUpcoming, isDone, renderDuration` from `lib/contest-status`; `ruleText` from `lib/rule-text`; `formatDate, formatDateTime` from `lib/datetime`; `canCreateContest` from `lib/perms`; `KNOWN_RULES, rulesFromTdocs` from `lib/contest-flags`.
- Consumes primitives: `Card` (default + side variants), `Chip` (variants: tag / diff / ongoing / upcoming / ended), `Select`, `Eyebrow`, `Link`, `CtaCard`.
- Consumes hooks: `useNavigate` from `context/router`, `useBuildUrl` from `hooks/use-build-url`, `useTranslate` from `lib/i18n`.
- Produces: a React default export `ContestMain` registered as `registerPage('contest_main', () => import('./contest_main'))`.

- [ ] **Step 1: Write the page file**

Path: `packages/ui-next/src/pages/contest_main.tsx`

```tsx
import { useMemo, useState } from 'react';
import { Chip } from '../components/primitives/Chip';
import { Card } from '../components/primitives/Card';
import { Eyebrow } from '../components/primitives/Eyebrow';
import { Select } from '../components/primitives/Select';
import { CtaCard } from '../components/sidebar/CtaCard';
import { Link } from '../components/link';
import { usePageData } from '../context/page-data';
import { useNavigate } from '../context/router';
import { useBuildUrl } from '../hooks/use-build-url';
import { isOngoing, isUpcoming, isDone, renderDuration } from '../lib/contest-status';
import { formatDate, formatDateTime } from '../lib/datetime';
import { canCreateContest } from '../lib/perms';
import { KNOWN_RULES, rulesFromTdocs } from '../lib/contest-flags';
import { ruleText } from '../lib/rule-text';
import { useTranslate } from '../lib/i18n';
import type { SerializedTdoc, SerializedContestStatusDoc } from '../sections/types';
import styles from './contest_main.module.css';

const PAGE_SIZE = 20;

interface ContestArgs {
  UserContext?: any;
  UiContext?: any;
  page?: number;
  tpcount?: number;
  qs?: string;
  rule?: string;
  group?: string;
  q?: string;
  groups?: string[];
  tdocs?: SerializedTdoc[];
  tsdict?: Record<string, SerializedContestStatusDoc>;
}

function SearchIcon() {
  return (
    <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}

function HeaderRow({ t }: { t: (k: string) => string }) {
  return (
    <div className={styles.headerRow}>
      <div className={styles.crumbs}>
        <Eyebrow dot={false}>{t('ContestMain.Crumbs')}</Eyebrow>
      </div>
      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-xl)',
          fontWeight: 600,
          letterSpacing: '-0.01em',
          margin: 0,
        }}
      >
        {t('ContestMain.Title')}
      </h3>
    </div>
  );
}

interface ToolbarProps {
  initialQ: string;
  rule: string;
  group: string;
  groups: string[];
  rulesOptions: typeof KNOWN_RULES;
}
function Toolbar({ initialQ, rule, group, groups, rulesOptions }: ToolbarProps) {
  const t = useTranslate();
  const navigate = useNavigate();
  const buildUrl = useBuildUrl();
  const [query, setQuery] = useState(initialQ);

  const goWith = (next: { q?: string; rule?: string; group?: string }) => {
    const params: Record<string, string> = {};
    const finalQ = next.q !== undefined ? next.q : query;
    const finalRule = next.rule !== undefined ? next.rule : rule;
    const finalGroup = next.group !== undefined ? next.group : group;
    if (finalQ) params.q = finalQ;
    if (finalRule) params.rule = finalRule;
    if (finalGroup) params.group = finalGroup;
    navigate(buildUrl('contest_main', {}, params));
  };

  return (
    <div className={styles.toolbar}>
      <form
        className={styles.toolbarRow}
        onSubmit={(e) => {
          e.preventDefault();
          goWith({});
        }}
      >
        <label className={styles.search}>
          <SearchIcon />
          <input
            type="text"
            name="q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('ContestMain.SearchPlaceholder')}
            aria-label={t('ContestMain.SearchAria')}
          />
        </label>
        <Select
          value={rule}
          onChange={(v) => goWith({ rule: v })}
          ariaLabel={t('ContestMain.RuleAria')}
          options={[
            { value: '', label: t('ContestMain.AllRules') },
            ...rulesOptions.map((r) => ({ value: r.key, label: r.label })),
          ]}
        />
        <Select
          value={group}
          onChange={(v) => goWith({ group: v })}
          ariaLabel={t('ContestMain.GroupAria')}
          options={[
            { value: '', label: t('ContestMain.AllGroups') },
            ...groups.map((g) => ({ value: g, label: g })),
          ]}
        />
      </form>
    </div>
  );
}

function EmptyState({ t }: { t: (k: string) => string }) {
  return <div className={styles.empty}>{t('ContestMain.NoContests')}</div>;
}

interface HeroBannerProps {
  tdoc: SerializedTdoc;
  tsdoc?: SerializedContestStatusDoc;
  variant: 'live' | 'ready';
}
function HeroBanner({ tdoc, tsdoc = undefined, variant }: HeroBannerProps) {
  const t = useTranslate();
  const start = tsdoc?.startAt ?? tdoc.beginAt;
  const attended = tsdoc?.attend === 1;
  const durationHrs = renderDuration({ ...tdoc });

  return (
    <Link
      to="contest_detail"
      params={{ tid: tdoc.docId }}
      className={`${styles.hero} ${variant === 'live' ? styles.heroLive : styles.heroReady}`}
    >
      <div>
        <div className={styles.heroBadge}>
          {variant === 'live' ? t('ContestMain.LiveBadge') : t('ContestMain.ReadyBadge')}
        </div>
        <h3 className={styles.heroTitle}>{tdoc.title}</h3>
        <ul className={styles.heroMeta}>
          <li>
            <span className={styles.heroMetaLabel}>{t('ContestMain.RuleLabel')}</span>
            {ruleText(tdoc.rule)}
          </li>
          <li>
            <span className={styles.heroMetaLabel}>{t('ContestMain.StartLabel')}</span>
            {formatDateTime(start)}
          </li>
          <li>
            <span className={styles.heroMetaLabel}>{t('ContestMain.DurationLabel')}</span>
            {durationHrs} {t('ContestMain.HoursUnit')}
          </li>
          <li>
            <span className={styles.heroMetaLabel}>{t('ContestMain.ParticipantsLabel')}</span>
            {tdoc.attend ?? 0}
          </li>
        </ul>
      </div>
      <div className={styles.heroRight}>
        <span className={`${styles.heroBtn} ${variant === 'live' ? styles.heroBtnLive : styles.heroBtnReady}`}>
          {t('ContestMain.ViewDetails')}
        </span>
        <div className={styles.heroStatus}>
          {attended
            ? <><span aria-hidden>✓</span> {t('ContestMain.Attended')}</>
            : <><span aria-hidden>○</span> {t('ContestMain.NotAttended')}</>}
        </div>
      </div>
    </Link>
  );
}

interface ContestRowProps {
  tdoc: SerializedTdoc;
  tsdoc?: SerializedContestStatusDoc;
  now: number;
}
function ContestRow({ tdoc, tsdoc = undefined, now }: ContestRowProps) {
  const t = useTranslate();
  const ongoing = isOngoing(tdoc, now);
  const upcoming = isUpcoming(tdoc, 7, now);
  const done = !ongoing && !upcoming && isDone(tdoc, now);
  const attended = tsdoc?.attend === 1;
  const ruleClass = (styles as Record<string, string | undefined>)[`rule_${tdoc.rule}`] ?? '';

  return (
    <div className={`${styles.row} ${ruleClass}`} data-rule={tdoc.rule}>
      <div className={styles.dateBlock}>
        <div className={styles.dateDay}>{formatDate(tdoc.beginAt, { day: 'numeric' })}</div>
      </div>
      <div className={styles.body}>
        <Link to="contest_detail" params={{ tid: tdoc.docId }} className={styles.titleLink}>
          {tdoc.title}
        </Link>
        <ul className={styles.meta}>
          <li><Chip variant="tag">{ruleText(tdoc.rule)}</Chip></li>
          {tdoc.rated && <li><Chip variant="diff">Rated</Chip></li>}
          <li className={styles.divider} aria-hidden />
          <li className={styles.text}>
            {renderDuration({ ...tdoc })} {t('ContestMain.HoursUnit')}
          </li>
          <li className={styles.text}>
            {tdoc.attend ?? 0} {t('ContestMain.ParticipantsShort')}
          </li>
          {ongoing && <li><Chip variant="ongoing">{t('ContestMain.Ongoing')}</Chip></li>}
          {upcoming && <li><Chip variant="upcoming">{t('ContestMain.Upcoming')}</Chip></li>}
          {done && <li><Chip variant="ended">{t('ContestMain.Ended')}</Chip></li>}
          {attended && <li><Chip variant="diff">{t('ContestMain.Attended')}</Chip></li>}
        </ul>
      </div>
    </div>
  );
}

interface PagerProps {
  page: number;
  tpcount: number;
  buildUrl: ReturnType<typeof useBuildUrl>;
  qs: string;
  rule: string;
  group: string;
  q: string;
}
function Pager({ page, tpcount, buildUrl, qs, rule, group, q }: PagerProps) {
  const t = useTranslate();
  const tpcountPages = Math.ceil(tpcount / PAGE_SIZE);
  if (tpcountPages <= 1) return null;

  const paramsFor = (p: number): Record<string, string> => {
    const out: Record<string, string> = {};
    if (qs) {
      for (const [k, v] of new URLSearchParams(qs).entries()) {
        if (k !== 'page' && v) out[k] = v;
      }
    }
    if (q) out.q = q;
    if (rule) out.rule = rule;
    if (group) out.group = group;
    out.page = String(p);
    for (const k of Object.keys(out)) if (!out[k]) delete out[k];
    return out;
  };

  const items: Array<number | 'gap'> = [];
  const window = 1;
  if (tpcountPages <= 7) {
    for (let i = 1; i <= tpcountPages; i++) items.push(i);
  } else {
    items.push(1);
    if (page - window > 2) items.push('gap');
    for (let i = Math.max(2, page - window); i <= Math.min(tpcountPages - 1, page + window); i++) items.push(i);
    if (page + window < tpcountPages - 1) items.push('gap');
    items.push(tpcountPages);
  }

  return (
    <nav className={styles.pager} aria-label={t('ContestMain.PagerAria')}>
      {items.map((it, idx) => {
        if (it === 'gap') {
          return <span key={`g-${idx}`} className={styles.pagerGap}>…</span>;
        }
        const active = it === page;
        return (
          <Link
            key={it}
            href={buildUrl('contest_main', {}, paramsFor(it))}
            className={`${styles.pagerItem} ${active ? styles.pagerActive : ''}`}
          >
            {it}
          </Link>
        );
      })}
    </nav>
  );
}

export default function ContestMain() {
  const data = usePageData() as any;
  const t = useTranslate();
  const buildUrl = useBuildUrl();
  const navigate = useNavigate();

  const args = (data?.args ?? {}) as ContestArgs;
  const tdocs = Array.isArray(args.tdocs) ? args.tdocs : [];
  const tsdict = (args.tsdict ?? {}) as Record<string, SerializedContestStatusDoc>;
  const page = Math.max(1, Number(args.page) || 1);
  const tpcount = Math.max(0, Number(args.tpcount) || 0);
  const rule = String(args.rule ?? '');
  const group = String(args.group ?? '');
  const q = String(args.q ?? '');
  const groups = Array.isArray(args.groups) ? args.groups : [];
  const qs = String(args.qs ?? '');

  const now = useMemo(() => Date.now(), []);

  const ongoingTdocs = useMemo(
    () => tdocs.filter((td) => isOngoing(td, now)),
    [tdocs, now],
  );
  const upcomingTdocs = useMemo(
    () => tdocs.filter((td) => isUpcoming(td, 7, now) && !isOngoing(td, now)),
    [tdocs, now],
  );

  const rulesOptions = useMemo(() => rulesFromTdocs(tdocs), [tdocs]);

  const showCta = canCreateContest(args.UserContext);

  const createHref = buildUrl('contest_create', {});

  return (
    <div className={styles.shell}>
      <main style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {ongoingTdocs.slice(0, 1).map((tdoc) => (
          <HeroBanner
            key={`live-${tdoc.docId}`}
            tdoc={tdoc}
            tsdoc={tsdict[tdoc.docId]}
            variant="live"
          />
        ))}
        {upcomingTdocs.slice(0, 1).map((tdoc) => (
          <HeroBanner
            key={`ready-${tdoc.docId}`}
            tdoc={tdoc}
            tsdoc={tsdict[tdoc.docId]}
            variant="ready"
          />
        ))}

        <Card variant="default" header={<HeaderRow t={t} />}>
          <Toolbar
            initialQ={q}
            rule={rule}
            group={group}
            groups={groups}
            rulesOptions={rulesOptions}
          />
          {tdocs.length === 0 ? (
            <EmptyState t={t} />
          ) : (
            <>
              <div className={styles.list}>
                {tdocs.map((tdoc) => (
                  <ContestRow
                    key={tdoc.docId}
                    tdoc={tdoc}
                    tsdoc={tsdict[tdoc.docId]}
                    now={now}
                  />
                ))}
              </div>
              <Pager
                page={page}
                tpcount={tpcount}
                buildUrl={buildUrl}
                qs={qs}
                rule={rule}
                group={group}
                q={q}
              />
            </>
          )}
        </Card>
      </main>

      <aside className={styles.sidebar}>
        {showCta && (
          <Card variant="side">
            <CtaCard
              title={t('ContestMain.SidebarCreateTitle')}
              subtitle={t('ContestMain.SidebarCreateSubtitle')}
              actionLabel={t('ContestMain.SidebarCreateAction')}
              onAction={() => navigate(createHref || '/contest/create')}
            />
          </Card>
        )}
      </aside>
    </div>
  );
}
```

- [ ] **Step 2: Verify the `contest_create` route**

`buildUrl('contest_create', {})` may return `undefined` if no `contest_create` page is registered in the routeMap. The implementation falls back to plain navigation in that case. Verify it works at runtime; if both calls fail, replace with `() => navigate('/contest/create')`.

Run: `grep -nE "registerPage\('contest_create" packages/ui-next/src/pages/index.ts 2>/dev/null`
Expected: no output (contest_create isn't a registered ui-next page). The fallback path will be used.

- [ ] **Step 3: Typecheck**

Run: `yarn workspace @hydrooj/ui-next build`
Expected: 0 TS errors. If `SerializedContestStatusDoc` isn't exported from `sections/types.ts`, append it (see Step 3a).

- [ ] **Step 3a (only if Step 3 fails on `SerializedContestStatusDoc`):** add the missing type

Append to `packages/ui-next/src/sections/types.ts`:

```ts
export interface SerializedContestStatusDoc {
  _id?: string;
  docId?: string;
  attend?: 0 | 1;
  subscribe?: 0 | 1;
  startAt?: string;   // ISO, user's actual start time
  endAt?: string;     // ISO
}
```

Re-run build: `yarn workspace @hydrooj/ui-next build`. Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add packages/ui-next/src/pages/contest_main.tsx 'packages/ui-next/src/sections/types.ts'
git commit -m "feat(ui-next): add contest_main page with hero banners, list, toolbar, pager"
```

---

## Task 8: Register the page

One-line change. Without this, `app.tsx` won't find `page:contest_main.html` → "Page not found".

**Files:**
- Modify: `packages/ui-next/src/pages/index.ts` (append one new `registerPage` call after `registerPage('homepage', ...)`)

- [ ] **Step 1: View current `index.ts` to find a good insertion line**

Run: `cat packages/ui-next/src/pages/index.ts`
Expected: a file with ~20 `registerPage(...)` lines.

- [ ] **Step 2: Add the registration**

Edit `packages/ui-next/src/pages/index.ts`. Insert this line **after** `registerPage('homepage', () => import('./homepage'));`:

```ts
registerPage('contest_main', () => import('./contest_main'));
```

Keep all existing imports (no new import needed — pages are dynamically imported).

- [ ] **Step 3: Typecheck**

Run: `yarn workspace @hydrooj/ui-next build`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add packages/ui-next/src/pages/index.ts
git commit -m "feat(ui-next): register contest_main page so /contest resolves"
```

---

## Task 9: Page integration test (`pages/contest_main.test.tsx`)

End-to-end test of the page's behavior using `PageDataProvider`. Covers behavior of every inline component.

**Files:**
- Create: `packages/ui-next/src/pages/contest_main.test.tsx`

**Interfaces:**
- Consumes (read-only): `ContestMain` from `./contest_main`; `usePageData` provider pattern from `problem_main.test.tsx`.
- Produces: a vitest test that exercises 9 scenarios (a-i from spec §10).

- [ ] **Step 1: Examine the existing test wrapper pattern**

Read: `packages/ui-next/src/pages/problem_main.test.tsx` (first 50 lines only).

Copy the wrapper helper into this test file (no need to import from a shared file).

- [ ] **Step 2: Write the test file**

Path: `packages/ui-next/src/pages/contest_main.test.tsx`

```tsx
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ContestMain from './contest_main';
import { PageDataProvider } from '../context/page-data';

function makeTdoc(overrides: Partial<{
  docId: string;
  title: string;
  rule: string;
  beginAt: string;
  endAt: string;
  rated: boolean;
  attend: number;
  duration: number;
}> = {}) {
  return {
    _id: overrides.docId ?? 'a1b2c3',
    docId: overrides.docId ?? 'a1b2c3',
    title: overrides.title ?? 'Spring Cup',
    rule: overrides.rule ?? 'acm',
    beginAt: overrides.beginAt ?? '2026-08-12T10:00:00.000Z',
    endAt: overrides.endAt ?? '2026-08-12T15:00:00.000Z',
    rated: overrides.rated,
    attend: overrides.attend,
    duration: overrides.duration,
  };
}

function renderPage(args: Record<string, unknown>, UserContext: any = {}) {
  const value = {
    name: 'contest_main',
    template: 'contest_main.html',
    args: { UserContext, ...args },
  };
  return render(
    <PageDataProvider initial={value}>
      <ContestMain />
    </PageDataProvider>,
  );
}

describe('ContestMain', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Fixed "now" 2026-07-17 12:00 UTC so time-relative tests are stable.
    vi.setSystemTime(new Date('2026-07-17T12:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('(a) shows empty state when no tdocs', () => {
    renderPage({ tdocs: [], tsdict: {}, tpcount: 0, page: 1, qs: '', rule: '', group: '', q: '', groups: [] });
    expect(screen.getByText(/暂无比赛|No contests/i)).toBeInTheDocument();
  });

  it('(b) renders one acm contest with rule chip', () => {
    const tdoc = makeTdoc({ rule: 'acm', title: 'XCPC Demo' });
    renderPage({ tdocs: [tdoc], tsdict: { [tdoc.docId]: {} }, tpcount: 1, page: 1, qs: '', rule: '', group: '', q: '', groups: [] });
    expect(screen.getByText('XCPC Demo')).toBeInTheDocument();
    // ruleText('acm') === 'XCPC' — appears at least once (in row chip)
    expect(screen.getAllByText('XCPC').length).toBeGreaterThan(0);
  });

  it('(c) shows live hero banner for ongoing contest', () => {
    // Fixed now is 2026-07-17T12:00:00Z; ongoing means beginAt<=now<endAt.
    const tdoc = makeTdoc({
      rule: 'oi',
      title: 'OI Live',
      beginAt: '2026-07-17T10:00:00.000Z',
      endAt: '2026-07-17T14:00:00.000Z',
      duration: 4,
    });
    renderPage({ tdocs: [tdoc], tsdict: { [tdoc.docId]: {} }, tpcount: 1, page: 1, qs: '', rule: '', group: '', q: '', groups: [] });
    expect(screen.getByText('OI Live')).toBeInTheDocument();
    // Live badge "Live 进行中" appears in the hero
    expect(screen.getAllByText(/Live/i).length).toBeGreaterThan(0);
  });

  it('(d) shows ready hero banner for upcoming contest', () => {
    // upcoming means beginAt > now and beginAt - now <= 7 days
    const tdoc = makeTdoc({
      rule: 'ioi',
      title: 'IOI Upcoming',
      beginAt: '2026-07-19T10:00:00.000Z', // 2 days ahead
      endAt: '2026-07-19T15:00:00.000Z',
      duration: 5,
    });
    renderPage({ tdocs: [tdoc], tsdict: { [tdoc.docId]: {} }, tpcount: 1, page: 1, qs: '', rule: '', group: '', q: '', groups: [] });
    expect(screen.getByText('IOI Upcoming')).toBeInTheDocument();
    // Ready badge "即将开始" or "Ready" appears
    expect(screen.getAllByText(/即将开始|Ready/i).length).toBeGreaterThan(0);
  });

  it('(e) shows attended chip when tsdict says attended=1', () => {
    const tdoc = makeTdoc({ docId: 'att1', title: 'Enrolled' });
    renderPage({
      tdocs: [tdoc],
      tsdict: { att1: { attend: 1 } },
      tpcount: 1, page: 1, qs: '', rule: '', group: '', q: '', groups: [],
    });
    expect(screen.getByText(/已报名/)).toBeInTheDocument();
  });

  it('(f) shows Rated chip when tdoc.rated is true', () => {
    const tdoc = makeTdoc({ rated: true, title: 'Rated Round' });
    renderPage({ tdocs: [tdoc], tsdict: { [tdoc.docId]: {} }, tpcount: 1, page: 1, qs: '', rule: '', group: '', q: '', groups: [] });
    expect(screen.getByText('Rated')).toBeInTheDocument();
  });

  it('(g) shows Create Contest sidebar CTA only when PERM_CREATE_CONTEST present', () => {
    const permCreate = `BigInt::${(1n << 41n) | (1n << 44n)}`; // PERM_VIEW_CONTEST + PERM_CREATE_CONTEST
    const permViewOnly = `BigInt::${1n << 41n}`;
    const { rerender } = render(
      <PageDataProvider
        initial={{
          name: 'contest_main', template: 'contest_main.html',
          args: { UserContext: { perm: permCreate }, tdocs: [], tsdict: {}, tpcount: 0,
                  page: 1, qs: '', rule: '', group: '', q: '', groups: [] },
        }}
      >
        <ContestMain />
      </PageDataProvider>,
    );
    expect(screen.getByText(/SidebarCreate|Create|\+ 新建比赛/i)).toBeInTheDocument();

    rerender(
      <PageDataProvider
        initial={{
          name: 'contest_main', template: 'contest_main.html',
          args: { UserContext: { perm: permViewOnly }, tdocs: [], tsdict: {}, tpcount: 0,
                  page: 1, qs: '', rule: '', group: '', q: '', groups: [] },
        }}
      >
        <ContestMain />
      </PageDataProvider>,
    );
    expect(screen.queryByText(/SidebarCreate|Create|\+ 新建比赛/i)).not.toBeInTheDocument();
  });

  it('(h) renders pager when tpcount > PAGE_SIZE', () => {
    const tdocs = Array.from({ length: 5 }, (_, i) =>
      makeTdoc({ docId: `td${i}`, title: `Contest ${i}` }),
    );
    renderPage({ tdocs, tsdict: {}, tpcount: 100, page: 2, qs: '', rule: '', group: '', q: '', groups: [] });
    expect(screen.getByRole('navigation', { name: /比赛分页|pagination/i })).toBeInTheDocument();
  });

  it('(i) no console errors during render', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const tdoc = makeTdoc({ title: 'Quiet' });
    renderPage({ tdocs: [tdoc], tsdict: { [tdoc.docId]: {} }, tpcount: 1, page: 1, qs: '', rule: '', group: '', q: '', groups: [] });
    expect(errSpy).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });
});
```

- [ ] **Step 3: Run the tests**

Run: `cd packages/ui-next && yarn test --run src/pages/contest_main.test.tsx`
Expected: 9 tests pass.

If a test fails:
- Empty state: confirm `ContestMain.NoContests` resolves to `'暂无比赛'`. Search the rendered HTML.
- Hero banners: `screen.getAllByText(...)` is forgiving when text appears in multiple elements.
- Pager: aria-label `t('ContestMain.PagerAria')` is `'比赛分页'`. The regex `/比赛分页|pagination/i` covers both forms.

- [ ] **Step 4: Run the full test suite**

Run: `cd packages/ui-next && yarn test --run`
Expected: prior 22 + new 9 = 31 tests, all green.

- [ ] **Step 5: Commit**

```bash
git add packages/ui-next/src/pages/contest_main.test.tsx
git commit -m "test(ui-next): add integration tests for contest_main page"
```

---

## Task 10: Playwright visual regression baseline regen

Capture dark + light screenshots of `/contest`. Confirms the actual rendered look matches the design and provides a checkpoint for future changes.

**Files:**
- Modify: `packages/ui-next/e2e/visual.spec.ts` (add one row for `/contest`)
- Create (regenerated):
  - `packages/ui-next/e2e/__snapshots__/contest_main-dark.png`
  - `packages/ui-next/e2e/__snapshots__/contest_main-light.png`

- [ ] **Step 1: Ensure Playwright + Chromium are available**

Run: `cd packages/ui-next && yarn playwright --version`
Expected: prints `Version x.y.z`. If `playwright` is unavailable:
```bash
yarn install
yarn playwright install chromium
```

- [ ] **Step 2: Build ui-next production bundle**

Run: `yarn workspace @hydrooj/ui-next build`
Expected: 0 TS errors, Vite build complete, `packages/ui-next/public/` populated.

- [ ] **Step 3: Examine the existing visual spec**

Read: `packages/ui-next/e2e/visual.spec.ts`. Identify the pattern used for existing baselines.

- [ ] **Step 4: Add a row for `contest_main` to the spec**

Edit `e2e/visual.spec.ts`. Insert (using existing row structure):

```ts
{ name: 'contest_main', path: '/contest' },
```

- [ ] **Step 5: Regenerate baselines**

Run: `cd packages/ui-next && yarn test:visual:update`
Expected: builds the snapshot directory; tests pass because baselines are being regenerated.

- [ ] **Step 6: Manually verify the screenshots**

Open both regenerated PNGs in a viewer. Verify:
- Dark: hero Live banner shows pink→violet gradient; ready banner shows cyan→blue; rows have rule-colored left borders.
- Light: hero banners use neutral grey gradients; rows still have rule-color borders (now all dark grey); Chip tags visible.

If either looks broken, iterate CSS in `contest_main.module.css` until it passes visual review.

- [ ] **Step 7: Run visual regression to confirm baselines are pinned**

Run: `cd packages/ui-next && yarn test:visual`
Expected: snapshots match. No new diffs.

- [ ] **Step 8: Commit**

```bash
git add packages/ui-next/e2e/visual.spec.ts 'packages/ui-next/e2e/__snapshots__/contest_main-*.png'
git commit -m "test(ui-next): add /contest Playwright visual baselines (dark + light)"
```

---

## Task 11: Final smoke test + commit

Bring it all together. The page is wired; this task verifies the end-to-end flow against a running backend (or against the dev server with mocked data if backend is unavailable).

- [ ] **Step 1: Confirm full build is clean**

Run: `yarn workspace @hydrooj/ui-next build`
Expected: 0 TS errors, Vite build completes.

- [ ] **Step 2: Confirm unit tests all pass**

Run: `cd packages/ui-next && yarn test --run`
Expected: 31 tests, all green.

- [ ] **Step 3: Confirm visual regression passes**

Run: `cd packages/ui-next && yarn test:visual`
Expected: pass against the baselines created in Task 10.

- [ ] **Step 4: Smoke test against running backend (if available)**

If `yarn debug` is running a backend on port 2333:

```bash
# Verify the page's HTML shell is the ui-next one (contains __HYDRO_INJECTION__)
curl -s "http://localhost:2333/contest" | head -3
```
Expected: HTML starts with `<!doctype html>` (or similar SPA shell) AND contains `__HYDRO_INJECTION__`.

```bash
# Then verify the JSON injected payload
curl -s "http://localhost:2333/contest" | grep -o '__HYDRO_INJECTION__[^<]*' | head -1 | python3 -c "
import sys, json, re
raw = sys.stdin.read()
m = re.search(r'>(.+?)</script>', raw, re.DOTALL)
if m:
    data = json.loads(m.group(1).replace('\\\\u003c','<'))
    print('name =', data.get('name'))
    print('template =', data.get('template'))
    print('args keys =', list(data.get('args',{}).keys())[:10])
"
```
Expected: `name = contest_main`, `template = contest_main.html`, `args keys` includes `tdocs`, `tsdict`, `page`, `tpcount`, `groups`, `q`, `rule`, `group`, `qs`.

If backend is **not** running, skip this step; the next-renderer integration is verified by `registerPage('contest_main', ...)` added in Task 8 and `app.tsx` resolving it.

- [ ] **Step 5: Final summary commit (changelog if any)**

If any further tweaks were needed to land cleanly (none expected):
```bash
git add -A
git commit -m "chore(ui-next): contest_main smoke-test polish"
```

If nothing to add, skip this commit.

- [ ] **Step 6: Push branch (optional)**

```bash
git push -u origin master
# (or push the branch this work is on)
```

Done! 11 tasks completed. The page is now live at `/contest` for users without `?__disableNext=1`, with all original ui-default behavior preserved and ui-next's design system + slot architecture in place.

---

## Summary checklist (for review at the end)

```
☐ Task 0: Prereq check
☐ Task 1: perm-constants.ts
☐ Task 2: perms.ts + perms.test.ts
☐ Task 3: contest-flags.ts + contest-flags.test.ts
☐ Task 4: i18n ContestMain.* keys
☐ Task 5: tokens.css contest block
☐ Task 6: contest_main.module.css
☐ Task 7: contest_main.tsx (page + inline components)
☐ Task 8: registerPage in pages/index.ts
☐ Task 9: contest_main.test.tsx (9 scenarios)
☐ Task 10: Playwright visual baselines
☐ Task 11: Final smoke test + commit
```

---

## Out-of-Scope (do NOT do these — explicit list)

Per `docs/superpowers/specs/2026-07-17-ui-next-contest-main-migration-design.md` §13:
- contest_detail, contest_scoreboard, contest_edit, contest_manage, contest_problem, contest_print — separate migrations.
- i18n library / dynamic translations.
- Real server-side React rendering.
- Removing or editing `packages/ui-default/` files.
- Editing `packages/hydrooj/src/handler/contest.ts`, `model/contest.ts`, `interface.ts`, `setting.yaml`.
- Adding sections/data sections other than the listed 28 keys.
- Bundling a real date library (use `Intl.DateTimeFormat` — already done by `lib/datetime.tsx`).
- Bundling a real markdown library.
