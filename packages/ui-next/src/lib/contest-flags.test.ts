import { describe, expect, it } from 'vitest';
import type { SerializedTdoc } from '../sections/types';
import { KNOWN_RULES, rulesFromTdocs } from './contest-flags';

describe('kNOWN_RULES', () => {
  it('has six backend contest rule keys', () => {
    expect(KNOWN_RULES).toHaveLength(6);
    expect(KNOWN_RULES.map((rule) => rule.key)).toEqual([
      'acm', 'oi', 'ioi', 'strictioi', 'ledo', 'homework',
    ]);
  });

  it('has non-empty labels', () => {
    for (const rule of KNOWN_RULES) {
      expect(typeof rule.label).toBe('string');
      expect(rule.label.length).toBeGreaterThan(0);
    }
  });
});

describe('rulesFromTdocs', () => {
  const fake = (rule: string): SerializedTdoc => ({
    _id: 'a',
    docId: 'b',
    title: 't',
    rule,
    beginAt: '2026-01-01T00:00:00.000Z',
    endAt: '2026-01-02T00:00:00.000Z',
  });

  it('returns the known rule union in catalog order', () => {
    const result = rulesFromTdocs([fake('acm'), fake('oi'), fake('acm')]);
    expect(result.map((rule) => rule.key)).toEqual(['acm', 'oi']);
  });

  it('ignores unknown rules', () => {
    expect(rulesFromTdocs([fake('unknown-rule')])).toEqual([]);
  });

  it('returns the complete catalog for empty tdocs', () => {
    expect(rulesFromTdocs([])).toEqual(KNOWN_RULES);
  });
});
