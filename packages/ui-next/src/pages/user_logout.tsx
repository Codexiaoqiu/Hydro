import { AuthShell } from '../components/auth/AuthShell';
import { Link } from '../components/link';
import { Button } from '../components/primitives';

/** GET /logout clears the session server-side; this page is only rendered on error. */
export default function UserLogoutPage() {
  return (
    <AuthShell
      title="Sign out"
      subtitle="Click below to sign out of Hydro."
      footLinks={<Link to="homepage">Back to homepage</Link>}
    >
      <a href="/logout" style={{ textDecoration: 'none' }}>
        <Button variant="primary" type="button">Sign out now</Button>
      </a>
    </AuthShell>
  );
}
