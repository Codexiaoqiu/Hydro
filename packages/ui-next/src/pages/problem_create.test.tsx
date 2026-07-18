/* @vitest-environment happy-dom */
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../components/primitives';
import { type PageData, PageDataProvider } from '../context/page-data';
import { RouterProvider } from '../context/router';
import ProblemCreatePage from './problem_create';

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
  return { name: 'problem_create', template: '', url: '/', args };
}

describe('problem_create page', () => {
  it('renders empty ProblemForm', async () => {
    render(
      <PageDataProvider initial={buildPageData({ statementLangs: ['zh_CN', 'en'], UserContext: { _id: 1 }, UiContext: {} })}>
        <RouterProvider>
          <ToastProvider>
            <ProblemCreatePage />
          </ToastProvider>
        </RouterProvider>
      </PageDataProvider>,
    );
    expect(screen.getByRole('textbox', { name: /标题|title/i })).toBeInTheDocument();
  });

  it('renders live preview pane', async () => {
    render(
      <PageDataProvider initial={buildPageData({ statementLangs: ['zh_CN', 'en'], UserContext: { _id: 1 }, UiContext: {} })}>
        <RouterProvider>
          <ToastProvider>
            <ProblemCreatePage />
          </ToastProvider>
        </RouterProvider>
      </PageDataProvider>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('markdown-preview-placeholder')).toBeInTheDocument();
    });
  });
});
