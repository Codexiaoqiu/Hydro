/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../components/primitives';
import { type PageData, PageDataProvider } from '../context/page-data';
import { RouterProvider } from '../context/router';
import ProblemEditPage from './problem_edit';

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

function buildPageData(args: PageData['args']): PageData {
  return { name: 'problem_edit', template: '', url: '/', args };
}

function renderWith(args: PageData['args']) {
  return render(
    <PageDataProvider initial={buildPageData(args)}>
      <RouterProvider>
        <ToastProvider>
          <ProblemEditPage />
        </ToastProvider>
      </RouterProvider>
    </PageDataProvider>,
  );
}

describe('problem_edit page', () => {
  it('renders ProblemForm with pdoc and statementLangs', () => {
    renderWith({
      pdoc: { docId: 1, pid: 'p1', title: 'Sample' },
      statementLangs: ['zh_CN', 'en'],
      UserContext: { _id: 1, perm: 0 },
      UiContext: {},
    });
    expect(screen.getByRole('textbox', { name: /标题|title/i })).toBeInTheDocument();
  });

  it('hides delete button when canDelete is false', () => {
    renderWith({
      pdoc: { docId: 1, pid: 'p1', title: 'Sample', owner: 999 },
      statementLangs: ['zh_CN', 'en'],
      UserContext: { _id: 1, perm: 0 },
      UiContext: {},
    });
    expect(screen.queryByRole('button', { name: /删除|delete/i })).not.toBeInTheDocument();
  });
});
