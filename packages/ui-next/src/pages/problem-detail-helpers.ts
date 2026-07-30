/**
 * Pick the best content-language key for a problem given the user's profile,
 * the URL `?lang=` override, the server-injected locale, and the browser's
 * `navigator.language`. Exported for unit testing.
 *
 * Resolution order:
 *   1. `fromQuery` (URL override) if it exists in `contentLangs`
 *   2. `userLang` (UserContext.viewLang) if it exists in `contentLangs`
 *   3. The first content-language whose name matches any *base* locale we
 *      know about, in priority order: userBaseLang, injectedLocale's base,
 *      navigatorLanguage's base. We try every base because the user's
 *      stored preference (`"de"`) might not exist in this problem at all
 *      — in that case we don't want it to shadow the browser's `"zh"`.
 *   4. The first available content language
 *   5. A region-appropriate default: `zh_CN` for zh-base, otherwise `en`
 */
export function pickPreferredLang(
  contentLangs: string[],
  options: {
    userLang?: string;
    fromQuery?: string | null;
    injectedLocale?: string;
    navigatorLanguage?: string;
  } = {},
): string {
  const { userLang, fromQuery = null, injectedLocale, navigatorLanguage } = options;
  if (fromQuery && contentLangs.includes(fromQuery)) return fromQuery;
  if (userLang && contentLangs.includes(userLang)) return userLang;
  const baseCandidates = [
    userLang?.split(/[-_]/)[0],
    injectedLocale?.split(/[-_]/)[0],
    navigatorLanguage?.split(/[-_]/)[0],
  ].filter((s): s is string => !!s);
  // Try each base locale in priority order. Earlier bases win even if a
  // later base also matches: the user's stored `de` should not silently
  // shadow the browser's `zh`, and the server-injected `zh_CN` should
  // beat `navigator.language = en-US` when both have content.
  for (const base of baseCandidates) {
    const matched = contentLangs.find((lang) => lang === base || lang.startsWith(`${base}_`));
    if (matched) return matched;
  }
  const activeBaseLang = baseCandidates[0];
  return contentLangs[0] || (activeBaseLang === 'zh' ? 'zh_CN' : 'en');
}

export function readContentText(content: Record<string, string> | string | undefined, preferredLang: string): string {
  if (!content) return '';
  // The server stores pdoc.content as a JSON string of the form
  //   {"zh":"...markdown...","en":"...markdown..."}
  // (see packages/hydrooj/src/model/problem.ts). Normalize it to a locale map
  // before picking the requested language. If the string is not JSON-shaped we
  // assume it is already raw markdown and return it as-is.
  let map: Record<string, unknown> | null = null;
  if (typeof content === 'string') {
    if (content.trimStart().startsWith('{')) {
      try {
        const parsed = JSON.parse(content);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          map = parsed as Record<string, unknown>;
        }
      } catch {
        /* fall through */
      }
    }
    if (!map) return content;
  } else if (typeof content === 'object') {
    map = content as Record<string, unknown>;
  } else {
    return '';
  }
  const pickFromMap = (m: Record<string, unknown>): string => {
    // Try the requested locale, then a base-locale fallback (e.g. `zh_CN`
    // -> `zh`). This is the critical fix vs. the old "fall through to
    // firstAny" behaviour, which silently returned the English content for
    // every Chinese viewer because the server persists `en` first in the
    // locale map and `m['zh_CN']` was undefined for content keyed `{"en",
    // "zh"}`.
    const base = preferredLang.split(/[-_]/)[0];
    const candidateKeys: string[] = [];
    if (preferredLang) candidateKeys.push(preferredLang);
    if (base && base !== preferredLang) {
      candidateKeys.push(base);
      // Also try regional siblings (`zh_TW`, `zh_HK`, …) and the exact base.
      for (const key of Object.keys(m)) {
        if (key === base || key.startsWith(`${base}_`)) candidateKeys.push(key);
      }
    }
    for (const key of candidateKeys) {
      const direct = m[key];
      if (typeof direct === 'string') return direct;
      const directStr = String(direct ?? '');
      if (directStr.trimStart().startsWith('{')) {
        try {
          const parsed = JSON.parse(directStr);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            const parsedMap = parsed as Record<string, unknown>;
            for (const k of candidateKeys) {
              if (typeof parsedMap[k] === 'string') return parsedMap[k] as string;
            }
            const first = Object.values(parsedMap).find((v) => typeof v === 'string');
            if (typeof first === 'string') return first;
          }
        } catch {
          /* fall through */
        }
      }
    }
    const firstAny = Object.values(m).find((v) => typeof v === 'string');
    return typeof firstAny === 'string' ? firstAny : '';
  };
  return pickFromMap(map);
}
