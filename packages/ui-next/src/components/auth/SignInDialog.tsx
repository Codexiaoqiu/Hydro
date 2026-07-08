import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { usePageData } from '../../context/page-data';
import { SignInDialogContext, useSignInDialogState } from '../../hooks/use-sign-in-dialog';
import { LoginForm, type LoginMethod } from './LoginForm';
import styles from './SignInDialog.module.css';

export interface SignInDialogProps {
  /** Content rendered inside the modal. Section 1 will mount the LoginForm here. */
  children?: ReactNode;
  /** Optional passkey prompt copy shown above the form. */
  passkeyHint?: ReactNode;
  /** Called whenever the dialog opens/closes. */
  onOpenChange?: (open: boolean) => void;
}

const MOBILE_BREAKPOINT = 880;

/**
 * Controlled modal shell used by the global "Login" affordance. Mirrors
 * ui-default's `components/signin/signInDialog.page.js`:
 *
 *   - On a viewport narrower than `MOBILE_BREAKPOINT` it short-circuits to
 *     `/login` (no modal — keeps the form full-width on phones).
 *   - On desktop it renders an overlay/modal with `Esc` and click-outside
 *     dismissal, plus an optional passkey banner.
 *   - The visible state is sourced from `SignInDialogContext` so any caller
 *     can do `const { show } = useSignInDialog(); show();` to open it.
 */
export function SignInDialog({ children, passkeyHint, onOpenChange }: SignInDialogProps) {
  const { open, hide } = useSignInDialogState();
  const overlayRef = useRef<HTMLDivElement | null>(null);

  // Mobile short-circuit: redirect to /login instead of showing the modal.
  useEffect(() => {
    if (!open || typeof window === 'undefined') return;
    if (window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches) {
      window.location.href = '/login';
      hide();
    }
  }, [open, hide]);

  // Esc to close + lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hide();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, hide]);

  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  const onOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === overlayRef.current) hide();
    },
    [hide],
  );

  // PageData must be read unconditionally (Rules of Hooks) so the hook count
  // stays stable when `open` toggles. The destructured `args` is only consumed
  // after the early return below, when the dialog is actually open.
  const { args } = usePageData() as unknown as {
    args: { builtInLogin?: boolean; loginMethods?: LoginMethod[]; redirect?: string };
  };

  if (!open) return null;

  // Fall back to a built-in LoginForm driven by PageData so callers can mount
  // `<SignInDialog />` once globally without wiring content manually. To
  // customise the form, pass `children` and the host page can read PageData.
  const formContent =
    children ?? (
      <LoginForm
        builtInLogin={args?.builtInLogin ?? true}
        loginMethods={args?.loginMethods ?? []}
        redirect={args?.redirect}
        wide
      />
    );

  return (
    <div ref={overlayRef} className={styles.overlay} onClick={onOverlayClick} role="presentation">
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Sign in">
        <button type="button" className={styles.close} onClick={hide} aria-label="Close">
          ×
        </button>
        {passkeyHint && <div className={styles.notice}>{passkeyHint}</div>}
        <div className={styles.body}>{formContent}</div>
      </div>
    </div>
  );
}

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