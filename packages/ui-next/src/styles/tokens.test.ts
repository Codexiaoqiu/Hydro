import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(__dirname, 'tokens.css'), 'utf8');

describe('tokens.css danger family', () => {
  it('declares --danger in :root', () => {
    expect(css).toMatch(/--danger:\s*#/);
  });
  it('declares --danger-strong in :root', () => {
    expect(css).toMatch(/--danger-strong:\s*#/);
  });
  it('declares --danger-soft in :root', () => {
    expect(css).toMatch(/--danger-soft:\s*rgba\(/);
  });
  it('declares --danger-mute in :root', () => {
    expect(css).toMatch(/--danger-mute:\s*#/);
  });
  it('overrides --danger in [data-theme="light"]', () => {
    expect(css).toMatch(/\[data-theme="light"\][\s\S]*--danger:\s*#/);
  });
});
