/* @vitest-environment happy-dom */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type PageData, PageDataProvider } from '../context/page-data';
import HomeMessagesPage from './home_messages';

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  url: string;
  sent: string[] = [];
  readyState = 1;
  onopen: ((ev?: unknown) => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  send(data: string) { this.sent.push(data); }
  // Mutating the static `instances` array on close mirrors the real
  // WebSocket contract (the connection no longer exists once `close()`
  // resolves) and keeps `FakeWebSocket.instances.length` aligned with the
  // number of currently-open sockets. Tests that assert on that length
  // rely on this behaviour.
  close() {
    this.readyState = 3;
    FakeWebSocket.instances = FakeWebSocket.instances.filter((w) => w !== this);
  }

  // Test helper: simulate an inbound message frame.
  emitServerEvent(payload: unknown) {
    this.onmessage?.({ data: JSON.stringify({ operation: 'event', payload }) });
  }
}

function makePageData(args: Record<string, unknown> = {}): PageData {
  return {
    name: 'home_messages',
    template: 'home_messages.html',
    url: '/home/messages',
    args: {
      UserContext: { viewLang: 'zh_CN', _id: 1 },
      UiContext: { ws_prefix: '' },
      selfUid: 1,
      messages: {},
      ...args,
    } as unknown as PageData['args'],
  };
}

function Providers({ args, children }: { args: Record<string, unknown>, children: ReactNode }) {
  return <PageDataProvider initial={makePageData(args)}>{children}</PageDataProvider>;
}

function sampleConversation(targetUid: number, uname: string, contents: string[]) {
  return {
    _id: targetUid,
    udoc: { _id: targetUid, uname, avatarUrl: '' },
    messages: contents.map((content, i) => ({
      _id: `seed-${targetUid}-${i}`,
      from: i % 2 === 0 ? 1 : targetUid,
      to: i % 2 === 0 ? targetUid : 1,
      content,
    })),
  };
}

beforeEach(() => {
  FakeWebSocket.instances = [];
  vi.stubGlobal('WebSocket', FakeWebSocket as unknown as typeof WebSocket);
  document.cookie = 'sid=session-abc';
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.cookie = 'sid=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
});

describe('home_messages', () => {
  it('renders the title + empty state when no conversations exist', () => {
    render(<Providers args={{ messages: {} }}><HomeMessagesPage /></Providers>);
    expect(screen.getAllByText(/站内消息|Messages/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/暂无对话|No conversations/).length).toBeGreaterThan(0);
    // No conversation selected → the "select a conversation" placeholder renders on the right pane.
    expect(screen.getAllByText(/选择左侧|Select a conversation/).length).toBeGreaterThan(0);
  });

  it('lists conversations and switches the active thread on click', () => {
    const messages = {
      7: sampleConversation(7, 'alice', ['Hi from alice']),
      8: sampleConversation(8, 'bob', ['Hi from bob', 'Reply from me']),
    };
    render(<Providers args={{ messages }}><HomeMessagesPage /></Providers>);
    // Both names visible in the left listbox (use getAllByText since the name
    // is also shown in the right pane header for the default selected row).
    expect(screen.getAllByText('alice').length).toBeGreaterThan(0);
    expect(screen.getAllByText('bob').length).toBeGreaterThan(0);
    // The first conversation is selected by default (alice).
    expect(screen.getAllByText(/Hi from alice/).length).toBeGreaterThan(0);
    // Click the listbox row for bob — there are multiple "bob" matches (list +
    // right pane header after switch), so click the one inside the listbox.
    const bobRow = screen.getAllByText('bob')[0].closest('[role="option"]') as HTMLElement;
    fireEvent.click(bobRow);
    expect(screen.getAllByText(/Reply from me/).length).toBeGreaterThan(0);
  });

  it('subscribes to the user message channel on WebSocket open', () => {
    render(<Providers args={{ selfUid: 1, messages: {} }}><HomeMessagesPage /></Providers>);
    expect(FakeWebSocket.instances).toHaveLength(1);
    const ws = FakeWebSocket.instances[0];
    // Re-fire onopen — the hook assigns it after the constructor returns.
    ws.onopen?.();
    expect(ws.sent).toHaveLength(1);
    const frame = JSON.parse(ws.sent[0]);
    expect(frame.operation).toBe('subscribe');
    expect(frame.credential).toBe('session-abc');
    expect(frame.channels).toEqual(['message:1']);
  });

  it('appends a live message event and auto-selects the new conversation', async () => {
    render(<Providers args={{ selfUid: 1, messages: {} }}><HomeMessagesPage /></Providers>);
    // Mock Date.now for the optimistic message id so the assertion is stable.
    const ws = FakeWebSocket.instances[0]!;
    await act(async () => {
      ws.emitServerEvent({
        udoc: { _id: 9, uname: 'carol' },
        mdoc: { _id: 'live-1', from: 9, to: 1, content: 'first ping' },
      });
    });
    // The new conversation should appear + become selected.
    await waitFor(
      () => expect(screen.getAllByText('carol').length).toBeGreaterThan(0),
      { timeout: 1500 },
    );
    expect(screen.getAllByText(/first ping/).length).toBeGreaterThan(0);
  });

  it('sends a message: POST /home/messages then optimistically appends', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch').mockImplementation(async () => ({
      ok: true, status: 200,
      headers: { get: () => '' },
      clone() { return this; },
      json: async () => undefined,
      text: async () => '',
    } as unknown as Response));
    const messages = { 7: sampleConversation(7, 'alice', ['prior message']) };
    render(<Providers args={{ selfUid: 1, messages }}><HomeMessagesPage /></Providers>);

    // Type a message into the form, submit.
    const input = screen.getByPlaceholderText(/输入消息|Type a message/i);
    fireEvent.change(input, { target: { value: 'hello back' } });
    const form = input.closest('form')!;
    await act(async () => {
      fireEvent.submit(form);
    });

    // The fetch call should have been a POST to /home/messages with uid=7 and
    // the typed content (RouterProvider mounts a JSON fetch on its own, so we
    // filter for the form-submission call).
    const formCall = fetchSpy.mock.calls.find(([u]) => u === '/home/messages');
    expect(formCall).toBeDefined();
    const [, init] = formCall!;
    expect((init as RequestInit).method).toBe('POST');
    expect(String((init as RequestInit).body)).toContain('uid=7');
    expect(String((init as RequestInit).body)).toContain('hello+back');

    // The optimistic message should appear in the right pane.
    await waitFor(() => expect(screen.getAllByText(/hello back/).length).toBeGreaterThan(0));
  });
});
