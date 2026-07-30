import { STATUS } from '@hydrooj/common';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  IFRAME_STATUS_MESSAGE,
  isAcceptedStatus,
  isTerminalRecordStatus,
  isTrustedIframeOrigin,
} from './iframe-protocol';

describe('iframe-protocol', () => {
  describe('iFRAME_STATUS_MESSAGE', () => {
    it('is the literal "hydro-record-status"', () => {
      expect(IFRAME_STATUS_MESSAGE).toBe('hydro-record-status');
    });
  });

  describe('isAcceptedStatus', () => {
    it('accepts numeric STATUS_ACCEPTED', () => {
      expect(isAcceptedStatus(STATUS.STATUS_ACCEPTED)).toBe(true);
    });

    it('accepts legacy string "STATUS_ACCEPTED"', () => {
      expect(isAcceptedStatus('STATUS_ACCEPTED')).toBe(true);
    });

    it('rejects other numeric statuses', () => {
      expect(isAcceptedStatus(STATUS.STATUS_WRONG_ANSWER)).toBe(false);
    });

    it('rejects null/undefined/objects', () => {
      expect(isAcceptedStatus(null)).toBe(false);
      expect(isAcceptedStatus(undefined)).toBe(false);
      expect(isAcceptedStatus({})).toBe(false);
    });
  });

  describe('isTerminalRecordStatus', () => {
    it('accepts accepted/wrong_answer/time_limit_exceeded', () => {
      expect(isTerminalRecordStatus(STATUS.STATUS_ACCEPTED)).toBe(true);
      expect(isTerminalRecordStatus(STATUS.STATUS_WRONG_ANSWER)).toBe(true);
      expect(isTerminalRecordStatus(STATUS.STATUS_TIME_LIMIT_EXCEEDED)).toBe(true);
    });

    it('rejects in-progress statuses', () => {
      expect(isTerminalRecordStatus(STATUS.STATUS_WAITING)).toBe(false);
      expect(isTerminalRecordStatus(STATUS.STATUS_JUDGING)).toBe(false);
    });

    it('rejects non-numeric', () => {
      expect(isTerminalRecordStatus('STATUS_ACCEPTED')).toBe(false);
      expect(isTerminalRecordStatus(null)).toBe(false);
    });
  });

  describe('isTrustedIframeOrigin', () => {
    const originalWindow = globalThis.window;

    beforeEach(() => {
      // @ts-expect-error — minimal stub for happy-dom origin check
      globalThis.window = { location: { origin: 'http://localhost:8000' } };
    });
    afterEach(() => {
      globalThis.window = originalWindow;
    });

    it('accepts the same origin', () => {
      expect(isTrustedIframeOrigin('http://localhost:8000')).toBe(true);
    });

    it('rejects cross-origin', () => {
      expect(isTrustedIframeOrigin('http://evil.com')).toBe(false);
    });

    it('rejects null origin (sandboxed iframe)', () => {
      expect(isTrustedIframeOrigin('null')).toBe(false);
    });
  });
});
