# SP8 Admin Backend Migration — Completion Report

**Date:** 2026-07-31
**Branch:** `master`
**Status:** DONE

## Summary

SP8 migrated 7 `manage_*` admin backend pages from `ui-default` templates to the `ui-next` SPA. All 7 implementation tasks landed and passed their task review (with 3 follow-up fix commits addressing reviewer findings). Targeted tests, full vitest, and lint are green except for one pre-existing, unrelated failure that has been carried forward since SP5.

## Page Inventory

| Page                | Template                          | Status | Test file                       | Test count |
| ------------------- | --------------------------------- | ------ | ------------------------------- | ---------- |
| manage_base         | manage_base.html                  | DONE   | manage_base.test.tsx            | 3          |
| manage_config       | manage_config.html                | DONE   | manage_config.test.tsx          | 5          |
| manage_dashboard    | manage_dashboard.html             | DONE   | manage_dashboard.test.tsx       | 9          |
| manage_script       | manage_script.html                | DONE   | manage_script.test.tsx          | 9          |
| manage_setting      | manage_setting.html               | DONE   | manage_setting.test.tsx         | 9          |
| manage_user_import  | manage_user_import.html           | DONE   | manage_user_import.test.tsx     | 9          |
| manage_user_priv    | manage_user_priv.html             | DONE   | manage_user_priv.test.tsx       | 14         |

**Total page tests:** 58

### Shared components reused (from SP7)

| Component    | Path                                     | Used by            |
| ------------ | ---------------------------------------- | ------------------ |
| MemberTable  | `src/components/domain/MemberTable.tsx`  | manage_user_priv   |
| RoleSelector | `src/components/domain/RoleSelector.tsx` | manage_user_priv   |

## Wiring

```
packages/ui-next/src/pages/manifest.ts |   7 +++++++
packages/ui-next/src/pages/index.ts    |   7 +++++++
```

All 7 `manage_*.html` entries added to both `NEXT_PAGES` and `registerPage`. No `email` / `pjax` / partial fragments — verified by `manifest.test.ts` PASS.

## Commits (9 total — 7 features + 2 fixes; 1 fix absorbed into Task 6)

```
5bc523dc feat(ui-next): add manage_user_priv page (SP8 task 7)
834f7e73 fix(ui-next): address Task 6 review finding (truthful local preview counts)
e6f44d79 feat(ui-next): add manage_user_import page (SP8 task 6)
3fba4d7e feat(ui-next): add manage_setting page (SP8 task 5)
2edf8f7a feat(ui-next): add manage_script page (SP8 task 4)
f15319d2 feat(ui-next): add manage_dashboard page (SP8 task 3)
3771c1f3 fix(ui-next): address Task 2 review findings (drop dead onClick, add field-count assertions)
3ad9e3db feat(ui-next): add manage_config page (SP8 task 2)
00f63a3c fix(ui-next): align manage_base nav with production ControlPanel + correct URLs (SP8 task 1)
692f7b8a feat(ui-next): add manage_base page (SP8 task 1)
```

Base: `b6c0d8e9` → Head: `5bc523dc` (9 commits, 16 files, 1394 insertions).

## Defect Close Matrix (per page)

| Page                | Open defects | Closed | Notes |
| ------------------- | ------------ | ------ | ----- |
| manage_base         | 0            | n/a    | shell with corrected URLs + 6 items (was 7 originally, dropped per real ControlPanel) |
| manage_config       | 0            | n/a    | form with dead onClick removed + count assertions added |
| manage_dashboard    | 0            | n/a    | 4 stat cards + activities + Information + Restart (noop) |
| manage_script       | 0            | n/a    | 4-col table (ID/Description/Modified/Action) + noop Run |
| manage_setting      | 0            | n/a    | 3-col table (Key/Value/Action) + noop Edit |
| manage_user_import  | 0            | n/a    | truthful local preview (1 field) vs server preview (3 fields) |
| manage_user_priv    | 0            | n/a    | reuses SP7 MemberTable + RoleSelector |

## Test Results

### Targeted (8 files — 7 new pages + manifest drift)

```
 Test Files  8 passed (8)
      Tests  62 passed (62)
   Duration  714ms
```

(58 page tests + 4 manifest drift tests, all passing)

### Full vitest

```
 Test Files  1 failed | 188 passed (189)
      Tests  1 failed | 1402 passed (1403)
```

The 1 failure is `record_detail.test.tsx > does not emit postMessage for non-accepted statuses` — **pre-existing**, in the SP5/SP6/SP7 known-limitations list. Not introduced by SP8.

### Lint

```
$ npx eslint packages/ui-next/src/pages/manage_*.tsx packages/ui-next/src/pages/manifest.ts packages/ui-next/src/pages/index.ts
```

Exit 0, 0 errors, 0 warnings on all SP8-touched files.

## Review Findings Closed

### Fixed in this branch (3 follow-up commits)

1. **Task 1 — manage_base**: URL mismatch (`/manage/user_import` → `/manage/userimport`, `/manage/user_priv` → `/manage/userpriv`) + dropped fictional 7th "Disabled" link to match real production ControlPanel (6 items).
2. **Task 2 — manage_config**: Removed dead `onClick` on Save button (form `onSubmit preventDefault` was the active handler) + added field-count regression assertions.
3. **Task 6 — manage_user_import**: Split `LocalPreview` (1 field, "Detected: N line(s)") from `PreviewSummary` (3 fields Total/Valid/Invalid) so the local noop preview doesn't lie about "Invalid: 0".

### Recorded for final review (Minor — all 7 pages)

- **Task 3 (manage_dashboard)**: Messages section goes beyond brief; `formatActivityTime` renders ISO 8601 in `<time>` text; `data-level` + class duplicate state; empty-state regex overly permissive; `{stats[key] ?? 0}` silently coerces undefined to 0.
- **Task 4 (manage_script)**: 4-column table vs. brief's 3 (extra Modified column); empty-arrow noop with comment slightly noisy; hard-coded English strings; `entry.description || 'None'` treats empty string as missing; `description: undefined as unknown as string` cast awkward.
- **Task 5 (manage_setting)**: type union excludes `image_radio` / `subType: 'yaml'`; no filtering of `family === 'setting_storage'` / `FLAG_HIDDEN`; only one "no value available" test case; `name`/`desc` never rendered.
- **Task 7 (manage_user_priv)**: MemberTable "Joined" column shows empty cell (not in source template); default role column header is literal `'default'`; only 2/4 cells asserted in bitmask test; test description doesn't assert uname in cells; `aria-label` replaces `name="select_user"`.

## File Layout

```
packages/ui-next/src/pages/
├── manage_base.tsx              (shell with 6-link sidebar)
├── manage_base.test.tsx         (3 tests, count + URL checks)
├── manage_config.tsx            (form + noop save)
├── manage_config.test.tsx       (5 tests, count + role checks)
├── manage_dashboard.tsx         (4 stat cards + activities + info)
├── manage_dashboard.test.tsx    (9 tests)
├── manage_script.tsx            (4-col data table)
├── manage_script.test.tsx       (9 tests)
├── manage_setting.tsx           (3-col settings table)
├── manage_setting.test.tsx      (9 tests)
├── manage_user_import.tsx       (form + truthful local preview + progress)
├── manage_user_import.test.tsx  (9 tests, LocalPreview vs PreviewSummary split)
├── manage_user_priv.tsx         (reuses MemberTable + RoleSelector)
└── manage_user_priv.test.tsx    (14 tests)
```

## Conventions Established (cross-SP8)

- **Args shape**: each page declares a narrow `Args` interface with only the fields it reads; `UserContext` / `UiContext` are optional forwarded-only fields.
- **Buttons**: noop via `type="button"` + empty `onClick` (outside any form) OR via form `onSubmit` `preventDefault` — never both simultaneously (Task 2 review rule).
- **Empty states**: every list/table has a `<p role="status">` empty state, discoverable to screen readers and to `getByRole` queries.
- **Count assertions**: every multi-row test pins the count via `getAllByRole('row'|'listitem'|'group'|...)` for regression protection.
- **Kebab-case BEM**: `manage-{name}` root, `manage-{name}__{slot}` and `manage-{name}__{slot}--{modifier}` modifiers.
- **No `ui-default/*` imports**: all pages pull only from `../context/*` and `../components/*` (including the reused SP7 domain components).

## Self-Review Against Plan's Checklist

- [x] **Spec coverage**: 7 manage pages + final review all mapped
- [x] **Placeholder scan**: no TBD/TODO/placeholder content in final code (the `/* inline edit is not wired in this view */` comments match the established SP7/8 pattern, accepted as precedent by Task 5 reviewer)
- [x] **Type consistency**: each page has its own `Args` interface; no shared union
- [x] **Global constraints**: exactly 7 lines added to `manifest.ts` and 7 lines to `index.ts`; no other files modified
- [x] **Commit checkpoints**: 9 commits — 7 feat + 2 fix (Task 6's fix absorbed into the 6-commit sequence; Task 1 and Task 2 each had separate fix commits)
- [x] **Risk Tier**: Task 7 (manage_user_priv) was correctly identified as the highest risk (component reuse); landed cleanly with no Critical/Important findings on review

## Follow-ups (for SP9+)

1. **Wire Save / Submit / Edit / Run handlers** for all 7 pages — all are noop placeholders pointing at the corresponding `handler/manage.ts` POST endpoints.
2. **Schema hydration** for `manage_config` — currently the page consumes a flat `Array<{ name, type, label?, default? }>`; the handler at `manage.ts:204` produces `Schema.intersect(...).toJSON()`.
3. **`manage_dashboard` stats hydration** — the `SystemDashboardHandler.get` (`manage.ts:81-84`) only sets the template; add `args.stats` and `args.activities` server-side.
4. **`manage_user_import` server preview POST** — wire the Preview button to `SystemUserImportHandler.post` (`manage.ts:246`).
5. **i18n sweep** — all 7 pages hard-code English strings (consistent with the SP7/8 sibling pattern).
6. **Filter hidden / `setting_storage` settings** in `manage_setting` (matches `partials/setting.html:2,8`).
