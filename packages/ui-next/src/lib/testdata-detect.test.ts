import { describe, expect, it } from 'vitest';
import { detectSubtasks } from './testdata-detect';

describe('detectSubtasks', () => {
  it('groups files into a single subtask by default', () => {
    const r = detectSubtasks(['1.in', '1.out', '2.in', '2.out']);
    expect(r).toHaveLength(1);
    expect(r[0].cases).toHaveLength(2);
  });
  it('correctly pairs input and output files', () => {
    const r = detectSubtasks(['1.in', '1.out', '2.in', '2.out']);
    expect(r[0].cases).toEqual(expect.arrayContaining([
      { input: '1.in', output: '1.out' },
      { input: '2.in', output: '2.out' },
    ]));
  });
  it('splits by naming convention 1-1 / 1-2 (subtask-case)', () => {
    const r = detectSubtasks(['1-1.in', '1-1.out', '1-2.in', '1-2.out', '2-1.in', '2-1.out']);
    expect(r).toHaveLength(2);
    expect(r[0].cases).toHaveLength(2);
    expect(r[1].cases).toHaveLength(1);
  });
  it('returns empty array when no pairs', () => {
    expect(detectSubtasks(['only.in'])).toEqual([]);
  });
});
