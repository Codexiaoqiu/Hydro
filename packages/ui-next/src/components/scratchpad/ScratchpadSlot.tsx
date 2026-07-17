/**
 * Scratchpad slot — a placeholder that lets plugins mount an inline editor on
 * the problem detail page (hotkeys Alt+E / Alt+Q). The full Monaco scratchpad
 * is deferred to a later phase, but the slot exists so we don't accidentally
 * hard-code the absence in the sidebar.
 *
 * Plugins register via:
 *
 *   defineSlot('problem:sidebar:scratchpad', MyScratchpadImpl);
 */
import type { ReactNode } from 'react';
import { defineSlot } from '../../registry';

export interface ScratchpadSlotProps {
  problemId: number;
  codeLang?: string;
  codeTemplate?: string;
  canSubmit?: boolean;
  header?: ReactNode;
}

const ScratchpadPlaceholder: React.FC<ScratchpadSlotProps> = () => (
  <div
    style={{
      padding: 'var(--space-3)',
      border: '1px dashed var(--border)',
      borderRadius: 'var(--radius-md)',
      color: 'var(--text-mute)',
      fontSize: 'var(--text-sm)',
    }}
  >
    Scratchpad is not enabled in this build.
  </div>
);

export default defineSlot('problem:sidebar:scratchpad', ScratchpadPlaceholder);
