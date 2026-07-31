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

  it('renders sidebar nav with 6 links', () => {
    renderPage();
    expect(screen.getAllByRole('link')).toHaveLength(6);
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/manage/dashboard');
    expect(screen.getByRole('link', { name: 'Script' })).toHaveAttribute('href', '/manage/script');
    expect(screen.getByRole('link', { name: 'User Import' })).toHaveAttribute('href', '/manage/userimport');
    expect(screen.getByRole('link', { name: 'User Priv' })).toHaveAttribute('href', '/manage/userpriv');
    expect(screen.getByRole('link', { name: 'Setting' })).toHaveAttribute('href', '/manage/setting');
    expect(screen.getByRole('link', { name: 'Config' })).toHaveAttribute('href', '/manage/config');
  });

  it('honors items passed via args', () => {
    renderPage({ items: [{ name: 'Custom Item', url: '/manage/custom' }] });
    expect(screen.getByRole('link', { name: 'Custom Item' })).toHaveAttribute('href', '/manage/custom');
  });
});
