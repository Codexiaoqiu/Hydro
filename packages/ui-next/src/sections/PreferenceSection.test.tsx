/* @vitest-environment happy-dom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { supportFontFamily } from './PreferenceSection.fonts';

afterEach(() => { vi.restoreAllMocks(); });

function mockCanvas({ same, fonts = [] }: { same: boolean, fonts?: string[] }): void {
  // supportFontFamily calls paint() twice: once for the Arial baseline and
  // once for the candidate font. We toggle the per-call buffer so the test
  // can express "second call differs from first" via `same: false`.
  let callIdx = 0;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ({
    textAlign: '', fillStyle: '', textBaseline: '', font: '',
    clearRect: () => {},
    fillText: () => {},
    getImageData: () => {
      callIdx += 1;
      // 1st call (baseline Arial): always all-zero. 2nd call (candidate):
      // either identical (same=true, font fell back) or different
      // (same=false, font painted something).
      const fillValue = same ? 0 : (callIdx >= 2 ? 99 : 0);
      return { data: new Uint8ClampedArray(100 * 100 * 4).fill(fillValue) };
    },
  } as unknown as CanvasRenderingContext2D));
  Object.defineProperty(document, 'fonts', {
    configurable: true,
    value: {
      addEventListener: () => {},
      removeEventListener: () => {},
      onloadingdone: null,
      check: () => Promise.resolve(false),
      load: () => Promise.resolve(fonts),
    },
  });
}

describe('supportFontFamily', () => {
  it('returns true for Arial itself', () => {
    mockCanvas({ same: true });
    expect(supportFontFamily('Arial')).toBe(true);
    expect(supportFontFamily('arial')).toBe(true);
  });

  it('returns false when the canvas returns identical pixels (font fell back to Arial)', () => {
    mockCanvas({ same: true });
    expect(supportFontFamily('Definitely Not Installed')).toBe(false);
  });

  it('returns true when the candidate font renders different pixels than the Arial baseline', () => {
    mockCanvas({ same: false });
    expect(supportFontFamily('Open Sans')).toBe(true);
  });

  it('returns false for an empty string', () => {
    mockCanvas({ same: true });
    expect(supportFontFamily('')).toBe(false);
  });
});
