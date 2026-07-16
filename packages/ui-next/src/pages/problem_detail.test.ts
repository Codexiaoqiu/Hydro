/* @vitest-environment happy-dom */
import { describe, expect, it } from 'vitest';
import { readContentText } from './problem_detail';

const SAMPLE_MD_ZH = '**这是一道交互题。**\n\n## 题目描述\n\n小 Y 的银行有 $N$ 个客户。';
const SAMPLE_MD_EN = '**This is an interactive problem.**\n\n## Description\n\nBank of Xiao Y has $N$ customers.';

describe('readContentText', () => {
  it('returns empty string for undefined / empty input', () => {
    expect(readContentText(undefined, 'zh')).toBe('');
    expect(readContentText('', 'zh')).toBe('');
  });

  it('parses the server-side JSON-string form and picks the requested locale', () => {
    // This mirrors the exact wire format that pdoc.content arrives in on the
    // problem_detail page (see q.md, pdoc.content = '{"zh":"...","en":"..."}').
    const json = JSON.stringify({ zh: SAMPLE_MD_ZH, en: SAMPLE_MD_EN });
    expect(readContentText(json, 'zh')).toBe(SAMPLE_MD_ZH);
    expect(readContentText(json, 'en')).toBe(SAMPLE_MD_EN);
  });

  it('strips the JSON wrapper characters (no leakage into markdown body)', () => {
    const json = JSON.stringify({ zh: SAMPLE_MD_ZH });
    const out = readContentText(json, 'zh');
    expect(out).not.toMatch(/^\{/);
    expect(out).not.toMatch(/[\\"{}]/);
    expect(out.startsWith('**这是一道交互题。**')).toBe(true);
  });

  it('falls back to the first available locale when the requested one is missing', () => {
    const json = JSON.stringify({ zh: SAMPLE_MD_ZH });
    expect(readContentText(json, 'en')).toBe(SAMPLE_MD_ZH);
  });

  it('still supports the already-parsed object form (Record<string, string>)', () => {
    expect(readContentText({ zh: SAMPLE_MD_ZH, en: SAMPLE_MD_EN }, 'zh')).toBe(SAMPLE_MD_ZH);
    expect(readContentText({ zh: SAMPLE_MD_ZH }, 'fr')).toBe(SAMPLE_MD_ZH);
  });

  it('returns raw markdown as-is when the string is not JSON-shaped', () => {
    const raw = '## Hello\n\nworld';
    expect(readContentText(raw, 'zh')).toBe(raw);
  });

  it('handles a string whose leading content looks like JSON but is malformed', () => {
    const broken = '{not really json';
    expect(readContentText(broken, 'zh')).toBe(broken);
  });

  it('handles a JSON string whose root is an array (defensive: treat as raw)', () => {
    const arr = '["a","b"]';
    expect(readContentText(arr, 'zh')).toBe(arr);
  });

  it('tolerates surrounding whitespace before the JSON object', () => {
    const padded = `   ${JSON.stringify({ zh: SAMPLE_MD_ZH })}`;
    expect(readContentText(padded, 'zh')).toBe(SAMPLE_MD_ZH);
  });
});
