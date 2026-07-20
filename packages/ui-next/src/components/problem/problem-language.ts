export interface LangMeta {
  display: string;
  hidden?: boolean;
  disabled?: boolean;
  pretest?: string;
  [key: string]: unknown;
}

export function getAvailableLangsForProblem(
  langRange: Record<string, string>,
  langs: Record<string, LangMeta>,
): Record<string, LangMeta> {
  const prefixes = new Set(
    Object.keys(langs).filter((key) => key.includes('.')).map((key) => key.split('.')[0]),
  );
  const available: Record<string, LangMeta> = {};
  for (const key in langs) {
    if (prefixes.has(key)) continue;
    if (!Object.hasOwn(langRange, key)) continue;
    if (langs[key].disabled) continue;
    available[key] = langs[key];
  }
  return available;
}

export function buildMainLangsAndPreferences(
  availableLangs: Record<string, LangMeta>,
  codeLang: string,
  langs: Record<string, LangMeta>,
): { mainLangs: Record<string, string>, preferences: string[] } {
  const mainLangs: Record<string, string> = {};
  const preferences = [codeLang || ''];
  for (const key in availableLangs) {
    if (langs[key]?.pretest === preferences[0]) preferences.push(key);
    if (!key.includes('.')) mainLangs[key] = langs[key]?.display || key;
    else {
      const main = key.split('.')[0];
      mainLangs[main] = langs[main]?.display || main;
    }
  }
  for (const key in availableLangs) {
    const pretest = langs[key]?.pretest;
    if (typeof pretest === 'string' && pretest.split('.')[0] === preferences[0].split('.')[0]) {
      preferences.push(key);
    }
  }
  return { mainLangs, preferences };
}

export function pickInitialLanguage(
  availableLangs: Record<string, LangMeta>,
  mainLangs: Record<string, string>,
  preferences: string[],
): [string, string] {
  for (const preference of preferences) {
    if (preference.includes('.')) {
      const [main, sub] = preference.split('.');
      if (availableLangs[preference]) return [main, sub];
      if (availableLangs[main]) return [main, ''];
    } else if (availableLangs[preference]) return [preference, ''];
  }
  const main = Object.keys(mainLangs)[0] || '';
  for (const key in availableLangs) {
    if (key.startsWith(`${main}.`)) return [main, key.split('.')[1]];
  }
  return [main, ''];
}

export function getSubLangs(
  availableLangs: Record<string, LangMeta>,
  main: string,
): Record<string, string> {
  const options: Record<string, string> = {};
  for (const key in availableLangs) {
    if (key.startsWith(`${main}.`)) options[key.split('.')[1]] = availableLangs[key].display;
  }
  return options;
}
