/* @vitest-environment happy-dom */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type PageData, PageDataProvider, useSetPageData } from '../context/page-data';
import { RouterProvider } from '../context/router';
import { routeMapStore } from '../globals';
import { request } from '../hooks/use-api';
import { ThemeProvider } from '../theme/ThemeProvider';
import ProblemImportPage from './problem_import';

function buildPageData(args: Record<string, any> = {}, overrides: Partial<PageData> = {}): PageData {
  return {
    name: '',
    template: '',
    args: {
      UserContext: {},
      UiContext: {},
      ...args,
    } as PageData['args'],
    url: '/problem/import',
    ...overrides,
  };
}

function LoadPageDataButton() {
  const setPageData = useSetPageData();
  return (
    <button
      type="button"
      onClick={() => setPageData((prev) => ({
        ...prev,
        name: 'problem_import_fps',
        template: 'problem_import.html',
        args: {
          UserContext: {},
          UiContext: {},
          type: 'fps-importer',
        },
      }))}
    >
      Load PageData
    </button>
  );
}

function Providers({ initial, children }: { initial: PageData, children: ReactNode }) {
  return (
    <ThemeProvider>
      <PageDataProvider initial={initial}>
        <RouterProvider>
          {children}
          <LoadPageDataButton />
        </RouterProvider>
      </PageDataProvider>
    </ThemeProvider>
  );
}

function renderImport(initial = buildPageData()) {
  return render(
    <Providers initial={initial}>
      <ProblemImportPage />
    </Providers>,
  );
}

describe('problemImportPage', () => {
  let originalRouteMap: Record<string, string>;

  beforeEach(() => {
    originalRouteMap = { ...routeMapStore._routeMap };
    routeMapStore.set({
      homepage: '/',
      problem_main: '/p',
    });
    window.history.pushState({}, '', '/problem/import');
    vi.spyOn(request, 'postFile').mockResolvedValue(undefined);
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
  });

  afterEach(() => {
    routeMapStore._routeMap = originalRouteMap;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('waits for PageData before rendering the import form', () => {
    renderImport();

    expect(screen.getByRole('status', { name: /Loading|加载中/ })).toBeInTheDocument();
    expect(screen.queryByLabelText('Package (.zip)')).not.toBeInTheDocument();
  });
  it('submits to the importer endpoint from loaded PageData type', async () => {
    renderImport();

    fireEvent.click(screen.getByRole('button', { name: 'Load PageData' }));
    const input = await screen.findByLabelText('Package (.zip)');
    const file = new File(['zip'], 'problems.zip', { type: 'application/zip' });
    fireEvent.change(input, { target: { files: [file] } });
    const form = input.closest('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(request.postFile).toHaveBeenCalledWith('/problem/import/fps-importer', expect.any(FormData));
    });
  });

  it('shows non-Hydro upload errors instead of swallowing them', async () => {
    vi.mocked(request.postFile).mockRejectedValueOnce(new Error('Unexpected upload failure'));
    renderImport();

    fireEvent.click(screen.getByRole('button', { name: 'Load PageData' }));
    const input = await screen.findByLabelText('Package (.zip)');
    const file = new File(['zip'], 'problems.zip', { type: 'application/zip' });
    fireEvent.change(input, { target: { files: [file] } });
    const form = input.closest('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    expect(await screen.findByText('Unexpected upload failure')).toBeInTheDocument();
  });
});
