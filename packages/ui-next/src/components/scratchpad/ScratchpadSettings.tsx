/* eslint-disable max-len */
import { useState } from 'react';
import styles from './Scratchpad.module.css';
import { persistScratchpadSettings, readScratchpadSettings, type ScratchpadEditorTheme, type ScratchpadSettingsValue } from './scratchpad-settings-storage';

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
