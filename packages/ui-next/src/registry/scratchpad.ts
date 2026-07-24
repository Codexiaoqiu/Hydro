import { registerPage } from './page';
import type { PageLoader, SlotName } from './types';
import { store } from './store';

/**
 * Loader for a scratchpad extension component. Used by the page registry
 * to lazy-load the React component on demand.
 */
export type ScratchpadPageLoader<P = unknown> = PageLoader<P>;

/**
 * Register a scratchpad extension page.
 *
 * Plugins can call:
 *
 *   import { addPage } from '@hydrooj/ui-next/registry/scratchpad';
 *   addPage('toolbar', () => import('./MyToolbarExtension'));
 *
 * to register a page that renders inside the scratchpad UI. The registered
 * name is namespaced under `scratchpad:` (so the underlying slot becomes
 * `page:scratchpad:<name>`) so it cannot collide with top-level pages.
 */
export function addPage<P = unknown>(
  name: string,
  loader: ScratchpadPageLoader<P>,
): void {
  registerPage<P>(`scratchpad:${name}`, loader);
}

/**
 * Set the default component for a scratchpad slot.
 *
 * This is a thin wrapper around the registry store that pins the namespace
 * (`scratchpad:`) so plugins cannot accidentally claim arbitrary slot names.
 */
export function setScratchpadSlotDefault<N extends SlotName>(
  name: N,
  component: unknown,
): void {
  store.setDefault(name, component);
}