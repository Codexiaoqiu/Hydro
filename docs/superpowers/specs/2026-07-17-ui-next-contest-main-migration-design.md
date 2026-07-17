# ui-next Contest Main Migration — Approved Design Spec

**Date:** 2026-07-17
**Status:** Approved (result of brainstorming on 2026-07-17; ready for implementation plan)
**Owner:** @hydro-dev
**Scope:** `packages/ui-next` only — no backend changes, no `packages/ui-default` changes

---

## 1. Context

The current `/contest` route is rendered entirely by `packages/ui-default`:
- Handler: `ContestListHandler` at `packages/hydrooj/src/handler/contest.ts:33-75` (lives in `hydrooj`, not `ui-default`).
- Template: `packages/ui-default/templates/contest_main.html` (Nunjucks, full SSR).
- Page styles: `packages/ui-default/pages/contest.page.styl` + `packages/ui-default/components/contest/contest.page.styl`.
- List items are rendered server-side; no React component exists. The front-end glue is `pages/contest_main.page.ts`, which only auto-submits the filter form when a `<select>` changes.
- Visual signature: hero `Live ...` / `Ready (☆▽☆)` banners with radial gradients, six rule-colored `contest-type-tag` chips, left-side date numbox (day + month), Attended green check, Rated orange pill.

`packages/ui-next` is a Vite + React 19 SPA with a slot-based plugin system, dark-first design tokens (`src/styles/tokens.css`), and `<Card>`/`<Chip>`/`<Select>` primitives. It already ships `homepage` and `problem_main` pages — both follow the same recipe: shell grid (1fr + 320px sidebar), Card header with Eyebrow + h3, toolbar with Search + Select, list rows with rule chip + meta chips, pager, sidebar cards.

ui-next's `'next'` renderer (`packages/ui-next/index.ts:210/245`, `priority: 100`) **always wins** over ui-default's renderer (`priority: 1`). Once `registerPage('contest_main', …)` is added, any user who does not opt out via `?__disableNext=1` will see the ui-next version. We do **not** delete or alter ui-default's template — it remains the fallback when users escape the SPA.

The goal of this work is to render `/contest` inside ui-next with the same hero banner, the same six rule color tags, the same filter / search / pagination UX, and the same `Create Contest` sidebar CTA — all while reusing the existing tokens, primitives, and helpers (`isOngoing`, `isUpcoming`, `isDone`, `renderDuration`, `ruleText`, `formatDate`).

## 2. Decisions log (from brainstorming)

| Decision | Choice | Why |
|---|---|---|
| Migration mode | **Switch to ui-next only** | User: "不动 ui-default 的任何代码，只在 ui-next 中修改" — keep ui-default intact as opt-out fallback |
| Style scope | **Reuse ui-next design system** | Map ui-default BEM classes to existing tokens + primitives; no BEM names carried over |
| Hero `Live / Ready` banners | **Keep them** (default) | User: "默认保留"; they carry the strongest visual identity |
| Right sidebar | **Mirror ui-default** — only `Create Contest` CTA (permission-gated) | User: "只照 ui-default"; skip problem_main's Lucky/Categories/Tags |
| Layout | **Mirror `problem_main.tsx`** | shell grid 1fr+320px, single main Card with header, sidebar Card |
| Filter interaction | **Client-side mirror via `useNavigate`** | Replicate "select auto-submits" UX but via SPA navigation, so no full page reload |
| Search submit | **Form onSubmit → `navigate()`** | Stays SPA; mirrors `problem_main.tsx` pattern |
| Pagination | **Custom `Pager` like `problem_main.tsx`** | window=±1, ellipsis gaps, URL with preserved q/rule/group |
| `PERM_CREATE_CONTEST` gate | **Read `args.UserContext.perm`** (same as problem_main) | Avoid coupling to backend `hasPerm()`; frontend perm is already serialized |
| tsdoc.id type | **String after JSON serialization** | ObjectId → hex string; verified by `model/types.ts` interface |
| New tokens to add | **Two gradients (`--gradient-contest-live`, `--gradient-contest-ready`) + six `--tint-rule-<rule>` families** | Only what's needed to recreate the six rule colors and the two banner gradients |
| Architecture for cards | **Inline components inside `contest_main.tsx`** | Page is ~330 LOC; rows are simple; no need for separate files |

## 3. Architecture

### Renderer → component wiring

```
GET /contest?rule=...&group=...&q=...&page=...       [browser]
  ↓
ContestListHandler.get()                            [backend, unchanged]
  └─ response.body = { page, tpcount, qs, rule, tdocs, tsdict, groups, group, q }
  └─ response.template = 'contest_main.html'

'next' renderer                                     [packages/ui-next/index.ts, unchanged]
  └─ JSON.stringify({ …, args: { UserContext, UiContext, ...args } }, serializer)
      ↑ (handler args = response.body)

__HYDRO_INJECTION__                                 [inline <script>]
  └─ globals.ts initialPage.args
      ↑ { UserContext, UiContext, page, tpcount, qs, rule, group, q, groups, tdocs, tsdict }

PageDataProvider                                    [src/context/page-data.tsx]
  └─ usePageData() returns { name, template, args }

app.tsx                                             [src/app.tsx, unchanged]
  └─ template 'contest_main.html' → page:contest_main.html → page:contest_main
      ↓
registerPage('contest_main', () => import('./contest_main'))  [NEW in pages/index.ts]
      ↓
ContestMain()                                       [src/pages/contest_main.tsx, NEW]
  └─ shell grid → main Card → Toolbar → List → Pager
  └─ sidebar Card → CtaCard (perm-gated)
```

### Page composition

```
<div className={styles.shell}>
  <main>
    <Card variant="default" header={<HeaderRow />}>
      <Toolbar>                           // Search input + Rule Select + Group Select
      {tdocs.length === 0
        ? <EmptyState />
        : <List rows={ContestRow ×N} />
      }
      <Pager page={page} tpcount={tpcount} qs={qs} rule={rule} group={group} q={q} />
    </Card>

    {(ongoingContests.length > 0 || upcomingContests.length > 0) && (
      <HeroBanners ongoing={...} upcoming={...} tsdict={...} />
    )}
  </main>

  <aside className={styles.sidebar}>
    <Card variant="side">
      <CtaCard ... />        // only when UserContext.perm & PERM_CREATE_CONTEST
    </Card>
  </aside>
</div>
```

Hero banners are inside `<main>` but **above** the main Card (separate `<section>`). Each banner is its own Card with `variant="hero-live"` / `variant="hero-ready"`.

### Inline components (all live in `contest_main.tsx`)

| Component | LOC est. | Reuse |
|---|---|---|
| `HeaderRow` | 8 | Eyebrow + h3 |
| `Toolbar` | 50 | `useNavigate`, `useState`, `useBuildUrl`, primitives `Select` |
| `EmptyState` | 5 | — |
| `ContestRow` | 60 | `Link`, `Chip`, `formatDate`, `renderDuration`, `ruleText`, `isOngoing`/`isUpcoming`/`isDone` |
| `HeroBanner` | 50 | `Card` with gradient background, `Link`, `Chip` |
| `Pager` | 50 | same approach as `problem_main.Pager` |
| `ContestMain` default export | 100 | orchestrates the above + perm gate |

### Data flow within the page

```
usePageData().args = { UserContext, UiContext, page, tpcount, qs, rule, group, q, groups, tdocs, tsdict }

ContestMain():
  const args = usePageData().args
  const tdocs = Array.isArray(args.tdocs) ? args.tdocs : []        // defensive
  const tsdict = (args.tsdict ?? {}) as Record<string, ContestStatusDoc>
  const page = Math.max(1, Number(args.page) || 1)
  const tpcount = Math.max(0, Number(args.tpcount) || 0)
  const tppagecount = Math.ceil(tpcount / PAGE_SIZE)                // PAGE_SIZE = ??, mirror handler's paginate
  const rule = String(args.rule ?? '')
  const group = String(args.group ?? '')
  const q = String(args.q ?? '')
  const groups = Array.isArray(args.groups) ? args.groups : []
  const qs = String(args.qs ?? '')

  ongoing  = tdocs.filter(t => isOngoing(t, NOW))     // NOW captured once with useMemo
  upcoming = tdocs.filter(t => isUpcoming(t, 7, NOW))  // 7-day window matches model/contest.ts default
```

## 4. Components (detailed)

### `<Toolbar>` — search + selects

```tsx
function Toolbar({ initialQ, rule, group, groups, rules }: { ... }) {
  const navigate = useNavigate()
  const buildUrl = useBuildUrl()
  const [query, setQuery] = useState(initialQ)
  const t = useTranslate()

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault()
    navigate(buildUrl('contest_main', {}, {
      ...(query ? { q: query } : {}),
      ...(rule ? { rule } : {}),
      ...(group ? { group } : {}),
    }))
  }
  const changeRule = (v: string) => {
    navigate(buildUrl('contest_main', {}, {
      ...(query ? { q: query } : {}),
      ...(v ? { rule: v } : {}),
      ...(group ? { group } : {}),
    }))
  }
  const changeGroup = (v: string) => {
    navigate(buildUrl('contest_main', {}, {
      ...(query ? { q: query } : {}),
      ...(rule ? { rule } : {}),
      ...(v ? { group } : {}),
    }))
  }

  return (
    <div className={styles.toolbar}>
      <form className={styles.toolbarRow} onSubmit={submit}>
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
          onChange={changeRule}
          ariaLabel={t('ContestMain.RuleAria')}
          options={[
            { value: '', label: t('ContestMain.AllRules') },
            ...rules.map(r => ({ value: r.key, label: r.label })),
          ]}
        />
        <Select
          value={group}
          onChange={changeGroup}
          ariaLabel={t('ContestMain.GroupAria')}
          options={[
            { value: '', label: t('ContestMain.AllGroups') },
            ...groups.map(g => ({ value: g, label: g })),
          ]}
        />
      </form>
    </div>
  )
}
```

`rules` is built from `args.model.contest.RULES` — but the model is server-side. The handler currently doesn't pass `RULES` to the template, only the rule text per tdoc and a select built by iterating `model.contest.RULES` from Nunjucks. In ui-next we need the rule map. **Two options**:

1. **Read each tdoc's rule from `args.tdocs`** and union them with a built-in list `['acm', 'oi', 'ioi', 'ledo', 'homework', 'strictioi']` — preserves every rule that's hidden from model but actually exists. **Limitation**: shows only rules that have at least one tdoc on this page.
2. **Add a `args.rules` field in the handler.** Out of scope per "no backend changes" rule.

→ **Decision**: use option 1 (union from tdocs + hardcoded fallback list of known rules). If a rule exists in DB but not on this page, the user can still type `?rule=…` to filter. Acceptable because rules are stable (model.contest.RULES rarely changes at runtime).

### `<HeroBanner>` — Live / Ready

```tsx
function HeroBanner({ tdoc, tsdoc = undefined, variant }: {
  tdoc: SerializedTdoc
  tsdoc?: ContestStatusDoc
  variant: 'live' | 'ready'
}) {
  const t = useTranslate()
  const start = tsdoc?.startAt ?? tdoc.beginAt
  const attended = tsdoc?.attend === 1
  const ruleName = ruleText(tdoc.rule)
  const durationHrs = renderDuration(tdoc)

  return (
    <Link
      to="contest_detail"
      params={{ tid: tdoc.docId }}
      className={`${styles.hero} ${variant === 'live' ? styles.heroLive : styles.heroReady}`}
    >
      <div className={styles.heroBadge}>
        {variant === 'live' ? t('ContestMain.LiveBadge') : t('ContestMain.ReadyBadge')}
      </div>
      <h3 className={styles.heroTitle}>{tdoc.title}</h3>
      <ul className={styles.heroMeta}>
        <li><span className={styles.heroMetaLabel}>{t('ContestMain.RuleLabel')}</span> {ruleName}</li>
        <li><span className={styles.heroMetaLabel}>{t('ContestMain.StartLabel')}</span> {formatDateTime(start)}</li>
        <li><span className={styles.heroMetaLabel}>{t('ContestMain.DurationLabel')}</span> {durationHrs} {t('ContestMain.HoursUnit')}</li>
        <li><span className={styles.heroMetaLabel}>{t('ContestMain.ParticipantsLabel')}</span> {tdoc.attend ?? 0}</li>
      </ul>
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
  )
}
```

### `<ContestRow>` — single list item

```tsx
function ContestRow({ tdoc, tsdoc, rule }: {
  tdoc: SerializedTdoc
  tsdoc?: ContestStatusDoc
  rule: string
}) {
  const t = useTranslate()
  const now = useNow()                                     // captured at render by useMemo + Date.now()
  const ongoing = isOngoing(tdoc, now)
  const upcoming = isUpcoming(tdoc, 7, now)
  const done = !ongoing && !upcoming && isDone(tdoc, now)
  const attended = tsdoc?.attend === 1

  return (
    <div className={`${styles.row} ${styles[`rule_${rule}`]}`} data-rule={rule}>
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
          <li className={styles.text}>{renderDuration(tdoc)} {t('ContestMain.HoursUnit')}</li>
          <li className={styles.text}>{tdoc.attend ?? 0} {t('ContestMain.ParticipantsShort')}</li>
          {ongoing && <li><Chip variant="ongoing">{t('ContestMain.Ongoing')}</Chip></li>}
          {upcoming && <li><Chip variant="upcoming">{t('ContestMain.Upcoming')}</Chip></li>}
          {done && <li><Chip variant="ended">{t('ContestMain.Ended')}</Chip></li>}
          {attended && <li><Chip variant="diff">{t('ContestMain.Attended')}</Chip></li>}
        </ul>
      </div>
    </div>
  )
}
```

### `<Pager>` — port from `problem_main.tsx`

Same algorithm (window=±1, gap markers, last-page anchor), but for `contest_main` route and q/rule/group params. Roughly 50 LOC, identical structure to `problem_main.tsx:Pager`.

### Perm gate

```tsx
function hasCreatePerm(UserContext: any): boolean {
  const permStr = (UserContext?.perm ?? '') as string
  // UserContext.perm is a BigInt stringified as "BigInt::123456"
  const m = permStr.match(/^BigInt::(\d+)$/)
  if (!m) return false
  const big = BigInt(m[1])
  // PERM_CREATE_CONTEST = 1 << 6 (matches hydrooj PERM.PERM_CREATE_CONTEST = 64)
  return ((big >> 6n) & 1n) === 1n
}
```

(`PERM_CREATE_CONTEST = 64` is verified by reading `packages/hydrooj/src/model/builtin.ts`.)

## 5. Components (existing reused)

| Component | Used for | Path |
|---|---|---|
| `Card` | main shell + sidebar + hero banners | `components/primitives/Card.tsx` |
| `Chip` | rule tag / Rated / status / attended | `components/primitives/Chip.tsx` |
| `Select` | rule dropdown / group dropdown | `components/primitives/Select.tsx` |
| `Eyebrow` | "Contests" crumb in main Card header | `components/primitives/Eyebrow.tsx` |
| `Link` | all navigation: contest_detail, buildUrl('contest_main',…) | `components/link.tsx` |
| `CtaCard` | "Create a contest" sidebar | `components/sidebar/CtaCard.tsx` |
| `isOngoing`, `isUpcoming`, `isDone`, `renderDuration` | row + banner status | `lib/contest-status.ts` (existing) |
| `ruleText` | rule abbreviation | `lib/rule-text.ts` (existing) |
| `formatDate`, `formatDateTime` | banner date / row date | `lib/datetime.tsx` (existing) |

No new primitives. No new helpers in `lib/` other than what's listed below.

## 6. Library code (new, in `lib/`)

### `src/lib/contest-flags.ts` — server-pushed rules list

We need to know which rule keys are "filterable" so the Rule select shows them. The rules map (`RULES` from `model/contest.ts`) lives server-side and is not passed in `args`. We hardcode the known set so the select renders on first render:

```ts
// Source: packages/hydrooj/src/model/contest.ts — model.contest.RULES keys
// Kept in sync manually; UI is lenient: missing keys just don't appear in the dropdown
// (filtering by URL param still works).
export const KNOWN_RULES: ReadonlyArray<{ key: string, label: string }> = [
  { key: 'acm', label: 'XCPC' },
  { key: 'oi', label: 'OI' },
  { key: 'ioi', label: 'IOI' },
  { key: 'strictioi', label: 'IOI(Strict)' },
  { key: 'ledo', label: 'Ledo' },
  { key: 'homework', label: '作业' },
];
```

This duplicates labels already in `lib/rule-text.ts` to avoid coupling the toolbar to a specific label-getter. Acceptable: rule names are stable.

### `src/lib/perms.ts` — small perm helpers

```ts
const PERM_VIEW_CONTEST = 1n << 5n;       // PERM.PERM_VIEW_CONTEST = 32 (verify in builtin.ts)
const PERM_CREATE_CONTEST = 1n << 6n;     // PERM.PERM_CREATE_CONTEST = 64 (verify in builtin.ts)
const PERM_VIEW_HIDDEN_CONTEST = 1n << 13n; // PERM.PERM_VIEW_HIDDEN_CONTEST — verify

export function hasPerm(UserContext: any, mask: bigint): boolean {
  const permStr = (UserContext?.perm ?? '') as string;
  const m = permStr.match(/^BigInt::(\d+)$/);
  if (!m) return false;
  const big = BigInt(m[1]);
  return (big & mask) !== 0n;
}

// Specific:
export function canCreateContest(UserContext: any): boolean {
  return hasPerm(UserContext, PERM_CREATE_CONTEST);
}
export function canViewHiddenContest(UserContext: any): boolean {
  return hasPerm(UserContext, PERM_VIEW_HIDDEN_CONTEST);
}
```

The implementation uses `(big & mask) !== 0n` — never bit-shift the mask index.

### `src/lib/perm-constants.ts` — single source of truth

```ts
// Mirror of packages/hydrooj/src/model/builtin.ts — manually kept in sync.
// Update if backend adds new PERM bits.
export const PERM = {
  PERM_VIEW_CONTEST:        1n << 5n,
  PERM_CREATE_CONTEST:      1n << 6n,
  PERM_VIEW_HIDDEN_CONTEST: 1n << 13n,
};
```

## 7. Tokens (append-only to `src/styles/tokens.css`)

Append after the existing `--gradient-article-border` rule. Mirrors light-theme re-mapping convention.

```css
/* === Contest (migrated from ui-default) ============================== */

/* Six contest rule color families — RGB triples so we can compose alpha */
:root {
  --tint-rule-acm:        107, 182, 122; /* green */
  --tint-rule-oi:         245, 199, 53;  /* yellow */
  --tint-rule-ioi:        46, 154, 254;  /* blue */
  --tint-rule-ledo:       128, 118, 163; /* violet */
  --tint-rule-homework:   255, 205, 205; /* pink */
  --tint-rule-strictioi:  110, 162, 199; /* cyan-ish */

  /* Hero banner gradients (Live/Ready) — dark theme keeps vivid colors */
  --gradient-contest-live:  linear-gradient(135deg, var(--pink), var(--violet));
  --gradient-contest-ready: linear-gradient(135deg, var(--cyan), var(--blue));
}

[data-theme="light"] {
  /* Remap all rule tints to neutral grey per existing convention */
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

Two aesthetic notes captured in code comments:
- In dark theme, hero Live = pink→violet (matches ui-default #E98696→#E96B6B family).
- In dark theme, hero Ready = cyan→blue (matches ui-default #469DCF→#8ACDE6 family).
- In light theme, both follow the "neutral monochrome" rule already established by `tokens.css` for every color.

## 8. `pages/contest_main.module.css` (sketch)

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

/* ===== Hero banners ===== */
.hero {
  position: relative;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--space-5);
  padding: var(--space-5) var(--space-6);
  border-radius: var(--radius-xl);
  color: var(--text);
  text-decoration: none;
  overflow: hidden;
  margin-bottom: var(--space-4);
  transition: transform var(--motion-base);
}
.hero:hover { transform: translateY(-2px); text-decoration: none; }

.heroLive  { background: var(--gradient-contest-live);  box-shadow: var(--shadow-2); }
.heroReady { background: var(--gradient-contest-ready); box-shadow: var(--shadow-2); }

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

.heroMetaLabel { opacity: 0.85; margin-right: 4px; font-family: var(--font-mono); font-size: var(--text-xs); }

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
[data-theme="light"] .heroStatus { color: var(--text); opacity: 0.9; }

/* ===== Toolbar (search + rule + group) ===== */
.toolbar { padding: var(--space-4) var(--space-6); border-bottom: 1px solid var(--border); }
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
}
.search:focus-within { border-color: var(--border-strong); }
.search input {
  flex: 1; background: transparent; border: none; outline: none;
  color: var(--text); font: inherit; font-size: var(--text-base);
  padding: var(--space-2) 0; min-width: 0;
}
.search input::placeholder { color: var(--text-mute); }
.searchIcon { width: 16px; height: 16px; color: var(--text-mute); flex-shrink: 0; }

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

/* Rule-specific left-border tints */
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
.text { color: var(--text-soft); font-size: var(--text-sm); font-family: var(--font-mono); }
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

/* Pager (same as problem_main) */
.pager {
  display: flex; align-items: center; justify-content: center;
  gap: var(--space-2); padding: var(--space-5) var(--space-6);
  border-top: 1px solid var(--border); flex-wrap: wrap;
}
.pagerItem, .pagerActive, .pagerGap { … } /* mirrored from problem_main.module.css */
```

## 9. i18n catalog additions

Append to the catalog in `src/lib/i18n.ts` (or wherever `ProblemMain.*` lives):

```ts
ContestMain: {
  Crumbs: '比赛',
  Title: '所有比赛',
  SearchPlaceholder: '搜索比赛...',
  SearchAria: '搜索比赛',
  AllRules: '所有赛制',
  AllGroups: '所有分组',
  RuleAria: '按赛制筛选',
  GroupAria: '按分组筛选',
  LiveBadge: 'Live 进行中',
  ReadyBadge: '即将开始',
  RuleLabel: '赛制',
  StartLabel: '开始',
  DurationLabel: '时长',
  ParticipantsLabel: '参赛人数',
  ViewDetails: '查看详情',
  Attended: '已报名',
  NotAttended: '未报名',
  HoursUnit: '小时',
  ParticipantsShort: '人',
  Ongoing: '进行中',
  Upcoming: '未开始',
  Ended: '已结束',
  EmptyState: '暂无比赛。',
  PagerAria: '比赛分页',
  SidebarCreateTitle: '创建比赛',
  SidebarCreateSubtitle: '设置赛制、时间与参赛者名单。',
  SidebarCreateAction: '+ 新建比赛',
  PageCountTitle: '共 {0} 场比赛',
  NoContests: '暂无比赛',
},
```

Mirrors `problem_main.tsx`'s catalog block style. No new i18n library.

## 10. Test strategy

| Test file | Coverage |
|---|---|
| `src/lib/perms.test.ts` | `hasPerm` matches `BigInt::<n>` strings, returns false on null/empty/unknown, verifies `(big & mask) !== 0n` against 64 (`PERM_CREATE_CONTEST`), 32, 8192 |
| `src/lib/contest-flags.test.ts` | `KNOWN_RULES` length = 6, all keys exist in `ruleText` map, label positions are stable |
| `src/pages/contest_main.test.tsx` | Wrap `PageDataProvider`; render with mocked args; verify: (a) empty tdocs shows `EmptyState`; (b) 1 acm contest shows row with rule tag; (c) 1 ongoing contest shows `HeroBanner` of variant `live`; (d) 1 upcoming shows `ready`; (e) `attended=1` shows "已报名" Chip; (f) rated shows "Rated" Chip; (g) perm-gated CTA renders when `UserContext.perm = "BigInt::96"` (bits 5+6 = `PERM_VIEW_CONTEST \| PERM_CREATE_CONTEST`) but not when `perm = "BigInt::32"` (only `PERM_VIEW_CONTEST`); (h) pager renders when `tpcount > PAGE_SIZE`; (i) no console errors |
| `src/pages/contest_main.module.css` | (no test) — captured by visual regression |

Visual regression:
- `e2e/visual.spec.ts` already runs Playwright on the dev server. Add a row for `/contest` (params `?` empty).
- Baseline regen via `yarn workspace @hydrooj/ui-next test:visual:update`.
- Two screenshots: dark + light.

Test conventions match existing `problem_main.test.tsx` and `pages/homepage.test.tsx`.

## 11. File inventory

### New files (5)

```
packages/ui-next/src/
├── lib/
│   ├── perms.ts             # hasPerm helper
│   ├── perm-constants.ts    # PERM bit constants
│   └── contest-flags.ts     # KNOWN_RULES
├── pages/
│   ├── contest_main.tsx     # full page + inline components
│   ├── contest_main.module.css
│   └── contest_main.test.tsx
```

### Modified files (2)

```
packages/ui-next/
└── src/
    ├── pages/
    │   └── index.ts                    # registerPage('contest_main', …) appended
    └── styles/
        └── tokens.css                  # append --tint-rule-* + --gradient-contest-*
```

### Untouched (explicitly)

- `packages/hydrooj/src/handler/contest.ts` — backend, **NO CHANGES**
- `packages/hydrooj/src/model/contest.ts`, `interface.ts` — backend, unchanged
- `packages/hydrooj/setting.yaml` — unchanged
- `packages/ui-default/` (entire package) — unchanged; its `contest_main.html` is the opt-out fallback
- `packages/ui-next/index.ts` — renderer contract unchanged
- `packages/ui-next/src/app.tsx`, `main.tsx`, `theme/*`, `context/*` — wiring unchanged
- All 18 existing primitives/nav/sidebar/charts/ide/article components
- All `sidebar/ContestList`, `sections/ContestSection` — these are used by other pages (problem_detail, homepage); leave their data shapes alone
- `lib/contest-status.ts`, `lib/rule-text.ts`, `lib/datetime.tsx` — already complete
- `playwright.config.ts`, `vitest.config.ts`, all existing tests

## 12. Verification

1. **Type + build**:
   ```bash
   yarn workspace @hydrooj/ui-next build
   ```
   Must produce 0 TypeScript errors. Vite build must complete.

2. **Unit tests**:
   ```bash
   yarn workspace @hydrooj/ui-next test
   ```
   Old 22 + new ~10 = ~32 tests, all green.

3. **Visual baseline regen**:
   ```bash
   yarn workspace @hydrooj/ui-next build
   yarn workspace @hydrooj/ui-next test:visual:update
   # Inspect screenshots manually: dark + light.
   yarn workspace @hydrooj/ui-next test:visual
   ```

4. **End-to-end with backend**:
   ```bash
   yarn build
   yarn debug
   # Open http://localhost:2333/contest
   ```
   - `/contest` renders inside ui-next (right-click "View Source" → see `__HYDRO_INJECTION__`).
   - Live and Ready banners (when applicable) appear above the list.
   - Search box accepts input; submit navigates with `?q=...`.
   - Rule select change navigates with `?rule=...`.
   - Group select change navigates with `?group=...`.
   - Pagination links preserve filter params.
   - "创建比赛" CTA visible only for users with `PERM_CREATE_CONTEST`.
   - ThemeToggle persists across reload.
   - No console errors.

5. **Commit + PR**:
   ```bash
   git add packages/ui-next/
   git commit -m "feat(ui-next): data-driven contest_main page with hero banners and rule chips"
   ```

## 13. Out of scope

- **Other contest pages** — `contest_detail`, `contest_scoreboard`, `contest_edit`, `contest_manage`, `contest_problem`, `contest_print` — separate migrations.
- **`tsdict` cursor offsets** — none of those features appear in the list view.
- **Dynamic i18n** — hardcoded Chinese strings, matching `problem_main.tsx` and the `homepage` migration (2026-07-07).
- **Server-side rendering of the React tree** — the renderer is `serialize(args) → SPA hydrate`. Same as everywhere else in ui-next.
- **Animation library** — CSS transitions only, matching the rest of ui-next.
- **Removing ui-default contest_main.html** — kept as the opt-out fallback. Removal is a separate decision; not part of this work.

## 14. Risks and mitigations

| Risk | Mitigation |
|---|---|
| `tdoc.beginAt/endAt` serialize as Date or string? | Verified by `serializer()` in `packages/framework/...`; `Date.prototype.toJSON` yields ISO string. `formatDate` accepts ISO strings; `isOngoing/isUpcoming/isDone` do `new Date(t.beginAt).getTime()`. Unit tests pin both date and string forms. |
| `tdoc.docId` is ObjectId hex after JSON | Confirmed by handler: `response.body.tdocs = tdocs`. Serializer stringifies ObjectId via `ObjectId.toHexString()`. Tests use string keys. |
| `args.tsdict` keyed by docId string vs ObjectId | After serialization, all keys are strings. Type the field as `Record<string, ContestStatusDoc>`. |
| `KNOWN_RULES` may go stale if backend adds a rule | Document the list as a soft mirror; **manual sync requirement** noted in code. Adding a new rule only requires updating this file and `lib/rule-text.ts` — no backend changes. URL filtering via `?rule=<new>` still works without UI showing it in the dropdown. |
| Hero banner links open in same tab vs new tab | `<Link>` opens same tab — matches ui-default. No target change. |
| Perm parsing wrong if backend changes `BigInt::` format | The `hasPerm` helper does **string match** first, then `BigInt` parse — if format changes, returns false (safe default). Comments call out the assumption. |
| PERM bit indices in `perm-constants.ts` wrong | Plan review explicitly cross-references `packages/hydrooj/src/model/builtin.ts`. If any bit is wrong, `PERM_CREATE_CONTEST` won't show when it should (or will show when it shouldn't). Verified in `perms.test.ts` with `BigInt::64` (= `0b1000000`). |
| Light theme hero gradient looks washed out | Light overrides use `--text → --text-soft` (neutral gray) per the existing `tokens.css` rule "Components MUST use these variables instead of hardcoded rgba() so the light theme can remap them to neutral monochrome." Visual regen catches this. |
| tsdict missing/empty when not logged in | `tsdict[docId]` returns `undefined`; `attended === 1` is false; "已报名" chip hidden. Tests cover this. |
| ObjectId parse fails if backend returns invalid string | `new Date(...)` returns `Invalid Date` whose `getTime()` is NaN. `isOngoing/Upcoming/Done` then short-circuit `false`. Safe degenerate. |
| `PENDING_HTML` shown on first prod build | Index.ts renders `PENDING_HTML` if `public/index.html` not present — only happens before first prod build, not relevant to dev workflow. |

## 15. Implementation order (for writing-plans)

1. `lib/perm-constants.ts`, `lib/perms.ts` + tests.
2. `lib/contest-flags.ts` + test.
3. Append token block to `styles/tokens.css`.
4. Append i18n keys to catalog.
5. `pages/contest_main.module.css` (full).
6. `pages/contest_main.tsx` (with inline components).
7. `pages/index.ts` add `registerPage('contest_main', …)`.
8. `pages/contest_main.test.tsx`.
9. Visual baseline regen for `/contest` (dark + light).
10. Build + test + smoke test.
11. Commit + (optional) PR.
