import { useState, type FormEvent } from 'react';
import { usePageData } from '../context/page-data';
import { Link } from '../components/link';
import { AuthShell } from '../components/auth/AuthShell';
import { Alert, Button, Input, RateLimitAlert } from '../components/primitives';
import { HydroClientError, request } from '../hooks/use-api';
import { useTranslate } from '../lib/i18n';

interface Args {
  smtpConfigured?: boolean;
}

export default function UserLostPassPage() {
  const { args } = usePageData() as unknown as { args: Args };
  const smtpConfigured = args?.smtpConfigured !== false;
  const [mail, setMail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<HydroClientError | null>(null);
  const [sent, setSent] = useState(false);
  const t = useTranslate();

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const fd = new URLSearchParams();
      fd.set('mail', mail);
      await request.post('/lostpass', fd);
      setSent(true);
    } catch (err) {
      if (err instanceof HydroClientError) setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title={t('Auth.LostPassword')}
      subtitle={
        smtpConfigured
          ? t('Auth.ResetHint')
          : t('Auth.LostPassFallback')
      }
      footLinks={<Link to="user_login">{t('Auth.BackToSignIn')}</Link>}
    >
      {!smtpConfigured ? (
        <Alert
          variant="warn"
          title={t('Auth.MailNotConfiguredTitle')}
          message={t('Auth.MailNotConfiguredMessage')}
        />
      ) : (
        <>
          {error && error.code !== 429 && <Alert variant="error" message={error.message} />}
          <RateLimitAlert error={error} />
          {sent ? (
            <Alert variant="success" title={t('Auth.ResetSentTitle')} message={t('Auth.ResetSentMessage')} />
          ) : (
            <form onSubmit={submit} method="POST" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <Input
                label={t('Auth.Email')}
                name="mail"
                type="text"
                autoFocus
                autoComplete="email"
                required
                value={mail}
                onChange={(e) => setMail(e.currentTarget.value)}
              />
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? t('Auth.Sending') : t('Auth.SendReset')}
              </Button>
            </form>
          )}
        </>
      )}
    </AuthShell>
  );
}