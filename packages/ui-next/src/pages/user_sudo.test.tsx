/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type PageData, PageDataProvider } from '../context/page-data';
import { RouterProvider } from '../context/router';
import { routeMapStore } from '../globals';
import { ThemeProvider } from '../theme/ThemeProvider';
import UserSudoPage from './user_sudo';

vi.mock('../lib/i18n', () => ({
  useTranslate: () => (k: string) => k,
}));
vi.mock('@simplewebauthn/browser', () => ({
  startAuthentication: vi.fn(),
}));
vi.mock('../hooks/use-api', () => ({
  HydroClientError: class extends Error {
    code: number;
    constructor({ code, message }: { code: number, message: string }) {
      super(message);
      this.code = code;
    }
  },
  request: { get: vi.fn(), post: vi.fn() },
}));

const baseArgs = {
  builtInLogin: true,
  loginMethods: [],
  redirect: '/contest/123',
  UserContext: { authn: false, tfa: false, _id: 1 },
  endpointOrigin: 'http://localhost:2333',
};

function Providers({ children, args = baseArgs }: any) {
  return (
    <ThemeProvider>
      <PageDataProvider initial={{
        name: 'user_sudo',
        template: 'user_sudo.html',
        args,
        url: '/user/sudo',
      } as PageData}>
        <RouterProvider>{children}</RouterProvider>
      </PageDataProvider>
    </ThemeProvider>
  );
}

describe('userSudo', () => {
  beforeEach(() => {
    routeMapStore.set({ user_sudo: '/user/sudo', homepage: '/home' });
  });
  afterEach(() => vi.restoreAllMocks());

  it('renders password input by default when no authn or tfa', () => {
    render(<Providers><UserSudoPage /></Providers>);
    expect(screen.getByLabelText(/Auth\.Password/)).toBeInTheDocument();
  });

  it('shows TFA code input when UserContext.tfa is true', () => {
    render(
      <Providers args={{ ...baseArgs, UserContext: { ...baseArgs.UserContext, tfa: true } }}>
        <UserSudoPage />
      </Providers>,
    );
    expect(screen.getByLabelText(/Auth\.TfaCode/)).toBeInTheDocument();
  });

  it('shows WebAuthn button when UserContext.authn is true', () => {
    render(
      <Providers args={{ ...baseArgs, UserContext: { ...baseArgs.UserContext, authn: true } }}>
        <UserSudoPage />
      </Providers>,
    );
    expect(screen.getByRole('button', { name: /Auth\.UseAuthenticator/ })).toBeInTheDocument();
  });
});
