import { describe, expect, it } from 'vitest';
import { previewRename } from './file-rename';

describe('previewRename', () => {
  it('applies a prefix to each name', () => {
    const p = previewRename(['a.txt', 'b.txt'], { prefix: 'x_' });
    expect(p.changes).toEqual([
      { oldName: 'a.txt', newName: 'x_a.txt' },
      { oldName: 'b.txt', newName: 'x_b.txt' },
    ]);
    expect(p.error).toBeUndefined();
  });

  it('applies a suffix to each name', () => {
    const p = previewRename(['a.txt'], { suffix: '.bak' });
    expect(p.changes).toEqual([{ oldName: 'a.txt', newName: 'a.txt.bak' }]);
  });

  it('applies a RegExp find/replace', () => {
    const p = previewRename(['1.in', '2.in'], { find: '\\.in$', replace: '.txt' });
    expect(p.changes).toEqual([
      { oldName: '1.in', newName: '1.txt' },
      { oldName: '2.in', newName: '2.txt' },
    ]);
  });

  it('supports regex capture groups in the replacement', () => {
    const p = previewRename(['case1.in'], { find: '(\\d+)', replace: 'x$1', flags: 'g' });
    expect(p.changes).toEqual([{ oldName: 'case1.in', newName: 'casex1.in' }]);
  });

  it('excludes names that do not change (no-op)', () => {
    const p = previewRename(['a.txt'], {});
    expect(p.changes).toEqual([]);
  });

  it('reports duplicates when two selected names map to the same result', () => {
    const p = previewRename(['a.txt', 'b.txt'], { find: '.*', replace: 'same.txt' });
    expect(p.duplicates).toEqual(['same.txt']);
  });

  it('reports collisions with an existing file not being renamed', () => {
    const p = previewRename(['a.txt'], { find: 'a', replace: 'b' }, ['a.txt', 'b.txt']);
    expect(p.collisions).toEqual(['b.txt']);
  });

  it('returns a displayable error for an invalid RegExp and no changes', () => {
    const p = previewRename(['a.txt'], { find: '[', replace: 'x' });
    expect(p.error).toBeTruthy();
    expect(p.changes).toEqual([]);
  });

  it('marks a result containing a slash as invalid', () => {
    const p = previewRename(['a.txt'], { prefix: 'dir/' });
    expect(p.invalid).toEqual([{ name: 'a.txt', reason: expect.any(String) }]);
    expect(p.changes).toEqual([]);
  });

  it('marks an empty result as invalid', () => {
    const p = previewRename(['a.txt'], { find: '.*', replace: '' });
    expect(p.invalid.map((i) => i.name)).toContain('a.txt');
  });
});
