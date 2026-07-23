import { useEffect, useRef, useState } from 'react';
import styles from './UserSelectAutoComplete.module.css';

export interface UserSummary { _id: number; uname: string; avatar?: string }

export interface UserSelectAutoCompleteProps {
  /** Currently selected UIDs (multi-select). */
  value: number[];
  onChange: (next: number[]) => void;
  /** Domain id forwarded to the backend `users` API. Defaults to `'system'`. */
  domainId?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Projection forwarded to the backend; keep narrow. */
  projection?: string[];
}

/**
 * Calls the real backend `users` API (`POST /d/:domainId/api/users`)
 * declared in `packages/hydrooj/src/handler/user.ts` — the legacy
 * `/user/search?...` route does NOT exist and was removed.
 *
 *   - hydration      → `{ args: { auto: value } }`
 *   - suggestions    → `{ args: { search: q } }`
 *   - projection     → `['_id', 'uname']` by default (caller may override)
 *
 * Returns deduplicated chips with a popup of candidates. The candidate that
 * is already selected is filtered out before render so the user cannot pick
 * the same UID twice. Loading / empty / error states are surfaced explicitly.
 */
export function UserSelectAutoComplete({
  value,
  onChange,
  domainId = 'system',
  placeholder = 'Search users…',
  disabled,
  projection = ['_id', 'uname'],
}: UserSelectAutoCompleteProps) {
  const [q, setQ] = useState('');
  const [candidates, setCandidates] = useState<UserSummary[]>([]);
  const [chosen, setChosen] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ac = useRef<AbortController | null>(null);
  const hydrationAc = useRef<AbortController | null>(null);
  const valueKey = value.slice().sort((a, b) => a - b).join(',');

  // Hydrate chosen users from UID list. Skips when value is empty so a freshly
  // mounted component does not perform a no-op round-trip.
  useEffect(() => {
    if (!value.length) { setChosen([]); return undefined; }
    hydrationAc.current?.abort();
    const ctrl = new AbortController();
    hydrationAc.current = ctrl;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/d/${domainId}/api/users`, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ args: { auto: value }, projection }),
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const rows = (await res.json()) as UserSummary[];
        if (!cancelled) setChosen(rows);
      } catch (e) {
        if ((e as { name?: string })?.name === 'AbortError') return;
        if (!cancelled) setChosen([]);
      }
    })();
    return () => { cancelled = true; ctrl.abort(); };
    // valueKey intentionally captures sorted value identity; projection/domainId
    // kept for correctness.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueKey, domainId]);

  // Debounced search. Aborts the previous request so a fast typist never
  // sees stale results from an in-flight query.
  useEffect(() => {
    if (!q) { setCandidates([]); setError(null); setLoading(false); return undefined; }
    setError(null);
    setLoading(true);
    ac.current?.abort();
    const ctrl = new AbortController();
    ac.current = ctrl;
    const t = setTimeout(() => {
      (async () => {
        try {
          const res = await fetch(`/d/${domainId}/api/users`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ args: { search: q }, projection }),
            signal: ctrl.signal,
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const rows = (await res.json()) as UserSummary[];
          if (ctrl.signal.aborted) return;
          setCandidates(rows.filter((r) => !value.includes(r._id)));
        } catch (e) {
          if ((e as { name?: string })?.name === 'AbortError') return;
          if (!ctrl.signal.aborted) setError((e as Error).message || 'Search failed');
        } finally {
          if (!ctrl.signal.aborted) setLoading(false);
        }
      })();
    }, 200);
    return () => { clearTimeout(t); ctrl.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, valueKey, domainId]);

  const pick = (u: UserSummary) => {
    if (value.includes(u._id)) return; // dedupe
    onChange([...value, u._id]);
    setQ('');
    setCandidates([]);
  };
  const remove = (uid: number) => onChange(value.filter((v) => v !== uid));

  const showEmpty = !loading && !error && q.length > 0 && candidates.length === 0;
  const showCandidates = !loading && !error && candidates.length > 0;

  return (
    <div className={styles.root} data-disabled={disabled}>
      <ul className={styles.chips}>
        {chosen.map((u) => (
          <li key={u._id} className={styles.chip}>
            <span>{u.uname}</span>
            <button type="button" aria-label={`Remove ${u.uname}`} onClick={() => remove(u._id)}>×</button>
          </li>
        ))}
      </ul>
      <input
        type="text"
        role="textbox"
        className={styles.input}
        value={q}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => setQ(e.target.value)}
      />
      {loading && (
        <div className={styles.status} role="status" data-testid="ac-loading">Loading…</div>
      )}
      {error && (
        <div className={styles.error} role="alert" data-testid="ac-error">Error: {error}</div>
      )}
      {showEmpty && (
        <div className={styles.status} role="status" data-testid="ac-empty">No matches.</div>
      )}
      {showCandidates && (
        <ul className={styles.popup} role="listbox">
          {candidates.map((u) => (
            <li key={u._id} className={styles.opt}>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); pick(u); }}>{u.uname}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
