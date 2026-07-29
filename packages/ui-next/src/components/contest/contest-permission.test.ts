import { describe, expect, it } from 'vitest';
import { buildPermissionPayload, deriveInitialPermission } from './contest-permission';

describe('contest-permission', () => {
  it('derives public when neither code nor assign is set', () => {
    expect(deriveInitialPermission({})).toBe('public');
    expect(deriveInitialPermission({ _code: '', assign: [] })).toBe('public');
  });

  it('derives invite when only _code is set', () => {
    expect(deriveInitialPermission({ _code: 'abcd' })).toBe('invite');
  });

  it('derives assign when assign list is non-empty', () => {
    expect(deriveInitialPermission({ assign: [1, 2] })).toBe('assign');
  });

  it('public mode emits no auth-only fields', () => {
    const fd = new URLSearchParams();
    buildPermissionPayload(fd, 'public', { _code: 'should-not-leak', assign: [9] });
    expect(fd.get('code')).toBeNull();
    expect(fd.get('assign')).toBeNull();
  });

  it('invite mode keeps _code and strips assign', () => {
    const fd = new URLSearchParams();
    buildPermissionPayload(fd, 'invite', { _code: 'abcd', assign: [1] });
    expect(fd.get('code')).toBe('abcd');
    expect(fd.get('assign')).toBeNull();
  });

  it('assign mode keeps CSV and strips _code', () => {
    const fd = new URLSearchParams();
    buildPermissionPayload(fd, 'assign', { _code: 'leak', assign: [1, 2, 3] });
    expect(fd.get('code')).toBeNull();
    expect(fd.get('assign')).toBe('1,2,3');
  });
});
