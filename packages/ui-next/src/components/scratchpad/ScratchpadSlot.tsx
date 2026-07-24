/**
 * Scratchpad slot dispatchers.
 *
 * Two consumers live in this file:
 *
 *   1. The default export is the legacy sidebar slot for the problem detail
 *      page. Plugins can mount an inline editor there via:
 *
 *        defineSlot('problem:sidebar:scratchpad', MyScratchpadImpl);
 *
 *   2. The named `ScratchpadSlot` export lets the scratchpad UI mount
 *      extension points by name. Currently supported:
 *
 *        - 'editor-toolbar-extra'  → rendered alongside the editor toolbar.
 *
 *      Plugins extend those slots the same way they extend any other slot:
 *
 *        defineSlot('scratchpad:editor-toolbar-extra', MyToolbarExtraImpl);
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

export interface ScratchpadSlotNamedProps {
  name: 'editor-toolbar-extra' | string;
}

/**
 * Default component for the editor-toolbar-extra slot — an empty fragment so
 * the toolbar's layout is unaffected when no extension is registered.
 */
const EditorToolbarExtraDefault: React.FC = () => null;

/**
 * Registered slot consumer. Plugins may call
 * `defineSlot('scratchpad:editor-toolbar-extra', MyExtension)` to inject
 * items next to the editor toolbar.
 */
const EditorToolbarExtraSlot = defineSlot(
  'scratchpad:editor-toolbar-extra',
  EditorToolbarExtraDefault,
);

/**
 * Dispatch a scratchpad extension slot by name.
 *
 * Unknown names resolve to a no-op so the caller doesn't need to defensively
 * check existence.
 */
export function ScratchpadSlot({ name }: ScratchpadSlotNamedProps) {
  if (name === 'editor-toolbar-extra') {
    return <EditorToolbarExtraSlot />;
  }
  return null;
}

// Legacy default export — kept for backward compatibility with plugins that
// registered a sidebar scratchpad via:
//   defineSlot('problem:sidebar:scratchpad', MyScratchpadImpl);
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