/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ToastProvider } from '../components/primitives/Toast';
import { type PageData, PageDataProvider } from '../context/page-data';
import ContestManagePage from './contest_manage';

function renderPage(args: Record<string, unknown>) {
  const initial: PageData = {
    name: 'contest_manage', template: 'contest_manage.html', url: '/contest/abc/management',
    args: { UserContext: {}, UiContext: {}, ...args } as PageData['args'],
  };
  return render(
    <PageDataProvider initial={initial}>
      <ToastProvider>
        <ContestManagePage />
      </ToastProvider>
    </PageDataProvider>,
  );
}

describe('contest_manage download code link', () => {
  it('renders a download link to /contest/:tid/code when args.perm.PERM_READ_RECORD_CODE is set', () => {
    renderPage({
      tdoc: { _id: 'abc' },
      perm: { PERM_READ_RECORD_CODE: true },
    });
    const link = screen.getByRole('link', { name: /download.*submissions|submissions.*zip/i });
    expect(link.getAttribute('href')).toBe('/contest/abc/code?all=1');
  });

  it('does not render the download link when perm.PERM_READ_RECORD_CODE is missing', () => {
    renderPage({
      tdoc: { _id: 'abc' },
    });
    expect(screen.queryByRole('link', { name: /download.*code|code.*zip/i })).not.toBeInTheDocument();
  });
});
