import type { InputHTMLAttributes, ReactNode } from 'react';
import { useId } from 'react';
import styles from './Checkbox.module.css';

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'prefix'> {
  label?: ReactNode;
}

/**
 * Checkbox styled for the dark/light theme via tokens. The native `<input>` is
 * visually hidden and the visible box is a styled `<label>` sibling so the
 * whole row is clickable.
 */
export function Checkbox({
  label,
  className,
  id,
  disabled,
  checked,
  defaultChecked,
  ...rest
}: CheckboxProps) {
  const autoId = useId();
  const inputId = id ?? `cb-${autoId}`;
  const isChecked = checked ?? defaultChecked ?? false;

  return (
    <label
      htmlFor={inputId}
      className={`${styles.wrap} ${className ?? ''}`}
      data-checked={isChecked ? 'true' : 'false'}
      data-disabled={disabled ? 'true' : 'false'}
    >
      <span className={styles.box}>
        <input
          id={inputId}
          type="checkbox"
          className={styles.input}
          checked={checked}
          defaultChecked={defaultChecked}
          disabled={disabled}
          {...rest}
        />
      </span>
      {label && <span>{label}</span>}
    </label>
  );
}
