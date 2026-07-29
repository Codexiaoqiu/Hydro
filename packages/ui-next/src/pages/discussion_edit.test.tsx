/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../components/primitives/Toast';
import { type PageData, PageDataProvider } from '../context/page-data';
import { RouterProvider } from '../context/router';
import { routeMapStore } from '../globals';
import { ThemeProvider } from '../theme/ThemeProvider';
import DiscussionEdit from './discussion_edit';

vi.mock('../lib/i18n', () => ({
  useTranslate: () => (key: string, args?: Record<string, unknown>) => {
    if (!args) return key;
    return key.replace(/\{(\w+)\}/g, (_, k) => String(args[k] ?? `{${k}}`));
  },
}));

function build(args: Partial<PageData['args']>, user: any): PageData {
  return {
    name: 'discussion_edit',
    template: 'discussion_edit.html',
    args: { UserContext: user, UiContext: {}, ...args } as any,
    url: '/d/1/edit',
  };
}
function Providers({ args, user, children }: any) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <PageDataProvider initial={build(args, user)}>
          <RouterProvider>{children}</RouterProvider>
        </PageDataProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

describe('discussionEdit', () => {
  beforeEach(() => {
    routeMapStore.set({
      discussion_edit: '/d/:did/edit',
      discussion_detail: '/d/:did',
    });
  });
  afterEach(() => vi.restoreAllMocks());

  it('renders the title and content prefilled', () => {
    render(
      <Providers
        args={{ ddoc: { _id: 'd1', docId: 1, title: 'edit me', content: 'init body', highlight: true, pin: false } }}
        user={{ _id: 1, hasPerm: () => true, own: () => true }}
      >
        <DiscussionEdit />
      </Providers>,
    );
    expect(screen.getByDisplayValue('edit me')).toBeInTheDocument();
  });

  it('hides Delete button when user lacks permission', () => {
    render(
      <Providers
        args={{ ddoc: { _id: 'd1', docId: 1, title: 'x', content: 'y' } }}
        user={{
          _id: 2,
          hasPerm: (p: bigint) => p !== (1n << 32n) && p !== (1n << 33n),
          own: () => false,
        }}
      >
        <DiscussionEdit />
      </Providers>,
    );
    expect(screen.queryByRole('button', { name: /删除/ })).toBeNull();
  });

  it('shows Delete button when user is owner and holds PERM_DELETE_DISCUSSION_SELF', () => {
    render(
      <Providers
        args={{ ddoc: { _id: 'd1', docId: 1, title: 'x', content: 'y' } }}
        user={{
          _id: 1,
          hasPerm: (p: bigint) => p === (1n << 33n),
          own: (doc: any) => doc._id === 'd1',
        }}
      >
        <DiscussionEdit />
      </Providers>,
    );
    expect(screen.getByRole('button', { name: /删除/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /删除/ }).className).toMatch(/danger/);
  });

  it('hides Delete button for owner who lacks PERM_DELETE_DISCUSSION_SELF', () => {
    // I3 fix: owner-only path requires the dedicated self-delete perm.
    render(
      <Providers
        args={{ ddoc: { _id: 'd1', docId: 1, title: 'x', content: 'y' } }}
        user={{
          _id: 1,
          hasPerm: (p: bigint) => p === (1n << 32n),
          own: (doc: any) => doc._id === 'd1',
        }}
      >
        <DiscussionEdit />
      </Providers>,
    );
    expect(screen.queryByRole('button', { name: /删除/ })).toBeNull();
  });

  it('shows Delete button for non-owner admin who holds PERM_DELETE_DISCUSSION', () => {
    render(
      <Providers
        args={{ ddoc: { _id: 'd1', docId: 1, title: 'x', content: 'y' } }}
        user={{
          _id: 99,
          hasPerm: (p: bigint) => p === (1n << 32n),
          own: () => false,
        }}
      >
        <DiscussionEdit />
      </Providers>,
    );
    expect(screen.getByRole('button', { name: /删除/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /删除/ }).className).toMatch(/danger/);
  });
});
