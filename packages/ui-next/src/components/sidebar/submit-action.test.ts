import { describe, expect, it } from 'vitest';
import { resolveSubmitAction } from './submit-action';

const baseInput = {
  loggedIn: true,
  hasSubmitPerm: true,
  domainJoin: true,
  pid: 'P1000',
  tid: undefined as string | undefined,
};

describe('resolveSubmitAction', () => {
  it('returns allowed URL when user has permission and pid exists', () => {
    const r = resolveSubmitAction({ ...baseInput });
    expect(r.state).toBe('allowed');
    expect(r.href).toBe('/p/P1000/submit');
  });

  it('appends tid query when in contest or homework', () => {
    const r = resolveSubmitAction({ ...baseInput, tid: '64f0d4a5b1c2d3e4f5a6b7c1' });
    expect(r.state).toBe('allowed');
    expect(r.href).toBe('/p/P1000/submit?tid=64f0d4a5b1c2d3e4f5a6b7c1');
  });

  it('returns anonymous when user is not logged in', () => {
    const r = resolveSubmitAction({ ...baseInput, loggedIn: false });
    expect(r.state).toBe('anonymous');
    expect(r.href).toMatch(/^\/login\?redirect=/);
  });

  it('returns forbidden when user is logged in but has no submit permission', () => {
    const r = resolveSubmitAction({ ...baseInput, hasSubmitPerm: false });
    expect(r.state).toBe('forbidden');
    expect(r.href).toBeUndefined();
  });

  it('returns forbidden when user has no domain join and cannot submit', () => {
    const r = resolveSubmitAction({ ...baseInput, hasSubmitPerm: false, domainJoin: false });
    expect(r.state).toBe('forbidden');
  });

  it('returns forbidden when pid is missing', () => {
    const r = resolveSubmitAction({ ...baseInput, pid: '' });
    expect(r.state).toBe('forbidden');
  });
});
