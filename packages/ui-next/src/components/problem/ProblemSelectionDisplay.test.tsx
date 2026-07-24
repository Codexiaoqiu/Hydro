import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../primitives/Toast';
import { ProblemSelectionDisplay } from './ProblemSelectionDisplay';

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  (global as { fetch?: unknown }).fetch = fetchMock;
});

afterEach(() => {
  vi.restoreAllMocks();
});

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (k: string) => (k.toLowerCase() === 'content-type' ? 'application/json' : null) },
    json: async () => body,
  };
}

const renderToolbar = (props: Partial<React.ComponentProps<typeof ProblemSelectionDisplay>> = {}) => {
  const onAfterAction = vi.fn();
  const utils = render(
    <ToastProvider>
      <ProblemSelectionDisplay
        pids={[1000, 1001]}
        onAfterAction={onAfterAction}
        canDelete
        canCopy
        canEdit
        {...props}
      />
    </ToastProvider>,
  );
  return { onAfterAction, utils };
};

describe('ProblemSelectionDisplay (P1-A.2)', () => {
  it('renders the selected count and the four batch action buttons', () => {
    renderToolbar();
    expect(screen.getByTestId('problem-selection')).toHaveTextContent('已选 2');
    expect(screen.getByRole('button', { name: '隐藏' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '取消隐藏' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '删除' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '复制到域' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '打包下载' })).toBeInTheDocument();
  });

  it('hides Copy button when canCopy=false and Delete when canDelete=false', () => {
    render(
      <ToastProvider>
        <ProblemSelectionDisplay pids={[1]} onAfterAction={vi.fn()} canEdit />
      </ToastProvider>,
    );
    expect(screen.queryByRole('button', { name: '复制到域' })).toBeNull();
    expect(screen.queryByRole('button', { name: '删除' })).toBeNull();
    expect(screen.getByRole('button', { name: '隐藏' })).toBeInTheDocument();
  });

  it('does not render any action buttons when the selection is empty', () => {
    render(
      <ToastProvider>
        <ProblemSelectionDisplay pids={[]} onAfterAction={vi.fn()} canEdit canDelete canCopy />
      </ToastProvider>,
    );
    expect(screen.queryByRole('button', { name: /隐藏/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /取消隐藏/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /删除/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /复制到域/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /打包/ })).toBeNull();
  });

  it('POSTs operation=hide with the selected pids on click and notifies after success', async () => {
    const onAfterAction = vi.fn();
    fetchMock.mockResolvedValue(jsonResponse({}));
    render(
      <ToastProvider>
        <ProblemSelectionDisplay pids={[1000, 1001]} onAfterAction={onAfterAction} canEdit />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: '隐藏' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/p');
    expect((init as RequestInit).method).toBe('POST');
    const body = (init as RequestInit).body as URLSearchParams;
    expect(body.get('operation')).toBe('hide');
    expect(body.getAll('pids')).toEqual(['1000', '1001']);
    await waitFor(() => expect(onAfterAction).toHaveBeenCalledTimes(1));
  });

  it('POSTs operation=unhide when the unhide button is clicked', async () => {
    const onAfterAction = vi.fn();
    fetchMock.mockResolvedValue(jsonResponse({}));
    render(
      <ToastProvider>
        <ProblemSelectionDisplay pids={[1000]} onAfterAction={onAfterAction} canEdit />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: '取消隐藏' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, init] = fetchMock.mock.calls[0];
    const body = (init as RequestInit).body as URLSearchParams;
    expect(body.get('operation')).toBe('unhide');
    expect(body.getAll('pids')).toEqual(['1000']);
    await waitFor(() => expect(onAfterAction).toHaveBeenCalledTimes(1));
  });
});
