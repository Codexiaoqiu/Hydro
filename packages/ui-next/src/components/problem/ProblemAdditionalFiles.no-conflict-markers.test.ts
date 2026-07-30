import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const src = readFileSync(resolve(__dirname, 'ProblemAdditionalFiles.tsx'), 'utf8');

describe('problemAdditionalFiles.tsx conflict markers', () => {
  it('contains no merge conflict markers', () => {
    expect(src).not.toMatch(/<<<<<<</);
    expect(src).not.toMatch(/=======/);
    expect(src).not.toMatch(/>>>>>>>/);
  });

  it('passes readOnly={disabled} into FilePreviewDialog', () => {
    expect(src).toMatch(/<FilePreviewDialog/);
    expect(src).toMatch(/readOnly=\{disabled\}/);
  });
});
