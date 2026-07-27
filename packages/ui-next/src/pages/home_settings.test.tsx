/* @vitest-environment happy-dom */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../components/primitives/Toast';
import { type PageData, PageDataProvider } from '../context/page-data';
import HomeSettingsPage from './home_settings';

function makePageData(args: Record<string, unknown> = {}): PageData {
  return {
    name: 'home_settings',
    template: 'home_settings.html',
    url: '/home/settings/preference',
    args: {
      UserContext: { viewLang: 'zh_CN', _id: 1 },
      UiContext: {},
      category: 'preference',
      page_name: 'home_preference',
      current: {},
      settings: [],
      ...args,
    } as unknown as PageData['args'],
  };
}

function Providers({ args, children }: { args: Record<string, unknown>, children: ReactNode }) {
  return (
    <PageDataProvider initial={makePageData(args)}>
      <ToastProvider>{children}</ToastProvider>
    </PageDataProvider>
  );
}

beforeEach(() => { vi.restoreAllMocks(); });

describe('home_settings', () => {
  it('shows the empty-state alert when there are no settings', () => {
    render(<Providers args={{ category: 'account', settings: [] }}><HomeSettingsPage /></Providers>);
    expect(screen.getAllByText(/偏好设置|账号设置|域设置|Preferences|Account settings|Domain settings/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/当前类别没有可配置项|No editable settings for this category/).length).toBeGreaterThan(0);
  });

  it('renders text + select + number + boolean + markdown fields grouped by family', () => {
    const settings = [
      { family: 'display', key: 'viewLang', name: 'UI Language', type: 'select', range: { zh_CN: '简体中文', en: 'English' }, value: 'zh_CN' },
      { family: 'display', key: 'timeZone', name: 'Timezone', type: 'select', range: { UTC: 'UTC', CST: 'CST' }, value: 'UTC' },
      { family: 'usage', key: 'avatar', name: 'Avatar URL', type: 'text', value: '' },
      { family: 'usage', key: 'linesOfCode', name: 'Lines of Code', type: 'number', value: 0 },
      { family: 'usage', key: 'markdownBio', name: 'Bio', type: 'markdown', value: '' },
      { family: 'usage', key: 'darkMode', name: 'Dark mode', type: 'boolean', value: true, flag: 0 },
      { family: 'usage', key: 'banReason', name: 'Ban reason', type: 'text', value: '', flag: 1 /* FLAG_HIDDEN */ },
    ];
    render(<Providers args={{ settings, current: { viewLang: 'en' } }}><HomeSettingsPage /></Providers>);
    // Selects: language + timezone
    expect(screen.getAllByRole('combobox').length).toBeGreaterThanOrEqual(2);
    // Number input
    expect(screen.getAllByDisplayValue('0').length).toBeGreaterThan(0);
    // Switch (boolean)
    expect(screen.getByRole('switch')).toBeInTheDocument();
    // Markdown textarea
    expect(screen.getByRole('textbox', { name: /Bio/i })).toBeInTheDocument();
    // Hidden field is excluded from the rendered DOM
    expect(screen.queryByText('Ban reason')).not.toBeInTheDocument();
  });

  it('initializes values from `current` and falls back to schema defaults', () => {
    const settings = [
      { family: 'display', key: 'viewLang', name: 'UI Language', type: 'select', range: { zh_CN: '简体中文', en: 'English' }, value: 'zh_CN' },
    ];
    render(<Providers args={{ settings, current: { viewLang: 'en' } }}><HomeSettingsPage /></Providers>);
    expect((screen.getByDisplayValue('English') as HTMLSelectElement)).toBeInTheDocument();
  });

  it('pOSTs the form to /home/settings/<category> on save with all current values', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch').mockImplementation(async () => ({
      ok: true, status: 200,
      headers: { get: () => '' },
      clone() { return this; },
      json: async () => undefined,
      text: async () => '',
    } as unknown as Response));
    const settings = [
      { family: 'display', key: 'viewLang', name: 'UI Language', type: 'select', range: { zh_CN: '简体中文', en: 'English' }, value: 'zh_CN' },
      { family: 'usage', key: 'avatar', name: 'Avatar URL', type: 'text', value: '' },
      { family: 'usage', key: 'darkMode', name: 'Dark mode', type: 'boolean', value: true },
    ];
    render(<Providers args={{ settings, current: {} }}><HomeSettingsPage /></Providers>);
    fireEvent.change(screen.getByLabelText(/Avatar URL/i), { target: { value: 'gravatar:a@b' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /保存|Save/ }));
    });
    await waitFor(() => {
      const call = fetchSpy.mock.calls.find(([u]) => String(u).startsWith('/home/settings/'));
      expect(call).toBeDefined();
    });
    const [url, init] = fetchSpy.mock.calls.find(([u]) => String(u).startsWith('/home/settings/'))!;
    expect(url).toBe('/home/settings/preference');
    expect((init as RequestInit).method).toBe('POST');
    const body = String((init as RequestInit).body);
    expect(body).toContain('category=preference');
    expect(body).toContain('viewLang=zh_CN');
    expect(body).toContain('avatar=gravatar%3Aa%40b');
    expect(body).toContain('darkMode=on');
  });

  it('includes booleanKeys for unchecked booleans and surfaces server errors', async () => {
    const errorJson = { error: { message: 'Permission denied' }, UserFacingError: true };
    const fetchSpy = vi.spyOn(window, 'fetch').mockImplementation(async () => ({
      ok: false, status: 403,
      headers: { get: () => 'application/json' },
      clone() { return this; },
      json: async () => errorJson,
      text: async () => JSON.stringify(errorJson),
    } as unknown as Response));
    const settings = [
      { family: 'usage', key: 'darkMode', name: 'Dark mode', type: 'boolean', value: false },
    ];
    render(<Providers args={{ settings, current: {} }}><HomeSettingsPage /></Providers>);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /保存|Save/ }));
    });
    await waitFor(() => expect(screen.getByText(/Permission denied/)).toBeInTheDocument());

    const call = fetchSpy.mock.calls.find(([u]) => String(u).startsWith('/home/settings/'));
    expect(call).toBeDefined();
    const [, init] = call!;
    const body = String((init as RequestInit).body);
    expect(body).toContain('booleanKeys=darkMode');
  });
});
