import { useState, type FormEvent } from 'react';
import { usePageData } from '../context/page-data';
import { AuthShell } from '../components/auth/AuthShell';
import { Alert, Button, Input, RateLimitAlert } from '../components/primitives';
import { HydroClientError, request } from '../hooks/use-api';
import { useTranslate } from '../lib/i18n';

interface Args {
  mail?: string;
}

export default function UserRegisterWithCodePage() {
  const { args } = usePageData() as unknown as { args: Args };
  const mail = args?.mail ?? '';
  const [uname, setUname] = useState('');
  const [password, setPassword] = useState('');
  const [verifyPassword, setVerifyPassword] = useState('');
  const [error, setError] = useState<HydroClientError | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const t = useTranslate();

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (password !== verifyPassword) {
      setError(new HydroClientError({ code: 400, message: t('Auth.PasswordMismatch') }));
      return;
    }
    setSubmitting(true);
    try {
      const code = window.location.pathname.split('/').pop() ?? '';
      const fd = new URLSearchParams();
      fd.set('uname', uname);
      fd.set('password', password);
      fd.set('verifyPassword', verifyPassword);
      await request.post(`/register/${encodeURIComponent(code)}`, fd);
      window.location.href = '/home_settings?category=preference';
    } catch (err) {
      if (err instanceof HydroClientError) setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell title={t('Auth.FinishRegistration')} subtitle={t('Auth.ChooseFor', { mail })}>
      {error && error.code !== 429 && <Alert variant="error" message={error.message} />}
      <RateLimitAlert error={error} />
      <form onSubmit={submit} method="POST" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <Input label={t('Auth.Email')} name="mail" type="email" value={mail} disabled required />
        <Input
          label={t('Auth.Username')}
          name="uname"
          type="text"
          autoFocus
          autoComplete="username"
          required
          value={uname}
          onChange={(e) => setUname(e.currentTarget.value)}
        />
        <Input
          label={t('Auth.Password')}
          name="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Input
          label={t('Auth.VerifyPassword')}
          name="verifyPassword"
          type="password"
          autoComplete="new-password"
          required
          value={verifyPassword}
          onChange={(e) => setVerifyPassword(e.target.value)}
        />
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? t('Auth.Creating') : t('Auth.Create')}
        </Button>
      </form>
    </AuthShell>
  );
}