/* @vitest-environment happy-dom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ObjectiveForm, type ObjectiveQuestion } from './ObjectiveForm';

const singleQuestions: ObjectiveQuestion[] = [
  { id: 'q1', type: 'single', label: 'Pick one', options: ['A', 'B', 'C'], required: true },
];

const multipleQuestions: ObjectiveQuestion[] = [
  { id: 'q1', type: 'multiple', label: 'Pick any', options: ['A', 'B', 'C'], required: true },
];

const textQuestions: ObjectiveQuestion[] = [
  { id: 'q1', type: 'text', label: 'Type answer', required: true },
];

const optionalQuestions: ObjectiveQuestion[] = [
  { id: 'q1', type: 'single', label: 'Optional', options: ['A', 'B'] },
];

describe('ObjectiveForm', () => {
  it('renders a radio group for single-choice questions', () => {
    render(<ObjectiveForm questions={singleQuestions} onSubmit={() => {}} />);
    expect(screen.getAllByRole('radio')).toHaveLength(3);
  });

  it('renders checkboxes for multi-choice questions', () => {
    render(<ObjectiveForm questions={multipleQuestions} onSubmit={() => {}} />);
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
  });

  function optionInput(value: string): HTMLInputElement {
    // Inputs for options are uniquely identifiable by their value attribute
    // because the question's `id` is stable per render.
    return document.querySelector<HTMLInputElement>(`input[value="${value}"]`)!;
  }

  it('renders a textarea for free-text questions', () => {
    render(<ObjectiveForm questions={textQuestions} onSubmit={() => {}} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('marks required questions and shows an error when blank', () => {
    const onSubmit = vi.fn();
    render(<ObjectiveForm questions={singleQuestions} onSubmit={onSubmit} />);
    // The required indicator (aria-label) is present on the asterisk span.
    expect(screen.getByLabelText('required')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    expect(onSubmit).not.toHaveBeenCalled();
    // Both the per-question error and the summary alert contain "required".
    const alerts = screen.getAllByRole('alert');
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts.some((el) => /required/i.test(el.textContent ?? ''))).toBe(true);
  });

  it('allows submission when optional question is left blank', () => {
    const onSubmit = vi.fn();
    render(<ObjectiveForm questions={optionalQuestions} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('serializes selected answers and passes them to onSubmit as a YAML payload', () => {
    const onSubmit = vi.fn();
    render(<ObjectiveForm questions={singleQuestions} onSubmit={onSubmit} />);
    fireEvent.click(optionInput('B'));
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const payload = onSubmit.mock.calls[0][0];
    expect(payload).toEqual({ q1: 'B' });
  });

  it('serializes multi-choice selections as an array of strings', () => {
    const onSubmit = vi.fn();
    render(<ObjectiveForm questions={multipleQuestions} onSubmit={onSubmit} />);
    fireEvent.click(optionInput('A'));
    fireEvent.click(optionInput('C'));
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.q1).toEqual(['A', 'C']);
  });

  it('serializes free-text answers as strings', () => {
    const onSubmit = vi.fn();
    render(<ObjectiveForm questions={textQuestions} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hello world' } });
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.q1).toBe('hello world');
  });

  it('seeds state from initialAnswers when provided', () => {
    const onSubmit = vi.fn();
    render(
      <ObjectiveForm
        questions={singleQuestions}
        onSubmit={onSubmit}
        initialAnswers={{ q1: 'C' }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toEqual({ q1: 'C' });
  });
});