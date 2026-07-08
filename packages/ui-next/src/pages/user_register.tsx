import { useState, type FormEvent } from 'react';
import { usePageData } from '../context/page-data';
import { Link } from '../components/link';
import { AuthShell } from '../components/auth/AuthShell';
import { Alert, Button, Input, RateLimitAlert } from '../components/primitives';
import { HydroClientError, request } from '../hooks/use-api';

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
      title={sent ? 'Check your inbox' : 'Create account'}
      subtitle={sent ? `We sent a verification link to ${mail}.` : 'Use your email to receive a one-time registration link.'}
      footLinks={<Link to="user_login">Already have an account?</Link>}
    >
      {error && error.code !== 429 && <Alert variant="error" message={error.message} />}
      <RateLimitAlert error={error} />
      {sent ? (
        <Alert variant="success" title="Email sent" message="Open the link in your inbox within 24 hours to finish creating your account." />
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
            hint="A verification link will be sent to this address."
          />
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? 'Sending…' : 'Send verification email'}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}