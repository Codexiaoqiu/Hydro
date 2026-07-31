/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { type PageData, PageDataProvider } from '../context/page-data';
import ManageConfigPage from './manage_config';

function renderPage(args: Record<string, unknown> = {}) {
  const initial: PageData = {
    name: 'manage_config', template: 'manage_config.html', url: '/manage/config',
    args: { UserContext: {}, UiContext: {}, ...args } as PageData['args'],
  };
  return render(
    <PageDataProvider initial={initial}>
      <ManageConfigPage />
    </PageDataProvider>,
  );
}

describe('manage_config', () => {
  it('shows the empty-state message when no schema is provided', () => {
    renderPage();
    expect(screen.getByText(/no configuration/i)).toBeInTheDocument();
  });

  it('shows the empty-state message when schema is an empty array', () => {
    renderPage({ schema: [], value: {} });
    expect(screen.getByText(/no configuration/i)).toBeInTheDocument();
  });

  it('renders one input per schema entry', () => {
    const schema = [
      { name: 'site_name', type: 'string', label: 'Site Name' },
      { name: 'max_connections', type: 'number', label: 'Max Connections' },
      { name: 'enable_signup', type: 'boolean', label: 'Enable Signup' },
    ];
    renderPage({ schema, value: {} });
    expect(screen.getByRole('textbox', { name: /site name/i })).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: /max connections/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /enable signup/i })).toBeInTheDocument();
  });

  it('initializes input values from args.value', () => {
    const schema = [
      { name: 'site_name', type: 'string', label: 'Site Name' },
      { name: 'max_connections', type: 'number', label: 'Max Connections' },
    ];
    renderPage({
      schema,
      value: { site_name: 'Hydro', max_connections: 42 },
    });
    expect(screen.getByDisplayValue('Hydro')).toBeInTheDocument();
    expect(screen.getByDisplayValue('42')).toBeInTheDocument();
  });

  it('renders a Save button', () => {
    const schema = [
      { name: 'site_name', type: 'string', label: 'Site Name' },
    ];
    renderPage({ schema, value: {} });
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });
});
