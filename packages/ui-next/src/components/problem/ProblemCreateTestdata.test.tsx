import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProblemCreateTestdata } from './ProblemCreateTestdata';

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  (global as any).fetch = fetchMock;
  fetchMock.mockResolvedValue({ ok: true, status: 200, headers: { get: () => '*/*' }, json: async () => ({}), text: async () => '' });
  (window as any).prompt = vi.fn(() => 'new.in');
});

describe('problemCreateTestdata', () => {
  it('prompts and uploads empty file', async () => {
    const onCreated = vi.fn();
    render(<ProblemCreateTestdata pid="P1" onCreated={onCreated} />);
    fireEvent.click(screen.getByRole('button', { name: /create|新建/i }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith('new.in'));
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/p/P1/files'),
      expect.objectContaining({ method: 'POST', body: expect.any(FormData) }),
    );
  });

  // Regression: the create button label is localised; the selector must match
  // both zh_CN ("新建") and en ("Create") so the test is locale-agnostic.
  it('renders the Create button label in the active locale', () => {
    render(<ProblemCreateTestdata pid="P1" onCreated={() => {}} />);
    expect(screen.getByRole('button', { name: /create|新建/i })).toBeInTheDocument();
  });
});
