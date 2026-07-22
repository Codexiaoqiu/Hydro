import { Button } from '../primitives/Button';
import type { ProblemConfigYaml } from '../../lib/yaml-config';
import styles from './ProblemConfigTree.module.css';

export interface ProblemConfigTreeProps {
  config: ProblemConfigYaml;
  testdata: string[];
  onChange: (next: ProblemConfigYaml) => void;
  onAutoDetect: () => void;
}

export function ProblemConfigTree({ config, testdata, onChange, onAutoDetect }: ProblemConfigTreeProps) {
  const subtasks = config.subtasks ?? [];

  const updateSubtask = (idx: number, patch: Partial<(typeof subtasks)[number]>) => {
    const next = subtasks.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    onChange({ ...config, subtasks: next });
  };

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <h3 className={styles.title}>Subtasks</h3>
        <Button variant="ghost" onClick={onAutoDetect}>Auto Detect</Button>
      </header>
      {subtasks.length === 0 ? (
        <p className={styles.empty}>
          No subtasks. Click &quot;Auto Detect&quot; to infer from filenames ({testdata.length} files).
        </p>
      ) : (
        <ol className={styles.list}>
          {subtasks.map((s, i) => (
            <li key={i} className={styles.row}>
              <div className={styles.rowHeader}>Subtask {i + 1} ({s.cases?.length ?? 0} cases)</div>
              <div className={styles.fields}>
                <label>Score<input type="number" value={s.score ?? 0} onChange={(e) => updateSubtask(i, { score: Number(e.target.value) })} /></label>
                <label>Time (ms)<input type="number" value={s.time_limit ?? 1000} onChange={(e) => updateSubtask(i, { time_limit: Number(e.target.value) })} /></label>
                <label>Memory (MB)<input type="number" value={s.memory_limit ?? 256} onChange={(e) => updateSubtask(i, { memory_limit: Number(e.target.value) })} /></label>
              </div>
              {s.cases && s.cases.length > 0 && (
                <ul className={styles.cases}>
                  {s.cases.map((c, j) => (
                    <li key={j} className={styles.case}>{c.input} → {c.output}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
