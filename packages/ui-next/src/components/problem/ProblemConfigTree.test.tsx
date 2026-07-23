import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ProblemConfigYaml } from '../../lib/yaml-config';
import { ProblemConfigTree } from './ProblemConfigTree';

const cfg = {
  type: 'default',
  subtasks: [{
    type: 'sum' as const,
    score: 100,
    cases: [{ input: '1.in', output: '1.out' }],
  }],
} as unknown as ProblemConfigYaml;

const cfgWithTwoSubtasks = {
  type: 'default',
  subtasks: [
    { type: 'sum' as const, score: 50, cases: [{ input: '1.in', output: '1.out' }] },
    { type: 'min' as const, score: 50, cases: [{ input: '2.in', output: '2.out' }] },
  ],
} as unknown as ProblemConfigYaml;

describe('ProblemConfigTree', () => {
  it('renders each subtask as a row', () => {
    render(<ProblemConfigTree config={cfg} testdata={['1.in', '1.out']} onChange={() => {}} onAutoDetect={() => {}} />);
    // Accept either localized or English form.
    expect(screen.getByText(/Subtask 1|子任务 1/)).toBeInTheDocument();
  });
  it('calls onAutoDetect when Auto Detect is clicked', () => {
    const onAutoDetect = vi.fn();
    render(<ProblemConfigTree config={cfg} testdata={['1-1.in', '1-1.out', '2-1.in', '2-1.out']} onChange={() => {}} onAutoDetect={onAutoDetect} />);
    fireEvent.click(screen.getByRole('button', { name: /auto detect|自动识别/i }));
    expect(onAutoDetect).toHaveBeenCalled();
  });
  it('calls onChange when Add is clicked', () => {
    const onChange = vi.fn();
    render(<ProblemConfigTree config={cfg} testdata={['1.in', '1.out']} onChange={onChange} onAutoDetect={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /add|\+ add/i }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      subtasks: expect.arrayContaining([
        expect.objectContaining({ score: 10 }),
        expect.objectContaining({ score: 100 }),
      ]),
    }));
  });
  it('calls onChange when Remove is clicked (after confirm)', () => {
    const onChange = vi.fn();
    // happy-dom doesn't ship window.confirm; stub it.
    window.confirm = vi.fn().mockReturnValue(true) as any;
    render(<ProblemConfigTree config={cfg} testdata={['1.in', '1.out']} onChange={onChange} onAutoDetect={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /remove/i }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ subtasks: [] }));
  });

  // ---- C-3 parity (SubtaskSettings modal + Add new subtask) ----
  it('renders one Settings trigger per subtask (2 subtasks → 2 triggers)', () => {
    render(<ProblemConfigTree config={cfgWithTwoSubtasks} testdata={['1.in', '1.out']} onChange={() => {}} onAutoDetect={() => {}} />);
    expect(screen.getAllByRole('button', { name: /settings/i })).toHaveLength(2);
  });
  it('"Add new subtask" button grows subtask list by +1', () => {
    const onChange = vi.fn();
    render(<ProblemConfigTree config={cfg} testdata={['1.in', '1.out']} onChange={onChange} onAutoDetect={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /add|\+ add/i }));
    const lastCall = onChange.mock.calls.at(-1)![0] as ProblemConfigYaml;
    expect((lastCall.subtasks ?? []).length).toBe((cfg.subtasks ?? []).length + 1);
  });
  it('opening SubtaskSettings modal then applying patch updates the subtask', () => {
    const onChange = vi.fn();
    render(<ProblemConfigTree config={cfg} testdata={['1.in', '1.out']} onChange={onChange} onAutoDetect={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /settings/i }));
    // Modal title should appear.
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // Click Apply with defaults — should call onChange with a score patch.
    fireEvent.click(screen.getByRole('button', { name: /apply/i }));
    expect(onChange).toHaveBeenCalled();
  });
});
