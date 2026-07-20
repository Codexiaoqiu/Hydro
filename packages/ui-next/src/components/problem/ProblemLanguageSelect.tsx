import { useMemo, useState } from 'react';
import { useTranslate } from '../../lib/i18n';
import {
  buildMainLangsAndPreferences,
  getAvailableLangsForProblem,
  getSubLangs,
  type LangMeta,
  pickInitialLanguage,
} from './problem-language';

export interface ProblemLanguageSelectProps {
  langRange: Record<string, string>;
  langs: Record<string, LangMeta>;
  codeLang?: string;
  name?: string;
}

export default function ProblemLanguageSelect({
  langRange, langs, codeLang = '', name = 'lang',
}: ProblemLanguageSelectProps) {
  const t = useTranslate();
  const available = useMemo(
    () => getAvailableLangsForProblem(langRange, langs),
    [langRange, langs],
  );
  const { mainLangs, preferences } = useMemo(
    () => buildMainLangsAndPreferences(available, codeLang, langs),
    [available, codeLang, langs],
  );
  const [initialMain, initialSub] = useMemo(
    () => pickInitialLanguage(available, mainLangs, preferences),
    [available, mainLangs, preferences],
  );
  const [main, setMain] = useState(initialMain);
  const [sub, setSub] = useState(initialSub);
  const subLangs = getSubLangs(available, main);
  const fullKey = sub ? `${main}.${sub}` : main;

  const changeMain = (nextMain: string) => {
    const nextSubs = getSubLangs(available, nextMain);
    setMain(nextMain);
    setSub(Object.keys(nextSubs)[0] || '');
  };

  return (
    <div>
      <label>
        <span>{t('ProblemSubmit.Language')}</span>
        <select value={main} onChange={(event) => changeMain(event.currentTarget.value)}>
          {Object.entries(mainLangs).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </label>
      {Object.keys(subLangs).length > 0 && (
        <label>
          <span>{t('ProblemSubmit.LanguageVersion')}</span>
          <select value={sub} onChange={(event) => setSub(event.currentTarget.value)}>
            {Object.entries(subLangs).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
      )}
      <input type="hidden" name={name} value={fullKey} />
    </div>
  );
}
