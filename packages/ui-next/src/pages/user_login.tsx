import { useCallback, useState } from 'react';
import { AuthShell } from '../components/auth/AuthShell';
import { LoginForm, type LoginMethod } from '../components/auth/LoginForm';
import { Link } from '../components/link';
import { usePageData } from '../context/page-data';
import { request } from '../hooks/use-api';
import { usePostLoginRedirect } from '../hooks/use-post-login-redirect';
import { useTranslate } from '../lib/i18n';
import { TwoFactorDialog, type TwoFactorResult } from '../sections/TwoFactorDialog';

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
  const redirectApi = usePostLoginRedirect();
  const [twoFactor, setTwoFactor] = useState<{ uname: string, password: string, rememberme: boolean } | null>(null);
  const [, setTwoFactorError] = useState('');

  const submitChallenge = useCallback(async (uname: string, password: string, rememberme: boolean, challenge: TwoFactorResult) => {
    const formData = new URLSearchParams();
    formData.set('uname', uname);
    formData.set('password', password);
    formData.set('login_submit', t('Auth.SubmitLogin'));
    if (rememberme) formData.set('rememberme', 'on');
    if (challenge.tfa) formData.set('tfa', challenge.tfa);
    if (challenge.authnChallenge) formData.set('authnChallenge', challenge.authnChallenge);
    try {
      await request.post('/login', formData);
      if (typeof window !== 'undefined') {
        window.location.href = redirect || redirectApi.target;
      }
    } catch (err) {
      setTwoFactor(null);
      throw err;
    }
  }, [redirect, redirectApi.target, t]);

  const handleTwoFactor = useCallback((uname: string) => {
    const form = (document.activeElement instanceof HTMLInputElement && document.activeElement.form)
      ? document.activeElement.form
      : document.querySelector('form');
    const passwordInput = form?.elements.namedItem('password') as HTMLInputElement | null;
    const rememberInput = form?.elements.namedItem('rememberme') as HTMLInputElement | null;
    setTwoFactor({
      uname,
      password: passwordInput?.value ?? '',
      rememberme: rememberInput?.checked ?? false,
    });
  }, []);

  const handleTwoFactorSuccess = useCallback(async (challenge: TwoFactorResult) => {
    if (!twoFactor) return;
    await submitChallenge(twoFactor.uname, twoFactor.password, twoFactor.rememberme, challenge);
    setTwoFactor(null);
  }, [twoFactor, submitChallenge]);

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
        <>
          <LoginForm
            builtInLogin={builtInLogin}
            loginMethods={loginMethods}
            redirect={redirect}
            wide
            onTwoFactorRequired={handleTwoFactor}
          />
          {twoFactor && (
            <TwoFactorDialog
              uname={twoFactor.uname}
              authn
              tfa
              onSuccess={handleTwoFactorSuccess}
              onError={setTwoFactorError}
            />
          )}
        </>
      )}
    </AuthShell>
  );
}
