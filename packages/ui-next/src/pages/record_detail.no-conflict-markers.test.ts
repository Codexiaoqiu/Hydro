import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const src = readFileSync(resolve(__dirname, 'record_detail.test.tsx'), 'utf8');

describe('record_detail.test.tsx conflict markers', () => {
  it('contains no merge conflict markers', () => {
    expect(src).not.toMatch(/<<<<<<</);
    expect(src).not.toMatch(/=======/);
    expect(src).not.toMatch(/>>>>>>>/);
  });

  it('imports STATUS from @hydrooj/common', () => {
    expect(src).toMatch(/import\s+\{\s*STATUS\s*\}\s+from\s+['"]@hydrooj\/common['"]/);
  });

  it('has a postMessage describe block', () => {
    expect(src).toMatch(/describe\(['"]record_detail postMessage['"]/);
  });
});
