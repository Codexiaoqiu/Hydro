import { useScratchpad } from './ScratchpadContext';
import { useTranslate } from '../../lib/i18n';
import type { Dispatch, SetStateAction } from 'react';

interface PdocMinimal {
  config?: { type?: string; langs?: string[] } | string;
}

export interface ScratchpadToolbarProps {
  postSubmitUrl: string;
  pretestConnUrl: string;
  getSubmissionsUrl: string;
  problemId: number;
  pdoc: PdocMinimal;
  tdoc?: { docId?: string };
  UserContext: { _id?: number };
  onExit: () => void;
  /**
   * Called with the new rid returned by the pretest POST so the parent
   * (`ScratchpadEditorPane`) can open the WebSocket session.
   */
  setRid: Dispatch<SetStateAction<string | null>>;
}

export function ScratchpadToolbar({
  postSubmitUrl,
  pretestConnUrl: _pretestConnUrl,
  getSubmissionsUrl: _getSubmissionsUrl,
  pdoc,
  onExit,
  setRid,
}: ScratchpadToolbarProps) {
  const { state, dispatch } = useScratchpad();
  const t = useTranslate();

  const langs = (typeof pdoc.config === 'object' && pdoc.config?.langs) || ['cpp'];
  const canPretest = typeof pdoc.config === 'object' && pdoc.config?.type === 'default';

  async function runPretest() {
    dispatch({ type: 'START_PRETEST' });
    try {
      const res = await fetch(postSubmitUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang: state.lang, code: state.code, input: [state.pretest.input], pretest: true }),
      });
      const data = await res.json();
      setRid(data.rid ?? null);
    } catch (e) {
      dispatch({ type: 'PRETEST_ERROR', payload: String((e as Error).message) });
    }
  }

  async function submit() {
    dispatch({ type: 'SUBMIT_START' });
    try {
      const res = await fetch(postSubmitUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang: state.lang, code: state.code }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (e) {
      dispatch({ type: 'SUBMIT_END' });
      alert((e as Error).message); // replaced by toast in follow-up
    }
  }

  return (
    <div role="toolbar" aria-label="Scratchpad toolbar" style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', padding: 'var(--space-2) var(--space-3)', borderBottom: '1px solid var(--border)', background: 'var(--surface-elev)' }}>
      {canPretest && (
        <button type="button" data-hotkey="f9" onClick={runPretest} disabled={state.pretest.running || state.submitting} style={btnStyle}>
          {t('Scratchpad.RunPretest')} (F9)
        </button>
      )}
      <button type="button" data-hotkey="f10" onClick={submit} disabled={state.submitting} style={btnStyle}>
        {t('Scratchpad.SubmitSolution')} (F10)
      </button>
      <button type="button" data-hotkey="alt+q" onClick={onExit} style={btnStyle}>
        {t('Scratchpad.Exit')} (Alt+Q)
      </button>
      <span style={{ flex: 1 }} />
      <button type="button" data-hotkey="alt+p" onClick={() => dispatch({ type: 'TOGGLE_PANEL', payload: 'pretest' })} style={btnStyle}>
        {t('Scratchpad.Pretest')} (Alt+P)
      </button>
      <button type="button" data-hotkey="alt+r" onClick={() => dispatch({ type: 'TOGGLE_PANEL', payload: 'records' })} style={btnStyle}>
        {t('Scratchpad.Records')} (Alt+R)
      </button>
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-soft)' }}>Language:</span>
      <select
        aria-label="Language"
        value={state.lang}
        onChange={(e) => dispatch({ type: 'SET_LANG', payload: e.target.value })}
        style={{ padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface)', color: 'var(--text)', minWidth: '120px' }}
      >
        {langs.map((l) => (
          <option key={l} value={l}>{l.toUpperCase()}</option>
        ))}
      </select>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--border)',
  color: 'var(--text-soft)',
  padding: '4px 10px',
  borderRadius: 'var(--radius-sm)',
  fontSize: 'var(--text-xs)',
  cursor: 'pointer',
};
