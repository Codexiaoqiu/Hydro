import { type PublicKeyCredentialRequestOptionsJSON, startAuthentication } from '@simplewebauthn/browser';
import { type FormEvent, useState } from 'react';
import { request } from '../hooks/use-api';
import { useTranslate } from '../lib/i18n';
import styles from './TwoFactorDialog.module.css';

export interface TwoFactorResult {
  authnChallenge?: string;
  tfa?: string;
}

export interface TwoFactorDialogProps {
  /** Username used to obtain the WebAuthn assertion options. */
  uname: string;
  /** Whether the account has a registered WebAuthn authenticator. */
  authn?: boolean;
  /** Whether the account has a TFA secret. Defaults to true for compatibility with the login response. */
  tfa?: boolean;
  onSuccess: (result: TwoFactorResult) => void;
  onError: (message: string) => void;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function TwoFactorDialog({ uname, authn = false, tfa = true, onSuccess, onError }: TwoFactorDialogProps) {
  const translate = useTranslate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reportError = (err: unknown) => {
    const message = errorMessage(err);
    setError(message);
    onError(message);
  };

  const verifyWebAuthn = async () => {
    setError('');
    setSubmitting(true);
    try {
      const authnInfo = await request.get<{ authOptions?: PublicKeyCredentialRequestOptionsJSON }>('/user/webauthn', { uname });
      if (!authnInfo?.authOptions) throw new Error(translate('Failed to fetch registration data.'));
      const result = await startAuthentication({ optionsJSON: authnInfo.authOptions });
      const verified = await request.post<{ challenge?: string }>('/user/webauthn', { result });
      if (!verified?.challenge) throw new Error(translate('Failed to verify authenticator.'));
      onSuccess({ authnChallenge: verified.challenge });
    } catch (err) {
      reportError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const verifyTfa = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (!/^\d{6}$/.test(code)) {
      reportError(translate('Please enter a 6-digit code.'));
      return;
    }
    onSuccess({ tfa: code });
  };

  return (
    <div className={styles.backdrop} role="presentation">
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-label={translate('Two Factor Authentication')}>
        <h2 className={styles.title}>{translate('Two Factor Authentication')}</h2>
        <p className={styles.description}>
          {translate('Your account has two factor authentication enabled. Please choose an authenticator to verify.')}
        </p>
        {error && <p className={styles.error} role="alert">{error}</p>}
        <div className={styles.actions}>
          {authn && (
            <button
              type="button"
              className={styles.button}
              onClick={verifyWebAuthn}
              disabled={submitting}
            >
              {translate('Use Authenticator')}
            </button>
          )}
          {tfa && (
            <form className={styles.form} onSubmit={verifyTfa}>
              <label className={styles.label} htmlFor="two-factor-code">
                {translate('6-Digit Code')}
                <input
                  id="two-factor-code"
                  className={styles.input}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="\\d{6}"
                  maxLength={6}
                  autoFocus={!authn}
                  value={code}
                  onChange={(event) => setCode(event.currentTarget.value.replace(/\D/g, ''))}
                />
              </label>
              <button type="submit" className={`${styles.button} ${authn ? styles.secondary : ''}`} disabled={submitting}>
                {translate('Use TFA Code')}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default TwoFactorDialog;
