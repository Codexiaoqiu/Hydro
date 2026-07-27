/* @vitest-environment happy-dom */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type PageData, PageDataProvider } from '../context/page-data';
import * as routerMod from '../context/router';
import RecordMainPage from './record_main';

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  url: string;
  listeners: Record<string, Array<(ev: { data: string }) => void>> = {};
  closed = false;
  constructor(url: string) { this.url = url; FakeEventSource.instances.push(this); }
  addEventListener(name: string, cb: (ev: { data: string }) => void) { (this.listeners[name] ||= []).push(cb); }
  close() { this.closed = true; }
  emit(name: string, data: unknown) { for (const cb of this.listeners[name] || []) cb({ data: JSON.stringify(data) }); }
}

function makePageData(args: Record<string, unknown> = {}): PageData {
  return {
    name: 'record_main',
    template: 'record_main.html',
    url: '/record',
    args: {
      UserContext: { viewLang: 'zh_CN', _id: 1 },
      UiContext: {},
      rdocs: [],
      udict: {},
      filter: { uidOrName: '', pid: '', language: '', status: '', all: false, allDomain: false },
      languages: [],
      ...args,
    } as unknown as PageData['args'],
  };
}

function Providers({ args, children }: { args: Record<string, unknown>, children: ReactNode }) {
  return (
    <PageDataProvider initial={makePageData(args)}>{children}</PageDataProvider>
  );
}

beforeEach(() => {
  FakeEventSource.instances = [];
  vi.stubGlobal('EventSource', FakeEventSource as unknown as typeof EventSource);
  vi.spyOn(routerMod, 'useNavigate').mockImplementation(
    () => vi.fn().mockResolvedValue(undefined) as unknown as (url: string) => Promise<void>,
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('record_main', () => {
  it('renders the empty-state row when rdocs is empty', () => {
    render(<Providers args={{ rdocs: [] }}><RecordMainPage /></Providers>);
    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();
    // i18n key RecordMain.NoSubmissions:
    //   zh_CN → "没有符合筛选条件的提交记录。"
    //   en    → "No submissions match the filter."
    expect(screen.getAllByText(/没有符合筛选条件|No submissions match/).length).toBeGreaterThan(0);
  });

  it('renders a row per record with uid, pid, lang, status, score, judge time', () => {
    const rdocs = [
      { _id: 'r1', uid: 7, pid: 'P1', status: 0, score: 100, lang: 'cpp', judgeAt: Date.UTC(2026, 6, 24, 12, 0, 0) },
      { _id: 'r2', uid: 8, pid: 'P2', status: 1, score: 80, lang: 'py', judgeAt: Date.UTC(2026, 6, 24, 12, 1, 0) },
    ];
    render(<Providers args={{
      rdocs,
      udict: { 7: { uname: 'alice' }, 8: { uname: 'bob' } },
    }}><RecordMainPage /></Providers>);
    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.getByText('bob')).toBeInTheDocument();
    expect(screen.getAllByText('cpp').length).toBeGreaterThan(0);
    expect(screen.getAllByText('py').length).toBeGreaterThan(0);
  });

  it('prefills the filter form from `args.filter`', () => {
    render(<Providers args={{
      filter: { uidOrName: 'alice', pid: 'P1', language: 'cpp', status: '0', all: false, allDomain: false },
    }}><RecordMainPage /></Providers>);
    // i18n placeholder for the user field is "用户 ID 或用户名" / "uid or name".
    // The problem field placeholder is "P1000" (a hint, not a label).
    expect((screen.getByPlaceholderText(/用户 ID 或用户名|uid or name/i) as HTMLInputElement).value).toBe('alice');
    expect((screen.getByPlaceholderText('P1000') as HTMLInputElement).value).toBe('P1');
  });

  it('merges SSE updates into the matching row without re-fetching', async () => {
    const rdocs = [{ _id: 'r1', uid: 7, pid: 'P1', status: 20, score: 0, lang: 'cpp', judgeAt: 0 }];
    render(<Providers args={{ rdocs }}><RecordMainPage /></Providers>);
    await waitFor(() => expect(FakeEventSource.instances.length).toBeGreaterThan(0));

    act(() => {
      FakeEventSource.instances.at(-1)!.emit('update', { rid: 'r1', status: 0, score: 100 });
    });

    expect(await screen.findByText(/100/)).toBeInTheDocument();
  });

  it('submits the filter form by calling useNavigate with a query string', async () => {
    const navigate = vi.fn().mockResolvedValue(undefined);
    vi.mocked(routerMod.useNavigate).mockImplementation(
      () => navigate as unknown as (url: string) => Promise<void>,
    );
    render(<Providers args={{
      filter: { uidOrName: '', pid: '', language: '', status: '', all: false, allDomain: false },
    }}><RecordMainPage /></Providers>);

    const userInput = screen.getByPlaceholderText(/用户 ID 或用户名|uid or name/i);
    fireEvent.change(userInput, { target: { value: 'alice' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Filter|筛选/ }));
    });

    expect(navigate).toHaveBeenCalledOnce();
    const called = String(navigate.mock.calls[0][0]);
    expect(called).toContain('uidOrName=alice');
  });
});
