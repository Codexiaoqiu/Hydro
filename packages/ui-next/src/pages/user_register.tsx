import { type FormEvent, useState } from 'react';
import { AuthShell } from '../components/auth/AuthShell';
import { Link } from '../components/link';
import { Alert, Button, Input, RateLimitAlert } from '../components/primitives';
import { usePageData } from '../context/page-data';
import { HydroClientError, request } from '../hooks/use-api';
import { useTranslate } from '../lib/i18n';

interface Args {
  mail?: string;
  UserContext?: { mail?: string };
}

export default function UserRegisterPage() {
  const { args } = usePageData() as unknown as { args: Args };
  const [mail, setMail] = useState(args?.mail ?? '');
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
      await request.post('/register', fd);
      setSent(true);
    } catch (err) {
      if (err instanceof HydroClientError) setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title={sent ? t('Auth.CheckInbox') : t('Auth.CreateAccount')}
      subtitle={sent ? t('Auth.SentToMail', { mail }) : t('Auth.MailHint')}
      footLinks={<Link to="user_login">{t('Auth.AlreadyHaveAccount')}</Link>}
    >
      {error && error.code !== 429 && <Alert variant="error" message={error.message} />}
      <RateLimitAlert error={error} />
      {sent ? (
        <Alert variant="success" title={t('Auth.EmailSentTitle')} message={t('Auth.EmailSentMessage')} />
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
            hint={t('Auth.MailHint')}
          />
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? t('Auth.Sending') : t('Auth.SendVerification')}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
