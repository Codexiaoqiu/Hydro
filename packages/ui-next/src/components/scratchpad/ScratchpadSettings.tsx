import { useState } from 'react';
import styles from './Scratchpad.module.css';

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

function persistScratchpadSettings(settings: ScratchpadSettingsValue) {
  try {
    window.localStorage.setItem(SCRATCHPAD_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {}
  window.dispatchEvent(new CustomEvent(SCRATCHPAD_SETTINGS_CHANGE_EVENT, { detail: settings }));
}

export function ScratchpadSettings() {
  const [settings, setSettings] = useState(readScratchpadSettings);

  function update(patch: Partial<ScratchpadSettingsValue>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    persistScratchpadSettings(next);
  }

  return (
    <section
      id="scratchpad-settings-panel"
      className={styles.settingsPanel}
      role="tabpanel"
      aria-label="Scratchpad settings"
    >
      <label className={styles.settingField}>
        Pretest interval (s)
        <input
          type="number"
          min="0"
          step="1"
          value={settings.pretestInterval}
          onChange={(event) => update({ pretestInterval: Number(event.target.value) })}
        />
      </label>
      <label className={styles.settingField}>
        Editor theme
        <select
          value={settings.editorTheme}
          onChange={(event) => update({ editorTheme: event.target.value as ScratchpadEditorTheme })}
        >
          <option value="auto">Auto</option>
          <option value="vs-light">Light</option>
          <option value="vs-dark">Dark</option>
        </select>
      </label>
      <label className={styles.settingField}>
        Font size
        <input
          type="number"
          min="1"
          step="1"
          value={settings.fontSize}
          onChange={(event) => update({ fontSize: Number(event.target.value) })}
        />
      </label>
    </section>
  );
}
