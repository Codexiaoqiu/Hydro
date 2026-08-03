/* @vitest-environment happy-dom */
import { startAuthentication } from '@simplewebauthn/browser';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { request } from '../hooks/use-api';
import { TwoFactorDialog } from './TwoFactorDialog';

vi.mock('@simplewebauthn/browser', () => ({
  startAuthentication: vi.fn(),
}));
vi.mock('../hooks/use-api', () => ({
  request: { get: vi.fn(), post: vi.fn() },
}));
vi.mock('../lib/i18n', () => ({
  useTranslate: () => (key: string) => key,
}));

beforeEach(() => {
  vi.mocked(request.get).mockReset();
  vi.mocked(request.post).mockReset();
  vi.mocked(startAuthentication).mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('twoFactorDialog', () => {
  it('shows both verification methods and has no cancel control', () => {
    render(<TwoFactorDialog uname="alice" authn tfa onSuccess={vi.fn()} onError={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Use Authenticator' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Use TFA Code' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /close|cancel/i })).not.toBeInTheDocument();
  });

  it('returns a TFA code to the caller after selection', async () => {
    const onSuccess = vi.fn();
    render(<TwoFactorDialog uname="alice" tfa onSuccess={onSuccess} onError={vi.fn()} />);

    const form = document.querySelector('form')!;
    const codeInput = screen.getByLabelText('6-Digit Code') as HTMLInputElement;
    fireEvent.change(codeInput, { target: { value: '123456' } });
    fireEvent.submit(form);

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith({ tfa: '123456' }));
    expect(request.post).not.toHaveBeenCalled();
  });

  it('verifies with WebAuthn and returns the backend challenge', async () => {
    const onSuccess = vi.fn();
    vi.mocked(request.get).mockResolvedValue({ authOptions: { challenge: 'options-challenge' } });
    vi.mocked(startAuthentication).mockResolvedValue({ id: 'credential-id' } as never);
    vi.mocked(request.post).mockResolvedValue({ challenge: 'verified-challenge' });

    render(<TwoFactorDialog uname="alice" authn tfa={false} onSuccess={onSuccess} onError={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Use Authenticator' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith({ authnChallenge: 'verified-challenge' }));
    expect(request.get).toHaveBeenCalledWith('/user/webauthn', { uname: 'alice' });
    expect(request.post).toHaveBeenCalledWith('/user/webauthn', { result: { id: 'credential-id' } });
  });

  it('reports WebAuthn failures and remains open for retry', async () => {
    const onError = vi.fn();
    vi.mocked(request.get).mockRejectedValue(new Error('verification failed'));

    render(<TwoFactorDialog uname="alice" authn tfa={false} onSuccess={vi.fn()} onError={onError} />);
    fireEvent.click(screen.getByRole('button', { name: 'Use Authenticator' }));

    await waitFor(() => expect(onError).toHaveBeenCalledWith('verification failed'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Use Authenticator' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('verification failed');
  });

  it('reports an invalid TFA code without closing', () => {
    const onError = vi.fn();
    render(<TwoFactorDialog uname="alice" tfa onSuccess={vi.fn()} onError={onError} />);

    const form = document.querySelector('form')!;
    const codeInput = screen.getByLabelText('6-Digit Code') as HTMLInputElement;
    fireEvent.change(codeInput, { target: { value: '123' } });
    fireEvent.submit(form);

    expect(onError).toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
