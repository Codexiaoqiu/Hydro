import { AuthShell } from '../components/auth/AuthShell';
import { LoginForm, type LoginMethod } from '../components/auth/LoginForm';
import { Link } from '../components/link';
import { usePageData } from '../context/page-data';
import { useTranslate } from '../lib/i18n';

interface UserLoginArgs {
  builtInLogin?: boolean;
  loginMethods?: LoginMethod[];
  redirect?: string;
  UserContext?: { _id?: number, uname?: string };
}

export default function UserLoginPage() {
  const { args } = usePageData() as unknown as { args: UserLoginArgs };
  const { builtInLogin = true, loginMethods = [], redirect, UserContext } = args ?? {};
  const isLoggedIn = !!UserContext?._id;
  const t = useTranslate();

  return (
    <AuthShell
      title={isLoggedIn ? t('Auth.WelcomeBack', { uname: UserContext?.uname ?? '' }) : t('Auth.SignIn')}
      subtitle={isLoggedIn ? t('Auth.AlreadySignedIn') : t('Auth.UseAccount')}
      footLinks={
        <>
          <Link to="homepage">{t('Common.Back')}</Link>
          {!isLoggedIn && <Link to="user_register">{t('Auth.CreateAccount')}</Link>}
        </>
      }
    >
      {isLoggedIn ? (
        <p style={{ color: 'var(--text-soft)' }}>
          {t('Auth.VisitHomepage')} <Link to="homepage">{t('Common.Home')}</Link> {t('Common.Or')} <Link to="user_logout">{t('Common.Logout')}</Link>.
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
