import { expect, type Page, test } from '@playwright/test';

/**
 * Visual regression tests for ui-next.
 *
 * Each test:
 *  1. Seeds localStorage with the right theme (if needed) before navigation.
 *  2. Navigates to a route, waits for fonts/network to settle.
 *  3. Compares the page screenshot against the baseline in `e2e/__snapshots__/`.
 *
 * To update baselines: `yarn test:visual:update`
 */

const ROUTES = [
    { name: 'homepage', path: '/' },
    { name: 'problem_main', path: '/p' },
    { name: 'contest_main', path: '/contest' },
];

async function seedTheme(page: Page, theme: 'dark' | 'light') {
    await page.addInitScript((t) => {
        try { localStorage.setItem('hydro.theme', t); } catch { /* ignore */ }
    }, theme);
}

async function settle(page: Page) {
    // Wait for fonts and the Ring/Trend animations to finish.
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(800);
}

for (const route of ROUTES) {
    test(`dark — ${route.name}`, async ({ page }) => {
        // Force-clear localStorage so default theme (dark) wins.
        await page.addInitScript(() => {
            try { localStorage.removeItem('hydro.theme'); } catch { /* ignore */ }
        });
        await page.emulateMedia({ colorScheme: 'dark' });
        await page.goto(route.path, { waitUntil: 'networkidle' });
        await settle(page);
        await expect(page).toHaveScreenshot(`${route.name}-dark.png`, {
            fullPage: true,
        });
    });

    test(`light — ${route.name}`, async ({ page }) => {
        await seedTheme(page, 'light');
        await page.emulateMedia({ colorScheme: 'light' });
        await page.goto(route.path, { waitUntil: 'networkidle' });
        await settle(page);
        await expect(page).toHaveScreenshot(`${route.name}-light.png`, {
            fullPage: true,
        });
    });
}

test('theme toggle switches data-theme and persists', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.click('button[aria-label="Toggle theme"]');
    const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(['dark', 'light']).toContain(theme);
    const stored = await page.evaluate(() => localStorage.getItem('hydro.theme'));
    expect(stored).toBe(theme);
});
