/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { type PageData, PageDataProvider } from '../context/page-data';
import DomainJoinApplicationsPage from './domain_join_applications';

function renderPage(args: Record<string, unknown>) {
  const initial: PageData = {
    name: 'domain_join_applications',
    template: 'domain_join_applications.html',
    url: '/domain/join_applications',
    args: { UserContext: {}, UiContext: {}, ...args } as PageData['args'],
  };
  return render(
    <PageDataProvider initial={initial}>
      <DomainJoinApplicationsPage />
    </PageDataProvider>,
  );
}

beforeEach(() => {
  // The implementation extracts the domainId from the URL path
  // `/d/{domainId}/domain/join_applications`. Set it here so the rendered
  // public-join URL contains the expected id.
  window.history.pushState({}, '', '/d/d1/domain/join_applications');
});

describe('domain_join_applications', () => {
  it('renders the Settings heading and Update Settings button', () => {
    renderPage({
      joinSettings: null,
      rolesWithText: [['default', 'default'], ['member', 'member']],
      expirations: { 24: 'In 1 day', '-1': 'Never expire' },
      url_prefix: 'https://hydro.ac/',
    });
    expect(screen.getByRole('heading', { level: 1, name: /^Settings$/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /update settings/i })).toBeInTheDocument();
  });

  it('renders join URL with the domain id when joinSettings is provided', () => {
    renderPage({
      joinSettings: { method: 1, role: 'default', expire: null },
      rolesWithText: [['default', 'default']],
      expirations: { 24: 'In 1 day', '-1': 'Never expire' },
      url_prefix: 'https://hydro.ac/',
    });
    // The generated URL ends with the handler path and the current domainId
    // (provided by `handler.args.domainId` in the template, mocked as 'd1').
    expect(screen.getByText(/d\/d1\/domain\/join/)).toBeInTheDocument();
  });

  it('renders the code-bearing URL when join method is CODE', () => {
    renderPage({
      joinSettings: { method: 2, role: 'default', expire: null, code: 'SECRET' },
      rolesWithText: [['default', 'default']],
      expirations: { 24: 'In 1 day', '-1': 'Never expire' },
      url_prefix: 'https://hydro.ac/',
    });
    expect(screen.getByText(/code=SECRET/)).toBeInTheDocument();
  });

  it('renders form fields: method, role, group, expire, invitationCode', () => {
    renderPage({
      joinSettings: { method: 1, role: 'member', group: '', code: '' },
      rolesWithText: [['default', 'default'], ['member', 'member']],
      expirations: { 24: 'In 1 day', '-1': 'Never expire' },
      url_prefix: 'https://hydro.ac/',
    });
    expect(screen.getByLabelText(/^method$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/role assignment/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/group assignment/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^expire$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/invitation code/i)).toBeInTheDocument();
  });

  it('hides the Information block when no joinSettings are configured', () => {
    renderPage({
      joinSettings: null,
      rolesWithText: [['default', 'default']],
      expirations: { 24: 'In 1 day', '-1': 'Never expire' },
      url_prefix: 'https://hydro.ac/',
    });
    // The Information header appears only when joinSettings is truthy; the
    // Settings header is always present, so we count Information occurrences.
    expect(screen.queryByRole('heading', { name: /^Information$/i })).not.toBeInTheDocument();
  });
});
