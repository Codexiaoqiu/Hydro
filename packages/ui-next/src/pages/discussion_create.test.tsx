/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../components/primitives/Toast';
import { type PageData, PageDataProvider } from '../context/page-data';
import { RouterProvider } from '../context/router';
import { routeMapStore } from '../globals';
import { ThemeProvider } from '../theme/ThemeProvider';
import DiscussionCreate from './discussion_create';

// `lib/i18n.ts` currently has unresolved conflict markers in the working tree
// (pre-existing baseline acknowledged in CLAUDE.md), so mock it to avoid the
// oxc parser failing the whole transform.
vi.mock('../lib/i18n', () => ({
  useTranslate: () => (key: string, args?: Record<string, unknown>) => {
    if (!args) return key;
    return key.replace(/\{(\w+)\}/g, (_, k) => String(args[k] ?? `{${k}}`));
  },
}));

function build(args: Partial<PageData['args']> = {}): PageData {
  return {
    name: 'discussion_create',
    template: 'discussion_create.html',
    args: {
      UserContext: { _id: 1, hasPerm: () => true, hasPriv: () => true },
      UiContext: {},
      ...args,
    } as any,
    url: '/discuss/node/n1/create',
  };
}

function Providers({ args, children }: any) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <PageDataProvider initial={build(args)}>
          <RouterProvider>{children}</RouterProvider>
        </PageDataProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

describe('discussionCreate', () => {
  beforeEach(() => {
    routeMapStore.set({
      discussion_node: '/discuss/:type/:name',
      discussion_main: '/discuss',
      discussion_create: '/discuss/:type/:name/create',
    });
  });
  afterEach(() => vi.restoreAllMocks());

  it('renders the vnode title heading and discussion form title input', () => {
    render(<Providers args={{
      path: [['Hydro', 'homepage'], ['discussion_main', 'discussion_main']],
      vnode: { _id: 'n1', title: 'Help', type: 4 },
    }}>
      <DiscussionCreate />
    </Providers>);
    expect(screen.getByRole('heading', { name: /Create Discussion in Help/ })).toBeInTheDocument();
    // DiscussionForm renders an empty title Input by default
    expect(screen.getByLabelText('标题')).toBeInTheDocument();
  });
});