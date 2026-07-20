import {
  type ChangeEvent, type KeyboardEvent, useCallback, useEffect, useId, useMemo, useState,
} from 'react';
import styles from './LanguageSelectAutoComplete.module.css';

export interface LanguageOption {
  /** Language key as known to the judge (e.g. `cpp`, `py3`). */
  value: string;
  /** Human-readable display name (e.g. `C++17`). */
  label: string;
}

export interface LanguageSelectAutoCompleteProps {
  /** Currently selected language keys. */
  value: string[];
  onChange: (next: string[]) => void;
  /** Full set of languages the user can choose from. */
  languages: LanguageOption[];
  /** Visible label rendered above the picker. */
  label?: string;
  /** Helper text rendered below the picker. */
  hint?: string;
  /** Placeholder for the search input. */
  placeholder?: string;
  /** Disable the entire picker. */
  disabled?: boolean;
  /** `name` attribute on a hidden input (emits a comma-separated value). */
  name?: string;
  /** Empty-state hint shown when nothing matches. */
  emptyText?: string;
}

/**
 * Multi-select language picker for `contest.langs` (the allowed submission
 * languages). Backed by the `languages` array injected by the backend handler
 * (typically `SettingModel.langs`), so no extra round-trip is needed at
 * render time.
 *
 * Selected keys render as removable chips. Typing filters the dropdown; arrow
 * keys + Enter / click add the highlighted entry; Backspace with an empty
 * query pops the most recently added chip. Comma-separated output is emitted
 * through the optional hidden input so the existing `langs` form field keeps
 * working without server-side changes.
 *
 * The dropdown is open iff the search input is focused — selecting a chip
 * preserves focus via `onMouseDown` `preventDefault()`, so the menu stays
 * visible and the user can keep selecting without re-clicking the input.
 */
export function LanguageSelectAutoComplete({
  value,
  onChange,
  languages,
  label,
  hint,
  placeholder,
  disabled,
  name,
  emptyText,
}: LanguageSelectAutoCompleteProps) {
  const inputId = useId();
  const listId = `${inputId}-list`;
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const open = focused && !disabled;

  const selectedSet = useMemo(() => new Set(value), [value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return languages.filter((lang) => {
      if (selectedSet.has(lang.value)) return false;
      if (!q) return true;
      return lang.value.toLowerCase().includes(q) || lang.label.toLowerCase().includes(q);
    });
  }, [languages, query, selectedSet]);

  // Reset highlight when the filtered list changes length.
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const add = useCallback(
    (key: string) => {
      if (selectedSet.has(key)) return;
      onChange([...value, key]);
      // Clear the query so the filter resets; focus is preserved by the
      // option's onMouseDown `preventDefault()` so the dropdown stays open.
      setQuery('');
    },
    [onChange, selectedSet, value],
  );

  const remove = useCallback(
    (key: string) => {
      onChange(value.filter((v) => v !== key));
    },
    [onChange, value],
  );

  const labelFor = useCallback(
    (key: string) => languages.find((l) => l.value === key)?.label || key,
    [languages],
  );

  const onInputChange = (ev: ChangeEvent<HTMLInputElement>) => {
    setQuery(ev.target.value);
  };

  const onKeyDown = (ev: KeyboardEvent<HTMLInputElement>) => {
    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(0, filtered.length - 1)));
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (ev.key === 'Enter') {
      const target = filtered[activeIndex];
      if (target) {
        ev.preventDefault();
        add(target.value);
      }
    } else if (ev.key === 'Backspace' && !query && value.length) {
      remove(value[value.length - 1]);
    } else if (ev.key === 'Escape') {
      (ev.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className={styles.field}>
      {label && (
        <label className={styles.label} htmlFor={inputId}>
          {label}
        </label>
      )}
      <div
        className={`${styles.control} ${disabled ? styles.disabled : ''}`}
        onClick={(ev) => {
          // Focus the input when the user clicks the chip row (but not when
          // they're clicking the chip × button — it has its own handler).
          if ((ev.target as HTMLElement).closest('button')) return;
          document.getElementById(inputId)?.focus();
        }}
      >
        <div className={styles.chips}>
          {value.map((key) => (
            <span key={key} className={styles.chip}>
              <span className={styles.chipText}>{labelFor(key)}</span>
              <button
                type="button"
                className={styles.chipRemove}
                aria-label={`Remove language ${key}`}
                disabled={disabled}
                onClick={(ev) => {
                  ev.stopPropagation();
                  remove(key);
                }}
              >
                ×
              </button>
            </span>
          ))}
          <input
            id={inputId}
            type="text"
            className={styles.input}
            value={query}
            placeholder={value.length === 0 ? (placeholder ?? '') : ''}
            disabled={disabled}
            role="combobox"
            aria-expanded={open && filtered.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            onChange={onInputChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={onKeyDown}
          />
          {name && <input type="hidden" name={name} value={value.join(',')} />}
        </div>
      </div>
      {open && (
        <ul id={listId} role="listbox" className={styles.menu}>
          {filtered.length === 0 && (
            <li className={styles.empty}>{emptyText || 'No matching languages'}</li>
          )}
          {filtered.map((lang, idx) => (
            <li
              key={lang.value}
              role="option"
              aria-selected={idx === activeIndex}
              className={`${styles.option} ${idx === activeIndex ? styles.active : ''}`}
              // preventDefault on mousedown keeps the input focused so the
              // focus-driven `open` flag stays true after selection.
              onMouseDown={(ev) => {
                ev.preventDefault();
                add(lang.value);
              }}
              onMouseEnter={() => setActiveIndex(idx)}
            >
              <span className={styles.optionLabel}>{lang.label}</span>
              <span className={styles.optionValue}>{lang.value}</span>
            </li>
          ))}
        </ul>
      )}
      {hint && <span className={styles.hint}>{hint}</span>}
    </div>
  );
}
