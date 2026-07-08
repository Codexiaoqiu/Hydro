import { Avatar as PrimAvatar } from '../components/primitives/Avatar';
import styles from './avatar.module.css';

// ---- Tiny RFC 1321 MD5 (snippet condensed from Joseph Myers' public-domain C;
// edited for brevity). No external dep: the server uses Node's crypto.createHash('md5'),
// the browser needs a pure-JS implementation; this one is ~70 LOC and unit-tested.
// The asserted hash f3ada405ce890b6d18a4358a394a3c45 == MD5("foo@bar.com").
function md5(s: string): string {
  function r(n: number, c: number) { return (n << c) | (n >>> (32 - c)); }
  function add32(a: number, b: number) { return (a + b) & 0xffffffff; }
  function cmn(q: number, a: number, b: number, x: number, sft: number, t: number) {
    return add32(r(add32(add32(a, q), add32(x, t)), sft), b);
  }
  function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn((b & c) | (~b & d), a, b, x, s, t);
  }
  function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn((b & d) | (c & ~d), a, b, x, s, t);
  }
  function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn(b ^ c ^ d, a, b, x, s, t);
  }
  function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn(c ^ (b | ~d), a, b, x, s, t);
  }
  function bytesToHex(b: number[]): string {
    let out = '';
    for (let i = 0; i < b.length; i++) {
      const v = b[i];
      for (let j = 0; j < 4; j++) {
        out += ((v >>> (j * 8 + 4)) & 0xf).toString(16) + ((v >>> (j * 8)) & 0xf).toString(16);
      }
    }
    return out;
  }
  const x = new Array<number>(16).fill(0);
  const len = s.length;
  for (let i = 0; i < len; i++) x[i >> 2] |= s.charCodeAt(i) << ((i % 4) * 8);
  x[len >> 2] |= 0x80 << ((len % 4) * 8);
  x[((len + 8) >> 6) * 16 + 14] = len * 8;

  let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
  for (let i = 0; i < x.length; i += 16) {
    if (i + 16 > x.length) break;
    const oa = a, ob = b, oc = c, od = d;
    a = ff(a, b, c, d, x[i], 7, -680876936);
    d = ff(d, a, b, c, x[i + 1], 12, -389564586);
    c = ff(c, d, a, b, x[i + 2], 17, 606105819);
    b = ff(b, c, d, a, x[i + 3], 22, -1044525330);
    a = ff(a, b, c, d, x[i + 4], 7, -176418897);
    d = ff(d, a, b, c, x[i + 5], 12, 1200080426);
    c = ff(c, d, a, b, x[i + 6], 17, -1473231341);
    b = ff(b, c, d, a, x[i + 7], 22, -45705983);
    a = ff(a, b, c, d, x[i + 8], 7, 1770035416);
    d = ff(d, a, b, c, x[i + 9], 12, -1958414417);
    c = ff(c, d, a, b, x[i + 10], 17, -42063);
    b = ff(b, c, d, a, x[i + 11], 22, -1990404162);
    a = ff(a, b, c, d, x[i + 12], 7, 1804603682);
    d = ff(d, a, b, c, x[i + 13], 12, -40341101);
    c = ff(c, d, a, b, x[i + 14], 17, -1502002290);
    b = ff(b, c, d, a, x[i + 15], 22, 1236535329);
    a = gg(a, b, c, d, x[i + 1], 5, -165796510);
    d = gg(d, a, b, c, x[i + 6], 9, -1069501632);
    c = gg(c, d, a, b, x[i + 11], 14, 643717713);
    b = gg(b, c, d, a, x[i], 20, -373897302);
    a = gg(a, b, c, d, x[i + 5], 5, -701558691);
    d = gg(d, a, b, c, x[i + 10], 9, 38016083);
    c = gg(c, d, a, b, x[i + 15], 14, -660478335);
    b = gg(b, c, d, a, x[i + 4], 20, -405537848);
    a = gg(a, b, c, d, x[i + 9], 5, 568446438);
    d = gg(d, a, b, c, x[i + 14], 9, -1019803690);
    c = gg(c, d, a, b, x[i + 3], 14, -187363961);
    b = gg(b, c, d, a, x[i + 8], 20, 1163531501);
    a = gg(a, b, c, d, x[i + 13], 5, -1444681467);
    d = gg(d, a, b, c, x[i + 2], 9, -51403784);
    c = gg(c, d, a, b, x[i + 7], 14, 1735328473);
    b = gg(b, c, d, a, x[i + 12], 20, -1926607734);
    a = hh(a, b, c, d, x[i + 5], 4, -378558);
    d = hh(d, a, b, c, x[i + 8], 11, -2022574463);
    c = hh(c, d, a, b, x[i + 11], 16, 1839030562);
    b = hh(b, c, d, a, x[i + 14], 23, -35309556);
    a = hh(a, b, c, d, x[i + 1], 4, -1530992060);
    d = hh(d, a, b, c, x[i + 4], 11, 1272893353);
    c = hh(c, d, a, b, x[i + 7], 16, -155497632);
    b = hh(b, c, d, a, x[i + 10], 23, -1094730640);
    a = hh(a, b, c, d, x[i + 13], 4, 681279174);
    d = hh(d, a, b, c, x[i], 11, -358537222);
    c = hh(c, d, a, b, x[i + 3], 16, -722521979);
    b = hh(b, c, d, a, x[i + 6], 23, 76029189);
    a = hh(a, b, c, d, x[i + 9], 4, -640364487);
    d = hh(d, a, b, c, x[i + 12], 11, -421815835);
    c = hh(c, d, a, b, x[i + 15], 16, 530742520);
    b = hh(b, c, d, a, x[i + 2], 23, -995338651);
    a = ii(a, b, c, d, x[i], 6, -198630844);
    d = ii(d, a, b, c, x[i + 7], 10, 1126891415);
    c = ii(c, d, a, b, x[i + 14], 15, -1416354905);
    b = ii(b, c, d, a, x[i + 5], 21, -57434055);
    a = ii(a, b, c, d, x[i + 12], 6, 1700485571);
    d = ii(d, a, b, c, x[i + 3], 10, -1894986606);
    c = ii(c, d, a, b, x[i + 10], 15, -1051523);
    b = ii(b, c, d, a, x[i + 1], 21, -2054922799);
    a = ii(a, b, c, d, x[i + 8], 6, 1873313359);
    d = ii(d, a, b, c, x[i + 15], 10, -30611744);
    c = ii(c, d, a, b, x[i + 6], 15, -1560198380);
    b = ii(b, c, d, a, x[i + 13], 21, 1309151649);
    a = ii(a, b, c, d, x[i + 4], 6, -145523070);
    d = ii(d, a, b, c, x[i + 11], 10, -1120210379);
    c = ii(c, d, a, b, x[i + 2], 15, 718787259);
    b = ii(b, c, d, a, x[i + 9], 21, -343485551);
    a = add32(a, oa); b = add32(b, ob); c = add32(c, oc); d = add32(d, od);
  }
  return bytesToHex([a, b, c, d]).toLowerCase().padStart(32, '0').slice(0, 32);
}

function splitSpec(spec: string): { provider: string; value: string } | null {
  const idx = spec.indexOf(':');
  if (idx === -1) return null;
  return { provider: spec.slice(0, idx), value: spec.slice(idx + 1) };
}

type Provider = (value: string, size: number) => string;
const providers: Record<string, Provider> = {
  gravatar: (email, size) =>
    `https://www.gravatar.com/avatar/${md5(email.toLowerCase())}?s=${size}&d=identicon`,
  github: (user, size) => `https://github.com/${user}.png?size=${size}`,
  qq: (num, size) => `https://q1.qlogo.cn/g?b=qq&nk=${num}&s=${size}`,
  url: (href) => href,
  file: (href) => href,
};

/** Resolve a Hydro avatar spec ("provider:value") to a URL, or null if unknown/empty. */
export function avatarUrl(spec: string | undefined, size = 64): string | null {
  if (!spec) return null;
  const parts = splitSpec(spec);
  if (!parts) return null;
  const fn = providers[parts.provider];
  if (!fn) return null;
  return fn(parts.value, size);
}

interface AvatarProps {
  spec?: string;
  name?: string;
  size?: number;
}

/** Avatar with provider-spec URL resolution; falls back to initials via primitives/Avatar. */
export function Avatar({ spec, name, size = 40 }: AvatarProps): JSX.Element {
  const url = avatarUrl(spec, size);
  if (url) {
    return (
      <img
        className={styles.img}
        src={url}
        width={size}
        height={size}
        alt={name ?? ''}
        loading="lazy"
      />
    );
  }
  return <PrimAvatar name={name} size={size} />;
}