import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type PageData, PageDataProvider } from '../context/page-data';
import { routeMapStore } from '../globals';
import { useBuildUrl } from './use-build-url';

let originalRouteMap: Record<string, string>;
let restoreConsoleError: () => void;

function Probe() {
  const buildUrl = useBuildUrl();
  return <a href={buildUrl('test_route', { pid: '1000' })}>Problem</a>;
}

function renderProbe(uiContext: PageData['args']['UiContext']) {
  const initial: PageData = {
    name: 'homepage',
    template: '',
    args: {
      UserContext: {},
      UiContext: uiContext,
    },
    url: '/',
  };
  return render(<PageDataProvider initial={initial}><Probe /></PageDataProvider>);
}

describe('useBuildUrl', () => {
  beforeEach(() => {
    originalRouteMap = { ...routeMapStore._routeMap };
    routeMapStore._routeMap = {};
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    restoreConsoleError = () => error.mockRestore();
  });

  afterEach(() => {
    routeMapStore._routeMap = originalRouteMap;
    restoreConsoleError();
  });

  it('builds same-domain URLs when UiContext has no domain host metadata', () => {
    routeMapStore.set({ test_route: '/p/:pid' });

    renderProbe({ domainId: 'system', domainVersion: 1 });

    expect(screen.getByRole('link', { name: 'Problem' })).toHaveAttribute('href', '/p/1000');
    expect(console.error).not.toHaveBeenCalled();
  });

  it('defaults to the system domain when UiContext has no domain id', () => {
    routeMapStore.set({ test_route: '/p/:pid' });

    renderProbe({ domainVersion: 1 });

    expect(screen.getByRole('link', { name: 'Problem' })).toHaveAttribute('href', '/p/1000');
  });
});
