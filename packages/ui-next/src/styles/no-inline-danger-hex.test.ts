import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(__dirname, '..', '..', 'src');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    if (!full.endsWith('.css')) return [];
    return [full];
  });
}

const dangerHexRegex = /var\(--danger[a-z-]*,\s*(#[\da-fA-F]{3,8}|rgba?\([^)]+\))/;

describe('no inline hex fallback for --danger*', () => {
  for (const file of walk(root)) {
    const rel = file.replace(`${root}/`, '');
    it(`${rel} uses bare var(--danger*)`, () => {
      const css = readFileSync(file, 'utf8');
      expect(css).not.toMatch(dangerHexRegex);
    });
  }
});
