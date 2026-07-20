/* @vitest-environment happy-dom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type PageData, PageDataProvider } from '../../context/page-data';
import { routeMapStore } from '../../globals';
import { request } from '../../hooks/use-api';
import { ProblemSelectAutoComplete } from './ProblemSelectAutoComplete';

vi.mock('../../hooks/use-api', () => ({
  request: { get: vi.fn() },
  HydroClientError: class HydroClientError extends Error {},
}));

function renderWithPageData(ui: React.ReactNode, uiContext: PageData['args']['UiContext'] = { domainId: 'system' }) {
  const initial: PageData = {
    name: 'contest_edit',
    template: '',
    args: { UserContext: {}, UiContext: uiContext },
    url: '/contest/edit',
  };
  return render(<PageDataProvider initial={initial}>{ui}</PageDataProvider>);
}

describe('problemSelectAutoComplete', () => {
  beforeEach(() => {
    routeMapStore._routeMap = {
      problem_main: '/p',
    };
    vi.mocked(request.get).mockResolvedValue({ pdocs: [] });
  });

  afterEach(() => {
    vi.mocked(request.get).mockReset();
  });

  it('renders selected docIds as removable chips and emits hidden CSV input', () => {
    renderWithPageData(
      <ProblemSelectAutoComplete
        value={[101, 202]}
        onChange={() => {}}
        name="pids"
      />,
    );

    expect(screen.getByText('#101')).toBeInTheDocument();
    expect(screen.getByText('#202')).toBeInTheDocument();
    const hidden = screen.getByDisplayValue('101,202') as HTMLInputElement;
    expect(hidden.tagName).toBe('INPUT');
    expect(hidden.type).toBe('hidden');
    expect(hidden.name).toBe('pids');
  });

  it('triggers a debounced search and adds a result chip on click', async () => {
    vi.mocked(request.get).mockResolvedValue({
      pdocs: [
        { docId: 7, pid: 'p7', title: 'Demo problem' },
      ],
    });
    const onChange = vi.fn();
    renderWithPageData(
      <ProblemSelectAutoComplete value={[]} onChange={onChange} />,
    );

    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'demo' } });

    // Wait for debounced search to fire and render the result.
    await waitFor(() => expect(request.get).toHaveBeenCalledTimes(1));
    const option = await screen.findByRole('option', { name: /Demo problem/ });
    fireEvent.mouseDown(option);
    expect(onChange).toHaveBeenCalledWith([7]);
  });

  it('removes a chip when its × button is clicked', () => {
    const onChange = vi.fn();
    renderWithPageData(
      <ProblemSelectAutoComplete value={[1, 2]} onChange={onChange} />,
    );
    fireEvent.click(screen.getByLabelText('Remove problem 1'));
    expect(onChange).toHaveBeenCalledWith([2]);
  });
});
