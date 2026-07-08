import type { InputHTMLAttributes, ReactNode } from 'react';
import { useId } from 'react';
import styles from './Input.module.css';

export type InputType = 'text' | 'email' | 'password' | 'number' | 'url' | 'tel';

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  prefix?: ReactNode;
  suffix?: ReactNode;
  /** Override the htmlFor/aria relationship target. Defaults to a generated id. */
  id?: string;
}

/**
 * Form input with label, hint, error, and optional affix slots.
 * Wraps `<input>` so it accepts every native attribute (autoFocus, autoComplete, name, …).
 * Styles come from `tokens.css` and adapt to dark/light themes automatically.
 */
export function Input({
  label,
  hint,
  error,
  required,
  prefix,
  suffix,
  className,
  id,
  type = 'text',
  ...rest
}: InputProps) {
  const autoId = useId();
  const inputId = id ?? `input-${autoId}`;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`${styles.field} ${className ?? ''}`}>
      {label && (
        <label className={styles.label} htmlFor={inputId}>
          {label}
          {required && (
            <span className={styles.required} aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      <div className={`${styles.inputWrap} ${error ? styles.invalid : ''}`}>
        {prefix && <span className={`${styles.affix} ${styles.affixLeft}`}>{prefix}</span>}
        <input
          id={inputId}
          type={type}
          className={styles.input}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          {...rest}
        />
        {suffix && <span className={`${styles.affix} ${styles.affixRight}`}>{suffix}</span>}
      </div>
      {hint && !error && (
        <span id={hintId} className={styles.hint}>
          {hint}
        </span>
      )}
      {error && (
        <span id={errorId} className={styles.error} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}