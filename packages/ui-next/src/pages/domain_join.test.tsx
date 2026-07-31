/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { type PageData, PageDataProvider } from '../context/page-data';
import DomainJoinPage from './domain_join';

function renderPage(args: Record<string, unknown>) {
  const initial: PageData = {
    name: 'domain_join', template: 'domain_join.html', url: '/domain/join',
    args: { UserContext: {}, UiContext: {}, ...args } as PageData['args'],
  };
  return render(
    <PageDataProvider initial={initial}>
      <DomainJoinPage />
    </PageDataProvider>,
  );
}

describe('domain_join', () => {
  it('renders domain name and owner in heading', () => {
    renderPage({
      joinSettings: null,
      code: '',
      target: 'mydomain',
      redirect: '',
      domainInfo: {
        name: 'mydomain',
        owner: { _id: 1, uname: 'alice', displayName: 'Alice' },
        avatar: '',
        bulletin: '',
      },
    });
    // The heading includes the domain name; use a heading-role query so we
    // don't accidentally match the hidden <input name="target"> value or the
    // <p> body copy.
    expect(screen.getByRole('heading', { level: 1, name: /mydomain/ })).toBeInTheDocument();
    expect(screen.getByText(/alice/i)).toBeInTheDocument();
  });

  it('renders the Join submit button', () => {
    renderPage({
      joinSettings: null,
      code: '',
      target: 'mydomain',
      redirect: '',
      domainInfo: {
        name: 'mydomain',
        owner: { _id: 1, uname: 'alice' },
        avatar: '',
        bulletin: '',
      },
    });
    expect(screen.getByRole('button', { name: /join/i })).toBeInTheDocument();
  });

  it('renders invitation code input when join method is CODE', () => {
    renderPage({
      joinSettings: { method: 2, role: 'default', group: '', code: 'SECRET' },
      code: 'SECRET',
      target: 'mydomain',
      redirect: '',
      domainInfo: {
        name: 'mydomain',
        owner: { _id: 1, uname: 'alice' },
        avatar: '',
        bulletin: '',
      },
    });
    const codeInput = screen.getByLabelText(/invitation code/i) as HTMLInputElement;
    expect(codeInput).toBeInTheDocument();
    expect(codeInput.value).toBe('SECRET');
  });

  it('renders bulletin content when provided', () => {
    renderPage({
      joinSettings: null,
      code: '',
      target: 'mydomain',
      redirect: '',
      domainInfo: {
        name: 'mydomain',
        owner: { _id: 1, uname: 'alice' },
        avatar: '',
        bulletin: '<p>Welcome!</p>',
      },
    });
    expect(screen.getByText(/welcome/i)).toBeInTheDocument();
  });

  it('hides code input when join method is not CODE (e.g. ALL)', () => {
    renderPage({
      joinSettings: { method: 1, role: 'default', group: '', expire: null },
      code: '',
      target: 'mydomain',
      redirect: '',
      domainInfo: {
        name: 'mydomain',
        owner: { _id: 1, uname: 'alice' },
        avatar: '',
        bulletin: '',
      },
    });
    expect(screen.queryByLabelText(/invitation code/i)).not.toBeInTheDocument();
  });

  it('includes hidden target and redirect fields', () => {
    const { container } = renderPage({
      joinSettings: null,
      code: '',
      target: 'mydomain',
      redirect: '/some/where',
      domainInfo: {
        name: 'mydomain',
        owner: { _id: 1, uname: 'alice' },
        avatar: '',
        bulletin: '',
      },
    });
    const target = container.querySelector('input[name="target"]') as HTMLInputElement | null;
    const redirect = container.querySelector('input[name="redirect"]') as HTMLInputElement | null;
    expect(target?.value).toBe('mydomain');
    expect(redirect?.value).toBe('/some/where');
  });
});
