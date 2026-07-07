# ui-next Homepage Data Migration — Design Spec

**Date:** 2026-07-07
**Status:** Draft (post-brainstorming, pre-implementation)
**Owner:** @hydro-dev
**Scope:** `packages/ui-next` only — no backend changes

---

## 1. Context

The current `packages/ui-next/src/pages/homepage.tsx` is a 50-line demo: a hardcoded "Hydro" hero card, three hardcoded `SAMPLE` problems, a hardcoded author, hardcoded contest list, hardcoded tags. It does not consume any of the data the backend passes to the SPA. The `'next'` renderer (`packages/ui-next/index.ts`) serializes the full `args` object (the handler's `this.response.body`) into `__HYDRO_INJECTION__`, so all the data the homepage needs is already in memory at render time — it just isn't being read.

Meanwhile `packages/ui-default` ships a real homepage driven by a server-side widget system:
- `hydrooj.homepage` YAML setting declares columns of named sections.
- `HomeHandler.get()` (`packages/hydrooj/src/handler/home.ts:147-178`) iterates that config, calls a `get<SectionName>(domainId, limit)` method per section, and returns `{ contents, udict, domain }` as `response.body`.
- `templates/main.html` is a dispatcher that includes `partials/homepage/<name>.html` per section.

13 section partials exist: `bulletin, contest, discussion, discussion_nodes, error, hitokoto, homework, problem_search, ranking, recent_problems, starred_problems, suggestion, training`. The default config is a 2-column (9+3) layout using 10 of them.

The goal of this work is to make ui-next's homepage a real, data-driven page that mirrors what ui-default shows, while keeping the slot/plugin architecture (so addons can extend) and the dark/light themed design system (already shipped in the prior style-refactor plan).

## 2. Decisions log (from brainstorming)

| Decision | Choice | Why |
|---|---|---|
| Scope | **Full parity** | User asked for real data, not demo. Section registry + all 13 section types. |
| Markdown for `domain.bulletin` | **Add `marked`** | No i18n/markdown/date library present. `marked` is ~30KB gz, Vite tree-shakes. |
| Where to do data transformation | **Client-side only** | Matches the prior plan's "no backend changes" principle. Backend stays untouched. |
| Section dispatch architecture | **Reuse `defineSlot`** | Built into the existing registry. Addons extend by `defineSlot('homepage:section:<name>', Comp)`. Interceptors (before/after/wrap/replace) come for free. |
| `hitokoto` content | **Static rotation** | Hardcode 3-5 Chinese hitokoto strings, pick one at render. 0 deps. |
| Unknown section handling | **Show error placeholder** | Matches `ui-default`'s `error.html` partial. Admin sees that their config is unsupported. |
| i18n | **Hardcoded Chinese** | Matches existing `problem_main.tsx` pattern. No i18n library. |
| Dep additions | **`marked` only** | Date formatting via native `Intl.DateTimeFormat`. Avatar via ported providers map. |

## 3. Architecture

### Section registry

A thin wrapper over the existing `defineSlot` system, scoped to the `homepage:section:<name>` slot key prefix.

```
SectionSlot (consumer)
  └─ for each [name, payload] in args.contents[*].sections[*]
       └─ look up homepage:section:<name> in slot store
            ├─ found → render with <Section payload={...} udict={...} domain={...}/>
            └─ not found → render <ErrorSection name={name} payload={payload}/>

Section components (producers)
  └─ 13 default components, each registered via defineSlot('homepage:section:<name>', Comp)
       └─ imported by src/sections/index.ts, which is imported by src/pages/homepage.tsx
```

The slot store (`packages/ui-next/src/registry/store.ts`) already supports pubsub via `useSyncExternalStore` and HMR persistence — `SectionSlot` subscribes to changes so plugin-installed sections appear without remounting the page.

### Column layout

`args.contents` is `[{ width, sections: [[name, payload], ...] }, ...]`. The width is a number (`9` or `3` in the default config; could be any positive integer for custom configs). The simplest faithful layout is **flex** with each column sized proportionally:

```css
.columns { display: flex; gap: var(--space-5); }
.column { display: flex; flex-direction: column; gap: var(--space-5); }
/* Each column gets flex-grow = column.width. Total widths: 9+3 → 75%/25% split. */
```

For the default 2-column case this gives a 9:3 ratio. For custom configs (3 columns, 4+3+3, etc.) the same `flex-grow` approach generalizes.

### Data flow

```
HomeMainHandler.get()                 [backend, unchanged]
  └─ response.body = { contents, udict, domain }

'next' renderer                       [packages/ui-next/index.ts, unchanged]
  └─ JSON.stringify({ ..., args: { UserContext, UiContext, ...args } }, serializer)

__HYDRO_INJECTION__                   [inline <script>]
  └─ globals.ts initialPage

PageDataProvider                      [src/context/page-data.tsx]
  └─ usePageData() returns { name, template, args: { UserContext, UiContext, contents, udict, domain, ... } }

Homepage()                            [src/pages/homepage.tsx, REWRITTEN]
  └─ for each column in args.contents:
       └─ for each [name, payload] in column.sections:
            └─ <SectionSlot name="homepage:section:{name}" payload={payload} udict={udict} domain={domain}/>

SectionSlot                           [src/registry/sections.tsx, NEW]
  └─ useSyncExternalStore on slot name
  └─ if default exists → render
  └─ else → <ErrorSection name={name} payload={payload}/>
```

### Per-section payload shapes

| Section | Payload | Source |
|---|---|---|
| bulletin | (uses `domain.bulletin: string`) | `DomainDoc.bulletin` |
| contest | `[tdocs, tsdict]` | `HomeHandler.getContest()` |
| homework | `[htdocs, htsdict]` | `HomeHandler.getHomework()` |
| training | `[tdocs, tsdict]` | `HomeHandler.getTraining()` |
| discussion | `[ddocs, vndict]` | `HomeHandler.getDiscussion()` |
| ranking | `uid[]` (flat array) | `HomeHandler.getRanking()` |
| starred_problems | `[pdocs]` (single-element tuple) | `HomeHandler.getStarredProblems()` |
| recent_problems | `[pdocs, psdict]` | `HomeHandler.getRecentProblems()` |
| discussion_nodes | `vnodes: Document[]` | `HomeHandler.getDiscussionNodes()` |
| hitokoto | (none) | Static rotation |
| suggestion | (none) | Static links |
| problem_search | (none) | Static form |
| error | `string` (error message from handler) | `HomeHandler.get()` catches |

A section tuple can also be `['error', errorMessage]` if the corresponding `get*()` throws. The page loop treats this the same as a regular tuple but `ErrorSection` reads the error message.

## 4. Components

### `src/registry/sections.tsx`

The dispatcher. Single file, ~50 LOC.

```tsx
import { Suspense } from 'react';
import { useSyncExternalStore } from 'react';
import { store } from './store';
import { SlotErrorBoundary } from './error-boundary';
import { ErrorSection } from '../sections/ErrorSection';
import type { SectionProps } from '../sections/types';

const slotName = (name: string) => `homepage:section:${name}` as const;

export function SectionSlot({ name, payload, udict, domain }: SectionProps) {
  const subscribe = (cb: () => void) => store.subscribe(slotName(name), cb);
  const getSnapshot = () => store.getVersion(slotName(name));
  useSyncExternalStore(subscribe, getSnapshot);

  const Section = store.getDefault(slotName(name)) as React.FC<SectionProps> | undefined;
  if (!Section) {
    return <ErrorSection name={name} payload={payload} udict={udict} domain={domain} />;
  }
  return (
    <SlotErrorBoundary slotName={slotName(name)} label="section">
      <Suspense fallback={null}>
        <Section name={name} payload={payload} udict={udict} domain={domain} />
      </Suspense>
    </SlotErrorBoundary>
  );
}
```

### `src/sections/types.ts`

```ts
export interface SerializedUser {
  _id: number;
  uname: string;
  avatar?: string;          // provider spec: 'gravatar:email' | 'github:user' | 'qq:num' | 'url:href' | 'file:href'
  avatarUrl?: string;       // rarely set on list users; prefer avatarUrl(udoc.avatar) from lib/avatar
  rp?: number;              // from public fields, only when FLAG_PUBLIC
  level?: number;
  bio?: string;
  displayName?: string;
  perm: string;             // 'BigInt::12345' format
}

export interface SerializedTdoc {
  _id: string;              // ObjectId hex
  docId: string;            // ObjectId hex
  title: string;
  rule: string;
  beginAt: string;          // ISO
  endAt: string;            // ISO
  penaltySince?: string;    // ISO (homework)
  lockAt?: string;          // ISO
  duration?: number;        // hours
  attend?: number;
  pids?: number[];
  dag?: Array<{ pids: number[] }>;  // training
  rated?: boolean;
  hidden?: boolean;
}

export interface SerializedPdoc {
  _id: string;              // ObjectId hex
  docId: number;            // numeric
  pid: string;
  title: string;
  tag?: string[];
  nSubmit?: number;
  nAccept?: number;
}

export interface SerializedDdoc {
  _id: string;
  docId: string;
  title: string;
  updateAt: string;         // ISO
  owner: number;
  nReply?: number;
  views?: number;
  pin?: boolean;
  highlight?: boolean;
  parentType?: number;
  parentId?: string | number;
}

export interface SerializedDomain {
  _id: string;
  bulletin?: string;        // raw markdown
  avatar?: string;
  host?: string[];
}

export interface SectionProps {
  name: string;
  payload: any;
  udict: Record<number, SerializedUser>;
  domain: SerializedDomain;
}
```

### `src/sections/index.ts`

```ts
import { defineSlot } from '../registry/slot';
import { BulletinSection } from './BulletinSection';
import { ContestSection } from './ContestSection';
import { HomeworkSection } from './HomeworkSection';
import { TrainingSection } from './TrainingSection';
import { DiscussionSection } from './DiscussionSection';
import { RankingSection } from './RankingSection';
import { StarredProblemsSection } from './StarredProblemsSection';
import { RecentProblemsSection } from './RecentProblemsSection';
import { DiscussionNodesSection } from './DiscussionNodesSection';
import { HitokotoSection } from './HitokotoSection';
import { SuggestionSection } from './SuggestionSection';
import { ProblemSearchSection } from './ProblemSearchSection';
import { ErrorSection } from './ErrorSection';

defineSlot('homepage:section:bulletin', BulletinSection);
defineSlot('homepage:section:contest', ContestSection);
defineSlot('homepage:section:homework', HomeworkSection);
defineSlot('homepage:section:training', TrainingSection);
defineSlot('homepage:section:discussion', DiscussionSection);
defineSlot('homepage:section:ranking', RankingSection);
defineSlot('homepage:section:starred_problems', StarredProblemsSection);
defineSlot('homepage:section:recent_problems', RecentProblemsSection);
defineSlot('homepage:section:discussion_nodes', DiscussionNodesSection);
defineSlot('homepage:section:hitokoto', HitokotoSection);
defineSlot('homepage:section:suggestion', SuggestionSection);
defineSlot('homepage:section:problem_search', ProblemSearchSection);
defineSlot('homepage:section:error', ErrorSection);
```

### `src/sections/<Name>Section.tsx`

Each section follows the same skeleton (example for `ContestSection`):

```tsx
import { Card } from '../components/primitives/Card';
import { Chip } from '../components/primitives/Chip';
import { Link } from '../components/link';
import { formatDate } from '../lib/datetime';
import { isOngoing, isUpcoming, renderDuration } from '../lib/contest-status';
import { ruleText } from '../lib/rule-text';
import type { SectionProps, SerializedTdoc } from './types';

export function ContestSection({ payload }: SectionProps) {
  const [tdocs = [], tsdict = {}] = Array.isArray(payload) ? payload : [[], {}];
  if (!tdocs.length) return null;

  return (
    <Card variant="default" header={<h3 className={styles.header}>比赛</h3>}>
      <ol className={styles.list}>
        {tdocs.map((tdoc: SerializedTdoc) => {
          const ongoing = isOngoing(tdoc);
          const upcoming = isUpcoming(tdoc);
          return (
            <li key={tdoc.docId} className={styles.item}>
              <div className={styles.dateBlock}>
                <div className={styles.dateDay}>{formatDate(tdoc.beginAt, { day: 'numeric' })}</div>
                <div className={styles.dateMonth}>{formatDate(tdoc.beginAt, { year: 'numeric', month: '2-digit' })}</div>
              </div>
              <div className={styles.body}>
                <Link to="contest_detail" params={{ tid: tdoc.docId }} className={styles.title}>{tdoc.title}</Link>
                <ul className={styles.meta}>
                  <li><Chip variant="tag">{ruleText(tdoc.rule)}</Chip></li>
                  {tdoc.rated && <li><Chip variant="diff">Rated</Chip></li>}
                  <li>{renderDuration(tdoc)} 小时</li>
                  <li>{tdoc.attend ?? 0} 人</li>
                  {ongoing && <li><Chip variant="diff">进行中</Chip></li>}
                  {upcoming && <li><Chip variant="tag">未开始</Chip></li>}
                  {tsdict[tdoc.docId]?.attend === 1 && <li><Chip>已报名</Chip></li>}
                </ul>
              </div>
            </li>
          );
        })}
      </ol>
      <div className={styles.footer}>
        <Link to="contest_main" className={styles.more}>更多 →</Link>
      </div>
    </Card>
  );
}
```

### Per-section content summary

| Section | Primary UI | Reused components |
|---|---|---|
| BulletinSection | `<Markdown source={domain.bulletin}/>` inside a `Card` | `Card`, `Markdown` |
| ContestSection | `Card` + `<ol>` of date numbox + title + meta chips | `Card`, `Chip`, `Link` |
| HomeworkSection | Same shape as Contest, with `penaltySince` as date and "Claimed" / "Pending" status | `Card`, `Chip`, `Link` |
| TrainingSection | Date numbox replaced by enrolled count numbox; progress shown via `Ring` | `Card`, `Chip`, `Ring`, `Link` |
| DiscussionSection | List of `<li>`: title + author `Avatar` + node `Chip` + timeAgo | `Card`, `Avatar`, `Chip`, `Link` |
| RankingSection | `<table>` with rank, `Author` (from sidebar), RP, bio | `Card`, `Avatar` (from primitives), `Link` |
| StarredProblemsSection | Compact problem list (pid + title, no tags) | `Card`, `Link` |
| RecentProblemsSection | Compact problem list + timeAgo from ObjectId | `Card`, `Link` |
| DiscussionNodesSection | `TagCloud`-style list grouped by `content` category | `Card`, `Link` |
| HitokotoSection | `Card` + title + one of N hardcoded strings | `Card` |
| SuggestionSection | `Card` + grouped chip links (中文/English/Tools) | `Card`, `Link` |
| ProblemSearchSection | `Card` + `<form method="get" action="/p">` with `<input name="q">` | `Card` |
| ErrorSection | `Card` with red border + title "Section '{name}' not implemented" | `Card` |

## 5. Library code

All in `packages/ui-next/src/lib/`. Pure functions, no React deps (except the `Avatar` component wrapper and `<Markdown/>`).

### `lib/avatar.tsx`

Port of `packages/hydrooj/src/lib/avatar.ts` providers map.

```ts
const providers: Record<string, (value: string, size: number) => string> = {
  gravatar: (email, size) => `https://www.gravatar.com/avatar/${md5(email.toLowerCase())}?s=${size}&d=identicon`,
  github: (user) => `https://github.com/${user}.png?size=${size}`,
  qq: (num) => `https://q1.qlogo.cn/g?b=qq&nk=${num}&s=${size}`,
  url: (href) => href,
  file: (href) => href,
};

export function avatarUrl(spec: string | undefined, size = 64): string | null {
  if (!spec) return null;
  const [provider, ...rest] = spec.split(':');
  const value = rest.join(':');
  const fn = providers[provider];
  return fn ? fn(value, size) : null;
}

export function Avatar({ spec, name, size = 40 }: { spec?: string; name?: string; size?: number }): JSX.Element {
  const url = avatarUrl(spec, size);
  if (url) return <img className={styles.img} src={url} width={size} height={size} alt={name ?? ''} loading="lazy" />;
  return <PrimAvatar name={name} size={size} />;  // fallback to existing primitives/Avatar
}
```

Note: requires `md5`. The server uses Node's `crypto.createHash('md5')`. In the browser we inline a JS MD5 implementation (~50 lines, no new dep). Tests verify the gravatar URL against a known email hash.

### `lib/contest-status.ts`

```ts
import type { SerializedTdoc } from '../sections/types';

export function isOngoing(t: SerializedTdoc, now = Date.now()): boolean {
  const begin = new Date(t.beginAt).getTime();
  const end = new Date(t.endAt).getTime();
  return begin <= now && now < end;
}
export function isUpcoming(t: SerializedTdoc, days = 7, now = Date.now()): boolean {
  const begin = new Date(t.beginAt).getTime();
  return now < begin && now >= begin - days * 86400_000;
}
export function isDone(t: SerializedTdoc, now = Date.now()): boolean {
  return now >= new Date(t.endAt).getTime();
}
export function isExtended(t: SerializedTdoc, now = Date.now()): boolean {
  if (!t.penaltySince) return false;
  return now > new Date(t.penaltySince).getTime() && now < new Date(t.endAt).getTime();
}
export function renderDuration(t: SerializedTdoc): string {
  if (t.duration) return Number(t.duration).toFixed(1);
  if (!t.beginAt || !t.endAt) return '?';
  const hours = (new Date(t.endAt).getTime() - new Date(t.beginAt).getTime()) / 3600_000;
  return hours.toFixed(1);
}
export function statusText(t: SerializedTdoc, status?: { attend?: number; enroll?: number; done?: boolean; donePids?: string[]; totalPids?: number }): string {
  if (isDone(t)) return '已结束';
  if (isOngoing(t)) return '进行中';
  if (isUpcoming(t)) return '未开始';
  if (status?.enroll && status?.done) return '已完成';
  if (status?.enroll) return '进行中';
  return '未开始';
}
```

### `lib/datetime.tsx`

```ts
export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit' }): string {
  return new Intl.DateTimeFormat('zh-CN', opts).format(new Date(iso));
}
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}
export function timeAgo(iso: string, now = Date.now()): string {
  const diff = now - new Date(iso).getTime();
  const rtf = new Intl.RelativeTimeFormat('zh-CN', { numeric: 'auto' });
  if (diff < 60_000) return rtf.format(-Math.round(diff / 1000), 'second');
  if (diff < 3600_000) return rtf.format(-Math.round(diff / 60_000), 'minute');
  if (diff < 86400_000) return rtf.format(-Math.round(diff / 3600_000), 'hour');
  if (diff < 30 * 86400_000) return rtf.format(-Math.round(diff / 86400_000), 'day');
  if (diff < 365 * 86400_000) return rtf.format(-Math.round(diff / (30 * 86400_000)), 'month');
  return rtf.format(-Math.round(diff / (365 * 86400_000)), 'year');
}
export function objectIdTime(hex: string): number {
  return parseInt(hex.slice(0, 8), 16) * 1000;
}
```

### `lib/markdown.tsx`

```tsx
import { useMemo } from 'react';
import { marked } from 'marked';
import styles from './markdown.module.css';

export function Markdown({ source }: { source: string }): JSX.Element {
  const html = useMemo(() => marked.parse(source, { async: false, breaks: true }) as string, [source]);
  return <div className={styles.markdown} dangerouslySetInnerHTML={{ __html: html }} />;
}
```

`marked` v14 has built-in defaults; we trust `domain.bulletin` is admin-authored (not user-submitted) so no sanitization is added. CSS in `markdown.module.css` reuses the typography rules from `Article.module.css` (copy to keep module CSS localized).

### `lib/rule-text.ts`

```ts
const RULE_TEXT: Record<string, string> = {
  acm: 'XCPC',
  oi: 'OI',
  ioi: 'IOI',
  strictioi: 'IOI(Strict)',
  ledo: 'Ledo',
  homework: '作业',
};
export function ruleText(rule: string): string {
  return RULE_TEXT[rule] ?? rule;
}
```

## 6. Test strategy

8 new vitest test files + 1 visual regression baseline regen.

| Test file | Coverage |
|---|---|
| `src/lib/avatar.test.tsx` | `avatarUrl()` for `gravatar`, `github`, `qq`, `url`, `file`, `''` (returns null), unknown provider; `Avatar` fallback to initials when spec missing |
| `src/lib/contest-status.test.ts` | `isOngoing` / `isUpcoming` / `isDone` / `isExtended` / `renderDuration` / `statusText` — table-driven, mock `Date.now()` |
| `src/lib/datetime.test.ts` | `formatDate`, `formatDateTime`, `timeAgo` (sec/min/hr/day/month/year buckets), `objectIdTime` |
| `src/lib/rule-text.test.ts` | `ruleText()` for 6 known rules + unknown returns input |
| `src/sections/ContestSection.test.tsx` | Renders 1 contest row, status chip (ongoing/upcoming/done), empty payload returns null, "More" link to `contest_main` |
| `src/sections/RankingSection.test.tsx` | Table row, avatar (from spec), RP number, bio text |
| `src/sections/RecentProblemsSection.test.tsx` | Renders pid + title, timeAgo from objectIdTime |
| `src/pages/homepage.test.tsx` | **Integration**: mock `args.contents` with 2 columns × 3 sections each (including 1 unknown to trigger ErrorSection); assert `TopNav`, column count, section count, `ErrorSection` placeholder text |

Test conventions:
- Wrap with `PageDataProvider` (pattern from `use-build-url.test.tsx:15-26`).
- Use `screen.getByRole` / `getByText`, **not** className queries.
- Mock `Date.now()` for time-sensitive assertions.
- No snapshot tests in this PR (visual regression covers the screenshot layer; component tests focus on behavior).

Visual regression:
- `e2e/visual.spec.ts` already lists `{ name: 'homepage', path: '/' }` — baselines are stale because the page is currently a placeholder.
- After implementation: `yarn workspace @hydrooj/ui-next test:visual:update` to regenerate.
- CI: `yarn workspace @hydrooj/ui-next test:visual` should now pass with new baselines.

## 7. File inventory

### New files (28)

```
packages/ui-next/src/
├── registry/
│   └── sections.tsx
├── sections/
│   ├── types.ts
│   ├── index.ts
│   ├── BulletinSection.tsx
│   ├── BulletinSection.module.css
│   ├── ContestSection.tsx
│   ├── ContestSection.module.css
│   ├── HomeworkSection.tsx
│   ├── HomeworkSection.module.css
│   ├── TrainingSection.tsx
│   ├── TrainingSection.module.css
│   ├── DiscussionSection.tsx
│   ├── DiscussionSection.module.css
│   ├── RankingSection.tsx
│   ├── RankingSection.module.css
│   ├── StarredProblemsSection.tsx
│   ├── StarredProblemsSection.module.css
│   ├── RecentProblemsSection.tsx
│   ├── RecentProblemsSection.module.css
│   ├── DiscussionNodesSection.tsx
│   ├── DiscussionNodesSection.module.css
│   ├── HitokotoSection.tsx
│   ├── HitokotoSection.module.css
│   ├── SuggestionSection.tsx
│   ├── SuggestionSection.module.css
│   ├── ProblemSearchSection.tsx
│   ├── ProblemSearchSection.module.css
│   ├── ErrorSection.tsx
│   └── ErrorSection.module.css
├── lib/
│   ├── avatar.tsx
│   ├── avatar.module.css
│   ├── contest-status.ts
│   ├── datetime.tsx
│   ├── markdown.tsx
│   ├── markdown.module.css
│   └── rule-text.ts
├── styles/
│   └── homepage.module.css
```

### New test files (8)

```
packages/ui-next/src/
├── lib/
│   ├── avatar.test.tsx
│   ├── contest-status.test.ts
│   ├── datetime.test.ts
│   └── rule-text.test.ts
├── sections/
│   ├── ContestSection.test.tsx
│   ├── RankingSection.test.tsx
│   └── RecentProblemsSection.test.tsx
└── pages/
    └── homepage.test.tsx
```

### Modified files (3)

```
packages/ui-next/
├── package.json                                # add `marked` runtime dep
├── src/pages/
│   ├── homepage.tsx                            # REWRITE — consume args.contents, dispatch via SectionSlot
│   └── index.ts                                # add `import '../sections'` to trigger registration
└── e2e/__snapshots__/homepage-{dark,light}.png # REGENERATE via test:visual:update
```

### Untouched (explicitly)

- `packages/hydrooj/src/handler/home.ts` — backend, user-confirmed client-side only
- `packages/hydrooj/setting.yaml` — same
- `packages/hydrooj/src/model/contest.ts` — RULES object not needed in client
- `packages/ui-next/index.ts` — Cordis plugin, renderer contract unchanged
- `packages/ui-next/src/app.tsx`, `main.tsx`, `theme/*` — wiring unchanged
- All 18 existing primitives/nav/sidebar/charts/ide/article components
- All 22 existing vitest tests
- The 4 existing Playwright visual specs (will pass with regenerated baselines)

## 8. Verification

1. **Type + build**:
   ```bash
   yarn workspace @hydrooj/ui-next build
   ```
   Must produce 0 TypeScript errors. Vite build must complete.

2. **Unit tests**:
   ```bash
   yarn workspace @hydrooj/ui-next test
   ```
   Old 22 + new ~25 = ~47 tests, all green.

3. **Visual baseline regen**:
   ```bash
   yarn workspace @hydrooj/ui-next build
   yarn workspace @hydrooj/ui-next test:visual:update
   # Inspect e2e/__snapshots__/homepage-{dark,light}.png manually
   yarn workspace @hydrooj/ui-next test:visual
   ```

4. **End-to-end with backend**:
   ```bash
   yarn build
   yarn debug
   # Open http://localhost:2333/
   ```
   - 2-column homepage renders with 10 sections in the default config.
   - ThemeToggle persists across reload.
   - NavLinks navigate to `/p` (problem_main).
   - No console errors.

5. **CLAUDE.md**:
   Append to the `packages/ui-next` bullet:
   > "Supports 13 server-driven section types via the section registry; default config renders a 2-column homepage mirroring ui-default."

6. **Commit + PR**:
   ```bash
   git add packages/ui-next/
   git commit -m "feat(ui-next): data-driven homepage with 13 server-driven section types"
   ```

## 9. Out of scope

- **Backend changes** — `HomeHandler`, `setting.yaml`, `home_main.html` remain as-is. The migration is purely a renderer-side change.
- **Other pages** — problem_detail, record_main, contest_main, etc. are out of scope (matches the prior plan's §12).
- **i18n** — hardcoded Chinese strings, matching `problem_main.tsx`. No i18n library added.
- **New visual tokens** — sections reuse existing `--space-*`, `--text-*`, `--radius-*`, `--border*`, `--cyan`, `--violet`, `--text-soft`, `--text-mute`. No new CSS variables.
- **Data prefetching / SWR** — pure SSR + client React render. No client-side refetching.
- **Performance optimizations** — no `React.memo` / `useMemo` on section list (each section is small). Add later if profiling shows it.
- **Animation library** — no Framer Motion. Use CSS transitions only, matching the existing style system.
- **Section-level interceptors in addons** — possible future work. Addons can already `defineSlot('homepage:section:<name>', Comp)` to replace. The interceptor chain works automatically but no docs / examples yet.

## 10. Risks and mitigations

| Risk | Mitigation |
|---|---|
| `marked` adds bundle weight | ~30KB gz; Vite tree-shakes unused features; acceptable |
| `domain.bulletin` is untrusted | Admin-authored only; `dangerouslySetInnerHTML` risk in practice is low; document that this assumes admin trust |
| ObjectId hex parsing wrong on time zones | `objectIdTime` uses UTC; `formatDate` uses 'zh-CN' which is local; documented in code |
| `perm` is a `"BigInt::..."` string | Sections don't currently check perm; if needed, add a `parsePerm(s: string): bigint` helper. Not required for default sections. |
| `Avatar` fallback to initials | Already covered by primitives/Avatar; no new fallback path |
| `tsdict[tdoc.docId]` is keyed by hex string not number | Documented in code; sections index by `tdoc.docId` (string) |
| Section receives unexpected payload shape | Defensive: `Array.isArray(payload) ? payload : [[], {}]` pattern in each section |
| Hitokoto hardcoded Chinese doesn't match user locale | Out of scope; matches existing `problem_main.tsx` precedent |
| `addons` add sections at runtime | Slot store's pubsub already triggers re-render via `useSyncExternalStore` |
| `marked` parse on large bulletin blocks main thread | `useMemo` cache; switch to `marked.parse` async + Suspense if real-world bulletins are huge (likely not) |

## 11. Implementation order (for the writing-plans phase)

1. Lib code (avatar, contest-status, datetime, rule-text) + their unit tests. Verified independently before sections depend on them.
2. `lib/markdown.tsx` (after `marked` is installed) + 1 small test.
3. Section types (`sections/types.ts`).
4. `ErrorSection` (simplest, no payload).
5. Static sections: `HitokotoSection`, `SuggestionSection`, `ProblemSearchSection` (no payload).
6. List sections with simple payload: `StarredProblemsSection`, `RecentProblemsSection`, `DiscussionNodesSection`.
7. List sections with rich payload: `ContestSection`, `HomeworkSection`, `TrainingSection`, `DiscussionSection`, `RankingSection`.
8. `BulletinSection` (last because it depends on `Markdown`).
9. `sections/index.ts` registering all 13.
10. `registry/sections.tsx` (`SectionSlot`).
11. `pages/homepage.tsx` rewrite.
12. `pages/index.ts` add `import '../sections'`.
13. `pages/homepage.test.tsx` integration test.
14. Visual baseline regen.
15. CLAUDE.md update.
16. Final build + `yarn test` + smoke test in `yarn debug`.
