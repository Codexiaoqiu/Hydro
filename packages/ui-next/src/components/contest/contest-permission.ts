export type ContestPermission = 'public' | 'invite' | 'assign';

export interface PermissionSource {
  _code?: string;
  assign?: Array<string | number>;
}

export function deriveInitialPermission(tdoc: PermissionSource = {}): ContestPermission {
  if (tdoc.assign && tdoc.assign.length > 0) return 'assign';
  if (tdoc._code) return 'invite';
  return 'public';
}

export function buildPermissionPayload(
  fd: URLSearchParams,
  permission: ContestPermission,
  source: PermissionSource,
): void {
  fd.delete('code');
  fd.delete('assign');
  if (permission === 'invite' && source._code) fd.set('code', source._code);
  if (permission === 'assign' && source.assign?.length) {
    fd.set('assign', source.assign.join(','));
  }
}
