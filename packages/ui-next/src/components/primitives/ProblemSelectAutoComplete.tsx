import {
  type ChangeEvent, type KeyboardEvent, useCallback, useEffect, useId, useMemo, useRef, useState,
} from 'react';
import { request } from '../../hooks/use-api';
import { useBuildUrl } from '../../hooks/use-build-url';
import styles from './ProblemSelectAutoComplete.module.css';

export interface ProblemOption {
  docId: number;
  pid?: string;
  title?: string;
}

export interface ProblemSelectAutoCompleteProps {
  /** docId values of currently selected problems. */
  value: number[];
  onChange: (next: number[]) => void;
  /**
   * Domain id used to construct the search URL via the `problem_main` route.
   * Defaults to the active ui-next domain; falls back to `'system'`.
   */
  domainId?: string;
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
  /**
   * Minimum query length before triggering search. Defaults to 0 so an empty
   * query still shows the recent problem list (matches ui-default behaviour).
   */
  minQueryLength?: number;
  /** Debounce window for the search input in ms. */
  debounceMs?: number;
}

interface SearchResponse {
  pdocs?: Array<{ docId: number, pid?: string, title?: string }>;
}

/**
 * Multi-select problem picker. Mirrors the `ProblemSelectAutoComplete` used by
 * ui-default: type-ahead queries hit `/d/{domainId}/p?q=...&quick=true&sort=...`
 * and return `{ pdocs }`. Selected docIds render as removable chips; clicking
 * a result adds it as a chip. Emits a comma-separated hidden input when `name`
 * is provided so the value reaches the server via the existing `pids` form
 * field.
 *
 * The component is fully controlled: pass `value` and an `onChange` callback
 * and the parent owns the selection. This keeps the form state in
 * ContestForm without the picker holding a stale copy.
 *
 * The dropdown is open iff the search input is focused — selecting a chip
 * preserves focus via `onMouseDown` `preventDefault()`, so the menu stays
 * visible and the user can keep selecting without re-clicking the input.
 */
export function ProblemSelectAutoComplete({
  value,
  onChange,
  domainId,
  label,
  hint,
  placeholder,
  disabled,
  name,
  minQueryLength = 0,
  debounceMs = 250,
}: ProblemSelectAutoCompleteProps) {
  const buildUrl = useBuildUrl();
  const inputId = useId();
  const listId = `${inputId}-list`;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProblemOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // The dropdown is open exactly when the input is focused. This avoids the
  // class of bugs where an explicit `open` state desyncs from focus (e.g.
  // clicking an option closing the menu, or clicking the input again not
  // reopening it).
  const open = focused && !disabled;

  // Build the search URL once per domainId change.
  const searchUrl = useMemo(
    () => buildUrl('problem_main', { domainId }),
    [buildUrl, domainId],
  );

  // Debounced search.
  useEffect(() => {
    if (!searchUrl) return;
    const trimmed = query.trim();
    // Treat an empty query as "show recent problems" so the dropdown stays
    // useful after selecting a chip (which clears the query). Only short-
    // circuit when minQueryLength > 0 forces a non-empty query.
    if (trimmed.length < minQueryLength && minQueryLength > 0) {
      setResults([]);
      setLoading(false);
      return;
    }
    const handle = window.setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      const sortStrategy = trimmed ? 'default' : 'recent';
      request
        .get<SearchResponse>(
          searchUrl,
          { q: trimmed, quick: true, sort: sortStrategy, limit: 20 },
          { signal: controller.signal },
        )
        .then((res) => {
          if (!controller.signal.aborted) {
            setResults((res?.pdocs ?? []).filter((p) => p?.docId != null));
            setActiveIndex(0);
          }
        })
        .catch(() => {
          // Aborted or transient network error: keep the previous results
          // visible so the user can still interact with what was last shown.
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, debounceMs);
    return () => {
      window.clearTimeout(handle);
      abortRef.current?.abort();
    };
  }, [query, searchUrl, minQueryLength, debounceMs]);

  const filteredResults = useMemo(
    () => results.filter((p) => !value.includes(p.docId)),
    [results, value],
  );

  const add = useCallback(
    (docId: number) => {
      if (value.includes(docId)) return;
      onChange([...value, docId]);
      // Clear the query so the next debounced pass refreshes the list
      // (sort=recent when the query is empty); the filter will simply drop
      // the just-added chip. Focus is preserved by the option's
      // onMouseDown `preventDefault()` so the dropdown stays open.
      setQuery('');
      setActiveIndex(0);
    },
    [onChange, value],
  );

  const remove = useCallback(
    (docId: number) => {
      onChange(value.filter((id) => id !== docId));
    },
    [onChange, value],
  );

  const onInputChange = (ev: ChangeEvent<HTMLInputElement>) => {
    setQuery(ev.target.value);
  };

  const onKeyDown = (ev: KeyboardEvent<HTMLInputElement>) => {
    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(0, filteredResults.length - 1)));
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (ev.key === 'Enter') {
      const target = filteredResults[activeIndex];
      if (target) {
        ev.preventDefault();
        add(target.docId);
      }
    } else if (ev.key === 'Backspace' && !query && value.length) {
      remove(value[value.length - 1]);
    } else if (ev.key === 'Escape') {
      // Escape closes the menu without removing focus. We blur the input
      // so the focus-driven `open` flag flips back to false.
      (ev.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className={styles.field} ref={wrapRef}>
      {label && (
        <label className={styles.label} htmlFor={inputId}>
          {label}
        </label>
      )}
      <div
        className={`${styles.control} ${disabled ? styles.disabled : ''}`}
        onClick={(ev) => {
          // Clicking the chip row (outside the actual <input>) should still
          // focus the input so the dropdown opens. Don't steal focus when the
          // user clicks the chip × button — it has its own handler.
          if ((ev.target as HTMLElement).closest('button')) return;
          wrapRef.current?.querySelector('input')?.focus();
        }}
      >
        <div className={styles.chips}>
          {value.map((id) => (
            <span key={id} className={styles.chip}>
              <span className={styles.chipText}>#{id}</span>
              <button
                type="button"
                className={styles.chipRemove}
                aria-label={`Remove problem ${id}`}
                disabled={disabled}
                onClick={(ev) => {
                  ev.stopPropagation();
                  remove(id);
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
            aria-expanded={open && filteredResults.length > 0}
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
          {loading && <li className={styles.empty}>Searching…</li>}
          {!loading && query && filteredResults.length === 0 && (
            <li className={styles.empty}>No matching problems</li>
          )}
          {!loading && !query && filteredResults.length === 0 && (
            <li className={styles.empty}>Type to search problems</li>
          )}
          {filteredResults.map((p, idx) => (
            <li
              key={p.docId}
              role="option"
              aria-selected={idx === activeIndex}
              className={`${styles.option} ${idx === activeIndex ? styles.active : ''}`}
              // preventDefault on mousedown keeps the input focused, so the
              // focus-driven `open` flag stays true after selection.
              onMouseDown={(ev) => {
                ev.preventDefault();
                add(p.docId);
              }}
              onMouseEnter={() => setActiveIndex(idx)}
            >
              <span className={styles.optionTitle}>
                {p.pid ? `${p.pid} ` : ''}
                {p.title || `(problem #${p.docId})`}
              </span>
              <span className={styles.optionId}>#{p.docId}</span>
            </li>
          ))}
        </ul>
      )}
      {hint && <span className={styles.hint}>{hint}</span>}
    </div>
  );
}
