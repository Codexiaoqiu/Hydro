/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { type PageData, PageDataProvider } from '../context/page-data';
import ManageBasePage from './manage_base';

function renderPage(args: Record<string, unknown> = {}) {
  const initial: PageData = {
    name: 'manage_base', template: 'manage_base.html', url: '/manage',
    args: { UserContext: {}, UiContext: {}, ...args } as PageData['args'],
  };
  return render(
    <PageDataProvider initial={initial}>
      <ManageBasePage />
    </PageDataProvider>,
  );
}

describe('manage_base', () => {
  it('renders the Control Panel banner', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /control panel/i })).toBeInTheDocument();
  });

  it('renders sidebar nav with 7 links', () => {
    renderPage();
    expect(screen.getByRole('link', { name: 'Config' })).toHaveAttribute('href', '/manage/config');
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/manage/dashboard');
    expect(screen.getByRole('link', { name: 'Script' })).toHaveAttribute('href', '/manage/script');
    expect(screen.getByRole('link', { name: 'Setting' })).toHaveAttribute('href', '/manage/setting');
    expect(screen.getByRole('link', { name: 'User Import' })).toHaveAttribute('href', '/manage/user_import');
    expect(screen.getByRole('link', { name: 'User Priv' })).toHaveAttribute('href', '/manage/user_priv');
    expect(screen.getByRole('link', { name: 'Disabled' })).toHaveAttribute('href', '/manage/disabled');
  });

  it('honors items passed via args', () => {
    renderPage({ items: [{ name: 'Custom Item', url: '/manage/custom' }] });
    expect(screen.getByRole('link', { name: 'Custom Item' })).toHaveAttribute('href', '/manage/custom');
  });
});
