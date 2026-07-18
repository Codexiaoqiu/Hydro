/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { type PageData, PageDataProvider } from '../context/page-data';
import { RouterProvider } from '../context/router';
import { ToastProvider } from '../components/primitives';
import ProblemCreatePage from './problem_create';

vi.mock('@monaco-editor/react', () => ({
  Editor: (props: { value?: string; onChange?: (v: string | undefined) => void }) => (
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
  test('renders empty ProblemForm', () => {
    render(
      <PageDataProvider initial={buildPageData({ statementLangs: ['zh_CN', 'en'], UserContext: { _id: 1 }, UiContext: {} })}>
        <RouterProvider>
          <ToastProvider>
            <ProblemCreatePage />
          </ToastProvider>
        </RouterProvider>
      </PageDataProvider>
    );
    expect(screen.getByRole('textbox', { name: /标题|title/i })).toBeInTheDocument();
  });
});