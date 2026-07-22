import { Input } from '../primitives/Input';
import type { ProblemConfigYaml } from '../../lib/yaml-config';
import styles from './ProblemConfigBasicForm.module.css';

export interface ProblemConfigBasicFormProps {
  config: ProblemConfigYaml;
  onChange: (next: ProblemConfigYaml) => void;
}

const TYPES = [
  { value: 'default', label: 'Standard (default)' },
  { value: 'objective', label: 'Objective' },
  { value: 'submit_answer', label: 'Submit Answer' },
  { value: 'interactive', label: 'Interactive' },
  { value: 'communication', label: 'Communication' },
];

export function ProblemConfigBasicForm({ config, onChange }: ProblemConfigBasicFormProps) {
  const set = <K extends keyof ProblemConfigYaml>(k: K, v: ProblemConfigYaml[K]) =>
    onChange({ ...config, [k]: v });

  return (
    <div className={styles.grid}>
      <label className={styles.field}>
        <span className={styles.label}>Type</span>
        <select
          className={styles.select}
          value={config.type ?? 'default'}
          onChange={(e) => set('type', e.currentTarget.value as ProblemConfigYaml['type'])}
        >
          {TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
      <Input
        label="Count (cases per subtask)"
        type="number"
        min={1}
        value={config.count ?? 10}
        onChange={(e) => set('count', Number(e.currentTarget.value))}
      />
      <Input
        label="Sub-Limit (ms)"
        type="number"
        min={0}
        value={config.subLimit ?? 0}
        onChange={(e) => set('subLimit', Number(e.currentTarget.value))}
      />
    </div>
  );
}
