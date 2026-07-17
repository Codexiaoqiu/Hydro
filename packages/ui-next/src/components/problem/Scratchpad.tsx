import { type PropsWithChildren, useId } from 'react';
import { useTranslate } from '../../lib/i18n';
import { Card } from '../primitives';

export interface ScratchpadProps {
  pdoc: unknown;
  open?: boolean;
  onToggle?: (next: boolean) => void;
}

/**
 * Placeholder scratchpad card. The real Monaco / CodeMirror surface lives in
 * `packages/ui-default/components/scratchpad/`; until that dependency ships
 * to `ui-next` this component renders a styled placeholder with the same
 * outer shape (open / collapsed variant of `<Card>`) so the agent that wires
 * up `problem_detail.tsx` can drop it in without restructuring later.
 *
 * Accessibility: the toggle buttons expose `aria-expanded` and
 * `aria-controls` (the panel region beneath them) so screen readers can
 * announce the collapsed / expanded state and target the right region.
 *
 * Note: keyboard handling (Alt+E / Alt+Q) is intentionally **not** wired
 * here — the parent page is expected to bind those and call `onToggle`.
 */
export function Scratchpad({ pdoc: _pdoc, open = false, onToggle, children }: PropsWithChildren<ScratchpadProps>) {
  const t = useTranslate();
  const panelId = useId();
  // Compose an a11y label that mixes the user-facing label with the keyboard
  // shortcut so AT users discover the binding without seeing the source.
  const openLabel = `${t('Scratchpad.OpenButton')} (Alt+E)`;
  const closeLabel = `${t('Scratchpad.CloseButton')} (Alt+Q)`;

  if (!open) {
    return (
      <Card variant="default">
        <div style={{ padding: 'var(--space-4)', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            aria-expanded={false}
            aria-controls={panelId}
            aria-label={openLabel}
            onClick={() => onToggle?.(true)}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--text-soft)',
              padding: '6px 14px',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
            }}
          >
            {t('Scratchpad.OpenButton')}
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card variant="default" header={<strong>{t('Scratchpad.Title')}</strong>}>
      <div
        id={panelId}
        role="region"
        aria-label={t('Scratchpad.RegionLabel')}
        style={{
          padding: 'var(--space-5)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-3)',
          color: 'var(--text-mute)',
          fontSize: 'var(--text-sm)',
        }}
      >
        <p style={{ margin: 0 }}>{t('Scratchpad.ComingSoon')}</p>
        {children}
        <div>
          <button
            type="button"
            aria-expanded={true}
            aria-controls={panelId}
            aria-label={closeLabel}
            onClick={() => onToggle?.(false)}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--text-soft)',
              padding: '6px 14px',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
            }}
          >
            {t('Scratchpad.CloseButton')}
          </button>
        </div>
      </div>
    </Card>
  );
}
