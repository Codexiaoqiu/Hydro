import { useEffect, useRef, useState } from 'react';
import styles from './UserSelectAutoComplete.module.css';

export interface UserSummary { _id: number; uname: string; avatar?: string }

export interface UserSelectAutoCompleteProps {
  value: number[];
  onChange: (next: number[]) => void;
  domainId?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function UserSelectAutoComplete({ value, onChange, domainId, placeholder = 'Search users…', disabled }: UserSelectAutoCompleteProps) {
  const [q, setQ] = useState('');
  const [candidates, setCandidates] = useState<UserSummary[]>([]);
  const [chosen, setChosen] = useState<UserSummary[]>([]);
  const [open, setOpen] = useState(false);
  const ac = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!value.length) { setChosen([]); return; }
    const ctrl = new AbortController();
    fetch(`/user/search?uids=${value.join(',')}`, { credentials: 'same-origin', signal: ctrl.signal })
      .then((r) => r.json())
      .then((rows: UserSummary[]) => setChosen(rows))
      .catch(() => {});
    return () => ctrl.abort();
  }, [value]);

  useEffect(() => {
    if (!q) { setCandidates([]); return; }
    ac.current?.abort();
    const ctrl = new AbortController();
    ac.current = ctrl;
    const t = setTimeout(() => {
      fetch(`/user/search?q=${encodeURIComponent(q)}${domainId ? `&domainId=${domainId}` : ''}`, {
        credentials: 'same-origin', signal: ctrl.signal,
      })
        .then((r) => r.json())
        .then((rows: UserSummary[]) => setCandidates(rows))
        .catch(() => {});
    }, 200);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q, domainId]);

  const pick = (u: UserSummary) => {
    if (value.includes(u._id)) return;
    onChange([...value, u._id]);
    setQ('');
    setCandidates([]);
  };
  const remove = (uid: number) => onChange(value.filter((v) => v !== uid));

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
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && candidates.length > 0 && (
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
