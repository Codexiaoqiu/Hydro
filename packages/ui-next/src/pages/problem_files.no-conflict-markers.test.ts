import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const src = readFileSync(resolve(__dirname, 'problem_files.tsx'), 'utf8');

describe('problem_files.tsx conflict markers', () => {
  it('contains no merge conflict markers', () => {
    expect(src).not.toMatch(/<<<<<<</);
    expect(src).not.toMatch(/=======/);
    expect(src).not.toMatch(/>>>>>>>/);
  });

  it('computes canEdit via canEditProblem', () => {
    expect(src).toMatch(/canEdit\s*=\s*!isReference\s*&&\s*canEditProblem\(/);
  });

  it('uses disabled={!canEdit} for testdata + additional file components', () => {
    const matches = src.match(/disabled=\{!canEdit\}/g) ?? [];
    expect(matches.length).toBe(2);
  });
});
