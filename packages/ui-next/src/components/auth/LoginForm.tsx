import { useEffect, useState, type FormEvent } from 'react';
import { Alert, Button, Checkbox, Input, RateLimitAlert } from '../primitives';
import { HydroClientError, request } from '../../hooks/use-api';
import { usePostLoginRedirect } from '../../hooks/use-post-login-redirect';
import styles from './LoginForm.module.css';

export interface LoginMethod {
  id: string;
  text: string;
}

export interface LoginFormProps {
  /** Allow built-in (username/password) login form. */
  builtInLogin: boolean;
  /** OAuth / OIDC providers (rendered as a button list). */
  loginMethods?: LoginMethod[];
  /** Redirect target after a successful login (overrides referer-based fallback). */
  redirect?: string;
  /** Optional extra UI rendered at the top of the form (e.g. 2FA prompt). */
  extraFields?: React.ReactNode;
  /** Override the submit button label. */
  submitLabel?: string;
  /** Hide the "forgot password" footnote. */
  hideFootnote?: boolean;
  /** Override the post-login redirect (e.g. for sudo flows that should stay on page). */
  onSuccess?: (resp: unknown) => void;
  /** Apply the auth-shell-styled full-width variant. */
  wide?: boolean;
}

interface TfaInfo {
  tfa: boolean;
  authn?: boolean;
}

/**
 * Login form used by `/login`, `<SignInDialog>`, and `/user/sudo`.
 *
 * Submission flow:
 *   1. If 2FA is required (`tfa` field is non-empty), re-submit with the TFA
 *      code in the `tfa` form field.
 *   2. Otherwise, send the username/password via `request.post('/login', …)`,
 *      which throws `HydroClientError` on validation/auth failure.
 *   3. On success, follow `usePostLoginRedirect()` (unless `onSuccess` given).
 *
 * Field naming intentionally mirrors `templates/user_login.html` so the same
 * names round-trip with the backend `@param('uname')` / `@param('password')`.
 */
export function LoginForm({
  builtInLogin,
  loginMethods = [],
  redirect,
  extraFields,
  submitLabel = 'Login',
  hideFootnote,
  onSuccess,
  wide,
}: LoginFormProps) {
  const [uname, setUname] = useState('');
  const [password, setPassword] = useState('');
  const [rememberme, setRememberme] = useState(false);
  const [tfa, setTfa] = useState('');
  const [authnChallenge, setAuthnChallenge] = useState('');
  const [tfaInfo, setTfaInfo] = useState<TfaInfo | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<HydroClientError | null>(null);
  const redirectApi = usePostLoginRedirect();

  // Probe TFA / WebAuthn requirement when the username loses focus.
  useEffect(() => {
    if (!builtInLogin) return;
    const u = uname.trim();
    if (!u) {
      setTfaInfo(null);
      return;
    }
    let cancelled = false;
    request
      .get<TfaInfo>('/user/tfa', { q: u })
      .then((info) => {
        if (!cancelled) setTfaInfo(info ?? null);
      })
      .catch(() => {
        if (!cancelled) setTfaInfo(null);
      });
    return () => {
      cancelled = true;
    };
  }, [uname, builtInLogin]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const formData = new URLSearchParams();
      formData.set('uname', uname);
      formData.set('password', password);
      formData.set('login_submit', submitLabel);
      if (rememberme) formData.set('rememberme', 'on');
      if (tfa) formData.set('tfa', tfa);
      if (authnChallenge) formData.set('authnChallenge', authnChallenge);
      const resp = await request.post('/login', formData);
      if (onSuccess) {
        onSuccess(resp);
      } else if (typeof window !== 'undefined') {
        window.location.href = redirect || redirectApi.target;
      }
    } catch (e) {
      if (e instanceof HydroClientError) setError(e);
    } finally {
      setSubmitting(false);
    }
  };

  const showOauth = loginMethods.length > 0;
  const showTfaField = tfaInfo?.tfa && !authnChallenge;
  const formClass = `${styles.form} ${wide ? styles.formWide : ''}`;

  // Build the OAuth redirect query exactly once. Using URLSearchParams (per
  // WHATWG URL) guarantees that any reserved characters inside `redirect`
  // (e.g. `?`, `&`, `=`, `#`) are percent-encoded as a single value, so the
  // round-trip to the backend `@param('redirect')` and back out to
  // `response.redirect` decode-once reproduces the original path/query/fragment
  // untouched. Manual concatenation with `encodeURIComponent` works for the
  // common case but is brittle and obscures intent — this is the robust form.
  const oauthRedirectQs = (() => {
    const qs = new URLSearchParams();
    qs.set('redirect', redirect || redirectApi.target);
    return qs.toString();
  })();

  return (
    <form className={formClass} method="POST" onSubmit={handleSubmit} noValidate>
      {error && error.code !== 429 && (
        <Alert variant="error" message={error.message} onClose={() => setError(null)} />
      )}
      <RateLimitAlert error={error} />

      {builtInLogin && (
        <>
          <Input
            label="Username"
            name="uname"
            type="text"
            autoFocus
            autoComplete="username webauthn"
            required
            value={uname}
            onChange={(e) => setUname(e.currentTarget.value)}
            error={error?.code === 404 ? error.message : undefined}
          />
          <Input
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
          />
          <Checkbox
            name="rememberme"
            label="Remember me"
            checked={rememberme}
            onChange={(e) => setRememberme(e.currentTarget.checked)}
          />
          {showTfaField && (
            <Input
              label="2FA Code"
              name="tfa"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={tfa}
              onChange={(e) => setTfa(e.currentTarget.value)}
              hint={tfaInfo?.authn ? 'Or use your passkey.' : undefined}
            />
          )}
          {extraFields}
          <input type="hidden" name="authnChallenge" value={authnChallenge} />
          <input type="hidden" name="redirect" value={redirect ?? ''} />
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? 'Signing in…' : submitLabel}
          </Button>
          {!hideFootnote && (
            <p className={styles.footnote}>
              <a href="/lostpass">Forgot password or username?</a>
            </p>
          )}
        </>
      )}

      {showOauth && builtInLogin && <div className={styles.divider}><span>or</span></div>}
      {showOauth && (
        <div className={styles.oauthList}>
          {loginMethods.map((m) => (
            <a
              key={m.id}
              className={styles.oauthBtn}
              href={`/oauth/${encodeURIComponent(m.id)}/login?${oauthRedirectQs}`}
            >
              {m.text}
            </a>
          ))}
        </div>
      )}

      {!builtInLogin && !showOauth && (
        <Alert
          variant="info"
          title="No login methods configured"
          message="The administrator has not enabled any login providers."
        />
      )}
    </form>
  );
}