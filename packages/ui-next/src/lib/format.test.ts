import { describe, expect, it } from 'vitest';
import { formatBytes, formatN } from './format';

describe('formatBytes', () => {
  it.each([0, undefined, null, Number.NaN, -1])(
    'returns placeholders for %p',
    (v) => {
      expect(formatBytes(v as number)).toBe('—');
    },
  );

  it('formats binary units correctly', () => {
    expect(formatBytes(1024)).toBe('1KiB');
    expect(formatBytes(2.5 * 1024 ** 2)).toBe('2.5MiB');
    expect(formatBytes(1024 ** 3)).toBe('1GiB');
  });

  it('switches to decimal when binary:false', () => {
    expect(formatBytes(1500, { binary: false })).toBe('1.5KB');
  });

  it('trims trailing .0', () => {
    expect(formatBytes(2 * 1024)).toBe('2KiB');
  });
});

describe('formatN', () => {
  it.each<[number | null | undefined, string]>([
    [0, '—'],
    [undefined, '?'],
    [null, '?'],
    [42, '42'],
  ])('formatN(%p) -> %p', (input, expected) => {
    expect(formatN(input)).toBe(expected);
  });
});
