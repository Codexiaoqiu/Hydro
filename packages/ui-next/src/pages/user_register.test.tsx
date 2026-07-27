/* @vitest-environment happy-dom */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type PageData, PageDataProvider } from '../context/page-data';
import { RouterProvider } from '../context/router';
import UserRegisterPage from './user_register';

function makePageData(args: Partial<{ UserContext: Record<string, unknown>; mail: string }> = {}): PageData {
  return {
    name: 'user_register',
    template: 'user_register.html',
    url: '/register',
    args: {
      UserContext: args.UserContext ?? { viewLang: 'zh_CN' },
      UiContext: {},
      mail: args.mail,
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

describe('user_register', () => {
  it('renders the email submission form by default', () => {
    render(<Providers args={{}}><UserRegisterPage /></Providers>);
    // i18n: "创建账号" / "Create an account".
    expect(screen.getAllByText(/创建账号|Create an account/).length).toBeGreaterThan(0);
    // Button: "发送验证邮件" / "Send verification email".
    expect(screen.getByRole('button', { name: /发送验证邮件|Send verification email/ })).toBeInTheDocument();
    expect(screen.getByLabelText(/邮箱|Email/i)).toBeInTheDocument();
  });

  it('prefills the email input from args.mail', () => {
    render(<Providers args={{ mail: 'prefilled@example.com' }}><UserRegisterPage /></Providers>);
    const input = screen.getByLabelText(/邮箱|Email/i) as HTMLInputElement;
    expect(input.value).toBe('prefilled@example.com');
  });

  it('POSTs mail to /register and switches to the email-sent success state', async () => {
    // use-api.ts calls res.clone().json() inside parseError; for a 204 the
    // success branch never reads the body, so a clone stub is unnecessary,
    // but a matching `text` keeps polyfills happy.
    const fetchMock = vi.fn().mockImplementation(async () => ({
      ok: true, status: 204,
      headers: { get: () => '' },
      clone() { return this; },
      json: async () => undefined,
      text: async () => '',
    }));
    vi.stubGlobal('fetch', fetchMock);
    render(<Providers args={{}}><UserRegisterPage /></Providers>);

    fireEvent.change(screen.getByLabelText(/邮箱|Email/i), { target: { value: 'me@example.com' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /发送验证邮件|Send verification email/ }));
    });

    // Drive the success signal from the rendered Alert first — that proves
    // the request resolved successfully — then verify the mock afterwards.
    await waitFor(() => expect(screen.getAllByText(/邮件已发送|Email sent/).length).toBeGreaterThan(0));
    // RouterProvider triggers its own JSON fetch on mount; filter the spy
    // calls by URL to find the form-submission one.
    const submittedCall = fetchMock.mock.calls.find(([u]) => u === '/register');
    expect(submittedCall).toBeDefined();
    const [, init] = submittedCall!;
    expect((init as RequestInit).method).toBe('POST');
    expect(String((init as RequestInit).body)).toContain('mail=me%40example.com');
    vi.unstubAllGlobals();
  });

  it('surfaces a HydroClientError without taking down the form', async () => {
    const errorJson = { error: { message: 'Mail rate limit exceeded' }, UserFacingError: true };
    const fetchMock = vi.fn().mockImplementation(async () => ({
      ok: false, status: 429,
      headers: { get: () => 'application/json' },
      clone() { return this; },
      json: async () => errorJson,
      text: async () => JSON.stringify(errorJson),
    }));
    vi.stubGlobal('fetch', fetchMock);
    render(<Providers args={{}}><UserRegisterPage /></Providers>);

    fireEvent.change(screen.getByLabelText(/邮箱|Email/i), { target: { value: 'me@example.com' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /发送验证邮件|Send verification email/ }));
    });

    // The form checks `error.code !== 429` to skip the inline Alert in favour
    // of the dedicated RateLimitAlert. Either way *some* "rate limit" copy
    // should appear. We assert the message text from the JSON.
    await waitFor(() => expect(screen.getAllByText(/Mail rate limit|rate limit|限/).length).toBeGreaterThan(0));
    vi.unstubAllGlobals();
  });

  it('renders gracefully with completely empty args', () => {
    expect(() => render(<PageDataProvider initial={{
      name: 'user_register',
      template: 'user_register.html',
      url: '/register',
      args: { UserContext: { viewLang: 'zh_CN' }, UiContext: {} } as unknown as PageData['args'],
    }}><RouterProvider><UserRegisterPage /></RouterProvider></PageDataProvider>)).not.toThrow();
    expect(screen.getByRole('button', { name: /发送验证邮件|Send verification email/ })).toBeInTheDocument();
  });
});
