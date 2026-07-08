import { useEffect, useId, useRef, useState } from 'react';
import styles from './Select.module.css';

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
}

interface SelectProps<T extends string = string> {
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  ariaLabel?: string;
  className?: string;
}

export function Select<T extends string = string>({
  value,
  options,
  onChange,
  ariaLabel,
  className,
}: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listId = useId();

  const current = options.find((o) => o.value === value) ?? options[0];

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const selectAt = (idx: number) => {
    const next = options[(idx + options.length) % options.length];
    if (next) onChange(next.value);
  };

  const onTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) setOpen(true);
      else selectAt(options.findIndex((o) => o.value === value) + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) setOpen(true);
      else selectAt(options.findIndex((o) => o.value === value) - 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen((v) => !v);
    }
  };

  const choose = (next: T) => {
    onChange(next);
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div className={`${styles.root} ${className ?? ''}`} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
      >
        <span>{current?.label ?? ''}</span>
        <svg
          className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <ul
          id={listId}
          className={styles.menu}
          role="listbox"
          aria-label={ariaLabel}
          aria-activedescendant={
            current ? `${listId}-${current.value}` : undefined
          }
        >
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <li
                key={opt.value}
                id={`${listId}-${opt.value}`}
                role="option"
                aria-selected={active}
                tabIndex={0}
                className={`${styles.option} ${active ? styles.optionActive : ''}`}
                onClick={() => choose(opt.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    choose(opt.value);
                  }
                }}
              >
                <span>{opt.label}</span>
                {active && (
                  <svg
                    className={styles.check}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    aria-hidden="true"
                  >
                    <path d="m5 12 5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
