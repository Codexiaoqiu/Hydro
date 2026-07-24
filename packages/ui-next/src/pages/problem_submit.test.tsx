/* @vitest-environment happy-dom */
import {
  fireEvent, render, screen,
} from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type PageData, PageDataProvider, useSetPageData } from '../context/page-data';
import { RouterProvider } from '../context/router';
import { routeMapStore } from '../globals';
import { ThemeProvider } from '../theme/ThemeProvider';
import ProblemSubmitPage from './problem_submit';

vi.mock('@monaco-editor/react', () => ({
  Editor: (props: { value?: string, onChange?: (v: string | undefined) => void }) => (
    <textarea
      data-testid="monaco-stub"
      value={props.value ?? ''}
      onChange={(e) => props.onChange?.(e.currentTarget.value)}
    />
  ),
  loader: { config: vi.fn() },
}));

// Stub idb-keyval so the persisted-draft hook can mount under happy-dom
// (which does not implement IndexedDB). A small per-test in-memory map
// keeps the behaviour observable without leaking state across tests.
const idbStore = new Map<string, string>();
vi.mock('idb-keyval', () => ({
  get: (k: string) => Promise.resolve(idbStore.get(k)),
  set: (k: string, v: string) => {
    idbStore.set(k, v);
    return Promise.resolve();
  },
  del: (k: string) => {
    idbStore.delete(k);
    return Promise.resolve();
  },
}));

const defaultArgs = {
  pdoc: {
    docId: 3,
    pid: 'P1000',
    title: 'A+B',
    config: { type: 'default', langs: ['cc.cc17', 'py'] },
  },
  langRange: { 'cc.cc17': 'C++17', py: 'Python' },
  langs: {
    cc: { display: 'C++', pretest: 'cc.cc17' },
    'cc.cc17': { display: 'C++17' },
    py: { display: 'Python' },
  },
  discussionCount: 0,
  solutionCount: 0,
  mode: 'normal' as const,
  UserContext: { _id: 2, codeLang: 'cc.cc17' },
  UiContext: {},
};

function buildPageData(args: PageData['args']): PageData {
  return {
    name: 'problem_submit',
    template: 'problem_submit.html',
    args,
    url: '/p/P1000/submit',
  };
}

function Providers({ args, children }: { args: PageData['args'], children: ReactNode }) {
  return (
    <ThemeProvider>
      <PageDataProvider initial={buildPageData(args)}>
        <RouterProvider>{children}</RouterProvider>
      </PageDataProvider>
    </ThemeProvider>
  );
}

function renderPage(args: PageData['args'] = defaultArgs) {
  return render(
    <Providers args={args}>
      <ProblemSubmitPage />
    </Providers>,
  );
}

function renderProviders(args: PageData['args'] = defaultArgs, children: ReactNode) {
  return render(
    <Providers args={args}>{children}</Providers>,
  );
}

describe('problem_submit page', () => {
  beforeEach(() => {
    routeMapStore.set({
      problem_submit: '/p/:pid/submit',
      problem_detail: '/p/:pid',
    });
  });

  it('renders language options from the server language map', async () => {
    const user = (await import('@testing-library/user-event')).default.setup();
    renderPage({
      pdoc: {
        docId: 1,
        pid: 'P1000',
        title: 'Sum',
        config: { type: 'default', langs: ['cpp', 'python'] },
      },
      langRange: { cpp: 'C++', python: 'Python 3' },
      langs: {
        cpp: { display: 'C++', pretest: 'cpp' },
        python: { display: 'Python 3', pretest: 'python' },
      },
      discussionCount: 0,
      solutionCount: 0,
      mode: 'normal',
      UserContext: { _id: 1, codeLang: 'cpp' },
      UiContext: {},
    });

    const trigger = screen.getByRole('button', { name: '语言' });
    await user.click(trigger);
    expect(screen.getByRole('option', { name: 'C++' })).toHaveTextContent('C++');
    expect(screen.getByRole('option', { name: 'Python 3' })).toHaveTextContent('Python 3');
  });

  it('renders a native multipart POST form without overriding the current URL', () => {
    renderPage();
    const form = document.querySelector('form')!;
    expect(form.getAttribute('method')?.toLowerCase()).toBe('post');
    expect(form.getAttribute('enctype')).toBe('multipart/form-data');
    expect(form.hasAttribute('action')).toBe(false);
  });

  it('renders legacy code and file field names without pretest fields', () => {
    renderPage();
    // code is now a hidden input synced from CodeEditor onChange
    expect(document.querySelector('input[type="hidden"][name="code"]')).toBeTruthy();
    expect(document.querySelector('input[type="file"][name="file"]')).toBeTruthy();
    expect(document.querySelector('[name="pretest"], [name="input"]')).toBeNull();
  });

  it('uses UserContext.codeLang for the initial submitted language', () => {
    renderPage({
      ...defaultArgs,
      UserContext: { _id: 2, codeLang: 'py' },
    });
    expect(document.querySelector<HTMLInputElement>('input[name="lang"]')?.value).toBe('py');
  });

  it('submit_answer fixes lang to underscore and hides language controls and hint', () => {
    renderPage({
      ...defaultArgs,
      pdoc: {
        ...defaultArgs.pdoc,
        config: { type: 'submit_answer', langs: ['_'] },
      },
      langRange: { _: '_' },
      langs: { _: { display: '_' } },
    });
    expect(document.querySelector<HTMLInputElement>('input[name="lang"]')?.value).toBe('_');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });

  it('renders the shared problem sidebar menu', () => {
    renderPage();
    expect(screen.getByRole('complementary')).toBeInTheDocument();
  });

  it('renders the ObjectiveForm for objective problems and hides the code editor + language picker', () => {
    renderPage({
      ...defaultArgs,
      pdoc: {
        ...defaultArgs.pdoc,
        config: {
          type: 'objective',
          subType: 'single',
          choices: [
            { id: 'q1', type: 'single', label: 'Pick one', options: ['A', 'B', 'C'] },
          ],
        },
      },
      langRange: { _: '_' },
      langs: { _: { display: '_' } },
    });
    // The objective form is mounted with the expected question label.
    expect(screen.getByText('Pick one')).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    // Code editor + file upload are suppressed for objective problems.
    expect(document.querySelector('[data-testid="monaco-stub"]')).toBeNull();
    expect(document.querySelector('input[type="file"][name="file"]')).toBeNull();
    // Hidden lang input still pins to `_` like submit_answer.
    expect(document.querySelector<HTMLInputElement>('input[name="lang"]')?.value).toBe('_');
  });

  it('objective form submits a YAML-encoded payload in the content field', async () => {
    const yaml = (await import('js-yaml')).default;
    renderPage({
      ...defaultArgs,
      pdoc: {
        ...defaultArgs.pdoc,
        config: {
          type: 'objective',
          subType: 'single',
          choices: [
            { id: 'q1', type: 'single', label: 'Pick one', options: ['A', 'B', 'C'] },
          ],
        },
      },
      langRange: { _: '_' },
      langs: { _: { display: '_' } },
    });
    const input = document.querySelector<HTMLInputElement>('input[value="B"]')!;
    fireEvent.click(input);
    // The submit button label is i18n'd; in zh_CN it is "提交", in en it is "Submit".
    fireEvent.click(screen.getByRole('button', { name: /提交|submit/i }));
    const content = document.querySelector<HTMLInputElement>('input[name="content"]')?.value;
    expect(content).toBeDefined();
    // YAML serialization should round-trip back to the same object.
    expect(yaml.load(content!)).toEqual({ q1: 'B' });
  });

  it('resets the code editor and hidden input when pdoc changes in the same page slot', () => {
    function NavigateToSecondProblem({ next }: { next: PageData }) {
      const setPageData = useSetPageData();
      return (
        <button
          type="button"
          onClick={() => setPageData(next)}
        >
          next problem
        </button>
      );
    }

    const secondPage = buildPageData({
      ...defaultArgs,
      pdoc: { ...defaultArgs.pdoc, docId: 4, pid: 'P1001', title: 'Second' },
    });

    renderProviders(defaultArgs, (
      <>
        <ProblemSubmitPage />
        <NavigateToSecondProblem next={secondPage} />
      </>
    ));

    // Simulate typing code into the Monaco stub textarea (CodeEditor uses
    // Monaco internally; the stub renders a textarea so we can change its
    // value the same way a user would). The hidden input is kept in sync
    // by the CodeEditor's onChange -> setCode handler.
    const editor = screen.getByTestId('monaco-stub') as HTMLTextAreaElement;
    fireEvent.change(editor, { target: { value: 'old code' } });
    expect(document.querySelector<HTMLInputElement>('input[type="hidden"][name="code"]')?.value).toBe('old code');

    fireEvent.click(screen.getByRole('button', { name: 'next problem' }));

    // <form key={formKey}> remount causes CodeEditor (and its stub textarea)
    // to be torn down and re-mounted, clearing the controlled value.
    expect((screen.getByTestId('monaco-stub') as HTMLTextAreaElement).value).toBe('');
    expect(document.querySelector<HTMLInputElement>('input[type="hidden"][name="code"]')?.value).toBe('');
  });
});