export const SCRATCHPAD_SETTINGS_STORAGE_KEY = 'hydro.scratchpad.settings';
export const SCRATCHPAD_SETTINGS_CHANGE_EVENT = 'hydro:scratchpad-settings-change';

export type ScratchpadEditorTheme = 'vs-light' | 'vs-dark' | 'auto';

export interface ScratchpadSettingsValue {
  pretestInterval: number;
  editorTheme: ScratchpadEditorTheme;
  fontSize: number;
}

export const DEFAULT_SCRATCHPAD_SETTINGS: ScratchpadSettingsValue = {
  pretestInterval: 5,
  editorTheme: 'auto',
  fontSize: 14,
};

function validNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : fallback;
}

export function readScratchpadSettings(): ScratchpadSettingsValue {
  if (typeof window === 'undefined') return { ...DEFAULT_SCRATCHPAD_SETTINGS };

  try {
    const raw = JSON.parse(window.localStorage.getItem(SCRATCHPAD_SETTINGS_STORAGE_KEY) ?? '{}');
    const editorTheme = raw?.editorTheme === 'vs-light' || raw?.editorTheme === 'vs-dark' || raw?.editorTheme === 'auto'
      ? raw.editorTheme
      : DEFAULT_SCRATCHPAD_SETTINGS.editorTheme;
    return {
      pretestInterval: validNumber(raw?.pretestInterval, DEFAULT_SCRATCHPAD_SETTINGS.pretestInterval),
      editorTheme,
      fontSize: validNumber(raw?.fontSize, DEFAULT_SCRATCHPAD_SETTINGS.fontSize),
    };
  } catch {
    return { ...DEFAULT_SCRATCHPAD_SETTINGS };
  }
}

export function persistScratchpadSettings(settings: ScratchpadSettingsValue) {
  try {
    window.localStorage.setItem(SCRATCHPAD_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {}
  window.dispatchEvent(new CustomEvent(SCRATCHPAD_SETTINGS_CHANGE_EVENT, { detail: settings }));
}
