/* @vitest-environment happy-dom */
import {
  fireEvent, render, screen,
} from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { type PageData, PageDataProvider, useSetPageData } from '../context/page-data';
import { RouterProvider } from '../context/router';
import { routeMapStore } from '../globals';
import { ThemeProvider } from '../theme/ThemeProvider';
import ProblemSubmitPage from './problem_submit';

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

  it('renders language options from the server language map', () => {
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

    expect(screen.getByRole('option', { name: 'C++' })).toHaveValue('cpp');
    expect(screen.getByRole('option', { name: 'Python 3' })).toHaveValue('python');
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
    expect(document.querySelector('textarea[name="code"]')).toBeTruthy();
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

  it('resets native form fields when pdoc changes in the same page slot', () => {
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

    const code = document.querySelector<HTMLTextAreaElement>('textarea[name="code"]')!;
    code.value = 'old code';
    fireEvent.click(screen.getByRole('button', { name: 'next problem' }));
    expect(document.querySelector<HTMLTextAreaElement>('textarea[name="code"]')?.value).toBe('');
  });
});
