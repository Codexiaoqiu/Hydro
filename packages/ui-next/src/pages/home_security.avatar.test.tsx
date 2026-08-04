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
});
