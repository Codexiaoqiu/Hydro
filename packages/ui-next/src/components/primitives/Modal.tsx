import { type ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from './Modal.module.css';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  footer?: ReactNode;
  children: ReactNode;
  /** Width in px (defaults to 480). */
  width?: number;
  /** When true, clicking the backdrop does not call onClose. */
  persistent?: boolean;
  /** Accessible label for the close button. Defaults to "Close". Pass a localized string when the host page has a translation. */
  closeLabel?: string;
}

export function Modal({
  open, onClose, title, footer, children,
  width = 480, persistent = false, closeLabel = 'Close',
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className={styles.root} role="presentation">
      <div
        className={styles.backdrop}
        data-testid="modal-backdrop"
        onClick={() => !persistent && onClose()}
      />
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ width }}
      >
        <header className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button
            type="button"
            className={styles.close}
            aria-label={closeLabel}
            onClick={onClose}
          >×</button>
        </header>
        <div className={styles.body}>{children}</div>
        {footer && <footer className={styles.footer}>{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}
