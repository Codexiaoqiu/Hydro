// Re-export the canonical permission / privilege constants from @hydrooj/common
// so the SPA can reference them by symbolic name instead of hard-coded bit
// positions. The previous in-file copy listed only three PERM bits, which
// silently fell out of sync with the server and made it easy to use the wrong
// mask (e.g. `1n << 9n` for submit, not `8`). Importing the real constants
// also fixes the bits used by `lib/perms.ts`.
export { PERM, PRIV } from '@hydrooj/common';
