import { useRef, useState } from 'react';
import { HexColorPicker } from '../primitives/HexColorPicker';
import { Modal } from '../primitives/Modal';
import { Button } from '../primitives/Button';
import { useTranslate } from '../../lib/i18n';
import { useToast } from '../primitives/Toast';
import * as yaml from 'js-yaml';
import styles from './ContestBalloonSetColor.module.css';

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export interface ContestBalloonSetColorProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  /** Every problem id that needs a balloon color. */
  pids: number[];
  /** Initial color/name map keyed by pid; merged with defaults. */
  initial?: Record<number, { color: string; name: string }>;
  /** Modal close-button label (localized). */
  closeLabel?: string;
}

interface RowState {
  color: string;
  name: string;
}

const DEFAULT_COLOR = '#fbbd23';

export function ContestBalloonSetColor({
  open, onClose, onSaved, pids, initial, closeLabel = 'Close',
}: ContestBalloonSetColorProps) {
  const toast = useToast();
  const t = useTranslate();
  const [rows, setRows] = useState<Record<string, RowState>>(() => {
    const out: Record<string, RowState> = {};
    for (const pid of pids) {
      const seed = initial?.[pid];
      out[String(pid)] = {
        color: seed?.color ?? DEFAULT_COLOR,
        name: seed?.name ?? '',
      };
    }
    return out;
  });
  const [busy, setBusy] = useState(false);
  const savingRef = useRef(false);

  const updateRow = (pid: number, patch: Partial<RowState>) => {
    setRows((prev) => {
      const key = String(pid);
      const current = prev[key] ?? { color: DEFAULT_COLOR, name: '' };
      return { ...prev, [key]: { ...current, ...patch } };
    });
  };

  const validate = (): string | null => {
    for (const pid of pids) {
      const row = rows[String(pid)];
      if (!row) return `Missing value for problem ${pid}`;
      if (!HEX_RE.test(row.color)) return `Invalid color for problem ${pid}`;
      if (!row.name.trim()) return `Missing name for problem ${pid}`;
    }
    return null;
  };

  const save = async () => {
    const validationError = validate();
    if (validationError) {
      toast.error(validationError);
      return;
    }
    // Guard against a same-tick double click: `busy` state won't re-render
    // before a second synchronous click, so a ref is the reliable latch.
    if (savingRef.current) return;
    savingRef.current = true;
    setBusy(true);
    try {
      const payload: Record<string, RowState> = {};
      for (const pid of pids) payload[String(pid)] = rows[String(pid)];
      const fd = new URLSearchParams();
      fd.set('operation', 'set_color');
      fd.set('color', yaml.dump(payload));
      const res = await fetch(window.location.pathname, {
        method: 'POST',
        body: fd.toString(),
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
      });
      if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText || 'Request failed'}`);
      }
      toast.success(t('ContestBalloon.ColorSaved'));
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      savingRef.current = false;
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('ContestBalloon.ModalTitle')}
      closeLabel={closeLabel}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>{t('ContestBalloon.Cancel')}</Button>
          <Button variant="primary" onClick={save} disabled={busy}>
            {busy ? t('ContestBalloon.Saving') : t('ContestBalloon.Save')}
          </Button>
        </>
      )}
    >
      <div className={styles.body}>
        {pids.map((pid) => {
          const row = rows[String(pid)] ?? { color: DEFAULT_COLOR, name: '' };
          return (
            <div key={pid} className={styles.row} style={{ marginBottom: 'var(--space-4)' }}>
              <div style={{ fontWeight: 600, marginBottom: 'var(--space-1)' }}>{`Problem ${pid}`}</div>
              <div className={styles.controls} style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
                <div style={{ pointerEvents: busy ? 'none' : 'auto', opacity: busy ? 0.6 : 1 }}>
                  <HexColorPicker value={row.color} onChange={(next) => updateRow(pid, { color: next })} />
                </div>
                <input
                  type="text"
                  aria-label={`Name for problem ${pid}`}
                  placeholder="Name"
                  value={row.name}
                  disabled={busy}
                  onChange={(e) => updateRow(pid, { name: e.target.value })}
                  style={{ padding: 'var(--space-1) var(--space-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}