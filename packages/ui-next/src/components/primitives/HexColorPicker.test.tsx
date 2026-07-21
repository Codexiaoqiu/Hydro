import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HexColorPicker } from './HexColorPicker';

describe('HexColorPicker', () => {
  it('renders the current hex value', () => {
    render(<HexColorPicker value="#aabbcc" onChange={() => {}} />);
    const input = screen.getByRole('textbox', { name: /hex/i }) as HTMLInputElement;
    expect(input.value).toBe('#aabbcc');
  });
  it('calls onChange with normalized hex', () => {
    const onChange = vi.fn();
    render(<HexColorPicker value="#000000" onChange={onChange} />);
    const input = screen.getByRole('textbox', { name: /hex/i });
    fireEvent.change(input, { target: { value: 'ff8800' } });
    expect(onChange).toHaveBeenCalledWith('#ff8800');
  });
  it('does not call onChange for invalid hex', () => {
    const onChange = vi.fn();
    render(<HexColorPicker value="#000000" onChange={onChange} />);
    const input = screen.getByRole('textbox', { name: /hex/i });
    fireEvent.change(input, { target: { value: 'xyz' } });
    expect(onChange).not.toHaveBeenCalled();
  });
});
