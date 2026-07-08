import { usePageData } from '../context/page-data';
import { Link } from '../components/link';
import { AuthShell } from '../components/auth/AuthShell';
import { LoginForm, type LoginMethod } from '../components/auth/LoginForm';

interface UserLoginArgs {
  builtInLogin?: boolean;
  loginMethods?: LoginMethod[];
  redirect?: string;
  UserContext?: { _id?: number; uname?: string };
}

export default function UserLoginPage() {
  const { args } = usePageData() as unknown as { args: UserLoginArgs };
  const { builtInLogin = true, loginMethods = [], redirect, UserContext } = args ?? {};
  const isLoggedIn = !!UserContext?._id;

  return (
    <AuthShell
      title={isLoggedIn ? `Welcome, ${UserContext?.uname ?? ''}` : 'Sign in'}
      subtitle={isLoggedIn ? 'You are already signed in.' : 'Use your Hydro account to continue.'}
      footLinks={
        <>
          <Link to="homepage">← Back to homepage</Link>
          {!isLoggedIn && <Link to="user_register">Create an account</Link>}
        </>
      }
    >
      {isLoggedIn ? (
        <p style={{ color: 'var(--text-soft)' }}>
          Visit the <Link to="homepage">homepage</Link> or <Link to="user_logout">sign out</Link>.
        </p>
      ) : (
        <LoginForm
          builtInLogin={builtInLogin}
          loginMethods={loginMethods}
          redirect={redirect}
          wide
        />
      )}
    </AuthShell>
  );
}