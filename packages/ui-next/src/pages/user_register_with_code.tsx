import { useState, type FormEvent } from 'react';
import { usePageData } from '../context/page-data';
import { AuthShell } from '../components/auth/AuthShell';
import { Alert, Button, Input, RateLimitAlert } from '../components/primitives';
import { HydroClientError, request } from '../hooks/use-api';

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

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (password !== verifyPassword) {
      setError(new HydroClientError({ code: 400, message: 'Passwords do not match.' }));
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
    <AuthShell title="Finish registration" subtitle={`Choose a username and password for ${mail}.`}>
      {error && error.code !== 429 && <Alert variant="error" message={error.message} />}
      <RateLimitAlert error={error} />
      <form onSubmit={submit} method="POST" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <Input label="Email" name="mail" type="email" value={mail} disabled required />
        <Input
          label="Username"
          name="uname"
          type="text"
          autoFocus
          autoComplete="username"
          required
          value={uname}
          onChange={(e) => setUname(e.currentTarget.value)}
        />
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.currentTarget.value)}
        />
        <Input
          label="Verify password"
          name="verifyPassword"
          type="password"
          autoComplete="new-password"
          required
          value={verifyPassword}
          onChange={(e) => setVerifyPassword(e.currentTarget.value)}
        />
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </AuthShell>
  );
}