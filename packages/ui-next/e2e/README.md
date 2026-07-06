# Visual regression tests

End-to-end visual regression for `packages/ui-next`, powered by [Playwright](https://playwright.dev).

## Quick start

```bash
# 1. Build the production bundle (Playwright serves it via vite preview).
yarn workspace @hydrooj/ui-next build

# 2. Install Playwright browsers (one-time, ~150 MB).
yarn workspace @hydrooj/ui-next exec playwright install --with-deps chromium

# 3. Generate baseline screenshots.
yarn workspace @hydrooj/ui-next test:visual:update

# 4. Run regression on every change.
yarn workspace @hydrooj/ui-next test:visual
```

## What's covered

Two projects × two routes:

- **chromium-dark** — clears localStorage, color-scheme: dark
- **chromium-light** — pre-seeds `hydro.theme = light`, color-scheme: light

For each project, screenshots are captured for:

- `homepage` (`/`)
- `problem_main` (`/p`)

Plus a smoke test that the theme-toggle button actually flips `data-theme` and writes to `localStorage`.

## Updating baselines

When the design legitimately changes, regenerate:

```bash
yarn workspace @hydrooj/ui-next test:visual:update
```

This writes new PNGs into `__snapshots__/`. **Commit them** — they are the new ground truth.

## Tuning tolerance

`playwright.config.ts` sets `maxDiffPixelRatio: 0.02` (2% of pixels may differ) and `threshold: 0.2` (per-pixel color delta). Lower for stricter CI, higher for font-rendering variance across machines.

## When running in CI

Set `CI=1` so Playwright applies the configured retries (2). On Linux runners without GUI, install OS deps via `playwright install --with-deps chromium` first.

## Limitations

- Tests assume the backend at `/` and `/p` is reachable. By default `yarn preview` serves the static SPA; pages that depend on backend data will show skeleton/empty states.
- Visual baselines are machine-specific. Regenerate on a single reference machine and treat subsequent diffs as reviewable, not authoritative.