/**
 * `/home/security` — security hub: change email, sessions, MFA, WebAuthn.
 *
 * Mirrors `packages/ui-default/pages/home_security.page.tsx` with three flows:
 *   1. Change mail (password + new email)
 *   2. Enable TOTP (generate secret, render QR, verify 6-digit code)
 *   3. Register a WebAuthn credential (browser API + name)
 *
 * All three submit to the same `POST /home/security` endpoint with an
 * `operation` field. The server, in `packages/hydrooj/src/handler/home.ts`,
 * dispatches based on that field.
 */
import {
  browserSupportsWebAuthn, platformAuthenticatorIsAvailable, startRegistration,
} from '@simplewebauthn/browser';
import QRCode from 'qrcode';
import {
  type FormEvent, useEffect, useRef, useState,
} from 'react';
import { Alert, Button } from '../components/primitives';
import { Modal } from '../components/primitives/Modal';
import { useToast } from '../components/primitives/use-toast';
import { usePageData, useUserContext } from '../context/page-data';
import { request } from '../hooks/use-api';
import { useTranslate } from '../lib/i18n';

// Random base32 secret for TOTP (RFC 4648, no padding). 13 chars ≈ 80 bits,
// matching the legacy `secureRandomString(13, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567')`.
function randomBase32(len: number): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let s = '';
  const bytes = new Uint8Array(len);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < len; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  for (let i = 0; i < len; i += 1) s += alphabet[bytes[i] % alphabet.length];
  return s;
}

interface SessionEntry {
  _id: string;
  isCurrent?: boolean;
  updateUaInfo?: { browser?: { name?: string }, os?: { name?: string } };
  updateGeoip?: string;
  updateIp?: string;
}

interface AuthenticatorEntry {
  credentialID: string;
  name: string;
  credentialType: string;
  credentialDeviceType: string;
  authenticatorAttachment?: string;
  regat?: number;
  fmt?: string;
}

interface Args {
  UserContext?: { _id?: number, uname?: string, mail?: string };
  sudoUid?: number | null;
  sessions?: SessionEntry[];
  authenticators?: AuthenticatorEntry[];
  geoipProvider?: string;
}

type DialogKind = null | 'changeMail' | 'tfa' | 'webauthn' | 'webauthn-name';

/**
 * Tiny canvas wrapper that re-renders the QR code whenever `data` changes.
 * Kept inline (not exported) because the TOTP flow is the only caller.
 * Defined before `HomeSecurityPage` so the JSX inside the TOTP modal can
 * reference it without a forward-reference lint hit.
 */
function QRCodeCanvas({ data, size }: { data: string, size: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    QRCode.toCanvas(ref.current, data, { width: size }).catch(() => undefined);
  }, [data, size]);
  return <canvas ref={ref} />;
}

export default function HomeSecurityPage() {
  const { args } = usePageData() as unknown as { args: Args };
  const user = useUserContext();
  const t = useTranslate();
  const toast = useToast();

  const sessions = args.sessions ?? [];
  const authenticators = args.authenticators ?? [];
  const currentMail = args.UserContext?.mail ?? '';

  const [dialog, setDialog] = useState<DialogKind>(null);
  const [tfaSecret, setTfaSecret] = useState('');
  const [tfaQr, setTfaQr] = useState('');
  const [tfaSecretVisible, setTfaSecretVisible] = useState(false);
  const [secureCtx, setSecureCtx] = useState(true);
  const [webauthnReady, setWebauthnReady] = useState<boolean | null>(null);
  const [webauthnPlatform, setWebauthnPlatform] = useState<boolean | null>(null);

  // Detect WebAuthn support + platform authenticator once on mount so the
  // menu doesn't issue async probes on each click.
  useEffect(() => {
    // These setters intentionally run synchronously here: they hydrate
    // React state from external values (window.isSecureContext, the
    // @simplewebauthn capability probes). The "mount-once" semantics
    // make this the canonical sync-from-external pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSecureCtx(typeof window !== 'undefined' && !!window.isSecureContext);
    const supported = browserSupportsWebAuthn();
    setWebauthnReady(Boolean(supported));
    Promise.resolve(platformAuthenticatorIsAvailable() as unknown)
      .then((v) => setWebauthnPlatform(Boolean(v)))
      .catch(() => setWebauthnPlatform(false));
  }, []);

  const openTfa = () => {
    const secret = randomBase32(13);
    setTfaSecret(secret);
    setTfaQr(`otpauth://totp/Hydro:${encodeURIComponent(user?.uname ?? 'user')}?secret=${secret}&issuer=Hydro`);
    setDialog('tfa');
  };

  const submitChangeMail = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await request.post('/home/security', {
        operation: 'change_mail',
        password: String(fd.get('password') ?? ''),
        mail: String(fd.get('mail') ?? ''),
      });
      toast.success(t('HomeSecurity.ChangeMailSuccess'));
      setDialog(null);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: unknown) {
      toast.error((err as Error).message);
    }
  };

  const submitTfa = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await request.post('/home/security', {
        operation: 'enable_tfa',
        code: String(fd.get('tfa_code') ?? ''),
        secret: tfaSecret,
      });
      toast.success(t('HomeSecurity.TfaSuccess'));
      setDialog(null);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: unknown) {
      toast.error((err as Error).message);
    }
  };

  const openWebauthn = async (type: 'platform' | 'cross-platform') => {
    try {
      const reg = await request.post<{ authOptions?: unknown }>('/home/security', {
        operation: 'register', type,
      });
      if (!reg.authOptions) {
        toast.error(t('HomeSecurity.WebauthnRegisterFailed'));
        return;
      }
      toast.info(t('HomeSecurity.WebauthnFollowDevice'));
      const credential = await startRegistration({ optionsJSON: reg.authOptions });
      setPendingCredential(credential);
      setDialog('webauthn-name');
    } catch (err: unknown) {
      toast.error((err as Error).message);
    }
  };

  const submitWebauthnName = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const credential = pendingCredential;
    if (!credential) {
      setDialog(null);
      return;
    }
    try {
      await request.post('/home/security', {
        operation: 'enable_authn',
        name: String(fd.get('webauthn_name') ?? ''),
        result: credential,
      });
      toast.success(t('HomeSecurity.WebauthnSuccess'));
      setPendingCredential(null);
      setDialog(null);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: unknown) {
      toast.error((err as Error).message);
    }
  };

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: 'var(--space-6)' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', margin: '0 0 var(--space-4)' }}>
        {t('HomeSecurity.Title')}
      </h1>
      <p style={{ color: 'var(--text-mute)' }}>{t('HomeSecurity.Subtitle')}</p>

      <section style={{ marginTop: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <Alert variant="info" title={t('HomeSecurity.CurrentEmail')} message={currentMail || '—'} />

        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <Button variant="primary" onClick={() => setDialog('changeMail')}>
            {t('HomeSecurity.ChangeMail')}
          </Button>
          <Button variant="ghost" onClick={openTfa}>
            {t('HomeSecurity.EnableTfa')}
          </Button>
          <Button
            variant="ghost"
            disabled={!secureCtx || webauthnReady !== true}
            onClick={() => setDialog('webauthn')}
          >
            {t('HomeSecurity.RegisterWebauthn')}
          </Button>
        </div>
      </section>

      <section style={{ marginTop: 'var(--space-5)' }}>
        <h2 style={{ fontSize: 'var(--text-md)', margin: '0 0 var(--space-3)' }}>
          {t('HomeSecurity.Authenticators')}
        </h2>
        {!authenticators.length && (
          <Alert variant="warn" message={t('HomeSecurity.NoAuthenticators')} />
        )}
        {authenticators.length > 0 && (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {authenticators.map((a) => (
              <li
                key={a.credentialID}
                style={{
                  padding: 'var(--space-3)',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{a.name || a.credentialID}</div>
                  <div style={{ color: 'var(--text-mute)', fontSize: 'var(--text-xs)' }}>
                    {a.credentialType} · {a.credentialDeviceType} · {a.authenticatorAttachment ?? '—'}
                  </div>
                </div>
                <a
                  href={`/home/security?operation=delete_authn&credentialID=${encodeURIComponent(a.credentialID)}`}
                  style={{ color: 'var(--text-mute)', fontSize: 'var(--text-sm)' }}
                >
                  {t('Common.Delete')}
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={{ marginTop: 'var(--space-5)' }}>
        <h2 style={{ fontSize: 'var(--text-md)', margin: '0 0 var(--space-3)' }}>
          {t('HomeSecurity.Sessions')}
        </h2>
        {!sessions.length && (
          <p style={{ color: 'var(--text-mute)', fontSize: 'var(--text-sm)' }}>{t('HomeSecurity.NoSessions')}</p>
        )}
        {sessions.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--text-mute)' }}>
                <th style={{ padding: 'var(--space-2)' }}>{t('HomeSecurity.Browser')}</th>
                <th style={{ padding: 'var(--space-2)' }}>{t('HomeSecurity.Location')}</th>
                <th style={{ padding: 'var(--space-2)' }}>{t('HomeSecurity.Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s._id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: 'var(--space-2)' }}>
                    {s.updateUaInfo?.browser?.name ?? '—'} / {s.updateUaInfo?.os?.name ?? '—'}
                    {s.isCurrent && <strong style={{ marginLeft: 8 }}>({t('HomeSecurity.Current')})</strong>}
                  </td>
                  <td style={{ padding: 'var(--space-2)' }}>{s.updateGeoip ?? '—'}</td>
                  <td style={{ padding: 'var(--space-2)' }}>
                    {!s.isCurrent && (
                      <a
                        href={`/home/security?operation=delete_session&sessionId=${encodeURIComponent(s._id)}`}
                        style={{ color: 'var(--accent)' }}
                      >
                        {t('HomeSecurity.Terminate')}
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <Modal open={dialog === 'changeMail'} onClose={() => setDialog(null)} title={t('HomeSecurity.ChangeMail')}>
        <form onSubmit={submitChangeMail} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 'var(--text-sm)' }}>{t('HomeSecurity.CurrentPassword')}</span>
            <input
              name="password"
              type="password"
              required
              autoFocus
              style={{ padding: 'var(--space-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 'var(--text-sm)' }}>{t('HomeSecurity.CurrentEmailReadonly')}</span>
            <input
              name="currentEmail"
              type="text"
              value={currentMail}
              disabled
              style={{ padding: 'var(--space-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', opacity: 0.6 }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 'var(--text-sm)' }}>{t('HomeSecurity.NewEmail')}</span>
            <input
              name="mail"
              type="text"
              required
              style={{ padding: 'var(--space-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }} />
          </label>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
            <Button type="button" variant="ghost" onClick={() => setDialog(null)}>{t('Common.Cancel')}</Button>
            <Button type="submit" variant="primary">{t('Common.Save')}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={dialog === 'tfa'} onClose={() => setDialog(null)} title={t('HomeSecurity.EnableTfa')}>
        <form onSubmit={submitTfa} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <p style={{ color: 'var(--text-mute)', fontSize: 'var(--text-sm)' }}>{t('HomeSecurity.TfaHint')}</p>
          {tfaQr && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)' }}>
              <QRCodeCanvas data={tfaQr} size={180} />
              <button
                type="button"
                onClick={() => setTfaSecretVisible((v) => !v)}
                aria-pressed={tfaSecretVisible}
                aria-label={tfaSecretVisible ? t('Common.Hide') : t('Common.Show')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  font: 'inherit',
                  color: 'var(--accent)',
                  cursor: 'pointer',
                  fontSize: 'var(--text-xs)',
                }}
              >
                {tfaSecretVisible ? tfaSecret : tfaSecret.replace(/./g, '•')}
              </button>
            </div>
          )}
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 'var(--text-sm)' }}>{t('HomeSecurity.TfaCode')}</span>
            <input
              name="tfa_code"
              type="text"
              required
              autoFocus
              inputMode="numeric"
              pattern="\d{6}"
              style={{ padding: 'var(--space-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }} />
          </label>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
            <Button type="button" variant="ghost" onClick={() => setDialog(null)}>{t('Common.Cancel')}</Button>
            <Button type="submit" variant="primary">{t('Common.Save')}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={dialog === 'webauthn'} onClose={() => setDialog(null)} title={t('HomeSecurity.ChooseAuthnType')}>
        {/* TOTP is intentionally NOT offered here — it lives behind the
            dedicated "Enable two-factor" button above (see `openTfa`).
            Mixing the two flows into one picker confuses users (TOTP is
            not a WebAuthn authenticator) and previously caused a TS type
            error (`openWebauthn('tfa')` against a `'platform' | 'cross-platform'`
            parameter signature). */}
        <ol style={{ paddingLeft: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <li>
            <Button
              variant="ghost"
              onClick={() => openWebauthn('platform')}
              disabled={webauthnPlatform !== true}
            >
              {t('HomeSecurity.YourDevice')}
            </Button>
          </li>
          <li>
            <Button variant="ghost" onClick={() => openWebauthn('cross-platform')}>
              {t('HomeSecurity.MultiPlatform')}
            </Button>
          </li>
        </ol>
      </Modal>

      <Modal open={dialog === 'webauthn-name'} onClose={() => setDialog(null)} title={t('HomeSecurity.NameAuthn')}>
        <form onSubmit={submitWebauthnName} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 'var(--text-sm)' }}>{t('HomeSecurity.AuthnName')}</span>
            <input
              name="webauthn_name"
              type="text"
              required
              autoFocus
              style={{ padding: 'var(--space-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }} />
          </label>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
            <Button type="button" variant="ghost" onClick={() => setDialog(null)}>{t('Common.Cancel')}</Button>
            <Button type="submit" variant="primary">{t('Common.Save')}</Button>
          </div>
        </form>
      </Modal>
    </main>
  );
}
