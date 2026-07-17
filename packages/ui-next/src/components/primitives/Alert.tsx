import type { ReactNode } from 'react';
import styles from './Alert.module.css';

export type AlertVariant = 'error' | 'success' | 'warn' | 'info';

export interface AlertProps {
  variant?: AlertVariant;
  title?: ReactNode;
  message?: ReactNode;
  children?: ReactNode;
  /** Allow the user to dismiss the alert. */
  onClose?: () => void;
  /** Override the role/aria semantics (defaults to "alert" for error, "status" otherwise). */
  role?: 'alert' | 'status';
  className?: string;
}

const ICONS: Record<AlertVariant, string> = {
  error: '!',
  success: '✓',
  warn: '!',
  info: 'i',
};

const DEFAULT_TITLES: Record<AlertVariant, string> = {
  error: 'Error',
  success: 'Success',
  warn: 'Warning',
  info: 'Info',
};

const FALLBACK_RATE_LIMIT_MESSAGE = '操作过于频繁，请稍后再试。';

/**
 * Inline alert used for server-side error feedback (HydroError, rate limits, etc.).
 * Pass `message` for a single-line alert or `children` for richer body content.
 */
export function Alert({
  variant = 'info',
  title,
  message,
  children,
  onClose,
  role,
  className,
}: AlertProps) {
  const variantClass = styles[variant];
  const computedRole = role ?? (variant === 'error' ? 'alert' : 'status');
  const body = children ?? message;

  return (
    <div className={`${styles.alert} ${variantClass} ${className ?? ''}`} role={computedRole}>
      <span className={styles.icon} aria-hidden="true">
        {ICONS[variant]}
      </span>
      <div className={styles.body}>
        <span className={styles.title}>{title ?? DEFAULT_TITLES[variant]}</span>
        {body && <div className={styles.message}>{body}</div>}
      </div>
      {onClose && (
        <button type="button" className={styles.close} onClick={onClose} aria-label="Dismiss">
          ×
        </button>
      )}
    </div>
  );
}

export interface RateLimitAlertProps extends Omit<AlertProps, 'variant' | 'title'> {
  /** The HydroError-like object thrown by the request layer. `code` is the numeric HTTP status. */
  error?: { code?: number, message?: string } | null;
}

/**
 * Specialised alert for rate-limit / opcount responses.
 *
 * Detection covers three signals (checked in order):
 *   1. HTTP 429 — some upstream APIs still emit `Too Many Requests` directly.
 *   2. HTTP 403 — Hydro's actual response: `OpcountExceededError` extends
 *      `ForbiddenError` (see `packages/hydrooj/src/model/opcount.ts` and
 *      `framework/framework/error.ts`), so rate limits surface as 403 here.
 *   3. Message fallback — matches the OpcountExceededError template
 *      `'Too frequent operations of {0} ...'`, since the upstream pipeline may
 *      not always preserve `code`.
 *
 * Falls back to a hardcoded Chinese message when the server provides no text,
 * matching the contract specified in the todo list (§0.6).
 */
export function RateLimitAlert({ error, message, children, ...rest }: RateLimitAlertProps) {
  const isRateLimit =
    error?.code === 403
    || error?.code === 429
    || error?.message?.toLowerCase().includes('too frequent');
  if (!isRateLimit) return null;

  return (
    <Alert
      variant="warn"
      title="请求受限"
      message={error?.message || message || FALLBACK_RATE_LIMIT_MESSAGE}
      {...rest}
    >
      {children}
    </Alert>
  );
}
