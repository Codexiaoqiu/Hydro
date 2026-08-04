/* @vitest-environment happy-dom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type PageData, PageDataProvider } from '../context/page-data';
import UserDeletePage from './user_delete';

function renderPage(args: Record<string, unknown> = {}) {
  const initial: PageData = {
    name: 'user_delete',
    template: 'user_delete_pending.html',
    url: '/user/delete',
    args: { UserContext: {}, UiContext: {}, ...args } as PageData['args'],
  };
  return render(
    <PageDataProvider initial={initial}>
      <UserDeletePage />
    </PageDataProvider>,
  );
}

afterEach(() => vi.restoreAllMocks());

describe('user_delete', () => {
  it('renders a warning heading and password input', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /delete account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toHaveAttribute('type', 'password');
  });

  it('opens a ConfirmDialog when Confirm Delete is clicked', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /confirm delete/i }));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('POSTs the entered password when deletion is confirmed', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 200 }));
    renderPage();
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: /confirm delete/i }));
    fireEvent.click(screen.getByRole('button', { name: /delete forever/i }));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledWith(
      '/user/delete',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ password: 'secret123' }),
      }),
    ));
  });
});
