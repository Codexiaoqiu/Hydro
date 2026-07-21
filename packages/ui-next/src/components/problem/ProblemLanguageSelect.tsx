import { useMemo, useState } from 'react';
import { useTranslate } from '../../lib/i18n';
import { Select } from '../primitives/Select';
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

  const mainOptions = useMemo(
    () => Object.entries(mainLangs).map(([value, label]) => ({ value, label })),
    [mainLangs],
  );
  const subOptions = useMemo(
    () => Object.entries(subLangs).map(([value, label]) => ({ value, label })),
    [subLangs],
  );

  const changeMain = (nextMain: string) => {
    const nextSubs = getSubLangs(available, nextMain);
    setMain(nextMain);
    setSub(Object.keys(nextSubs)[0] || '');
  };

  return (
    <div>
      <label>
        <span>{t('ProblemSubmit.Language')}</span>
        <Select
          value={main}
          options={mainOptions}
          onChange={changeMain}
          ariaLabel={t('ProblemSubmit.Language')}
        />
      </label>
      {subOptions.length > 0 && (
        <label>
          <span>{t('ProblemSubmit.LanguageVersion')}</span>
          <Select
            value={sub}
            options={subOptions}
            onChange={setSub}
            ariaLabel={t('ProblemSubmit.LanguageVersion')}
          />
        </label>
      )}
      <input type="hidden" name={name} value={fullKey} />
    </div>
  );
}