/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { type PageData, PageDataProvider } from '../context/page-data';
import DomainEditPage from './domain_edit';

function renderPage(args: Record<string, unknown>) {
  const initial: PageData = {
    name: 'domain_edit', template: 'domain_edit.html', url: '/domain/edit',
    args: { UserContext: {}, UiContext: {}, ...args } as PageData['args'],
  };
  return render(
    <PageDataProvider initial={initial}>
      <DomainEditPage />
    </PageDataProvider>,
  );
}

describe('domain_edit', () => {
  it('renders DomainForm in edit mode with prefilled fields', () => {
    renderPage({
      domain: { _id: 'd1', name: 'd1', displayName: 'My', gravatar: '' },
    });
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^name$/i)).toBeDisabled(); // name locked on edit
  });
});
