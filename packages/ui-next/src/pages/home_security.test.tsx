/* @vitest-environment happy-dom */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type PageData, PageDataProvider } from '../context/page-data';
import { ToastProvider } from '../components/primitives/Toast';
import HomeSecurityPage from './home_security';

function makePageData(args: Record<string, unknown> = {}): PageData {
  return {
    name: 'home_security',
    template: 'home_security.html',
    url: '/home/security',
    args: {
      UserContext: { _id: 1, uname: 'alice', mail: 'alice@example.com', viewLang: 'zh_CN' },
      UiContext: { domainId: 'system' },
      sessions: [],
      authenticators: [],
      sudoUid: null,
      ...args,
    } as unknown as PageData['args'],
  };
}

function Providers({ args, children }: { args: Record<string, unknown>; children: ReactNode }) {
  return (
    <PageDataProvider initial={makePageData(args)}>
      <ToastProvider>{children}</ToastProvider>
    </PageDataProvider>
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  // happy-dom doesn't expose window.isSecureContext by default; the page reads
  // it on mount to decide whether WebAuthn is available.
  Object.defineProperty(window, 'isSecureContext', { configurable: true, value: false });
});

describe('home_security', () => {
  it('renders the title + current email + action buttons', () => {
    render(<Providers args={{}}><HomeSecurityPage /></Providers>);
    expect(screen.getAllByText(/安全设置|Security/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/alice@example\.com/).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /修改邮箱|Change email/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /启用两步验证|Enable two-factor/ })).toBeInTheDocument();
  });

  it('shows an empty-authenticators warning when none are registered', () => {
    render(<Providers args={{ authenticators: [] }}><HomeSecurityPage /></Providers>);
    expect(screen.getAllByText(/尚未注册任何认证器|No authenticators registered yet/).length).toBeGreaterThan(0);
  });

  it('renders each registered authenticator with a delete link', () => {
    const authenticators = [
      { credentialID: 'cred-1', name: 'YubiKey', credentialType: 'public-key', credentialDeviceType: 'cross-platform', authenticatorAttachment: 'cross-platform' },
      { credentialID: 'cred-2', name: '', credentialType: 'public-key', credentialDeviceType: 'single-device', authenticatorAttachment: 'platform' },
    ];
    render(<Providers args={{ authenticators }}><HomeSecurityPage /></Providers>);
    expect(screen.getByText('YubiKey')).toBeInTheDocument();
    // When name is empty we fall back to credentialID.
    expect(screen.getByText('cred-2')).toBeInTheDocument();
    const deleteLinks = screen.getAllByRole('link', { name: /删除|Delete/ });
    expect(deleteLinks).toHaveLength(2);
    expect(deleteLinks[0].getAttribute('href')).toContain('delete_authn');
  });

  it('POSTs change_mail when the dialog form is submitted', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch').mockImplementation(async () => ({
      ok: true, status: 200,
      headers: { get: () => '' },
      clone() { return this; },
      json: async () => undefined,
      text: async () => '',
    } as unknown as Response));
    render(<Providers args={{}}><HomeSecurityPage /></Providers>);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /修改邮箱|Change email/ }));
    });
    fireEvent.change(screen.getByLabelText(/当前密码|Current password/i), { target: { value: 'hunter2' } });
    fireEvent.change(screen.getByLabelText(/新邮箱|New email/i), { target: { value: 'alice2@example.com' } });
    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: /保存|Save/ })[0]);
    });

    // Filter for the form-submission call. RouterProvider may make other
    // JSON fetches on its own; we only care about /home/security.
    await waitFor(() => {
      const call = fetchSpy.mock.calls.find(([u]) => u === '/home/security');
      expect(call).toBeDefined();
    });
    const [, init] = fetchSpy.mock.calls.find(([u]) => u === '/home/security')!;
    const body = JSON.parse(String((init as RequestInit).body));
    expect(body.operation).toBe('change_mail');
    expect(body.password).toBe('hunter2');
    expect(body.mail).toBe('alice2@example.com');
  });

  it('opens the TOTP dialog and renders a 6-digit code field', async () => {
    render(<Providers args={{}}><HomeSecurityPage /></Providers>);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /启用两步验证|Enable two-factor/ }));
    });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText(/6 位代码|6-digit code/i)).toBeInTheDocument();
    expect((screen.getByLabelText(/6 位代码|6-digit code/i) as HTMLInputElement).pattern).toBe('\\d{6}');
  });
});
