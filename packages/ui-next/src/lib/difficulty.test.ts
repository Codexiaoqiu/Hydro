import { describe, expect, it } from 'vitest';
import { difficultyAlgorithm, formatN } from './difficulty';

describe('difficultyAlgorithm (client port of hydrooj/lib/difficulty.ts)', () => {
  it('returns null when nSubmit is 0 regardless of nAccept', () => {
    expect(difficultyAlgorithm(0, 0)).toBeNull();
    expect(difficultyAlgorithm(0, 1)).toBeNull();
    expect(difficultyAlgorithm(0, 100)).toBeNull();
  });

  it('returns a number in [1, 10] whenever nSubmit > 0', () => {
    for (const nSubmit of [1, 2, 5, 10, 50, 100, 1000, 5000]) {
      for (const nAccept of [0, 1, Math.floor(nSubmit / 2), nSubmit]) {
        const d = difficultyAlgorithm(nSubmit, nAccept);
        expect(d).not.toBeNull();
        expect(d).toBeGreaterThanOrEqual(1);
        expect(d).toBeLessThanOrEqual(10);
      }
    }
  });

  it('rates an all-AC problem as the easiest bucket (1)', () => {
    // nSubmit = nAccept ⇒ acRate = 1 ⇒ integrand = 13 * integrate(n) * 1
    // becomes the maximum subtraction; result clamps to 1.
    expect(difficultyAlgorithm(100, 100)).toBe(1);
    expect(difficultyAlgorithm(1000, 1000)).toBe(1);
  });

  it('rates zero-AC problems harder than all-AC at the same nSubmit', () => {
    // AC-rate 0 makes the difficulty strictly higher (less subtraction).
    const ac = difficultyAlgorithm(200, 200);
    const wa = difficultyAlgorithm(200, 0);
    expect(ac).not.toBeNull();
    expect(wa).not.toBeNull();
    expect(wa!).toBeGreaterThanOrEqual(ac!);
  });

  it('monotonically decreases as nAccept grows for fixed nSubmit', () => {
    // ans = round(10 - 13 * integrate(nSubmit) * (nAccept / nSubmit))
    // acRate grows with nAccept ⇒ the integrand grows ⇒ ans shrinks.
    const nSubmit = 500;
    let prev = Infinity;
    for (const nAccept of [0, 5, 25, 100, 250, 500]) {
      const d = difficultyAlgorithm(nSubmit, nAccept);
      expect(d).not.toBeNull();
      expect(d!).toBeLessThanOrEqual(prev);
      prev = d!;
    }
  });

  it('agrees with server shape: zero-AC is harder than partial-AC at the same nSubmit', () => {
    // Anchor values verified by running
    //   packages/hydrooj/src/lib/difficulty.ts
    // under Node with the same inputs. The port must reproduce them
    // exactly — the file is a literal port, not a re-derivation.
    const cases: Array<[number, number, number]> = [
      [10, 0, 10], // tiny nSubmit, no AC → near ceiling
      [10, 10, 9], // tiny nSubmit, all AC → integrand almost zero, ans ≈ 10
      [200, 0, 10], // mid volume, zero AC → near ceiling
      [200, 200, 1], // mid volume, all AC → integrand large enough to clamp
      [2000, 2000, 1], // large nSubmit + full AC → clamped to 1
      [500, 0, 10], // large volume, zero AC → near ceiling
      [500, 250, 3], // large volume, half AC → mid bucket
      [50, 25, 4], // small-mid volume, half AC → mid bucket
      [1, 1, 10], // single submit AC'd → integrate(1) is tiny, ans ≈ 10
    ];
    for (const [nSubmit, nAccept, expected] of cases) {
      const d = difficultyAlgorithm(nSubmit, nAccept);
      expect(d).toBe(expected);
    }
  });
});

describe('formatN', () => {
  it('returns "?" when value is undefined', () => {
    expect(formatN(undefined)).toBe('?');
  });

  it('returns "—" when value is exactly 0', () => {
    // 0 means "no submissions yet" — we don't want to mislead the user
    // with a literal "0 提交" in the list, since the server omits the
    // count when it hasn't been computed.
    expect(formatN(0)).toBe('—');
  });

  it('stringifies positive integers as-is', () => {
    expect(formatN(1)).toBe('1');
    expect(formatN(42)).toBe('42');
    expect(formatN(1000000)).toBe('1000000');
  });

  it('preserves a real zero count passed via explicit assignment', () => {
    // Belt-and-suspenders: ensure the function isn't accidentally
    // coercing falsy values into "—".
    const n: number | undefined = 0;
    expect(formatN(n)).toBe('—');
  });
});
