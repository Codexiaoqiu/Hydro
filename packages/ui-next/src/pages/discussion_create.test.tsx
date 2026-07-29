/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../components/primitives/Toast';
import { type PageData, PageDataProvider } from '../context/page-data';
import { RouterProvider } from '../context/router';
import { routeMapStore } from '../globals';
import { TYPE_CONTEST, TYPE_PROBLEM } from '../lib/document-types';
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

// Mock Monaco so the Suspense fallback (a real textarea) is what's rendered.
// Without this, the Editor lazy-loads and the content field is empty, which
// keeps the submit button disabled and our submit-action assertion moot.
vi.mock('@monaco-editor/react', () => ({
  Editor: (props: {
    value?: string;
    onChange?: (v: string | undefined) => void;
    onMount?: (editor: unknown, monaco: unknown) => void;
  }) => {
    props.onMount?.(
      {
        addAction: vi.fn(),
        addCommand: vi.fn(),
        onDidPaste: vi.fn(),
        trigger: vi.fn(),
      },
      { KeyMod: { CtrlCmd: 1 }, KeyCode: { Enter: 2 } },
    );
    return (
      <textarea
        aria-label="content"
        data-testid="editor-source"
        value={props.value ?? ''}
        onChange={(e) => props.onChange?.(e.currentTarget.value)}
      />
    );
  },
  loader: { config: vi.fn() },
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

  it('posts the form to /discuss/node/:name/create for a generic node', async () => {
    // C1/C2 fix: the submit handler must target `discussion_create` (not
    // `discussion_node`, which only handles GET) with type/name derived from
    // the vnode.
    const user = userEvent.setup();
    const submitSpy = vi.fn();
    const realCreate = HTMLFormElement.prototype.submit;
    HTMLFormElement.prototype.submit = function () { submitSpy(this.action); };
    try {
      render(<Providers args={{
        path: [['discussion_main', 'discussion_main']],
        vnode: { _id: 'n1', title: 'Help', type: 4 },
      }}>
        <DiscussionCreate />
      </Providers>);
      await user.type(screen.getByLabelText('标题'), 'A new topic');
      await user.type(screen.getByTestId('editor-source'), 'Some body text');
      await user.click(screen.getByRole('button', { name: /发布|Ctrl\+Enter/ }));
      expect(submitSpy).toHaveBeenCalled();
      const action = submitSpy.mock.calls[0]?.[0] as string | undefined;
      expect(action).toBeDefined();
      expect(action).toMatch(/\/discuss\/node\/n1\/create$/);
      expect(action).not.toMatch(/\/discuss\/node\/n1$/);
    } finally {
      HTMLFormElement.prototype.submit = realCreate;
    }
  });

  it('derives type=problem and name=docId when vnode.type is TYPE_PROBLEM (canonical 10)', async () => {
    // Uses the symbolic constant so the test fails if anyone re-introduces
    // a wrong literal `type: 1`.
    expect(TYPE_PROBLEM).toBe(10);
    const user = userEvent.setup();
    const submitSpy = vi.fn();
    const realCreate = HTMLFormElement.prototype.submit;
    HTMLFormElement.prototype.submit = function () { submitSpy(this.action); };
    try {
      render(<Providers args={{
        path: [['discussion_main', 'discussion_main']],
        vnode: { _id: 'mongoobjid42', id: 42, docId: 42, title: 'P-42', type: TYPE_PROBLEM },
      }}>
        <DiscussionCreate />
      </Providers>);
      await user.type(screen.getByLabelText('标题'), 'Problem topic');
      await user.type(screen.getByTestId('editor-source'), 'Problem body');
      await user.click(screen.getByRole('button', { name: /发布|Ctrl\+Enter/ }));
      const action = submitSpy.mock.calls[0]?.[0] as string | undefined;
      expect(action).toBeDefined();
      expect(action).toMatch(/\/discuss\/problem\/42\/create$/);
      // Regression: must NOT fall through to /discuss/node/... .
      expect(action).not.toMatch(/\/discuss\/node\//);
    } finally {
      HTMLFormElement.prototype.submit = realCreate;
    }
  });

  it('derives type=contest and name=id when vnode.type is TYPE_CONTEST (canonical 30)', async () => {
    expect(TYPE_CONTEST).toBe(30);
    const user = userEvent.setup();
    const submitSpy = vi.fn();
    const realCreate = HTMLFormElement.prototype.submit;
    HTMLFormElement.prototype.submit = function () { submitSpy(this.action); };
    try {
      render(<Providers args={{
        path: [['discussion_main', 'discussion_main']],
        vnode: { _id: 'cid', id: 'cid', title: 'Contest-X', type: TYPE_CONTEST },
      }}>
        <DiscussionCreate />
      </Providers>);
      await user.type(screen.getByLabelText('标题'), 'Contest topic');
      await user.type(screen.getByTestId('editor-source'), 'Contest body');
      await user.click(screen.getByRole('button', { name: /发布|Ctrl\+Enter/ }));
      const action = submitSpy.mock.calls[0]?.[0] as string | undefined;
      expect(action).toBeDefined();
      expect(action).toMatch(/\/discuss\/contest\/cid\/create$/);
      expect(action).not.toMatch(/\/discuss\/node\//);
    } finally {
      HTMLFormElement.prototype.submit = realCreate;
    }
  });
});
