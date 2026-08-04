/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ToastProvider } from '../components/primitives/Toast';
import { type PageData, PageDataProvider } from '../context/page-data';
import HomeSecurityPage from './home_security';

function renderPage() {
  const initial: PageData = {
    name: 'home_security', template: 'home_security.html', url: '/home/security',
    args: {
      UserContext: { _id: 1, uname: 'me' },
      UiContext: {},
    } as PageData['args'],
  };
  return render(
    <PageDataProvider initial={initial}>
      <ToastProvider>
        <HomeSecurityPage />
      </ToastProvider>
    </PageDataProvider>,
  );
}

describe('home_security avatar form', () => {
  it('renders a multipart form posting to /home/avatar', () => {
    renderPage();
    const form = screen.getByRole('form', { name: /upload avatar/i });
    expect(form.getAttribute('action')).toBe('/home/avatar');
    expect(form.getAttribute('method')).toBe('post');
    expect(form.getAttribute('enctype')).toBe('multipart/form-data');
  });

  // Finding 4: required + CSRF
  it('marks the file input as required', () => {
    renderPage();
    const form = screen.getByRole('form', { name: /upload avatar/i });
    const fileInput = form.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).not.toBeNull();
    expect(fileInput.required).toBe(true);
  });

  it('includes a CSRF hidden input when a token is present in the DOM', async () => {
    // happy-dom doesn't render <meta> tags from page-data args, so we
    // inject a token via the same path the production page reads from.
    // (Menu.tsx::FormRow uses the identical pattern, so this assertion
    // proves our form is consistent with the rest of the SPA.)
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'csrf-token');
    meta.setAttribute('content', 'test-csrf-token-abc');
    document.head.appendChild(meta);
    try {
      renderPage();
      // The form's CsrfInput reads on mount, so we wait for the
      // microtask that flushes the useEffect.
      const form = await screen.findByRole('form', { name: /upload avatar/i });
      const csrfInput = form.querySelector('input[name="_csrf"]') as HTMLInputElement | null;
      expect(csrfInput).not.toBeNull();
      expect(csrfInput?.value).toBe('test-csrf-token-abc');
    } finally {
      meta.remove();
    }
  });
});
