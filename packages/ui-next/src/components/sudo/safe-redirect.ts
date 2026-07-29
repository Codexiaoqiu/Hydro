export function isSafeRelativeRedirect(target: string, endpointOrigins: Set<string>): string | null {
  if (!target) return '';
  if (target.startsWith('//')) return null;
  if (/^\s*[a-z][a-z0-9+.-]*:/i.test(target)) {
    const scheme = target.split(':', 1)[0].toLowerCase();
    if (scheme !== 'http' && scheme !== 'https') return null;
    try {
      const u = new URL(target);
      if (!endpointOrigins.has(u.origin)) return null;
      return `${u.pathname}${u.search}${u.hash}`;
    } catch {
      return null;
    }
  }
  if (target.startsWith('/')) return target;
  return null;
}

export function sanitizeSudoRedirect(target: string, endpointOrigins: Set<string>, fallback: string): string {
  const r = isSafeRelativeRedirect(target, endpointOrigins);
  return r === null ? fallback : r;
}
