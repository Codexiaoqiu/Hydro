// Client-side port of packages/hydrooj/src/lib/difficulty.ts.
// Kept numerically identical to the server implementation so the difficulty
// shown in the SPA matches the value stored in ProblemDoc.difficulty once the
// backend learns to write it. Formula: round(10 - 13 * ∫log-normal PDF * AC-rate),
// with a precomputed CDF cache built lazily up to 10000.
//
// The original lives on the server (Node) and is not re-exported from
// @hydrooj/common, so we mirror it here.

const _CACHE_INFO = {
    s: 0.0,
    y: 0,
    values: [0.0],
};

function _LOGP(x: number) {
    const sqrtPi = 2.506628274631; // Sqrt[Pi]
    return (2 * Math.exp(-2.0 * (Math.log(x) ** 2))) / x / sqrtPi;
}

function _intergrateEnsureCache(y: number) {
    let lastY = _CACHE_INFO.y;
    if (y <= lastY) return _CACHE_INFO;
    let s = _CACHE_INFO.s;
    const dx = 0.1;
    const dT = 2;
    let x0 = (lastY / dT) * dx;
    while (y > lastY) {
        x0 += dx;
        s += _LOGP(x0) * dx;
        for (let i = 1; i <= dT; i++) _CACHE_INFO.values.push(s);
        lastY += dT;
    }
    _CACHE_INFO.y = lastY;
    _CACHE_INFO.s = s;
    return _CACHE_INFO;
}

_intergrateEnsureCache(10000);

function _integrate(y: number) {
    _intergrateEnsureCache(y);
    return _CACHE_INFO.values[y];
}

export function difficultyAlgorithm(nSubmit: number, nAccept: number): number | null {
    if (!nSubmit) return null;
    const s = _integrate(nSubmit);
    const acRate = nAccept / nSubmit;
    const ans = Math.round(10 - 13 * s * acRate);
    return Math.max(ans, 1);
}

// `formatN` historically lived here; it has been moved to `./format.ts` so
// any module that needs to render a count can share one implementation.
// Re-exported below for backwards compatibility with existing call sites
// (`pages/problem_main.tsx`, this module's own test).
export { formatN } from './format';

export default difficultyAlgorithm;
