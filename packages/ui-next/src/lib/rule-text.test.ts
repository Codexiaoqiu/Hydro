/* @vitest-environment happy-dom */
import { describe, expect, it } from 'vitest';
import { ruleText } from './rule-text';

describe('ruleText', () => {
  it.each([
    ['acm', 'XCPC'],
    ['oi', 'OI'],
    ['ioi', 'IOI'],
    ['strictioi', 'IOI(Strict)'],
    ['ledo', 'Ledo'],
    ['homework', '作业'],
    ['unknown-rule', 'unknown-rule'],
  ])('maps %s -> %s', (input, expected) => {
    expect(ruleText(input)).toBe(expected);
  });

  it('returns an empty string unchanged', () => {
    expect(ruleText('')).toBe('');
  });
});