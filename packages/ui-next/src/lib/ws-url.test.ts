import { describe, expect, it } from 'vitest';
import { toWebSocketUrl } from './ws-url';

const httpLoc = { protocol: 'http:', host: 'localhost:2333' };
const httpsLoc = { protocol: 'https:', host: 'judge.example.com' };

describe('toWebSocketUrl', () => {
  it('promotes a relative path to an absolute ws:// URL on http:', () => {
    expect(toWebSocketUrl('record-conn?pretest=1', { location: httpLoc }))
      .toBe('ws://localhost:2333/record-conn?pretest=1');
  });

  it('promotes to wss:// when the page is https:', () => {
    expect(toWebSocketUrl('record-conn?pretest=1', { location: httpsLoc }))
      .toBe('wss://judge.example.com/record-conn?pretest=1');
  });

  it('preserves a leading-slash path', () => {
    expect(toWebSocketUrl('/record-conn?rid=abc', { location: httpLoc }))
      .toBe('ws://localhost:2333/record-conn?rid=abc');
  });

  it('joins a non-default ws_prefix without doubling slashes', () => {
    expect(toWebSocketUrl('record-conn', { location: httpLoc, wsPrefix: '/ws/' }))
      .toBe('ws://localhost:2333/ws/record-conn');
  });

  it('normalises ws_prefix with trailing slashes', () => {
    expect(toWebSocketUrl('record-conn', { location: httpLoc, wsPrefix: '/ws///' }))
      .toBe('ws://localhost:2333/ws/record-conn');
  });

  it('passes through a complex query string', () => {
    const url = toWebSocketUrl(
      'record-conn?pretest=1&uidOrName=42&pid=123&tid=abc',
      { location: httpLoc },
    );
    expect(url).toBe('ws://localhost:2333/record-conn?pretest=1&uidOrName=42&pid=123&tid=abc');
  });

  it('returns null when neither window nor an explicit location is available', () => {
    // happy-dom provides `window`, so this branch only triggers in Node —
    // simulate by passing neither window nor location through the helper.
    const saved = (globalThis as { window?: unknown }).window;
    try {
      // @ts-expect-error: intentionally delete the global for the assertion
      delete (globalThis as { window?: unknown }).window;
      expect(toWebSocketUrl('record-conn')).toBeNull();
    } finally {
      if (saved !== undefined) (globalThis as { window?: unknown }).window = saved;
    }
  });
});
