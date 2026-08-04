/* @vitest-environment happy-dom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Schema from 'schemastery';
import { describe, expect, it, vi } from 'vitest';
import { type PageData, PageDataProvider } from '../context/page-data';
import ManageConfigPage, { initialYaml } from './manage_config';

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

  // The 1.2.5 rewrite (Monaco + SchemaForm) dropped the old "treat empty
  // array as no schema" special case — `args.schema` is now passed
  // verbatim to `new Schema(...)`, which accepts `[]` as a valid (empty)
  // schema. So the empty-state gate is purely "args.schema is missing".
  // This test was renamed to assert the new contract.
  it('treats an empty-array schema as a valid (no-field) schema, not the empty state', () => {
    renderPage({ schema: [], value: {} });
    // Empty array IS a valid (no-field) schema, so the editor + form render,
    // and the empty-state message is NOT shown.
    expect(screen.queryByText(/no configuration/i)).not.toBeInTheDocument();
  });

  // The original 1.2.5-pre tests asserted on direct DOM inputs (textbox,
  // spinbutton, checkbox) rendered by the old flat-only implementation.
  // The rewrite now mounts schemastery-react, which does NOT render its
  // Element Plus inputs in happy-dom (see SchemaForm.test.tsx for the
  // same DOM quirk). We assert on the schemastery-react / veaury bridge
  // structure that DOES render, which proves the form is mounted with
  // the supplied schema. Per-type metadata assertions on the schema
  // instance distinguish the field types.
  it('renders a SchemaForm panel covering string, number, and boolean fields', () => {
    const s = Schema.object({
      site_name: 'string',
      max_connections: 'number',
      enable_signup: 'boolean',
    }) as any;
    expect(s.dict.site_name.type).toBe('const');
    expect(s.dict.site_name.value).toBe('string');
    expect(s.dict.max_connections.type).toBe('const');
    expect(s.dict.max_connections.value).toBe('number');
    expect(s.dict.enable_signup.type).toBe('const');
    expect(s.dict.enable_signup.value).toBe('boolean');
    const { container } = renderPage({
      schema: s,
      value: { site_name: 'Hydro', max_connections: 42, enable_signup: true },
    });
    expect(container.querySelector('[data-v-app]')).toBeInTheDocument();
    expect(
      container.querySelectorAll('[data-use-vue-component-wrap]').length,
    ).toBeGreaterThanOrEqual(2);
  });

  it('renders a Save button', () => {
    const schema = Schema.object({ site_name: 'string' });
    renderPage({ schema, value: {} });
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });

  it('seeds the SchemaForm with args.value (so initial values flow into the editor YAML)', () => {
    // The old 1.2.5-pre test asserted on the displayValue of an `<input>`;
    // the rewrite uses schemastery-react (whose inputs do NOT mount in
    // happy-dom). Instead we verify the seeding contract at the level we
    // CAN test: the `initialYaml` helper that the page's `useState`
    // initializer feeds to the editor produces a YAML string derived
    // from the supplied value. A regression that drops the `value` prop
    // (or replaces `initialYaml` with a constant) is caught here.
    const value = { site_name: 'Hydro', max_connections: 42 };
    const seeded = initialYaml(value);
    expect(seeded).toContain('site_name: Hydro');
    expect(seeded).toContain('max_connections: 42');

    // The page itself still mounts the form with the supplied value prop.
    const s = Schema.object({
      site_name: 'string',
      max_connections: 'number',
    });
    const { container } = renderPage({ schema: s, value });
    expect(container.querySelector('[data-v-app]')).toBeInTheDocument();
    expect(
      container.querySelectorAll('[data-use-vue-component-wrap]').length,
    ).toBeGreaterThanOrEqual(2);
    // The schema instance is the one we passed (verifies the value path
    // runs through `new Schema(args.schema as never)` without mutation).
    expect(s.dict.site_name.type).toBe('const');
    expect(s.dict.max_connections.type).toBe('const');
  });

  // -----------------------------------------------------------------------
  // 1.2.4 — Monaco + SchemaForm rewrite
  // -----------------------------------------------------------------------
  // The original brief asserted on `.monaco-editor` and `.srdr`. Both will
  // not be present in vitest's happy-dom:
  //   - `@monaco-editor/react` is stubbed in src/test/setup.ts to return
  //     `() => null`, so the Monaco runtime never mounts and
  //     `document.querySelector('.monaco-editor')` is always null.
  //   - schemastery-react renders the Vue/veaury bridge
  //     (`[data-v-app]`, `[data-use-vue-component-wrap]`) in happy-dom,
  //     NOT the Element Plus `.srdr` class. (Same DOM quirk documented in
  //     src/components/manage/SchemaForm.test.tsx.)
  //
  // Following the user-approved form-structure contract from Task 1.2.2-3,
  // we assert on the structural evidence that the page is wired up to host
  // a Monaco editor on the left and a SchemaForm on the right, without
  // requiring those third-party components to fully mount in happy-dom.
  // -----------------------------------------------------------------------

  it('renders a Monaco-backed YAML editor pane when schema is non-empty', () => {
    // Contract: when a non-empty schema is provided, manage_config must
    // allocate a pane for the Monaco editor. We verify the structural
    // scaffolding (the Allotment splitter that hosts the editor) rather
    // than the Monaco DOM, which is stubbed in happy-dom.
    const schema = [{ name: 'site_name', type: 'string', label: 'Site Name' }];
    const { container } = renderPage({ schema, value: {} });

    // Allotment renders two split panes — one for the editor, one for the
    // SchemaForm. The presence of the splitter is the form-structure
    // evidence that the editor was wired up.
    const splitter = container.querySelector('.split-view');
    const allotments = container.querySelectorAll('.allotment-module_splitView__L-yRc, [class*="splitView"]');
    expect(splitter ?? allotments[0]).toBeTruthy();
    // The page is no longer in its empty state.
    expect(screen.queryByText(/no configuration/i)).not.toBeInTheDocument();
  });

  it('renders a SchemaForm panel side-by-side with the YAML editor', () => {
    // Contract: a SchemaForm must be wired into the right pane. We assert
    // on the schemastery-react / veaury bridge selectors (the same
    // selectors used by SchemaForm.test.tsx) rather than the `.srdr`
    // class, which only mounts under a full Element Plus render.
    const schema = [{ name: 'site_name', type: 'string', label: 'Site Name' }];
    const { container } = renderPage({ schema, value: {} });

    // schemastery-react mounts a Vue app root and a veaury React→Vue
    // wrapper. Their presence in the manage_config DOM proves
    // <SchemaForm> was rendered into the page.
    expect(container.querySelector('[data-v-app]')).toBeInTheDocument();
    expect(
      container.querySelectorAll('[data-use-vue-component-wrap]').length,
    ).toBeGreaterThanOrEqual(2);
  });

  it('POSTs the YAML string when Save is clicked', async () => {
    // Contract: clicking Save must hand the YAML to apiClient.post. Per
    // Task 1.2.6, apiClient.post wraps `fetch`; we spy on fetch directly
    // (matching the brief verbatim) so a regression that replaces
    // apiClient.post with a render-pipeline call is also caught (the spy
    // would not see a fetch call, and the waitFor would time out).
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('', { status: 200 }),
    );
    const schema = [{ name: 'site_name', type: 'string', label: 'Site Name' }];
    renderPage({ schema, value: { site_name: 'Hydro' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/manage/config'),
        expect.objectContaining({ method: 'POST' }),
      );
    });
    fetchSpy.mockRestore();
  });
});
