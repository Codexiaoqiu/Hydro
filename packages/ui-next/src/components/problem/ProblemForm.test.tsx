import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type PageData, PageDataProvider } from '../../context/page-data';
import { RouterProvider } from '../../context/router';
import { ToastProvider } from '../primitives';
import { ProblemForm } from './ProblemForm';

let ctrlEnterCommand: (() => void) | undefined;

vi.mock('@monaco-editor/react', () => ({
  Editor: (props: {
    value?: string,
    onChange?: (v: string | undefined) => void,
    onMount?: (editor: unknown, monaco: unknown) => void,
  }) => {
    props.onMount?.({
      addAction: vi.fn(),
      addCommand: (_keybinding: number, handler: () => void) => {
        ctrlEnterCommand = handler;
      },
      onDidPaste: vi.fn(),
    }, { KeyMod: { CtrlCmd: 1 }, KeyCode: { Enter: 2 } });
    return (
      <textarea
        data-testid="monaco-stub"
        value={props.value ?? ''}
        onChange={(e) => props.onChange?.(e.currentTarget.value)}
      />
    );
  },
  loader: { config: vi.fn() },
}));

function buildPageData(args: PageData['args']): PageData {
  return {
    name: 'problem_edit',
    template: '',
    url: '/',
    args,
  };
}

function renderForm(props: Partial<ComponentProps<typeof ProblemForm>> = {}) {
  const defaultProps = {
    pageName: 'problem_edit' as const,
    pdoc: { docId: 1, pid: 'p1', title: 'Test', hidden: false },
    statementLangs: ['zh_CN', 'en'],
    canDelete: true,
    isReference: false,
  };
  return render(
    <PageDataProvider initial={buildPageData({ UserContext: { _id: 1 }, UiContext: {} })}>
      <RouterProvider>
        <ToastProvider>
          <ProblemForm {...defaultProps} {...props} />
        </ToastProvider>
      </RouterProvider>
    </PageDataProvider>,
  );
}

describe('problemForm', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('shows title required error when title empty', async () => {
    renderForm({ pdoc: { docId: 1, pid: 'p1', title: '' } });
    const titleInput = screen.getByRole('textbox', { name: /标题|title/i }) as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /更新|update|save/i }));
    await waitFor(() => {
      expect(screen.getByText(/标题不能为空|title is required/i)).toBeInTheDocument();
    });
  });

  it('renders category tree when categoryTree provided', () => {
    const categoryTree = [
      { name: 'DP', children: [{ name: 'Knapsack' }] },
      { name: 'Graph' },
    ];
    renderForm({ categoryTree });
    expect(screen.getByRole('button', { name: /\+ DP/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Knapsack' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\+ Graph/ })).toBeInTheDocument();
  });

  it('clicking category chip appends to tag input', () => {
    const categoryTree = [{ name: 'DP' }];
    renderForm({ categoryTree });
    const tagInput = screen.getByRole('textbox', { name: /标签|tag/i }) as HTMLInputElement;
    fireEvent.change(tagInput, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /\+ DP/ }));
    expect(tagInput.value).toContain('DP');
  });

  it('language tab switching changes editor content', () => {
    const pdoc = {
      docId: 1,
      content: { zh_CN: '# 中文', en: '# English' },
    };
    renderForm({ pdoc });
    fireEvent.click(screen.getByRole('button', { name: 'en' }));
    expect(screen.getByDisplayValue(/# English/)).toBeInTheDocument();
  });


  it('submits the form with Ctrl/Cmd+Enter from the markdown editor', async () => {
    renderForm({ pdoc: { docId: 1, pid: 'p1', title: '' } });

    expect(ctrlEnterCommand).toBeTypeOf('function');
    await act(async () => {
      ctrlEnterCommand?.();
    });

    await waitFor(() => {
      expect(screen.getByText(/标题不能为空|title is required/i)).toBeInTheDocument();
    });
  });

  it('delete button opens ConfirmDialog, confirms deletes', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ url: '/problem' });
    global.fetch = fetchMock as unknown as typeof fetch;
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: /删除|delete/i }));
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: /删除|delete/i }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
  });
});
