import { usePageData } from '../context/page-data';
import { AuthShell } from '../components/auth/AuthShell';
import { LoginForm, type LoginMethod } from '../components/auth/LoginForm';

interface Args {
  builtInLogin?: boolean;
  loginMethods?: LoginMethod[];
  redirect?: string;
}

/** /user/sudo — re-authentication gate; reuses LoginForm with a custom submitLabel. */
export default function UserSudoPage() {
  const { args } = usePageData() as unknown as { args: Args };
  const { builtInLogin = true, loginMethods = [], redirect } = args ?? {};
  return (
    <AuthShell
      title="Confirm your password"
      subtitle="For your security, please re-enter your password to continue."
    >
      <LoginForm
        builtInLogin={builtInLogin}
        loginMethods={loginMethods}
        redirect={redirect}
        submitLabel="Confirm"
        hideFootnote
        onSuccess={() => {
          if (typeof window !== 'undefined') {
            const target = redirect || window.location.pathname + window.location.search;
            window.location.href = target;
          }
        }}
        wide
      />
    </AuthShell>
  );
}