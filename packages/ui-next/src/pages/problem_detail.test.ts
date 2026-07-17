/* @vitest-environment happy-dom */
import { describe, expect, it } from 'vitest';
import { pickPreferredLang, readContentText } from './problem_detail';

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

  it('falls back from zh_CN to zh when the content is keyed { en, zh }', () => {
    // Regression: pickPreferredLang can resolve to 'zh_CN' (the i18n canonical
    // name) even when the server stored the content under the shorter 'zh'
    // key. readContentText must do its own base-locale fallback so the
    // Chinese viewer doesn't silently get English (the first inserted key).
    const json = JSON.stringify({ en: SAMPLE_MD_EN, zh: SAMPLE_MD_ZH });
    expect(readContentText(json, 'zh_CN')).toBe(SAMPLE_MD_ZH);
  });

  it('matches regional siblings (zh_TW, zh_HK) when asked for zh_CN', () => {
    const json = JSON.stringify({ en: SAMPLE_MD_EN, zh_TW: SAMPLE_MD_ZH });
    expect(readContentText(json, 'zh_CN')).toBe(SAMPLE_MD_ZH);
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

describe('pickPreferredLang', () => {
  it('lets ?lang= override everything when the key exists in contentLangs', () => {
    expect(pickPreferredLang(['en', 'zh'], { fromQuery: 'en', navigatorLanguage: 'zh-CN' }))
      .toBe('en');
    // URL key not in content → falls through to base-locale match.
    expect(pickPreferredLang(['en', 'zh'], { fromQuery: 'fr', navigatorLanguage: 'zh-CN' }))
      .toBe('zh');
  });

  it('honors userLang (UserContext.viewLang) over the browser locale', () => {
    expect(pickPreferredLang(['en', 'zh'], { userLang: 'en', navigatorLanguage: 'zh-CN' }))
      .toBe('en');
    expect(pickPreferredLang(['en', 'zh_CN'], { userLang: 'zh_CN', navigatorLanguage: 'en-US' }))
      .toBe('zh_CN');
  });

  it('picks zh when the viewer is in a Chinese browser and content is { en, zh }', () => {
    // This is the regression case the user pasted: a problem with only "en"
    // and "zh" keys (no zh_CN), viewed anonymously from zh-CN. The base-locale
    // match must short-circuit contentLangs[0] so the body isn't English.
    expect(pickPreferredLang(['en', 'zh'], { navigatorLanguage: 'zh-CN' })).toBe('zh');
  });

  it('matches the base locale against zh_CN / zh_TW variants', () => {
    expect(pickPreferredLang(['en', 'zh_CN'], { navigatorLanguage: 'zh-CN' })).toBe('zh_CN');
    expect(pickPreferredLang(['en', 'zh_TW'], { navigatorLanguage: 'zh-TW' })).toBe('zh_TW');
  });

  it('prefers the server-injected locale over navigator.language', () => {
    expect(pickPreferredLang(['en', 'zh_CN'], {
      injectedLocale: 'zh_CN',
      navigatorLanguage: 'en-US',
    })).toBe('zh_CN');
  });

  it('falls back to contentLangs[0] when no base locale is available', () => {
    expect(pickPreferredLang(['en', 'zh'], {})).toBe('en');
  });

  it('defaults to zh_CN when only zh-base is detected but contentLangs is empty', () => {
    expect(pickPreferredLang([], { navigatorLanguage: 'zh-CN' })).toBe('zh_CN');
    expect(pickPreferredLang([], {})).toBe('en');
  });

  it('ignores userLang when it is not present in contentLangs', () => {
    // userLang is `de`, content has only en + zh → base match still wins.
    expect(pickPreferredLang(['en', 'zh'], { userLang: 'de', navigatorLanguage: 'zh-CN' }))
      .toBe('zh');
  });
});
