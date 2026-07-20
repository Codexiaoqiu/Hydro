/* @vitest-environment happy-dom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LanguageSelectAutoComplete } from './LanguageSelectAutoComplete';

const sampleLanguages = [
  { value: 'cpp', label: 'C++17' },
  { value: 'py', label: 'Python 3' },
  { value: 'java', label: 'Java' },
];

describe('languageSelectAutoComplete', () => {
  it('renders initial selections as removable chips and emits hidden CSV input', () => {
    render(
      <LanguageSelectAutoComplete
        value={['cpp']}
        onChange={() => {}}
        languages={sampleLanguages}
        name="langs"
        label="Allowed languages"
      />,
    );

    expect(screen.getByText('C++17')).toBeInTheDocument();
    expect(screen.getByLabelText('Remove language cpp')).toBeInTheDocument();
    const hidden = screen.getByDisplayValue('cpp') as HTMLInputElement;
    expect(hidden.tagName).toBe('INPUT');
    expect(hidden.type).toBe('hidden');
    expect(hidden.name).toBe('langs');
  });

  it('opens the dropdown on focus and filters by query', () => {
    render(
      <LanguageSelectAutoComplete
        value={[]}
        onChange={() => {}}
        languages={sampleLanguages}
        placeholder="Type a language"
      />,
    );

    const input = screen.getByRole('combobox');
    fireEvent.focus(input);

    // All non-selected languages are visible at first.
    expect(screen.getByRole('option', { name: /C\+\+17/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Python 3/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Java/ })).toBeInTheDocument();

    // Filtering narrows the list.
    fireEvent.change(input, { target: { value: 'py' } });
    expect(screen.getByRole('option', { name: /Python 3/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /C\+\+17/ })).not.toBeInTheDocument();
  });

  it('calls onChange when a dropdown option is selected', () => {
    const onChange = vi.fn();
    render(
      <LanguageSelectAutoComplete
        value={[]}
        onChange={onChange}
        languages={sampleLanguages}
      />,
    );
    fireEvent.focus(screen.getByRole('combobox'));
    fireEvent.mouseDown(screen.getByRole('option', { name: /Python 3/ }));
    expect(onChange).toHaveBeenCalledWith(['py']);
  });

  it('removes a chip when its × button is clicked', () => {
    const onChange = vi.fn();
    render(
      <LanguageSelectAutoComplete
        value={['cpp', 'py']}
        onChange={onChange}
        languages={sampleLanguages}
      />,
    );
    fireEvent.click(screen.getByLabelText('Remove language cpp'));
    expect(onChange).toHaveBeenCalledWith(['py']);
  });

  it('excludes already-selected languages from the dropdown', () => {
    render(
      <LanguageSelectAutoComplete
        value={['cpp']}
        onChange={() => {}}
        languages={sampleLanguages}
      />,
    );
    fireEvent.focus(screen.getByRole('combobox'));
    expect(screen.queryByRole('option', { name: /C\+\+17/ })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Python 3/ })).toBeInTheDocument();
  });
});
