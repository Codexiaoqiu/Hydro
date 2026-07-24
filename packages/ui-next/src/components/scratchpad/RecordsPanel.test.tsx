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

  it('renders a placeholder when records are not viewable', () => {
    wrap(<RecordsPanel submissionsUrl="/r" canViewRecord={false} />);
    expect(screen.getByText(/not available/i)).toBeInTheDocument();
    expect(globalThis.fetch).not.toHaveBeenCalledWith('/r');
  });

  it('appends records received from the websocket', async () => {
    class MockWebSocket {
      static instances: MockWebSocket[] = [];
      onmessage?: (event: MessageEvent) => void;
      onopen?: () => void;
      close = vi.fn();
      constructor() { MockWebSocket.instances.push(this); }
    }
    vi.stubGlobal('WebSocket', MockWebSocket);
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, json: async () => ({ rdocs: [] }) });
    wrap(<RecordsPanel submissionsUrl="/r" wsUrl="ws://records" />);
    await waitFor(() => expect(MockWebSocket.instances).toHaveLength(1));
    MockWebSocket.instances[0].onmessage?.({ data: JSON.stringify({ rdoc: { _id: 'r3', status: 1, lang: 'cpp', time: 1 } }) } as MessageEvent);
    await waitFor(() => expect(screen.getByText('r3')).toBeInTheDocument());
    vi.unstubAllGlobals();
  });
});
