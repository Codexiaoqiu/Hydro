/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { type PageData, PageDataProvider } from '../context/page-data';
import DomainCreatePage from './domain_create';

function renderPage(args: Record<string, unknown> = {}) {
  const initial: PageData = {
    name: 'domain_create', template: 'domain_create.html', url: '/domain/create',
    args: { UserContext: {}, UiContext: {}, ...args } as PageData['args'],
  };
  return render(
    <PageDataProvider initial={initial}>
      <DomainCreatePage />
    </PageDataProvider>,
  );
}

describe('domain_create', () => {
  it('renders DomainForm in create mode', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
  });
});
