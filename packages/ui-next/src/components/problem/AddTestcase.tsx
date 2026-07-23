import type { ReactNode } from 'react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../primitives/Button';
import { Input } from '../primitives/Input';
import styles from './AddTestcase.module.css';

export interface AddTestcaseProps {
  open: boolean;
  testdata: string[];
  onAdd: (input: string, output: string) => void;
  onCancel: () => void;
}

/**
 * Modal for picking an input/output pair from the testdata directory and
 * appending it to the currently selected subtask. Mirrors ui-default's
 * `AddTestcase` component so the data shape (`{ input, output }`) matches
 * what `ProblemConfigTree` already handles.
 */
export function AddTestcase({
  open, testdata, onAdd, onCancel,
}: AddTestcaseProps): ReactNode {
  const [input, setInput] = useState<string>('');
  const [output, setOutput] = useState<string>('');

  if (!open || typeof document === 'undefined') return null;

  const submit = () => {
    if (!input || !output) return;
    onAdd(input, output);
  };

  return createPortal(
    <div className={styles.backdrop} onClick={onCancel}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-labelledby="add-testcase-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="add-testcase-title" className={styles.title}>Add test case</h2>
        <div className={styles.grid}>
          <label className={styles.field}>
            <span className={styles.label}>Input file</span>
            <select
              className={styles.select}
              value={input}
              onChange={(e) => setInput(e.currentTarget.value)}
            >
              <option value="">— pick input —</option>
              {testdata.filter((f) => /\.(in|IN|txt|TXT)$/.test(f)).map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Output file</span>
            <select
              className={styles.select}
              value={output}
              onChange={(e) => setOutput(e.currentTarget.value)}
            >
              <option value="">— pick output —</option>
              {testdata.filter((f) => /\.(out|OUT|ans|ANS)$/.test(f)).map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </label>
        </div>
        <div className={styles.preview}>
          {input && output ? (
            <code>{input} → {output}</code>
          ) : (
            <span className={styles.hint}>Pick both files to enable.</span>
          )}
        </div>
        <div className={styles.actions}>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Input type="hidden" />
          <Button variant="primary" onClick={submit} disabled={!input || !output}>
            Add
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}