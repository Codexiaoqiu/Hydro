import { SignInDialogContext } from '../../hooks/use-sign-in-dialog';

export const MOBILE_BREAKPOINT = 880;

/**
 * Convenience helper: trigger the dialog from anywhere without importing the
 * hook. Mirrors `window.showSignInDialog()` in ui-default.
 */
export function showSignInDialog(): void {
  if (typeof window === 'undefined') return;
  if (window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches) {
    window.location.href = '/login';
    return;
  }
  SignInDialogContext.show();
}
