import { execSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('harness boot smoke', () => {
  it('starts without "invalid plugin" error', () => {
    let out = '';
    try {
      out = execSync(
        'CI=true node --enable-source-maps -r @hydrooj/register test/entry.js 2>&1',
        { encoding: 'utf8', timeout: 60_000, cwd: '/home/xq/Hydro' },
      );
    } catch (e: any) {
      out = (e.stdout ?? '') + (e.stderr ?? '');
    }
    expect(out).not.toMatch(/invalid plugin/);
  }, 90_000);
});
