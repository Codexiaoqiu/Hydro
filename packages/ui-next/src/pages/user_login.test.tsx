/* eslint-disable max-len */
/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type PageData, PageDataProvider } from '../context/page-data';
import { RouterProvider } from '../context/router';
import UserLoginPage from './user_login';

// LoginForm does an effect-driven GET /user/tfa on every uname change; silence
// it so the test doesn't have to mock that endpoint for every variant.
vi.mock('../components/auth/LoginForm', () => ({
  LoginForm: ({ builtInLogin, loginMethods, redirect, wide }: {
    builtInLogin: boolean;
    loginMethods?: { id: string, text: string }[];
    redirect?: string;
    wide?: boolean;
  }) => (
    <div
      data-testid="mocked-login-form"
      data-builtin={builtInLogin ? '1' : '0'}
      data-methods={String(loginMethods?.length ?? 0)}
      data-redirect={redirect ?? ''}
      data-wide={wide ? '1' : '0'}
    />
  ),
}));

function makePageData(args: Partial<{ UserContext: Record<string, unknown>, redirect: string, builtInLogin: boolean, loginMethods: { id: string, text: string }[] }> = {}): PageData {
  return {
    name: 'user_login',
    template: 'user_login.html',
    url: '/login',
    args: {
      UserContext: args.UserContext ?? { viewLang: 'zh_CN' },
      UiContext: {},
      builtInLogin: args.builtInLogin ?? true,
      loginMethods: args.loginMethods ?? [],
      redirect: args.redirect,
      ...args,
    } as unknown as PageData['args'],
  };
}

function Providers({ args, children }: { args: Parameters<typeof makePageData>[0], children: ReactNode }) {
  return (
    <PageDataProvider initial={makePageData(args)}>
      <RouterProvider>{children}</RouterProvider>
    </PageDataProvider>
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('user_login', () => {
  it('renders the sign-in form when no UserContext is provided', () => {
    render(<Providers args={{ UserContext: { viewLang: 'zh_CN' } }}><UserLoginPage /></Providers>);
    // i18n key "Auth.SignIn": "登录" / "Sign in".
    expect(screen.getAllByText(/登录|Sign in/).length).toBeGreaterThan(0);
    expect(screen.getByTestId('mocked-login-form')).toBeInTheDocument();
  });

  it('shows the already-signed-in copy + Visit Home link when UserContext._id is present', () => {
    render(<Providers args={{ UserContext: { _id: 1, uname: 'alice', viewLang: 'zh_CN' } }}>
      <UserLoginPage />
    </Providers>);
    // i18n: "你已经登录。" / "You are already signed in."
    expect(screen.getAllByText(/你已经登录|already signed in/i).length).toBeGreaterThan(0);
    // WelcomeBack uses {uname} substitution: "欢迎回来, alice".
    expect(screen.getAllByText(/欢迎回来.*alice|Welcome back.*alice/i).length).toBeGreaterThan(0);
    // The LoginForm should NOT be rendered for already-signed-in users.
    expect(screen.queryByTestId('mocked-login-form')).not.toBeInTheDocument();
  });

  it('forwards builtInLogin + loginMethods + redirect + wide to the LoginForm', () => {
    const methods = [{ id: 'github', text: 'GitHub' }];
    render(<Providers args={{
      builtInLogin: true, loginMethods: methods, redirect: '/home', UserContext: { viewLang: 'zh_CN' },
    }}><UserLoginPage /></Providers>);
    const form = screen.getByTestId('mocked-login-form');
    expect(form.dataset.builtin).toBe('1');
    expect(form.dataset.methods).toBe('1');
    expect(form.dataset.redirect).toBe('/home');
    expect(form.dataset.wide).toBe('1');
  });

  it('hides the LoginForm entirely when builtInLogin is false and shows the "create account" foot link', () => {
    render(<Providers args={{
      builtInLogin: false, loginMethods: [], UserContext: { viewLang: 'zh_CN' },
    }}><UserLoginPage /></Providers>);
    const form = screen.getByTestId('mocked-login-form');
    expect(form.dataset.builtin).toBe('0');
    // i18n: "创建账号" / "Create an account" appears in the footLinks block.
    expect(screen.getAllByText(/创建账号|Create an account/).length).toBeGreaterThan(0);
  });

  it('does not crash with completely empty args (defensive)', () => {
    render(<PageDataProvider initial={{
      name: 'user_login',
      template: 'user_login.html',
      url: '/login',
      args: { UserContext: { viewLang: 'zh_CN' }, UiContext: {} } as unknown as PageData['args'],
    }}><RouterProvider><UserLoginPage /></RouterProvider></PageDataProvider>);
    // Should render sign-in copy without throwing.
    expect(screen.getAllByText(/登录|Sign in/).length).toBeGreaterThan(0);
  });
});
