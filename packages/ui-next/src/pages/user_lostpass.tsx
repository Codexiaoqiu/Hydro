import { useState, type FormEvent } from 'react';
import { usePageData } from '../context/page-data';
import { Link } from '../components/link';
import { AuthShell } from '../components/auth/AuthShell';
import { Alert, Button, Input, RateLimitAlert } from '../components/primitives';
import { HydroClientError, request } from '../hooks/use-api';

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
      title="Lost password"
      subtitle={
        smtpConfigured
          ? 'Enter the email tied to your account and we will send you a reset link.'
          : 'Relax and try to remember your password.'
      }
      footLinks={<Link to="user_login">Back to sign in</Link>}
    >
      {!smtpConfigured ? (
        <Alert
          variant="warn"
          title="Mail not configured"
          message="The administrator has not set up a mail provider, so password recovery is unavailable. Contact an administrator for help."
        />
      ) : (
        <>
          {error && error.code !== 429 && <Alert variant="error" message={error.message} />}
          <RateLimitAlert error={error} />
          {sent ? (
            <Alert variant="success" title="Reset link sent" message="Check your inbox for instructions." />
          ) : (
            <form onSubmit={submit} method="POST" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <Input
                label="Email"
                name="mail"
                type="text"
                autoFocus
                autoComplete="email"
                required
                value={mail}
                onChange={(e) => setMail(e.currentTarget.value)}
              />
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? 'Sending…' : 'Send password reset email'}
              </Button>
            </form>
          )}
        </>
      )}
    </AuthShell>
  );
}