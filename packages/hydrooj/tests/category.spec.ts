import { expect } from 'chai';
import { describe, it } from 'node:test';
import { parseCategorySetting } from '../src/lib/category';

describe('parseCategorySetting', () => {
  it('returns [] for undefined', () => {
    expect(parseCategorySetting(undefined)).to.deep.equal([]);
  });
  it('returns [] for empty string', () => {
    expect(parseCategorySetting('')).to.deep.equal([]);
  });
  it('returns [] for invalid YAML', () => {
    expect(parseCategorySetting('{[invalid')).to.deep.equal([]);
  });
  it('returns [] for array root', () => {
    expect(parseCategorySetting('- a\n- b')).to.deep.equal([]);
  });
  it('parses single-level categories', () => {
    const yaml = 'A:\nB:\n';
    expect(parseCategorySetting(yaml)).to.deep.equal([{ name: 'A' }, { name: 'B' }]);
  });
  it('parses nested categories', () => {
    const yaml = 'A:\n  - a1\n  - a2\nB:\n  - b1\n';
    expect(parseCategorySetting(yaml)).to.deep.equal([
      { name: 'A', children: [{ name: 'a1' }, { name: 'a2' }] },
      { name: 'B', children: [{ name: 'b1' }] },
    ]);
  });
  it('filters non-string subcategories', () => {
    const yaml = 'A:\n  - a1\n  - 123\n';
    expect(parseCategorySetting(yaml)).to.deep.equal([
      { name: 'A', children: [{ name: 'a1' }] },
    ]);
  });
});