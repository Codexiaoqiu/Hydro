/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../components/primitives/Toast';
import { type PageData, PageDataProvider } from '../context/page-data';
import { RouterProvider } from '../context/router';
import { routeMapStore } from '../globals';
import { ThemeProvider } from '../theme/ThemeProvider';
import UserDetail from './user_detail';

function build(args: Partial<PageData['args']> = {}): PageData {
  return {
    name: 'user_detail',
    template: 'user_detail.html',
    args: {
      UserContext: { _id: 1, hasPerm: () => false },
      UiContext: {},
      ...args,
    } as any,
    url: '/user/1',
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

describe('userDetail', () => {
  beforeEach(() => {
    routeMapStore.set({ user_detail: '/user/:uid', home_settings: '/home/settings/:category' });
  });
  afterEach(() => vi.restoreAllMocks());

  it('renders the username', () => {
    render(<Providers args={{
      isSelfProfile: false,
      udoc: { _id: 7, uname: 'alice', avatar: '', bio: 'loves cats', nSubmit: 10, nAccept: 5, nLiked: 2 },
      sdoc: undefined, pdocs: [], tags: [],
    }}>
      <UserDetail />
    </Providers>);
    expect(screen.getByRole('heading', { name: 'alice' })).toBeInTheDocument();
  });

  it('renders the bio tab content', () => {
    render(<Providers args={{
      isSelfProfile: true,
      udoc: { _id: 7, uname: 'alice', avatar: '', bio: 'loves cats', nSubmit: 10, nAccept: 5, nLiked: 2 },
      sdoc: undefined, pdocs: [], tags: [],
    }}>
      <UserDetail />
    </Providers>);
    expect(screen.getByText('loves cats')).toBeInTheDocument();
  });

  it('renders the accepted problems tab when pdocs is non-empty', () => {
    render(<Providers args={{
      isSelfProfile: false,
      udoc: { _id: 7, uname: 'alice', avatar: '', nSubmit: 1, nAccept: 1, nLiked: 0 },
      sdoc: undefined, pdocs: [{ docId: 1001, title: 'A+B', pid: '1001' }], tags: [],
    }}>
      <UserDetail />
    </Providers>);
    expect(screen.getByRole('tab', { name: /通过的题目/ })).toBeInTheDocument();
  });

  it('renders the user stat tiles', () => {
    render(<Providers args={{
      isSelfProfile: false,
      udoc: { _id: 7, uname: 'alice', avatar: '', bio: '', nSubmit: 10, nAccept: 5, nLiked: 2 },
      sdoc: undefined, pdocs: [], tags: [],
    }}>
      <UserDetail />
    </Providers>);
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  // --- Finding 3: account-switch link ---------------------------------
  // The link to /account/:uid must be visible only for admins (those with
  // PRIV_EDIT_SYSTEM) viewing a *different* user's profile. It must NOT
  // appear for the user themselves or for non-admin viewers.
  it('hides the account-switch link for non-admin viewers', () => {
    render(<Providers args={{
      isSelfProfile: false,
      // Non-admin: hasPerm/hasPriv return false for every mask.
      UserContext: { _id: 1, hasPerm: () => false, hasPriv: () => false, priv: 0 },
      udoc: { _id: 7, uname: 'alice', avatar: '', bio: '', nSubmit: 0, nAccept: 0, nLiked: 0 },
      sdoc: undefined, pdocs: [], tags: [],
    }}>
      <UserDetail />
    </Providers>);
    expect(screen.queryByTestId('account-switch-link')).toBeNull();
  });

  it('hides the account-switch link on the user\'s own profile even for admins', () => {
    // Admin viewing their own profile — self-switch is meaningless.
    render(<Providers args={{
      isSelfProfile: true,
      UserContext: { _id: 7, hasPerm: () => true, hasPriv: () => true, priv: 1 },
      udoc: { _id: 7, uname: 'admin', avatar: '', bio: '', nSubmit: 0, nAccept: 0, nLiked: 0 },
      sdoc: undefined, pdocs: [], tags: [],
    }}>
      <UserDetail />
    </Providers>);
    expect(screen.queryByTestId('account-switch-link')).toBeNull();
  });

  it('shows the account-switch link to admins viewing another user', () => {
    // Admin (_id: 1) viewing user 7. priv: 1 = PRIV_EDIT_SYSTEM.
    render(<Providers args={{
      isSelfProfile: false,
      UserContext: { _id: 1, hasPerm: () => true, hasPriv: (p: number) => p === 1, priv: 1 },
      udoc: { _id: 7, uname: 'alice', avatar: '', bio: '', nSubmit: 0, nAccept: 0, nLiked: 0 },
      sdoc: undefined, pdocs: [], tags: [],
    }}>
      <UserDetail />
    </Providers>);
    const link = screen.getByTestId('account-switch-link');
    expect(link).toBeInTheDocument();
    expect(link.getAttribute('href')).toBe('/account/7');
  });
});
