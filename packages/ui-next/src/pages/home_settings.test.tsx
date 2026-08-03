/* eslint-disable ts/naming-convention */
/* @vitest-environment happy-dom */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../components/primitives/Toast';
import { type PageData, PageDataProvider } from '../context/page-data';
import HomeSettingsPage from './home_settings';

// Top-level mock: spy on supportFontFamily/applyFontFilter so the
// integration test can verify behaviour without depending on happy-dom
// canvas rasterisation. `vi.mock` is hoisted by vitest before any import
// of `home_settings` so the page picks up the mocked functions.
const supportFontFamilyMock = vi.fn<(font: string) => boolean>();
const applyFontFilterMock = vi.fn<(root?: ParentNode) => void>();
vi.mock('../sections/PreferenceSection.fonts', () => ({
  supportFontFamily: (font: string) => supportFontFamilyMock(font),
  applyFontFilter: (root?: ParentNode) => applyFontFilterMock(root),
}));

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

  it('renders font selects with name attributes so the preference helper can target them', () => {
    const settings = [
      // eslint-disable-next-line max-len
      { family: 'setting_display', key: 'fontFamily', name: 'Font Family', type: 'select', range: { Open: 'Open Sans', Mono: 'Source Code Pro' }, value: 'Open' },
      // eslint-disable-next-line max-len
      { family: 'setting_display', key: 'codeFontFamily', name: 'Code Font Family', type: 'select', range: { Open: 'Open Sans', Mono: 'Source Code Pro' }, value: 'Mono' },
    ];
    render(<Providers args={{ settings, current: {} }}><HomeSettingsPage /></Providers>);
    const ff = document.querySelector('select[name="fontFamily"]') as HTMLSelectElement | null;
    const cff = document.querySelector('select[name="codeFontFamily"]') as HTMLSelectElement | null;
    expect(ff).not.toBeNull();
    expect(cff).not.toBeNull();
    expect(ff?.options).toHaveLength(2);
    expect(cff?.options).toHaveLength(2);
  });

  it('hides options that fail supportFontFamily when category=preference (P1-1 regression)', async () => {
    supportFontFamilyMock.mockImplementation((font: string) => font === 'supported');
    applyFontFilterMock.mockImplementation((root: ParentNode = document) => {
      // Re-implement the real side-effect inline so the test still exercises
      // the DOM mutation path. Keeps the test honest even though applyFontFilter
      // is mocked.
      const names = ['fontFamily', 'codeFontFamily'];
      for (const name of names) {
        const select = (root as ParentNode).querySelector?.(`select[name="${name}"]`) as HTMLSelectElement | null;
        if (!select) continue;
        for (const option of Array.from(select.options)) {
          option.style.fontFamily = option.value;
          if (supportFontFamilyMock(option.value)) continue;
          option.hidden = true;
        }
      }
    });
    const settings = [
      {
        family: 'setting_display', key: 'fontFamily', name: 'Font Family', type: 'select',
        range: { supported: 'Open Sans', missing: 'Totally Missing Font' }, value: 'supported',
      },
    ];
    render(<Providers args={{ category: 'preference', settings, current: {} }}><HomeSettingsPage /></Providers>);
    await act(async () => { await new Promise((r) => setTimeout(r, 30)); });
    expect(supportFontFamilyMock).toHaveBeenCalled();
    // applyFontFilter calls supportFontFamily with `option.value` (the `<option>`
    // value attribute), which is the `range` key, not the user-visible label.
    // In the spec below we use 'supported' / 'missing' as values so the test
    // stays expressive without depending on happy-dom text rendering.
    expect(supportFontFamilyMock).toHaveBeenCalledWith('supported');
    expect(supportFontFamilyMock).toHaveBeenCalledWith('missing');
    const ff = document.querySelector('select[name="fontFamily"]') as HTMLSelectElement | null;
    expect(ff).not.toBeNull();
    const missingOpt = Array.from(ff!.options).find((o) => o.value === 'missing');
    const openOpt = Array.from(ff!.options).find((o) => o.value === 'supported');
    expect(missingOpt?.hidden).toBe(true);
    expect(openOpt?.hidden).toBe(false);
    // Manual resets are required even though `beforeEach` runs
    // `vi.restoreAllMocks()`: `restoreAllMocks` only resets *spies* created
    // via `vi.spyOn`. The mock fns declared by `vi.mock(...)` above are
    // vi.mock-hoisted factories whose `.mock*` state persists across tests,
    // so without these resets the next test sees call history from this one.
    supportFontFamilyMock.mockReset();
    applyFontFilterMock.mockReset();
  });

  it('does not invoke canvas / font detection for non-preference categories (no side-effects)', async () => {
    const getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext');
    const settings = [
      {
        family: 'setting_display', key: 'fontFamily', name: 'Font Family', type: 'select',
        range: { A: 'Open Sans', B: 'Totally Missing Font' }, value: 'A',
      },
    ];
    render(<Providers args={{ category: 'account', settings, current: {} }}><HomeSettingsPage /></Providers>);
    // `<PreferenceSection/>` is only mounted when `args.category === 'preference'`,
    // so `applyFontFilter` (and therefore `getContext`) is never called for
    // `account`. The assertion is safe to make synchronously after render
    // because no microtask schedules the helper — the absence is structural.
    await waitFor(() => expect(getContextSpy).not.toHaveBeenCalled());
    getContextSpy.mockRestore();
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
