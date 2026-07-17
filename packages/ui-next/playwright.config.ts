import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for ui-next visual regression.
 *
 * Two projects are defined to capture dark and light variants:
 *  - `chromium-dark`   — localStorage cleared before navigation, default dark theme
 *  - `chromium-light`  — localStorage pre-seeded with `hydro.theme = light`
 *
 * The dev server is `vite preview` of the built bundle (production-mode parity).
 */
export default defineConfig({
    testDir: './e2e',
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1,
    reporter: [['list']],
    expect: {
        toHaveScreenshot: {
            maxDiffPixelRatio: 0.02,
            threshold: 0.2,
            animations: 'disabled',
        },
    },
    use: {
        baseURL: 'http://localhost:4173',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
    projects: [
        {
            name: 'chromium-dark',
            use: { ...devices['Desktop Chrome'], colorScheme: 'dark' },
        },
        {
            name: 'chromium-light',
            use: { ...devices['Desktop Chrome'], colorScheme: 'light' },
        },
    ],
    webServer: {
        command: 'yarn preview --port 4173 --strictPort',
        url: 'http://localhost:4173',
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
        stdout: 'pipe',
        stderr: 'pipe',
    },
});
