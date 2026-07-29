import { startAuthentication } from '@simplewebauthn/browser';
import { type FormEvent, useState } from 'react';
import { AuthShell } from '../components/auth/AuthShell';
import { Alert, Button, Input } from '../components/primitives';
import { sanitizeSudoRedirect } from '../components/sudo/safe-redirect';
import { usePageData } from '../context/page-data';
import { useNavigate } from '../context/router';
import { HydroClientError, request } from '../hooks/use-api';
import { useTranslate } from '../lib/i18n';

interface UserLite { authn?: boolean, tfa?: boolean, _id?: number }
interface Args {
  builtInLogin?: boolean;
  redirect?: string;
  UserContext?: UserLite;
  endpointOrigin?: string;
}

const FALLBACK = '/homepage';

export default function UserSudoPage() {
  const { args } = usePageData() as unknown as { args: Args };
  const t = useTranslate();
  const navigate = useNavigate();
  const origins = new Set<string>(args?.endpointOrigin ? [args.endpointOrigin] : []);
  const redirect = sanitizeSudoRedirect(args?.redirect ?? '', origins, FALLBACK);
  const user = args?.UserContext ?? {};
  const [password, setPassword] = useState('');
  const [tfa, setTfa] = useState('');
  const [authnChallenge, setAuthnChallenge] = useState('');
  const [error, setError] = useState<HydroClientError | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const fd = new URLSearchParams();
      if (user.authn && authnChallenge) fd.set('authnChallenge', authnChallenge);
      else if (user.tfa && tfa) fd.set('tfa', tfa);
      else fd.set('password', password);
      await request.post('/user/sudo', fd);
      navigate(redirect);
    } catch (err) {
      if (err instanceof HydroClientError) setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const runWebauthn = async () => {
    if (typeof window === 'undefined' || !window.isSecureContext || !('credentials' in navigator)) {
      setError(new HydroClientError({
        name: 'WebAuthnError', code: 0, message: 'WebAuthn unavailable in this context',
      }));
      return;
    }
    try {
      const { authOptions } = await request.get<{ authOptions: unknown }>('/user/webauthn', { login: true });
      const result = await startAuthentication({ optionsJSON: authOptions as any });
      const verified = await request.post<{ challenge?: string }>('/user/webauthn', { result });
      if (!verified?.challenge) {
        throw new HydroClientError({ name: 'WebAuthnError', code: 400, message: 'challenge missing' });
      }
      setAuthnChallenge(verified.challenge);
    } catch (err) {
      if (err instanceof HydroClientError) setError(err);
    }
  };

  return (
    <AuthShell title={t('Auth.SudoTitle')} subtitle={t('Auth.SudoSubtitle')}>
      <form method="POST" onSubmit={submit}>
        {error && <Alert variant="error" message={error.message} />}

        {!user.authn && !user.tfa && (
          <Input
            label={t('Auth.Password')}
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        )}

        {user.tfa && !user.authn && (
          <Input
            label={t('Auth.TfaCode')}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={tfa}
            onChange={(e) => setTfa(e.target.value)}
          />
        )}

        {user.authn && (
          <Button type="button" variant="primary" onClick={runWebauthn} disabled={submitting}>
            {authnChallenge ? t('Auth.WebAuthnVerified') : t('Auth.UseAuthenticator')}
          </Button>
        )}

        <input type="hidden" name="authnChallenge" value={authnChallenge} />
        <Button type="submit" variant="primary" disabled={submitting || (!!user.authn && !authnChallenge)}>
          {t('Auth.Confirm')}
        </Button>
      </form>
    </AuthShell>
  );
}
