/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PageDataProvider } from '../../context/page-data';
import { RouterProvider } from '../../context/router';
import { routeMapStore } from '../../globals';
import { Paginator } from './Paginator';

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <PageDataProvider
      initial={{
        name: 'test',
        template: '',
        args: { UserContext: {}, UiContext: { domainId: 'system' } },
        url: '/test',
      }}
    >
      <RouterProvider>{ui}</RouterProvider>
    </PageDataProvider>,
  );
}

describe('paginator', () => {
  beforeEach(() => {
    routeMapStore._routeMap = {};
    // Prevent RouterProvider from fetching page data on mount.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 200 })));
  });

  it('renders nothing when total <= 1', () => {
    const { container } = renderWithProviders(
      <Paginator current={1} total={1} buildHref={(p) => `?page=${p}`} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders all pages when total <= 7', () => {
    renderWithProviders(
      <Paginator current={2} total={5} buildHref={(p) => `?page=${p}`} />,
    );
    for (let i = 1; i <= 5; i += 1) {
      expect(screen.getByText(String(i))).toBeInTheDocument();
    }
  });

  it('marks the current page with aria-current="page"', () => {
    renderWithProviders(
      <Paginator current={3} total={5} buildHref={(p) => `?page=${p}`} />,
    );
    const current = screen.getByText('3');
    expect(current.getAttribute('aria-current')).toBe('page');
  });

  it('renders ellipsis when total > 7', () => {
    renderWithProviders(
      <Paginator current={5} total={20} buildHref={(p) => `?page=${p}`} />,
    );
    expect(screen.getAllByText('…').length).toBeGreaterThan(0);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
  });

  it('calls buildHref with the new page number on link href', () => {
    renderWithProviders(
      <Paginator current={2} total={5} buildHref={(p) => `?page=${p}`} />,
    );
    const link4 = screen.getByText('4');
    expect(link4.getAttribute('href')).toBe('?page=4');
  });
});
