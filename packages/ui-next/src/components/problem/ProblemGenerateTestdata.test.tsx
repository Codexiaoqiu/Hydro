import { STATUS } from '@hydrooj/common';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { request } from '../../hooks/use-api';
import { ProblemGenerateTestdata } from './ProblemGenerateTestdata';
import { ToastProvider } from '../primitives';

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  (global as any).fetch = fetchMock;
  fetchMock.mockResolvedValue({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({ url: '/record/R1' }) });
});

function renderComp(props: Partial<React.ComponentProps<typeof ProblemGenerateTestdata>> = {}) {
  const onGenerated = vi.fn();
  render(
    <ToastProvider>
      <ProblemGenerateTestdata pid="P 1" testdata={['gen', 'std']} onGenerated={onGenerated} {...props} />
    </ToastProvider>,
  );
  return { onGenerated };
}

async function startGeneration() {
  fireEvent.click(screen.getByRole('button', { name: /生成|Generate/i }));
  fireEvent.change(await screen.findByLabelText(/生成器|Generator/i), { target: { value: 'gen' } });
  fireEvent.change(await screen.findByLabelText(/标准|Standard/i), { target: { value: 'std' } });
  fireEvent.click(screen.getByRole('button', { name: /开始|Start/i }));
  await waitFor(() => expect(screen.getByTitle('generate-record')).toBeInTheDocument());
}

describe('ProblemGenerateTestdata', () => {
  it('posts generation to the problem files endpoint', async () => {
    const postSpy = vi.spyOn(request, 'post');
    renderComp();
    await startGeneration();
    expect(postSpy).toHaveBeenCalledWith('/p/P%201/files', expect.any(URLSearchParams));
    const body = postSpy.mock.calls[0][1] as URLSearchParams;
    expect(Object.fromEntries(body)).toEqual({ operation: 'generate_testdata', gen: 'gen', std: 'std' });
  });

  it.each([
    STATUS.STATUS_ACCEPTED,
    'STATUS_ACCEPTED',
  ])('accepts completion status %s from the record iframe', async (status) => {
    const { onGenerated } = renderComp();
    await startGeneration();
    act(() => window.dispatchEvent(new MessageEvent('message', { data: { status } })));
    await waitFor(() => expect(onGenerated).toHaveBeenCalledOnce());
    expect(screen.queryByTitle('generate-record')).not.toBeInTheDocument();
  });

  it('disables Generate when disabled', () => {
    renderComp({ disabled: true });
    expect(screen.getByRole('button', { name: /生成|Generate/i })).toBeDisabled();
  });
});
