import { useState, type FormEvent } from 'react';
import { usePageData } from '../context/page-data';
import { AuthShell } from '../components/auth/AuthShell';
import { Alert, Button, Input, RateLimitAlert } from '../components/primitives';
import { HydroClientError, request } from '../hooks/use-api';
import { useTranslate } from '../lib/i18n';

interface Args {
  uname?: string;
}

export default function UserLostPassWithCodePage() {
  const { args } = usePageData() as unknown as { args: Args };
  const uname = args?.uname ?? '';
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
      fd.set('password', password);
      fd.set('verifyPassword', verifyPassword);
      await request.post(`/lostpass/${encodeURIComponent(code)}`, fd);
      window.location.href = '/';
    } catch (err) {
      if (err instanceof HydroClientError) setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell title={t('Auth.ResetPassword')} subtitle={t('Auth.NewPasswordFor', { name: uname })}>
      {error && error.code !== 429 && <Alert variant="error" message={error.message} />}
      <RateLimitAlert error={error} />
      <form onSubmit={submit} method="POST" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <Input label={t('Auth.Username')} name="uname" type="text" value={uname} disabled required />
        <Input
          label={t('Auth.NewPassword')}
          name="password"
          type="password"
          autoFocus
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
          {submitting ? t('Auth.Saving') : t('Auth.SetNewPassword')}
        </Button>
      </form>
    </AuthShell>
  );
}