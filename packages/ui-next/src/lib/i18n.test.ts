import { describe, expect, it } from 'vitest';
import { resolveLocale, translate } from './i18n';

describe('translate', () => {
  it('returns catalog value when key exists', () => {
    const cat = { 'Foo.Bar': 'hello {name}' };
    expect(translate(cat, 'Foo.Bar', { name: 'world' })).toBe('hello world');
  });
  it('keeps {name} literal when arg missing', () => {
    const cat = { 'Foo.Bar': 'hi {name}' };
    expect(translate(cat, 'Foo.Bar')).toBe('hi {name}');
  });
  it('falls back to key when key missing in both catalogs', () => {
    const cat: Record<string, string> = {};
    expect(translate(cat, 'Missing')).toBe('Missing');
  });
  it('handles multiple substitutions', () => {
    const cat = { 'X': 'a {x} b {y}' };
    expect(translate(cat, 'X', { x: '1', y: '2' })).toBe('a 1 b 2');
  });
});

describe('resolveLocale', () => {
  it.each([
    ['zh_CN', 'zh_CN'],
    ['zh-CN', 'zh_CN'],
    ['zh_TW', 'en'], // currently fallback to en
    ['', 'en'],
    ['fr', 'en'],
  ] as const)('resolveLocale(%p) → %p', (input, expected) => {
    expect(resolveLocale(input)).toBe(expected);
  });
});