import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProblemConfigEditor } from './ProblemConfigEditor';

describe('ProblemConfigEditor', () => {
  it('renders a textarea fallback when Monaco is not loaded', () => {
    // happy-dom: there is no real layout engine and Monaco's lazy chunk
    // sometimes refuses to render; the fallback is always shown for SSR.
    render(<ProblemConfigEditor value="type: default" onChange={() => {}} />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();
    expect((textarea as HTMLTextAreaElement).value).toBe('type: default');
  });
  it('calls onChange with parsed object', () => {
    const onChange = vi.fn();
    render(<ProblemConfigEditor value="type: default" onChange={onChange} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'type: objective' } });
    expect(onChange).toHaveBeenCalledWith('type: objective', expect.objectContaining({ type: 'objective' }));
  });
});
