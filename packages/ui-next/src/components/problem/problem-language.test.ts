import { describe, expect, it } from 'vitest';
import {
  buildMainLangsAndPreferences,
  getAvailableLangsForProblem,
  getSubLangs,
  type LangMeta,
  pickInitialLanguage,
} from './problem-language';

const langs: Record<string, LangMeta> = {
  cc: { display: 'C++', pretest: 'cc.cc17' },
  'cc.cc17': { display: 'C++17' },
  'cc.cc17o2': { display: 'C++17 (O2)' },
  py: { display: 'Python' },
  rs: { display: 'Rust', hidden: true },
};

describe('problem submit language model', () => {
  it('uses langRange as the allowed-language set', () => {
    const available = getAvailableLangsForProblem(
      { 'cc.cc17': 'C++17', py: 'Python' },
      langs,
    );
    expect(Object.keys(available)).toEqual(['cc.cc17', 'py']);
  });

  it('excludes disabled languages and keeps explicitly allowed hidden languages', () => {
    const available = getAvailableLangsForProblem(
      { 'py.py2': 'Python 2', rs: 'Rust' },
      langs,
    );
    expect(available).not.toHaveProperty('py.py2');
    expect(available).toHaveProperty('rs');
  });

  it('groups compound keys under their main language', () => {
    const available = getAvailableLangsForProblem(
      { 'cc.cc17': 'C++17', 'cc.cc17o2': 'C++17 (O2)' },
      langs,
    );
    const { mainLangs } = buildMainLangsAndPreferences(available, '', langs);
    expect(mainLangs).toEqual({ cc: 'C++' });
    expect(getSubLangs(available, 'cc')).toEqual({ cc17: 'C++17', cc17o2: 'C++17 (O2)' });
  });

  it('prefers UserContext.codeLang when it is available', () => {
    const available = getAvailableLangsForProblem(
      { 'cc.cc17': 'C++17', py: 'Python' },
      langs,
    );
    const { mainLangs, preferences } = buildMainLangsAndPreferences(available, 'py', langs);
    expect(pickInitialLanguage(available, mainLangs, preferences)).toEqual(['py', '']);
  });

  it('preserves the legacy pretest preference mapping', () => {
    const available = getAvailableLangsForProblem(
      { 'cc.cc17': 'C++17', 'cc.cc17o2': 'C++17 (O2)' },
      langs,
    );
    const { mainLangs, preferences } = buildMainLangsAndPreferences(available, 'cc.cc17', langs);
    expect(preferences).toEqual(['cc.cc17']);
    expect(pickInitialLanguage(available, mainLangs, preferences)).toEqual(['cc', 'cc17']);
  });

  it('falls back to the first available complete language key', () => {
    const available = getAvailableLangsForProblem({ py: 'Python', 'cc.cc17': 'C++17' }, langs);
    const { mainLangs } = buildMainLangsAndPreferences(available, 'missing', langs);
    expect(pickInitialLanguage(available, mainLangs, ['missing'])).toEqual(['cc', 'cc17']);
  });
});
