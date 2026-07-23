import type { ReactNode } from 'react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { SubtaskConfig } from '@hydrooj/common';
import { Button } from '../primitives/Button';
import { Input } from '../primitives/Input';
import styles from './SubtaskSettings.module.css';

const SUBTASK_TYPE_OPTIONS = ['min', 'max', 'sum'] as const;

export interface SubtaskSettingsProps {
  open: boolean;
  subtask: SubtaskConfig;
  index: number;
  onApply: (patch: Partial<SubtaskConfig>) => void;
  onCancel: () => void;
}

/**
 * Modal for editing a single subtask's scoring/time/memory/type. Mirrors the
 * `SubtaskSettings` modal in ui-default's `ProblemConfigTree` so the data
 * shape lines up with what the judge expects.
 *
 * YAGNI: dependencies (`if`) and animation are deferred — the modal edits
 * just the core fields so tests can lock the contract.
 */
export function SubtaskSettings({
  open, subtask, index, onApply, onCancel,
}: SubtaskSettingsProps): ReactNode {
  const [score, setScore] = useState<number>(subtask.score ?? 10);
  const [time, setTime] = useState<string>(typeof subtask.time === 'string' ? subtask.time : '');
  const [memory, setMemory] = useState<string>(typeof subtask.memory === 'string' ? subtask.memory : '');
  const [type, setType] = useState<SubtaskConfig['type']>(subtask.type ?? 'sum');

  if (!open || typeof document === 'undefined') return null;

  const submit = () => {
    const patch: Partial<SubtaskConfig> = {
      score,
      type,
      time: time || undefined,
      memory: memory || undefined,
    };
    onApply(patch);
  };

  return createPortal(
    <div className={styles.backdrop} onClick={onCancel}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-labelledby="subtask-settings-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="subtask-settings-title" className={styles.title}>
          Subtask {index + 1}
        </h2>
        <div className={styles.grid}>
          <Input
            label="Score (1-100)"
            type="number"
            min={1}
            max={100}
            value={String(score)}
            onChange={(e) => setScore(Math.max(1, Math.min(100, Number(e.currentTarget.value) || 1)))}
          />
          <label className={styles.field}>
            <span className={styles.label}>Scoring type</span>
            <select
              className={styles.select}
              value={type}
              onChange={(e) => setType(e.currentTarget.value as SubtaskConfig['type'])}
            >
              {SUBTASK_TYPE_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </label>
          <Input
            label="Time (e.g. 1s, 100ms)"
            type="text"
            value={time}
            onChange={(e) => setTime(e.currentTarget.value)}
          />
          <Input
            label="Memory (e.g. 256MB, 1GB)"
            type="text"
            value={memory}
            onChange={(e) => setMemory(e.currentTarget.value)}
          />
        </div>
        <div className={styles.actions}>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" onClick={submit}>Apply</Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}