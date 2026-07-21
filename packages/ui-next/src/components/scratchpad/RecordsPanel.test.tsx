import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PageDataProvider } from '../../context/page-data';
import { RouterProvider } from '../../context/router';
import { routeMapStore } from '../../globals';
import { RecordsPanel } from './RecordsPanel';

const originalFetch = globalThis.fetch;

const t = vi.fn((key: string) => {
  const map: Record<string, string> = {
    'Scratchpad.NoRecords': 'No submissions yet',
  };
  return map[key] ?? key;
});
vi.mock('../../lib/i18n', () => ({ useTranslate: () => t }));

const initialPageData = {
  name: 'problem_main',
  template: '',
  args: { UserContext: {}, UiContext: { domainId: 'system', domainVersion: 1 } },
  url: '/p/1000',
};

function wrap(ui: React.ReactNode) {
  return render(
    <PageDataProvider initial={initialPageData}>
      <RouterProvider>{ui}</RouterProvider>
    </PageDataProvider>,
  );
}

beforeEach(() => {
  globalThis.fetch = vi.fn();
  routeMapStore._routeMap = { record_detail: '/record/:rid' };
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  routeMapStore._routeMap = {};
});

describe('RecordsPanel', () => {
  it('shows empty state when fetch returns no records', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ rdocs: [] }),
    });
    wrap(<RecordsPanel submissionsUrl="/r" />);
    await waitFor(() => expect(screen.getByText(/no submissions/i)).toBeInTheDocument());
  });

  it('renders up to 5 records with link to record detail', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        rdocs: [
          { _id: 'r1', status: 1, lang: 'cpp', time: 1700000000 },
          { _id: 'r2', status: 2, lang: 'py', time: 1700000001 },
        ],
      }),
    });
    wrap(<RecordsPanel submissionsUrl="/r" />);
    await waitFor(() => {
      expect(screen.getByText('r1')).toBeInTheDocument();
      expect(screen.getByText('r2')).toBeInTheDocument();
    });
    expect((screen.getByText('r1').closest('a') as HTMLAnchorElement).href).toContain('/record/r1');
  });
});
