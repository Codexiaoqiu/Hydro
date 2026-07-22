import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProblemGenerateTestdata } from './ProblemGenerateTestdata';
import { ToastProvider } from '../primitives';

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  (global as any).fetch = fetchMock;
  fetchMock.mockResolvedValue({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({ url: '/record/R1' }) });
});

describe('ProblemGenerateTestdata', () => {
  it('opens modal with iframe after submit', async () => {
    render(<ToastProvider><ProblemGenerateTestdata pid="P1" testdata={['gen', 'std']} onGenerated={() => {}} /></ToastProvider>);
    fireEvent.click(screen.getByRole('button', { name: /generate/i }));
    const genInput = await screen.findByLabelText(/generator/i);
    const stdInput = await screen.findByLabelText(/standard/i);
    fireEvent.change(genInput, { target: { value: 'gen' } });
    fireEvent.change(stdInput, { target: { value: 'std' } });
    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    await waitFor(() => expect(screen.getByTitle('generate-record')).toBeInTheDocument());
  });
});
