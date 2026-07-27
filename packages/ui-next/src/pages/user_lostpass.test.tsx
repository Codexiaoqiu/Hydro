/* @vitest-environment happy-dom */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type PageData, PageDataProvider } from '../context/page-data';
import { RouterProvider } from '../context/router';
import UserLostPassPage from './user_lostpass';

function makePageData(args: Partial<{ UserContext: Record<string, unknown>; smtpConfigured: boolean }> = {}): PageData {
  return {
    name: 'user_lostpass',
    template: 'user_lostpass.html',
    url: '/lostpass',
    args: {
      UserContext: args.UserContext ?? { viewLang: 'zh_CN' },
      UiContext: {},
      smtpConfigured: args.smtpConfigured ?? true,
      ...args,
    } as unknown as PageData['args'],
  };
}

function Providers({ args, children }: { args: Parameters<typeof makePageData>[0], children: ReactNode }) {
  return <PageDataProvider initial={makePageData(args)}><RouterProvider>{children}</RouterProvider></PageDataProvider>;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('user_lostpass', () => {
  it('renders the email submission form when SMTP is configured (default)', () => {
    render(<Providers args={{ smtpConfigured: true }}><UserLostPassPage /></Providers>);
    // i18n: "找回密码" / "Lost password".
    expect(screen.getAllByText(/找回密码|Lost password/).length).toBeGreaterThan(0);
    // Button: "发送密码重置邮件" / "Send password reset email".
    expect(screen.getByRole('button', { name: /发送密码重置邮件|Send password reset email/ })).toBeInTheDocument();
    expect(screen.getByLabelText(/邮箱|Email/i)).toBeInTheDocument();
  });

  it('shows the warning banner instead of the form when SMTP is not configured', () => {
    render(<Providers args={{ smtpConfigured: false }}><UserLostPassPage /></Providers>);
    // i18n MailNotConfiguredTitle: "邮件未配置" / "Mail not configured".
    expect(screen.getAllByText(/邮件未配置|Mail not configured/).length).toBeGreaterThan(0);
    // The reset form button must NOT render when SMTP is disabled.
    expect(screen.queryByRole('button', { name: /发送密码重置邮件|Send password reset email/ })).not.toBeInTheDocument();
  });

  it('POSTs to /lostpass and renders a success Alert after a successful submission', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch').mockImplementation(async () => ({
      ok: true, status: 204,
      headers: { get: () => '' },
      clone() { return this; },
      json: async () => undefined,
      text: async () => '',
    }) as unknown as Response);
    render(<Providers args={{ smtpConfigured: true }}><UserLostPassPage /></Providers>);

    fireEvent.change(screen.getByLabelText(/邮箱|Email/i), { target: { value: 'me@example.com' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /发送密码重置邮件|Send password reset email/ }));
    });

    await waitFor(() => expect(screen.getAllByText(/重置链接已发送|Reset email sent|重置邮件已发送/).length).toBeGreaterThan(0));
    // RouterProvider triggers its own JSON fetch on mount, so filter for the
    // form-submission call by URL. The fallback assertion is the Alert copy
    // above, which only appears after setSent(true) ran.
    const submittedCall = fetchSpy.mock.calls.find(([u]) => u === '/lostpass');
    expect(submittedCall).toBeDefined();
    const [, init] = submittedCall!;
    expect((init as RequestInit).method).toBe('POST');
    expect(String((init as RequestInit).body)).toContain('mail=me%40example.com');
    fetchSpy.mockRestore();
  });

  it('renders a fallback subtitle when SMTP is disabled', () => {
    render(<Providers args={{ smtpConfigured: false }}><UserLostPassPage /></Providers>);
    // i18n subtitle distinguishes configured (ResetHint) vs fallback
    // (LostPassFallback: "放松一下,试着回忆你的密码。" / "Relax and try to remember your password.").
    expect(screen.getAllByText(/放松|Relax|try to remember/).length).toBeGreaterThan(0);
  });

  it('renders the back-to-sign-in footer link', () => {
    render(<Providers args={{ smtpConfigured: true }}><UserLostPassPage /></Providers>);
    // i18n: "返回登录" / "Back to sign in".
    expect(screen.getAllByText(/返回登录|Back to sign in/).length).toBeGreaterThan(0);
  });
});
