import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ProblemConfigYaml } from '../../lib/yaml-config';
import { ProblemConfigBasicForm } from './ProblemConfigBasicForm';

const cfg = { type: 'default' } as unknown as ProblemConfigYaml;

describe('ProblemConfigBasicForm', () => {
  it('renders the type select with current value', () => {
    render(<ProblemConfigBasicForm config={cfg} onChange={() => {}} />);
    // The first combobox is the problem type selector (the second is the
    // Checker type dropdown that only appears for default type).
    const select = screen.getAllByRole('combobox')[0] as HTMLSelectElement;
    expect(select.value).toBe('default');
  });
  it('emits onChange when type changes', () => {
    const onChange = vi.fn();
    render(<ProblemConfigBasicForm config={cfg} onChange={onChange} />);
    const select = screen.getAllByRole('combobox')[0];
    fireEvent.change(select, { target: { value: 'objective' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ type: 'objective' }));
  });
  it('renders filename field for default type', () => {
    render(<ProblemConfigBasicForm config={cfg} onChange={() => {}} />);
    expect(screen.getByLabelText(/FileIO prefix/i)).toBeInTheDocument();
  });
  it('renders interactor field for interactive type', () => {
    render(<ProblemConfigBasicForm config={{ type: 'interactive' } as unknown as ProblemConfigYaml} onChange={() => {}} />);
    expect(screen.getByLabelText(/Interactor/i)).toBeInTheDocument();
  });
  it('renders manager + num_processes for communication type', () => {
    render(<ProblemConfigBasicForm config={{ type: 'communication' } as unknown as ProblemConfigYaml} onChange={() => {}} />);
    expect(screen.getByLabelText(/Manager/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Num processes/i)).toBeInTheDocument();
  });
  it('does not render count/subLimit (removed)', () => {
    render(<ProblemConfigBasicForm config={cfg} onChange={() => {}} />);
    expect(screen.queryByLabelText(/count/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Sub-Limit/i)).not.toBeInTheDocument();
  });

  // ---- C-2 parity (12-field coverage) ----
  it('renders subType + filename for submit_answer type', () => {
    render(<ProblemConfigBasicForm config={{ type: 'submit_answer' } as unknown as ProblemConfigYaml} onChange={() => {}} />);
    expect(screen.getByLabelText(/Subtype/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Template/i)).toBeInTheDocument();
  });
  it('does not render subType for default type', () => {
    render(<ProblemConfigBasicForm config={cfg} onChange={() => {}} />);
    expect(screen.queryByLabelText(/Subtype/i)).not.toBeInTheDocument();
  });
  it('emits numeric multi_pass value via onChange', () => {
    const onChange = vi.fn();
    render(<ProblemConfigBasicForm config={{ type: 'default', multi_pass: 2 } as unknown as ProblemConfigYaml} onChange={onChange} />);
    const input = screen.getByLabelText(/Multi-pass/i);
    fireEvent.change(input, { target: { value: '5' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ multi_pass: 5 }));
  });
  it('strips stale fields when switching type (configYamlFormat)', () => {
    const onChange = vi.fn();
    render(<ProblemConfigBasicForm config={{ type: 'interactive', interactor: 'foo.cpp' } as unknown as ProblemConfigYaml} onChange={onChange} />);
    const select = screen.getAllByRole('combobox')[0];
    fireEvent.change(select, { target: { value: 'default' } });
    const lastCall = onChange.mock.calls.at(-1)![0] as ProblemConfigYaml;
    // After switching away from interactive, interactor should be dropped.
    expect(lastCall.interactor).toBeUndefined();
    expect(lastCall.type).toBe('default');
  });
});
