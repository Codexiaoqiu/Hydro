import { chromium } from 'playwright';

const url = process.argv[2] || 'http://localhost:2333/';

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

const consoleMsgs = [];
const pageErrors = [];
const failedRequests = [];

page.on('console', (msg) => {
    consoleMsgs.push({ type: msg.type(), text: msg.text() });
});
page.on('pageerror', (err) => {
    pageErrors.push({ name: err.name, message: err.message, stack: err.stack });
});
page.on('requestfailed', (req) => {
    failedRequests.push({ url: req.url(), failure: req.failure()?.errorText });
});
page.on('response', (res) => {
    if (res.status() >= 400) {
        failedRequests.push({ url: res.url(), status: res.status() });
    }
});

let navError = null;
try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
} catch (e) {
    navError = e.message;
}

await page.waitForTimeout(1500);

const title = await page.title();
const bodyText = (await page.evaluate(() => document.body.innerText)).slice(0, 800);
const visibleRoot = await page.evaluate(() => {
    const root = document.querySelector('#root');
    if (!root) return null;
    return { childCount: root.children.length, innerHTML: root.innerHTML.slice(0, 1500) };
});

await page.screenshot({ path: '/tmp/hydro-home.png', fullPage: true });

await browser.close();

console.log('=== NAV ===');
console.log(navError ? `ERR: ${navError}` : 'ok');
console.log('title:', title);
console.log();
console.log('=== PAGE ERRORS (uncaught) ===');
console.log(pageErrors.length ? JSON.stringify(pageErrors, null, 2) : '(none)');
console.log();
console.log('=== FAILED REQUESTS ===');
console.log(failedRequests.length ? JSON.stringify(failedRequests, null, 2) : '(none)');
console.log();
console.log('=== CONSOLE (errors+warnings only) ===');
const important = consoleMsgs.filter((m) => m.type === 'error' || m.type === 'warning');
console.log(important.length ? JSON.stringify(important, null, 2) : '(none)');
console.log();
console.log('=== ALL CONSOLE ===');
console.log(JSON.stringify(consoleMsgs, null, 2));
console.log();
console.log('=== BODY TEXT (truncated) ===');
console.log(bodyText);
console.log();
console.log('=== #root ===');
console.log(JSON.stringify(visibleRoot, null, 2));