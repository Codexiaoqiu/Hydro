import type { SubtaskConfig, TestCaseConfig } from '@hydrooj/common';
import { useState } from 'react';
import { Button } from '../primitives/Button';
import { Input } from '../primitives/Input';
import { useTranslate } from '../../lib/i18n';
import { dumpProblemConfigYaml, parseProblemConfigYaml, type ProblemConfigYaml } from '../../lib/yaml-config';
import { SubtaskSettings } from './SubtaskSettings';
import styles from './ProblemConfigTree.module.css';

export interface ProblemConfigTreeProps {
  config: ProblemConfigYaml;
  testdata: string[];
  onChange: (next: ProblemConfigYaml) => void;
  onAutoDetect: () => void;
}

// Subtask tree:
//  - Global settings (time/memory defaults that apply to all subtasks).
//  - Per-subtask: time / memory / score / scoring-type (min/max/sum).
//  - Add and remove subtask buttons (remove uses confirm()).
// YAGNI: drag-and-drop (react-dnd) and animation are intentionally out of
// scope.

const SUBTASK_TYPE_OPTIONS = ['min', 'max', 'sum'] as const;

export function ProblemConfigTree({ config, testdata, onChange, onAutoDetect }: ProblemConfigTreeProps) {
  const t = useTranslate();
  const subtasks = (config.subtasks ?? []) as SubtaskConfig[];
  const [settingsFor, setSettingsFor] = useState<number | null>(null);

  const apply = (mutate: (cfg: ProblemConfigYaml) => ProblemConfigYaml) => {
    const next = mutate(config);
    onChange(next);
  };

  const updateSubtask = (idx: number, patch: Partial<SubtaskConfig>) => {
    apply((cfg) => ({
      ...cfg,
      subtasks: (cfg.subtasks ?? []).map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    }));
  };

  const addSubtask = () => {
    apply((cfg) => ({
      ...cfg,
      subtasks: [
        ...(cfg.subtasks ?? []),
        {
          type: 'sum',
          score: 10,
          id: (cfg.subtasks?.length ?? 0) + 1,
          cases: [],
        },
      ],
    }));
  };

  const removeSubtask = (idx: number) => {
    if (typeof window !== 'undefined' && !window.confirm(`Delete subtask ${idx + 1}?`)) return;
    apply((cfg) => ({
      ...cfg,
      subtasks: (cfg.subtasks ?? []).filter((_, i) => i !== idx),
    }));
  };

  // Global time/memory apply to all subtasks that don't have their own.
  const setGlobalTime = (raw: string) =>
    apply((cfg) => {
      const yamlText = dumpProblemConfigYaml({ ...cfg, time: raw || undefined });
      return parseProblemConfigYaml(yamlText);
    });
  const setGlobalMemory = (raw: string) =>
    apply((cfg) => {
      const yamlText = dumpProblemConfigYaml({ ...cfg, memory: raw || undefined });
      return parseProblemConfigYaml(yamlText);
    });

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <h3 className={styles.title}>{t('ProblemConfig.TreeSubtasks')}</h3>
        <div className={styles.headerActions}>
          <Button variant="ghost" onClick={onAutoDetect}>{t('ProblemConfig.TreeAutoDetect')}</Button>
          <Button variant="primary" onClick={addSubtask}>+ Add</Button>
        </div>
      </header>

      {/* Global defaults */}
      <div className={styles.global}>
        <Input
          label="Global time (e.g. 1s)"
          type="text"
          value={typeof config.time === 'string' ? config.time : ''}
          onChange={(e) => setGlobalTime(e.currentTarget.value)}
        />
        <Input
          label="Global memory (e.g. 256MB)"
          type="text"
          value={typeof config.memory === 'string' ? config.memory : ''}
          onChange={(e) => setGlobalMemory(e.currentTarget.value)}
        />
      </div>

      {subtasks.length === 0 ? (
        <p className={styles.empty}>{t('ProblemConfig.TreeEmpty', { count: testdata.length })}</p>
      ) : (
        <ol className={styles.list}>
          {subtasks.map((s, i) => (
            <li key={i} className={styles.row}>
              <div className={styles.rowHeader}>
                <span>{t('ProblemConfig.TreeSubtaskTitle', { index: i + 1, count: s.cases?.length ?? 0 })}</span>
                <div className={styles.headerActions}>
                  <Button variant="ghost" onClick={() => setSettingsFor(i)}>Settings</Button>
                  <Button variant="ghost" onClick={() => removeSubtask(i)}>Remove</Button>
                </div>
              </div>
              <div className={styles.fields}>
                <label>
                  {t('ProblemConfig.TreeScore')}
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={s.score ?? 0}
                    onChange={(e) => updateSubtask(i, { score: Number(e.target.value) })}
                  />
                </label>
                <label>
                  Time (e.g. 1s)
                  <input
                    type="text"
                    value={typeof s.time === 'string' ? s.time : ''}
                    placeholder="(use global)"
                    onChange={(e) => updateSubtask(i, { time: e.currentTarget.value || undefined })}
                  />
                </label>
                <label>
                  Memory (e.g. 256MB)
                  <input
                    type="text"
                    value={typeof s.memory === 'string' ? s.memory : ''}
                    placeholder="(use global)"
                    onChange={(e) => updateSubtask(i, { memory: e.currentTarget.value || undefined })}
                  />
                </label>
                <label>
                  Scoring type
                  <select
                    value={s.type ?? 'sum'}
                    onChange={(e) => updateSubtask(i, { type: e.currentTarget.value as SubtaskConfig['type'] })}
                  >
                    {SUBTASK_TYPE_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </label>
              </div>
              {s.cases && s.cases.length > 0 && (
                <ul className={styles.cases}>
                  {s.cases.map((c: TestCaseConfig, j) => (
                    <li key={j} className={styles.case}>{c.input} → {c.output}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      )}

      {settingsFor !== null && subtasks[settingsFor] && (
        <SubtaskSettings
          open
          index={settingsFor}
          subtask={subtasks[settingsFor]}
          onApply={(patch) => {
            updateSubtask(settingsFor, patch);
            setSettingsFor(null);
          }}
          onCancel={() => setSettingsFor(null)}
        />
      )}
    </div>
  );
}
