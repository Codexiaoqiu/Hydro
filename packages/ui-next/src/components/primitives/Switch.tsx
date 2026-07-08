import type { InputHTMLAttributes, ReactNode } from 'react';
import { useId } from 'react';
import styles from './Switch.module.css';

export interface SwitchProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'prefix'> {
  label?: ReactNode;
  description?: ReactNode;
}

/**
 * Toggle switch with optional label and supporting description. Uses tokens
 * so the on-state shows the brand gradient and the knob matches text-on-cyan.
 */
export function Switch({
  label,
  description,
  className,
  id,
  disabled,
  checked,
  defaultChecked,
  ...rest
}: SwitchProps) {
  const autoId = useId();
  const inputId = id ?? `sw-${autoId}`;
  const isChecked = checked ?? defaultChecked ?? false;

  return (
    <label
      htmlFor={inputId}
      className={`${styles.wrap} ${className ?? ''}`}
      data-checked={isChecked ? 'true' : 'false'}
      data-disabled={disabled ? 'true' : 'false'}
    >
      <span className={styles.track}>
        <input
          id={inputId}
          type="checkbox"
          role="switch"
          className={styles.input}
          checked={checked}
          defaultChecked={defaultChecked}
          disabled={disabled}
          {...rest}
        />
        <span className={styles.knob} aria-hidden="true" />
      </span>
      {(label || description) && (
        <span className={styles.label}>
          {label && <span className={styles.labelText}>{label}</span>}
          {description && <span className={styles.labelHint}>{description}</span>}
        </span>
      )}
    </label>
  );
}