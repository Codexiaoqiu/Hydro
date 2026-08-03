/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { type PageData, PageDataProvider } from '../context/page-data';
import ManageSettingPage from './manage_setting';

function renderPage(args: Record<string, unknown> = {}) {
  const initial: PageData = {
    name: 'manage_setting', template: 'manage_setting.html', url: '/manage/setting',
    args: { UserContext: { _id: 1, priv: 1 }, UiContext: {}, ...args } as PageData['args'],
  };
  return render(
    <PageDataProvider initial={initial}>
      <ManageSettingPage />
    </PageDataProvider>,
  );
}

describe('manage_setting', () => {
  it('renders a UI Renderer toggle using the manage-setting boolean contract', () => {
    const { container } = renderPage({ settings: [], current: { ui_next: true } });

    const section = screen.getByRole('group', { name: 'UI Renderer' });
    const checkbox = screen.getByRole('checkbox', { name: /enable ui renderer/i });
    expect(section).toContainElement(checkbox);
    expect(checkbox).toHaveAttribute('name', 'ui_next');
    expect(checkbox).toHaveAttribute('value', 'true');
    expect(checkbox).toBeChecked();
    expect(screen.getByText('(Active)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Switch UI' })).toBeInTheDocument();
    expect(section.closest('form')).toHaveAttribute('action', '/manage/setting');
    expect(container.querySelector('input[type="hidden"][name="booleanKeys.ui_next"]'))
      .toHaveAttribute('value', 'true');
  });

  it('hides the UI Renderer toggle without system-edit privilege', () => {
    renderPage({
      UserContext: { _id: 2, priv: 0 },
      settings: [{ key: 'site_name', name: 'Site Name', value: 'Hydro', type: 'text' }],
      current: { ui_next: false },
    });

    expect(screen.queryByRole('group', { name: 'UI Renderer' })).not.toBeInTheDocument();
    expect(screen.getByText('site_name')).toBeInTheDocument();
  });

  it('shows the empty-state message when settings is missing', () => {
    renderPage();
    expect(screen.getByText(/no settings/i)).toBeInTheDocument();
  });

  it('shows the empty-state message when settings is an empty array', () => {
    renderPage({ settings: [], current: {} });
    expect(screen.getByText(/no settings/i)).toBeInTheDocument();
  });

  it('renders one row per setting and pins the count', () => {
    const settings = [
      { key: 'site_name', name: 'Site Name', value: 'Hydro', type: 'text' },
      { key: 'max_connections', name: 'Max Connections', value: 100, type: 'number' },
      { key: 'enable_signup', name: 'Enable Signup', value: true, type: 'boolean' },
    ];
    renderPage({ settings, current: {} });
    // 1 header row + 3 data rows
    expect(screen.getAllByRole('row')).toHaveLength(4);
  });

  it('shows the setting key, value, and an Edit button per row', () => {
    const settings = [
      { key: 'site_name', name: 'Site Name', value: 'Hydro', type: 'text' },
    ];
    renderPage({ settings, current: {} });
    expect(screen.getByText('site_name')).toBeInTheDocument();
    expect(screen.getByText('Hydro')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
  });

  it('prefers the current value over the default value when both are provided', () => {
    const settings = [
      { key: 'site_name', name: 'Site Name', value: 'Hydro', type: 'text' },
    ];
    renderPage({
      settings,
      current: { site_name: 'Custom' },
    });
    expect(screen.getByText('Custom')).toBeInTheDocument();
    expect(screen.queryByText('Hydro')).not.toBeInTheDocument();
  });

  it('renders boolean values as Yes/No', () => {
    const settings = [
      { key: 'enable_signup', name: 'Enable Signup', value: true, type: 'boolean' },
      { key: 'allow_invite', name: 'Allow Invite', value: false, type: 'boolean' },
    ];
    renderPage({ settings, current: {} });
    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
  });

  it('renders an em-dash placeholder when no value is available', () => {
    const settings = [
      { key: 'unset', name: 'Unset', type: 'text' },
    ];
    renderPage({ settings, current: {} });
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders one Edit button per setting and pins the count', () => {
    const settings = [
      { key: 'a', name: 'A', value: '1', type: 'text' },
      { key: 'b', name: 'B', value: '2', type: 'text' },
      { key: 'c', name: 'C', value: '3', type: 'text' },
    ];
    renderPage({ settings, current: {} });
    expect(screen.getAllByRole('button', { name: /edit/i })).toHaveLength(3);
  });

  it('renders column headers: Key, Value, Action', () => {
    const settings = [
      { key: 'site_name', name: 'Site Name', value: 'Hydro', type: 'text' },
    ];
    renderPage({ settings, current: {} });
    expect(screen.getByRole('columnheader', { name: /key/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /value/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /action/i })).toBeInTheDocument();
  });
});
