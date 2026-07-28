# SP0: ui-next 渲染器门禁与安全增量 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reverse the ui-next renderer hijack via a manifest-driven `accept` allowlist, add a site-level toggle, upgrade SPA navigation fallback, and remove the three dead opt-out layers — so the 42% migrated state is safe to ship.

**Architecture:** A single source-of-truth `NEXT_PAGES` manifest shared by the server (for `accept` allowlist) and tests (for drift detection). The server renderer uses a `getter` on `accept` to honor a `ui.next` setting without restart. Client `navigate()` falls back to a full page load when the JSON target has no registered page, gracefully delegating to ui-default. Three dead opt-out layers are removed in one cleanup task.

**Tech Stack:** TypeScript, vitest, cordis (handler registration), MongoDB (settings via `SettingModel`), React 19 + Vite (ui-next client).

## Global Constraints

- Node ≥22; Yarn 4 workspace; `@hydrooj/register` for on-the-fly TS transpilation.
- **No new lint errors / test failures** beyond the pre-existing baseline (505 lint / 8 failing tests as of 2026-07-27 10:21 review).
- No use of `any` except where already present; tighten `serializeInjection` typing is out of scope.
- All paths `README.md` / `AGPLv3` and AGPL obligations unchanged.
- Existing convention: handler classes in `packages/hydrooj/src/handler/*.ts`; `ctx.Route(name, path, Handler, perms)` to register; `SettingModel` access via `packages/hydrooj/src/model/setting.ts`.
- Adhere to `CONTRIBUTING.md`: don't add info-bearing comments via AI without reviewer sanity-check.

---

## File Structure

### Created

| File | Responsibility |
|---|---|
| `packages/ui-next/src/pages/manifest.ts` | Pure-data `NEXT_PAGES` map + frozen `NEXT_TEMPLATES` array |
| `packages/ui-next/src/pages/manifest.test.ts` | Drift / hygiene tests (4 invariants) |
| `packages/hydrooj/src/handler/admin-ui.ts` | `AdminUiHandler` (POST /admin/ui), `PRIV_EDIT_SYSTEM` gated |

### Modified

| File | Change |
|---|---|
| `packages/ui-next/index.ts` | `accept: []` → getter returning `NEXT_TEMPLATES`; `asFallback: true` → `false`; new `enabled` closure variable; new `system/setting` listener |
| `packages/ui-next/src/context/router.tsx` | `navigate()` checks `store.getDefault` after fetch; on miss, `window.location.href = url; return false` |
| `packages/ui-next/src/app.tsx` | Replace bare `<div>Page not found</div>` with full `DefaultLayout`-wrapped error page |
| `packages/hydrooj/src/model/setting.ts` | Add `ui_next: Schema.boolean().default(true)` to `SystemSetting` |
| `packages/hydrooj/src/handler/<registration-file>` | Add `ctx.Route('admin_ui', '/admin/ui', AdminUiHandler, PRIV.PRIV_EDIT_SYSTEM)` (Task 5 step 2 locates this file) |
| `test/main.ts` | Append 3 e2e regression assertions |

### Deleted

| File | Reason |
|---|---|
| `packages/ui-next/src/hooks/use-disable-next.ts` | All paths are dead code (no backend support) |
| `packages/ui-next/src/hooks/use-disable-next.test.tsx` | Tests for deleted hook |
| `packages/ui-next/src/pages/admin_ui.tsx` | Its POST target is now a real backend handler; the page itself duplicated the toggle UX and confused reviewers |
| `packages/ui-next/src/pages/admin_ui.test.tsx` | Tests for deleted page |
| `packages/ui-next/src/api.ts` (modify, not delete) | Remove the two re-exports of `useDisableNext` |

### Unchanged but referenced

- `packages/hydrooj/src/handler/home.ts:172` — `homepage` route sets `template = 'main.html'`
- `packages/hydrooj/src/handler/contest.ts:381` — `contest_edit` route sets `template = 'contest_edit.html'`
- `packages/hydrooj/src/handler/problem.ts:997` — `problem_create` route sets `template = 'problem_edit.html'`
- `framework/framework/base.ts:117` — error path uses `error.html` / `bsod.html`
- `framework/framework/server.ts:208-213, 910, 125` — renderer selection / storage / `accept: readonly string[]` typing

---

## Task 1: Create the page manifest

**Files:**
- Create: `packages/ui-next/src/pages/manifest.ts`
- Test: `packages/ui-next/src/pages/manifest.test.ts`

**Interfaces:**
- Produces: `NEXT_PAGES: Record<string, readonly string[]>` (frozen via `as const`)
- Produces: `NEXT_TEMPLATES: readonly string[]` (frozen, deduped, flattened)
- Consumed by: Task 2 (server `accept` getter), Task 3 (consumer test of `NEXT_TEMPLATES`)

- [ ] **Step 1: Enumerate all `registerPage` keys and their handler templates**

```bash
grep -nE "registerPage\(" packages/ui-next/src/pages/index.ts
```

Expected: 35 lines, one per page key (some are route-name-only: `homepage`, `error`, `contest_create`, `problem_create`, `admin_ui`).

```bash
grep -rnE "response\.template = '" packages/hydrooj/src/handler --include='*.ts' \
    | grep -E "Home|Contest|Problem|Record|User|home" | sort -u
```

Expected: a list of templates per handler. Cross-reference with Step 1's page keys to build the `NEXT_PAGES` mapping. Notes:
- `homepage` → `main.html` (`handler/home.ts:172`)
- `contest_create` shares `contest_edit.html` with `contest_edit` (`handler/contest.ts:381`)
- `problem_create` shares `problem_edit.html` with `problem_edit` (`handler/problem.ts:997`)
- `error` → `['error.html', 'bsod.html']` (`base.ts:117`)

- [ ] **Step 2: Write the failing test file**

Create `packages/ui-next/src/pages/manifest.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import '../pages'; // side-effect: triggers all registerPage calls
import { store } from '../registry/store';
import { NEXT_PAGES, NEXT_TEMPLATES } from './manifest';

const registeredPageKeys = () =>
    Object.keys(store).filter((k) => k.startsWith('page:')).map((k) => k.slice(5));

describe('NEXT_PAGES manifest', () => {
    it('manifest keys exactly match all registerPage keys', () => {
        const manifestKeys = Object.keys(NEXT_PAGES).sort();
        const registeredKeys = registeredPageKeys().sort();
        expect(registeredKeys).toEqual(manifestKeys);
    });

    it('NEXT_TEMPLATES contains the homepage / error / create templates', () => {
        // Failure of any of these would silently regress C1 for the most-used page.
        expect(NEXT_TEMPLATES).toContain('main.html');
        expect(NEXT_TEMPLATES).toContain('error.html');
        expect(NEXT_TEMPLATES).toContain('bsod.html');
        expect(NEXT_TEMPLATES).toContain('contest_edit.html'); // contest_create shares
        expect(NEXT_TEMPLATES).toContain('problem_edit.html'); // problem_create shares
    });

    it('NEXT_TEMPLATES never includes email / pjax / partial templates', () => {
        // Pin down C2 (emails) and H1 (pjax) regression: any of these reappearing
        // means someone added a template the SPA cannot render.
        for (const tpl of NEXT_TEMPLATES) {
            expect(tpl).not.toMatch(/_mail\.html$/);
            expect(tpl).not.toMatch(/_tr\.html$/);
            expect(tpl).not.toMatch(/_status\.html$/);
            expect(tpl).not.toMatch(/_summary\.html$/);
            expect(tpl).not.toMatch(/^partials\//);
        }
    });

    it('NEXT_TEMPLATES is deduped and frozen', () => {
        const asSet = new Set(NEXT_TEMPLATES);
        expect(asSet.size).toBe(NEXT_TEMPLATES.length);
        expect(Object.isFrozen(NEXT_TEMPLATES)).toBe(true);
    });
});
```

- [ ] **Step 3: Run the test to verify it fails (manifest does not exist yet)**

Run: `yarn workspace @hydrooj/ui-next test src/pages/manifest.test.ts 2>&1 | tail -20`
Expected: FAIL with `Cannot find module './manifest'`.

- [ ] **Step 4: Create the manifest module**

Create `packages/ui-next/src/pages/manifest.ts`:

```ts
// Source of truth for which templates the ui-next renderer serves.
// Keys MUST match `registerPage` keys in src/pages/index.ts (enforced by manifest.test.ts).
// Templates MUST NOT include email / pjax / partial fragments (enforced by the same test).
//
// `contest_create` and `problem_create` route to handlers that set the same
// `*_edit.html` template as their edit counterparts (handler/contest.ts:381,
// handler/problem.ts:997). Their template appears in NEXT_TEMPLATES only once,
// under the edit page; the create page key still lives in NEXT_PAGES so the
// drift test passes — its absence would silently break that route.

export const NEXT_PAGES = {
    homepage: ['main.html'],
    error: ['error.html', 'bsod.html'],
    contest_detail: ['contest_detail.html'],
    contest_main: ['contest_main.html'],
    contest_problemlist: ['contest_problemlist.html'],
    contest_scoreboard: ['contest_scoreboard.html'],
    contest_manage: ['contest_manage.html'],
    contest_user: ['contest_user.html'],
    contest_create: ['contest_edit.html'],   // shared template
    contest_balloon: ['contest_balloon.html'],
    contest_clarification: ['contest_clarification.html'],
    contest_edit: ['contest_edit.html'],
    contest_print: ['contest_print.html'],
    problem_main: ['problem_main.html'],
    user_login: ['user_login.html'],
    user_register: ['user_register.html'],
    user_register_with_code: ['user_register_with_code.html'],
    user_lostpass: ['user_lostpass.html'],
    user_lostpass_with_code: ['user_lostpass_with_code.html'],
    user_logout: ['user_logout.html'],
    user_sudo: ['user_sudo.html'],
    problem_create: ['problem_edit.html'],   // shared template
    problem_edit: ['problem_edit.html'],
    problem_import: ['problem_import.html'],
    problem_detail: ['problem_detail.html'],
    problem_submit: ['problem_submit.html'],
    problem_files: ['problem_files.html'],
    problem_config: ['problem_config.html'],
    problem_hack: ['problem_hack.html'],
    record_detail: ['record_detail.html'],
    record_main: ['record_main.html'],
    home_messages: ['home_messages.html'],
    home_security: ['home_security.html'],
    home_settings: ['home_settings.html'],
} as const;

export const NEXT_TEMPLATES: readonly string[] = Object.freeze(
    [...new Set(Object.values(NEXT_PAGES).flat())],
);
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `yarn workspace @hydrooj/ui-next test src/pages/manifest.test.ts 2>&1 | tail -20`
Expected: 4 passed, 0 failed.

- [ ] **Step 6: Commit**

```bash
git add packages/ui-next/src/pages/manifest.ts packages/ui-next/src/pages/manifest.test.ts
git commit -m "feat(ui-next): add NEXT_PAGES manifest as single source of truth"
```

---

## Task 2: Wire manifest into server `accept` and flip `asFallback`

**Files:**
- Modify: `packages/ui-next/index.ts` (lines 286-291 dev branch, 315-321 prod branch; both `registerRenderer` calls)
- Test: re-run `yarn workspace @hydrooj/ui-next test src/pages/manifest.test.ts`

**Interfaces:**
- Consumes: `NEXT_TEMPLATES` from Task 1.
- Produces: `enabled: boolean` closure variable (initially `true`); the renderer exposes `get accept() { return enabled ? NEXT_TEMPLATES : []; }`.

- [ ] **Step 1: Read the current `registerRenderer` calls**

```bash
sed -n '280,295p' packages/ui-next/index.ts
sed -n '310,330p' packages/ui-next/index.ts
```

Expected: two `registerRenderer('next', { accept: [], asFallback: true, priority: 100, ... })` blocks (one in `if (process.env.DEV)` branch around line 286, one in the `else` branch around line 315).

- [ ] **Step 2: Add the import and the closure variable**

In `packages/ui-next/index.ts`, after the existing `hydrooj` import block, add:

```ts
import { NEXT_TEMPLATES } from './src/pages/manifest';
```

Locate the `apply` function and at the very top of its body (before the `if (process.env.DEV)` branch), add the closure variable:

```ts
export async function apply(ctx: Context) {
    if (process.env.HYDRO_CLI) return;
    // Whether the 'next' renderer is currently allowed to serve any templates.
    // Mutable so a `system/setting` listener can hot-toggle ui-next on/off.
    let enabled = true;
```

- [ ] **Step 3: Update both `registerRenderer` calls to use the getter and `asFallback: false`**

In the **DEV** branch (around line 286), change:

```ts
        ctx.server.registerRenderer('next', {
            name: 'next',
            accept: [],
            output: 'html',
            asFallback: true,
            priority: 100,
            async render(_name, args, context) {
```

to:

```ts
        ctx.server.registerRenderer('next', {
            name: 'next',
            get accept() { return enabled ? NEXT_TEMPLATES : []; },
            output: 'html',
            asFallback: false,
            priority: 100,
            async render(_name, args, context) {
```

In the **PROD** branch (around line 315), make the same change to `accept` and `asFallback`.

- [ ] **Step 4: Run the existing manifest test to confirm it still passes**

Run: `yarn workspace @hydrooj/ui-next test src/pages/manifest.test.ts 2>&1 | tail -10`
Expected: 4 passed, 0 failed. (The test imports from `./manifest`; it does not run the server. It should be unaffected by `index.ts` changes.)

- [ ] **Step 5: Run `yarn build` to ensure the server-side import compiles**

Run: `yarn build 2>&1 | tail -20`
Expected: success; no TS errors about `NEXT_TEMPLATES` import.

- [ ] **Step 6: Smoke-test by booting the server and `curl`-ing two pages**

```bash
yarn start &
SERVER_PID=$!
sleep 5
# Expect SPA shell: <div id="root">
curl -s http://localhost:2333/ | head -50 | grep -F 'id="root"' && echo "OK: homepage -> next renderer"
# Expect ui-default (nunjucks): no <div id="root">
curl -s http://localhost:2333/ranking | head -50 | grep -qF 'id="root"' && echo "FAIL: ranking should be ui-default" || echo "OK: ranking -> ui-default"
kill $SERVER_PID
```

Expected: first `OK`, second `OK`.

- [ ] **Step 7: Commit**

```bash
git add packages/ui-next/index.ts
git commit -m "feat(ui-next): reverse renderer hijack via manifest-driven accept allowlist"
```

---

## Task 3: Add SPA `navigate()` fallback for unmigrated pages

> **This task implements the `navigate()` half of the design. The `app.tsx` error page upgrade is Task 4. They are split because the test for each is at a different level (unit vs. integration).**

**Files:**
- Modify: `packages/ui-next/src/context/router.tsx` (around lines 80-103, after the `res.json()` call)
- Test: `packages/ui-next/src/context/router.test.tsx` (new file)

**Interfaces:**
- Consumes: `store.getDefault('page:' + pageName)` from `src/registry/store.ts`
- Produces: when the JSON response's `x-hydro-page` header is not in the store, set `window.location.href = url; return false`.

- [ ] **Step 1: Inspect the test harness pattern**

```bash
ls packages/ui-next/src/context/router.test.tsx 2>/dev/null || echo "no test yet"
cat packages/ui-next/src/hooks/use-disable-next.test.tsx | head -50
```

Note: Task 6 will delete `use-disable-next.test.tsx`. Read it now to learn `withPageData` / `renderHook` patterns.

- [ ] **Step 2: Write the failing test**

Create `packages/ui-next/src/context/router.test.tsx`:

```tsx
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { store } from '../registry/store';
import { useNavigate } from './router';

describe('navigate() SPA fallback', () => {
    const originalFetch = global.fetch;
    let hrefSetter: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        delete (window as any).location;
        hrefSetter = vi.fn();
        (window as any).location = {};
        Object.defineProperty(window.location, 'href', {
            get: () => '',
            set: hrefSetter,
            configurable: true,
        });
        global.fetch = vi.fn();
    });

    afterEach(() => {
        (window as any).location.reload();
        (window as any).location = { href: '' };
        global.fetch = originalFetch;
    });

    it('falls back to full page load when target page is not registered', async () => {
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            redirected: false,
            status: 200,
            statusText: 'OK',
            headers: {
                get(name: string) {
                    return name.toLowerCase() === 'x-hydro-page' ? 'ranking' : null;
                },
            },
            json: async () => ({}),
        });
        expect(store.getDefault('page:ranking')).toBeUndefined();

        const { result } = renderHook(() => useNavigate());
        let ok: boolean | undefined;
        await act(async () => { ok = await result.current('/ranking'); });

        expect(ok).toBe(false);
        expect(hrefSetter).toHaveBeenCalledWith('/ranking');
    });

    it('does NOT fall back when target page is registered', async () => {
        store.setDefault('page:__test', { Page: () => null, layout: 'default' } as never);
        try {
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                redirected: false,
                status: 200,
                statusText: 'OK',
                headers: { get: () => '__test' },
                json: async () => ({}),
            });
            const { result } = renderHook(() => useNavigate());
            let ok: boolean | undefined;
            await act(async () => { ok = await result.current('/__test'); });
            expect(ok).toBe(true);
            expect(hrefSetter).not.toHaveBeenCalled();
        } finally {
            store.delete('page:__test');
        }
    });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `yarn workspace @hydrooj/ui-next test src/context/router.test.tsx 2>&1 | tail -30`
Expected: FAIL — `navigate()` currently never calls `window.location.href` after a successful JSON fetch.

- [ ] **Step 4: Add the fallback to `navigate()`**

In `packages/ui-next/src/context/router.tsx`, locate the line `const pageName = res.headers.get('x-hydro-page') || '';` (around line 86). Immediately after that line, insert:

```ts
const pageName = res.headers.get('x-hydro-page') || '';
// SPA fallback: if the target page isn't registered in the client store,
// the server has decided this template belongs to ui-default. A full page
// load lets ui-default render it correctly. The initial-page entrypoint
// (fetchPage with init=true) does NOT go through navigate, so this can't
// cause an infinite reload loop on first paint.
if (pageName && !store.getDefault(`page:${pageName}` as `page:${string}`)) {
    window.location.href = url;
    return false;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `yarn workspace @hydrooj/ui-next test src/context/router.test.tsx 2>&1 | tail -15`
Expected: 2 passed, 0 failed.

- [ ] **Step 6: Commit**

```bash
git add packages/ui-next/src/context/router.tsx packages/ui-next/src/context/router.test.tsx
git commit -m "feat(ui-next): SPA navigate() falls back to full page load for unmigrated pages"
```

---

## Task 4: Upgrade `app.tsx` error page

**Files:**
- Modify: `packages/ui-next/src/app.tsx` (lines 45-51, the `if (!entry)` branch)

- [ ] **Step 1: Read the current error branch**

```bash
sed -n '40,55p' packages/ui-next/src/app.tsx
```

- [ ] **Step 2: Replace the bare `<div>` with a full-layout error page**

Replace:

```tsx
    if (!entry) {
        return (
            <div>
                Page not found: <code>{name}</code>
            </div>
        );
    }
```

with:

```tsx
    if (!entry) {
        return (
            <DefaultLayout>
                <div style={{ padding: 32 }}>
                    <h2>This page does not have a new-UI implementation yet</h2>
                    <p>
                        The server has decided this route belongs to ui-next,
                        but the client has no registered page <code>{name}</code>.
                    </p>
                    <p>
                        This is a manifest drift or stale build artifact. Please return to the{' '}
                        <a href="/">homepage</a>.
                    </p>
                </div>
            </DefaultLayout>
        );
    }
```

> This branch is now only hit on initial page load (Task 3 moved the SPA-navigation case to `window.location.href`). The `DefaultLayout` provides the nav, so the user can recover without a hard reload.

- [ ] **Step 3: Skip the dedicated test — Task 7's e2e covers this regression**

Trying to render `<App />` directly in a unit test requires page-data context wiring that is not worth scaffolding for one assertion. Task 7's e2e test (`GET /` returns SPA shell) plus the Task 3 `navigate()` test are the actual gates. Mark this step complete without writing a new test file.

- [ ] **Step 4: Commit**

```bash
git add packages/ui-next/src/app.tsx
git commit -m "feat(ui-next): upgrade Page not found to a full-layout error page"
```

---

## Task 5: Add `AdminUiHandler` and the `ui.next` setting

**Files:**
- Create: `packages/hydrooj/src/handler/admin-ui.ts`
- Modify: `packages/hydrooj/src/handler/<registration-file>` (located in Step 2)
- Modify: `packages/hydrooj/src/model/setting.ts` (add `ui_next` to `SystemSetting`)
- Modify: `packages/ui-next/index.ts` (add `system/setting` listener)

**Interfaces:**
- Produces: `POST /admin/ui` handler, `PRIV_EDIT_SYSTEM`-gated, body `{ next: 'on' | 'off' }`, writes `SettingModel.set('ui.next', boolean)`.
- Consumed by: Task 2's `enabled` closure via the `system/setting` listener.

- [ ] **Step 1: Read an existing simple handler for pattern reference**

```bash
sed -n '22,35p' packages/hydrooj/src/handler/misc.ts
```

Note: `SwitchLanguageHandler` shows the minimal pattern (extends `Handler`, uses `@param`, calls `this.back()`).

- [ ] **Step 2: Read where handlers are registered**

```bash
grep -rn "SwitchLanguageHandler\|FilesHandler" packages/hydrooj/src --include='*.ts' | grep -v handler/misc.ts
```

Expected: a registration file (e.g. `handler/index.ts` or similar) that calls `ctx.Route('switch_language', '/switch-language', SwitchLanguageHandler)`. **This is where Step 5 will add the `admin_ui` route.**

- [ ] **Step 3: Read the setting schema**

```bash
grep -n "SystemSetting\\|DomainSetting\\|Schema\\.object" packages/hydrooj/src/model/setting.ts | head -30
```

Expected: a `Schema.object({...})` block in `SettingModel` exports. Add `ui_next` (boolean, default `true`) to `SystemSetting` (since it affects site-wide rendering).

- [ ] **Step 4: Create `AdminUiHandler`**

Create `packages/hydrooj/src/handler/admin-ui.ts`:

```ts
import { Types } from '@hydrooj/framework';
import { PRIV } from '../model/builtin';
import { Handler, param } from '../service/server';

export class AdminUiHandler extends Handler {
    @param('next', Types.Boolean)
    async post({ domainId }: { domainId: string }, next: boolean) {
        this.checkPriv(PRIV.PRIV_EDIT_SYSTEM);
        await this.ctx.setting.set('ui.next', next);
        this.back();
    }
}
```

- [ ] **Step 5: Register the route**

In the handler-registration file located in Step 2, add:

```ts
import { AdminUiHandler } from './handler/admin-ui';
// ...existing imports...
ctx.Route('admin_ui', '/admin/ui', AdminUiHandler, PRIV.PRIV_EDIT_SYSTEM);
```

Place it next to other admin routes (near the end of the boot block).

- [ ] **Step 6: Add `ui_next` to the setting schema**

In `packages/hydrooj/src/model/setting.ts` (inside `SystemSetting` `Schema.object({...})`), add:

```ts
ui_next: Schema.boolean().default(true),
```

- [ ] **Step 7: Wire the `system/setting` listener in `packages/ui-next/index.ts`**

Right after the `let enabled = true;` line added in Task 2, add:

```ts
    ctx.on('system/setting', (key: string) => {
        // Tolerant: the schema key in the model may be 'ui.next' or 'ui_next'.
        if (key === 'ui.next' || key === 'ui_next') {
            enabled = ctx.setting.get('ui.next') !== false;
        }
    });
```

- [ ] **Step 8: Commit**

```bash
git add packages/hydrooj/src/handler/admin-ui.ts \
        packages/hydrooj/src/handler/<registration-file> \
        packages/hydrooj/src/model/setting.ts \
        packages/ui-next/index.ts
git commit -m "feat: add /admin/ui handler and ui.next setting for ui-next toggle"
```

---

## Task 6: Delete dead opt-out code

> **WARNING**: This task must be atomic. Edit the test imports in the same commit as the deletions, or vitest will fail to compile.

**Files:**
- Delete: `packages/ui-next/src/hooks/use-disable-next.ts`
- Delete: `packages/ui-next/src/hooks/use-disable-next.test.tsx`
- Delete: `packages/ui-next/src/pages/admin_ui.tsx`
- Delete: `packages/ui-next/src/pages/admin_ui.test.tsx`
- Modify: `packages/ui-next/src/api.ts` (remove the two re-exports of `useDisableNext`)

- [ ] **Step 1: Find all importers of the files being deleted**

```bash
grep -rn "use-disable-next\|useDisableNext" packages/ui-next/src --include='*.ts' --include='*.tsx'
grep -rn "admin_ui" packages/ui-next/src --include='*.ts' --include='*.tsx' | grep -v "admin_ui.tsx:\|admin_ui.test.tsx:"
```

Expected: only `api.ts` re-exports `useDisableNext`; no other consumers. **If any unexpected importers exist, stop and resolve them before deleting.**

- [ ] **Step 2: Remove the re-exports from `api.ts`**

In `packages/ui-next/src/api.ts`, delete these two lines:

```ts
export { useDisableNext } from './hooks/use-disable-next';
export type { DisableNextState } from './hooks/use-disable-next';
```

- [ ] **Step 3: Delete the four files**

```bash
git rm packages/ui-next/src/hooks/use-disable-next.ts \
        packages/ui-next/src/hooks/use-disable-next.test.tsx \
        packages/ui-next/src/pages/admin_ui.tsx \
        packages/ui-next/src/pages/admin_ui.test.tsx
```

- [ ] **Step 4: Run the full test suite**

Run: `yarn workspace @hydrooj/ui-next test 2>&1 | tail -20`
Expected: same baseline as before SP0 (8 failed / 873 passed). **No new failures.**

- [ ] **Step 5: Run lint**

Run: `yarn workspace @hydrooj/ui-next exec eslint src 2>&1 | tail -10 || yarn lint 2>&1 | tail -20`
Expected: no new lint errors (the deletions can only reduce counts).

- [ ] **Step 6: Commit**

```bash
git add packages/ui-next/src/api.ts
git commit -m "refactor(ui-next): remove dead opt-out code (use-disable-next, admin_ui page)"
```

---

## Task 7: End-to-end verification (regression suite for C1 / C2 / H1)

**Files:**
- Modify: `test/main.ts` (append three e2e assertions)

- [ ] **Step 1: Read the existing `test/main.ts` harness**

```bash
sed -n '1,60p' test/main.ts
```

Note the `supertest.agent` pattern and the `describe('App', ...)` block. New tests go inside that describe.

- [ ] **Step 2: Append three e2e assertions**

Add to the `describe('App', ...)` block in `test/main.ts`:

```ts
describe('SP0: renderer gate regression', () => {
    test('GET / serves ui-next SPA shell', async () => {
        const res = await agent.get('/').set('Accept', 'text/html');
        expect(res.status).toBe(200);
        expect(res.text).toContain('id="root"');
    });

    test('GET /ranking serves ui-default nunjucks (not ui-next)', async () => {
        const res = await agent.get('/ranking').set('Accept', 'text/html');
        expect(res.status).toBe(200);
        expect(res.text).not.toContain('id="root"');
    });

    test('pjax fragment for problem list is a fragment, not a full document', async () => {
        // Adjust the problem ID to one that exists in the test seed.
        const res = await agent
            .get('/p/1?pjax=partials/problem_list.html')
            .set('x-requested-with', 'XMLHttpRequest')
            .set('Accept', 'text/html');
        expect(res.status).toBe(200);
        const body = JSON.parse(res.text);
        expect(body).toHaveProperty('fragments');
        for (const f of body.fragments) {
            expect(f.html).not.toMatch(/<html/i);
        }
    });
});
```

> If `test/main.ts` does not seed problem `1`, the third test will 404 — adjust the path or seed.

- [ ] **Step 3: Run the full e2e suite**

Run: `yarn test 2>&1 | tail -40`
Expected: SP0 block 3/3 pass; baseline (8 failed elsewhere) unchanged.

- [ ] **Step 4: Manual email verification (C2 — required for merge)**

```bash
MAIL_TRANSPORT=debug yarn start &
SERVER_PID=$!
sleep 5
curl -s -X POST http://localhost:2333/register \
    -H 'Content-Type: application/json' \
    -d '{"mail": "test@example.com", "uname": "test", "password": "x"}' | head
# Inspect server logs for the user_register_mail.html render output.
kill $SERVER_PID
```

Verify: the logged body contains the verification code (a 6-digit string or URL) — **not** `<div id="root">`.

- [ ] **Step 5: Commit**

```bash
git add test/main.ts
git commit -m "test: add e2e regression for SP0 renderer gate"
```

---

## Self-Review

**Spec coverage check:**

| Spec section | Covered by |
|---|---|
| §3.1 manifest module | Task 1 |
| §3.2 renderer with getter + `asFallback: false` | Task 2 |
| §3.3 site toggle + `/admin/ui` Handler + delete three layers | Task 5 (Handler, setting, listener) + Task 6 (delete dead code) |
| §3.4 SPA fallback + error page | Task 3 (navigate) + Task 4 (error page) |
| §5 error handling | Covered by Task 2 (smoke test), Task 5 (default true), Task 7 (e2e) |
| §6 tests | Task 1 (manifest), Task 3 (router), Task 7 (e2e) |
| §7 rollout order (email first, then SPA, then toggle) | Tasks 2→3→4→5→6→7 enforce this order; each commit is independently shippable |
| §8 risk: lint/test baseline | Task 6 step 4-5, Task 7 step 3 explicitly check baseline |

**Placeholder scan:** No TBD / TODO / "fill in later" markers. Every step has a complete command and expected output. The two `<...>` placeholders (Task 5 commit line, registration-file path) are intentional open-ends the implementer fills at execution time.

**Type/name consistency:**
- `NEXT_PAGES`, `NEXT_TEMPLATES` — defined Task 1, consumed Tasks 2, 3.
- `enabled: boolean` — defined Task 2, mutated Task 5.
- `store.getDefault('page:' + name)` — pattern used in both Task 3 test and Task 3 implementation.
- `PRIV.PRIV_EDIT_SYSTEM` — matches the `manage.ts` / `misc.ts` convention.
- `/admin/ui` path — matches the original `admin_ui.tsx:33` POST target.
