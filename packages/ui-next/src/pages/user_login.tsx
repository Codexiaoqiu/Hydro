import { useCallback, useState } from 'react';
import { AuthShell } from '../components/auth/AuthShell';
import { LoginForm, type LoginMethod } from '../components/auth/LoginForm';
import { Link } from '../components/link';
import { usePageData } from '../context/page-data';
import { request } from '../hooks/use-api';
import { usePostLoginRedirect } from '../hooks/use-post-login-redirect';
import { useTranslate } from '../lib/i18n';
import { TwoFactorDialog, type TwoFactorResult } from '../sections/TwoFactorDialog';

export interface UserLoginArgs {
  builtInLogin?: boolean;
  loginMethods?: LoginMethod[];
  redirect?: string;
  UserContext?: { _id?: number, uname?: string };
}

export interface TwoFactorCallbackCtx {
  password: string;
  rememberme: boolean;
  info: { tfa: boolean, authn?: boolean } | null;
}

export interface TwoFactorState {
  uname: string;
  password: string;
  rememberme: boolean;
  /** Backend-reported availability flags (probed via `/user/tfa`). */
  authn: boolean;
  tfa: boolean;
}

export default function UserLoginPage() {
  const { args } = usePageData();
  const { builtInLogin = true, loginMethods = [], redirect, UserContext } = args ?? {};
  const isLoggedIn = !!UserContext?._id;
  const t = useTranslate();
  const redirectApi = usePostLoginRedirect();
  const [twoFactor, setTwoFactor] = useState<TwoFactorState | null>(null);

  const submitChallenge = useCallback(async (state: TwoFactorState, challenge: TwoFactorResult) => {
    const formData = new URLSearchParams();
    formData.set('uname', state.uname);
    formData.set('password', state.password);
    formData.set('login_submit', t('Auth.SubmitLogin'));
    if (state.rememberme) formData.set('rememberme', 'on');
    if (challenge.tfa) formData.set('tfa', challenge.tfa);
    if (challenge.authnChallenge) formData.set('authnChallenge', challenge.authnChallenge);
    // On failure the dialog stays open so the user can retry; the parent
    // <LoginForm /> still owns the inline error surface and will show whatever
    // HydroClientError message comes back from the next POST. We only tear
    // down the dialog when the re-POST actually succeeds (see handleTwoFactorSuccess).
    await request.post('/login', formData);
    if (typeof window !== 'undefined') {
      window.location.href = redirect || redirectApi.target;
    }
  }, [redirect, redirectApi.target, t]);

  const handleTwoFactor = useCallback((uname: string, ctx: TwoFactorCallbackCtx) => {
    setTwoFactor({
      uname,
      password: ctx.password,
      rememberme: ctx.rememberme,
      // Default both methods on if the probe failed (e.g. user not found) so
      // the dialog is still usable; the probe only refines the buttons shown.
      authn: ctx.info?.authn ?? true,
      tfa: ctx.info?.tfa ?? true,
    });
  }, []);

  const handleTwoFactorSuccess = useCallback(async (challenge: TwoFactorResult) => {
    if (!twoFactor) return;
    await submitChallenge(twoFactor, challenge);
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
              authn={twoFactor.authn}
              tfa={twoFactor.tfa}
              onSuccess={handleTwoFactorSuccess}
            />
          )}
        </>
      )}
    </AuthShell>
  );
}
