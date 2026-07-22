import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type PageData, PageDataProvider } from '../../context/page-data';
import { RouterProvider } from '../../context/router';
import { ToastProvider } from '../primitives';
import { ProblemTestdata } from './ProblemTestdata';

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  (global as any).fetch = fetchMock;
  fetchMock.mockResolvedValue({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({}) });
});

function renderComp(props: Partial<ComponentProps<typeof ProblemTestdata>> = {}) {
  return render(
    <PageDataProvider initial={{ name: 'problem_edit', template: '', url: '/', args: { UserContext: { _id: 1 }, UiContext: {} } }}>
      <RouterProvider>
        <ToastProvider>
          <ProblemTestdata pid="P1" files={[{ name: '1.in', size: 100 }, { name: '1.out', size: 200 }]} onChange={() => {}} {...props} />
        </ToastProvider>
      </RouterProvider>
    </PageDataProvider>,
  );
}

describe('ProblemTestdata', () => {
  it('renders file rows', () => {
    renderComp();
    expect(screen.getByText('1.in')).toBeInTheDocument();
    expect(screen.getByText('1.out')).toBeInTheDocument();
  });

  it('deletes selected files', async () => {
    const onChange = vi.fn();
    renderComp({ onChange, files: [{ name: '1.in', size: 100 }] });
    fireEvent.click(screen.getByRole('button', { name: /delete 1\.in/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/p/P1/files'),
      expect.objectContaining({ method: 'POST' }),
    ));
  });
});
