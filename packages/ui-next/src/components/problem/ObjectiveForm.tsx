import { useMemo, useState } from 'react';
import { Button } from '../primitives/Button';
import styles from './ObjectiveForm.module.css';

export type ObjectiveQuestionType = 'text' | 'single' | 'multiple';

export interface ObjectiveQuestion {
  id: string;
  type: ObjectiveQuestionType;
  label: string;
  /** Required for `single` / `multiple`. */
  options?: string[];
  required?: boolean;
}

export type ObjectiveAnswers = Record<string, string | string[]>;

export interface ObjectiveFormProps {
  questions: ObjectiveQuestion[];
  /** Initial values keyed by `question.id`. */
  initialAnswers?: ObjectiveAnswers;
  /** Invoked with the collected answers when validation passes. */
  onSubmit: (answers: ObjectiveAnswers) => void;
  /** Submit button label. */
  submitLabel?: string;
}

interface ValidationError {
  id: string;
  message: string;
}

/** Build a blank answer map seeded from `initialAnswers`. */
function seedAnswers(questions: ObjectiveQuestion[], initial?: ObjectiveAnswers): ObjectiveAnswers {
  const out: ObjectiveAnswers = {};
  for (const q of questions) {
    const seed = initial?.[q.id];
    if (seed !== undefined) {
      out[q.id] = seed;
    } else if (q.type === 'multiple') {
      out[q.id] = [];
    } else {
      out[q.id] = '';
    }
  }
  return out;
}

function validate(questions: ObjectiveQuestion[], answers: ObjectiveAnswers): ValidationError[] {
  const errors: ValidationError[] = [];
  for (const q of questions) {
    if (!q.required) continue;
    const value = answers[q.id];
    const blank = Array.isArray(value) ? value.length === 0 : !value?.toString().trim();
    if (blank) errors.push({ id: q.id, message: 'This question is required.' });
  }
  return errors;
}

export function ObjectiveForm({
  questions,
  initialAnswers,
  onSubmit,
  submitLabel = 'Submit',
}: ObjectiveFormProps) {
  const [answers, setAnswers] = useState<ObjectiveAnswers>(() =>
    seedAnswers(questions, initialAnswers));
  const [errors, setErrors] = useState<ValidationError[]>([]);

  const errorById = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of errors) map.set(e.id, e.message);
    return map;
  }, [errors]);

  const updateSingle = (id: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const toggleMultiple = (id: string, option: string) => {
    setAnswers((prev) => {
      const current = Array.isArray(prev[id]) ? (prev[id] as string[]) : [];
      const idx = current.indexOf(option);
      const next = idx >= 0 ? current.filter((v) => v !== option) : [...current, option];
      return { ...prev, [id]: next.sort() };
    });
  };

  const updateText = (id: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = (e?: React.FormEvent) => {
    const nextErrors = validate(questions, answers);
    if (nextErrors.length > 0) {
      e?.preventDefault();
      setErrors(nextErrors);
      return;
    }
    setErrors([]);
    // Strip blanks for optional questions so the YAML stays small.
    const payload: ObjectiveAnswers = {};
    for (const q of questions) {
      const value = answers[q.id];
      const blank = Array.isArray(value) ? value.length === 0 : !value?.toString().trim();
      if (!blank) payload[q.id] = value as string | string[];
    }
    // Hand the validated answers up. The parent is responsible for actually
    // shipping them — typically by populating a hidden input and letting the
    // surrounding <form> submit natively.
    onSubmit(payload);
    // Do NOT preventDefault here — the parent form's onSubmit handler runs
    // next and decides whether to ship the payload via native form submit.
  };

  return (
    <div className={styles.form} data-objective-form>
      <ol className={styles.list}>
        {questions.map((q, idx) => {
          const error = errorById.get(q.id);
          return (
            <li key={q.id} className={styles.item} data-question-id={q.id}>
              <div className={styles.header}>
                <span className={styles.index}>{idx + 1}.</span>
                <span className={styles.label}>
                  {q.label}
                  {q.required && (
                    <span className={styles.required} aria-label="required">*</span>
                  )}
                </span>
              </div>
              <div className={styles.controls}>
                {q.type === 'single' && (
                  <div className={styles.options} role="radiogroup" aria-label={q.label}>
                    {(q.options ?? []).map((opt) => {
                      const id = `${q.id}-${opt}`;
                      const checked = answers[q.id] === opt;
                      return (
                        <label key={opt} htmlFor={id} className={styles.option}>
                          <input
                            id={id}
                            type="radio"
                            name={q.id}
                            value={opt}
                            checked={checked}
                            onChange={() => updateSingle(q.id, opt)}
                          />
                          <span>{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
                {q.type === 'multiple' && (
                  <div className={styles.options} role="group" aria-label={q.label}>
                    {(q.options ?? []).map((opt) => {
                      const id = `${q.id}-${opt}`;
                      const current = Array.isArray(answers[q.id]) ? (answers[q.id] as string[]) : [];
                      const checked = current.includes(opt);
                      return (
                        <label key={opt} htmlFor={id} className={styles.option}>
                          <input
                            id={id}
                            type="checkbox"
                            value={opt}
                            checked={checked}
                            onChange={() => toggleMultiple(q.id, opt)}
                          />
                          <span>{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
                {q.type === 'text' && (
                  <textarea
                    className={styles.textarea}
                    value={(answers[q.id] as string) ?? ''}
                    onChange={(e) => updateText(q.id, e.target.value)}
                    rows={4}
                    aria-label={q.label}
                    aria-required={q.required || undefined}
                  />
                )}
              </div>
              {error && (
                <div role="alert" className={styles.error}>{error}</div>
              )}
            </li>
          );
        })}
      </ol>
      {errors.length > 0 && errors.length === questions.filter((q) => q.required).length && (
        <div role="alert" className={styles.summary}>
          Please answer all required questions before submitting.
        </div>
      )}
      <div className={styles.actions}>
        {/* Button is wired through the parent <form>'s submit handler so the
            page can ship the answers as a single hidden-content field. The
            button itself uses type="button" and asks the parent to validate
            + serialize via the ObjectiveForm's imperative submit() API. */}
        <Button type="button" variant="primary" onClick={() => handleSubmit()}>
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}