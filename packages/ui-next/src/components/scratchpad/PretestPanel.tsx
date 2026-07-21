import { useScratchpad } from './ScratchpadContext';
import { useTranslate } from '../../lib/i18n';

export function PretestPanel() {
  const { state, dispatch } = useScratchpad();
  const t = useTranslate();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <label>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-mute)' }}>{t('Scratchpad.PretestInput')}</span>
        <textarea
          aria-label={t('Scratchpad.PretestInput')}
          value={state.pretest.input}
          onChange={(e) => dispatch({ type: 'SET_INPUT', payload: e.target.value })}
          rows={3}
          spellCheck={false}
          wrap="off"
          style={{
            width: '100%',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-sm)',
            padding: 'var(--space-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--surface)',
            color: 'var(--text)',
            whiteSpace: 'pre',
          }}
        />
      </label>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-mute)' }}>
            {t('Scratchpad.PretestOutput')} {state.pretest.running ? '…' : ''}
          </span>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(state.pretest.output.join('\n'))}
              aria-label={t('Scratchpad.CopyOutput')}
              style={btnStyle}
            >
              {t('Scratchpad.CopyOutput')}
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: 'START_PRETEST' })}
              aria-label={t('Scratchpad.ClearOutput')}
              style={btnStyle}
            >
              {t('Scratchpad.ClearOutput')}
            </button>
          </div>
        </div>
        <pre
          aria-label={t('Scratchpad.PretestOutput')}
          data-pretest-output
          style={{
            minHeight: 120,
            maxHeight: 240,
            overflow: 'auto',
            margin: 0,
            padding: 'var(--space-2)',
            background: 'var(--surface)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-sm)',
            whiteSpace: 'pre-wrap',
          }}
        >
          {state.pretest.error ? state.pretest.error : state.pretest.output.join('\n')}
        </pre>
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--border)',
  color: 'var(--text-soft)',
  padding: '2px 8px',
  borderRadius: 'var(--radius-sm)',
  fontSize: 'var(--text-xs)',
  cursor: 'pointer',
};
