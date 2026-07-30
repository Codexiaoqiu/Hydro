import { STATUS } from '@hydrooj/common';
import { isTerminalStatus } from './record-terminal';

export const IFRAME_STATUS_MESSAGE = 'hydro-record-status' as const;

export interface IframeStatusPayload {
  type: typeof IFRAME_STATUS_MESSAGE;
  status: number;
}

export function isAcceptedStatus(value: unknown): boolean {
  return value === STATUS.STATUS_ACCEPTED || value === 'STATUS_ACCEPTED';
}

export function isTerminalRecordStatus(value: unknown): value is number {
  return typeof value === 'number' && isTerminalStatus(value);
}

/**
 * Strict origin check — only accept messages whose origin matches our own.
 * Rejects cross-origin, `null` (sandboxed iframe), and empty strings.
 */
export function isTrustedIframeOrigin(origin: string): boolean {
  if (typeof window === 'undefined') return false;
  if (!origin || origin === 'null') return false;
  try {
    return origin === window.location.origin;
  } catch {
    return false;
  }
}
