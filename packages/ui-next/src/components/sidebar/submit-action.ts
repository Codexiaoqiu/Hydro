export type SubmitState = 'allowed' | 'anonymous' | 'forbidden';

export interface SubmitInputs {
  loggedIn: boolean;
  hasSubmitPerm: boolean;
  pid: string;
  tid?: string;
}

export interface SubmitResult {
  state: SubmitState;
  href?: string;
  reasonKey?: 'Problem.NoPermissionToSubmit' | 'Problem.LoginToSubmit';
}

export function resolveSubmitAction(input: SubmitInputs): SubmitResult {
  if (!input.pid) return { state: 'forbidden', reasonKey: 'Problem.NoPermissionToSubmit' };
  if (!input.loggedIn) {
    const submitPath = `/p/${encodeURIComponent(input.pid)}/submit${input.tid ? `?tid=${encodeURIComponent(input.tid)}` : ''}`;
    return {
      state: 'anonymous',
      href: `/login?redirect=${encodeURIComponent(submitPath)}`,
      reasonKey: 'Problem.LoginToSubmit',
    };
  }
  if (input.hasSubmitPerm) {
    const submitPath = `/p/${encodeURIComponent(input.pid)}/submit${input.tid ? `?tid=${encodeURIComponent(input.tid)}` : ''}`;
    return { state: 'allowed', href: submitPath };
  }
  return { state: 'forbidden', reasonKey: 'Problem.NoPermissionToSubmit' };
}
