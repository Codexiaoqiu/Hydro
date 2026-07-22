import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ProblemConfigYaml } from '../../lib/yaml-config';
import { ProblemConfigBasicForm } from './ProblemConfigBasicForm';

const cfg = { type: 'default', subLimit: 0, count: 10 } as unknown as ProblemConfigYaml;

describe('ProblemConfigBasicForm', () => {
  it('renders current values', () => {
    render(<ProblemConfigBasicForm config={cfg} onChange={() => {}} />);
    const type = screen.getByDisplayValue('Standard (default)') as HTMLInputElement;
    expect(type).toBeInTheDocument();
  });
  it('emits onChange when type changes', () => {
    const onChange = vi.fn();
    render(<ProblemConfigBasicForm config={cfg} onChange={onChange} />);
    const select = screen.getByRole('combobox', { name: /type/i });
    fireEvent.change(select, { target: { value: 'objective' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ type: 'objective' }));
  });
});