import { describe, expect, it } from 'vitest';
import { isSafeRelativeRedirect, sanitizeSudoRedirect } from './safe-redirect';

describe('isSafeRelativeRedirect', () => {
  it('accepts empty string and returns empty', () => {
    expect(isSafeRelativeRedirect('', new Set(['http://localhost']))).toBe('');
  });

  it('rejects protocol-relative', () => {
    expect(isSafeRelativeRedirect('//evil.com', new Set(['http://localhost']))).toBeNull();
  });

  it('rejects javascript: scheme', () => {
    expect(isSafeRelativeRedirect('javascript:alert(1)', new Set())).toBeNull();
  });

  it('rejects data: scheme', () => {
    expect(isSafeRelativeRedirect('data:text/html,<script>alert(1)</script>', new Set())).toBeNull();
  });

  it('accepts in-origin absolute URL and returns relative part', () => {
    const origins = new Set(['http://localhost:2333']);
    expect(isSafeRelativeRedirect('http://localhost:2333/contest/123', origins)).toBe('/contest/123');
  });

  it('accepts in-origin absolute URL with query and hash', () => {
    const origins = new Set(['http://localhost:2333']);
    expect(isSafeRelativeRedirect('http://localhost:2333/p/1?lang=zh#section', origins)).toBe('/p/1?lang=zh#section');
  });

  it('rejects cross-origin absolute URL', () => {
    const origins = new Set(['http://localhost:2333']);
    expect(isSafeRelativeRedirect('http://evil.com/contest/123', origins)).toBeNull();
  });

  it('accepts relative path with query and hash', () => {
    expect(isSafeRelativeRedirect('/contest/123?lang=zh#section', new Set())).toBe('/contest/123?lang=zh#section');
  });

  it('rejects bare path without leading slash', () => {
    expect(isSafeRelativeRedirect('contest/123', new Set())).toBeNull();
  });
});

describe('sanitizeSudoRedirect', () => {
  it('falls back to default for unsafe values', () => {
    expect(sanitizeSudoRedirect('//evil.com', new Set(['http://l']), '/homepage')).toBe('/homepage');
  });

  it('keeps safe relative values', () => {
    expect(sanitizeSudoRedirect('/contest/123', new Set(), '/homepage')).toBe('/contest/123');
  });

  it('keeps empty string (caller handles empty)', () => {
    expect(sanitizeSudoRedirect('', new Set(), '/homepage')).toBe('');
  });

  it('rejects javascript: scheme with fallback', () => {
    expect(sanitizeSudoRedirect('javascript:alert(1)', new Set(), '/homepage')).toBe('/homepage');
  });
});
