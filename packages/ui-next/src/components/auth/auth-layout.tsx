import { defineSlot } from '../../registry';
import { AuthLayout } from './AuthLayout';

/**
 * Slot wrapper around {@link AuthLayout}. Pages that want a visible nav can
 * pass `hideTopNav={false}` or set `UiContext.authShellHideTopNav = false`
 * before mount.
 */
export default defineSlot('layout:auth', AuthLayout);
