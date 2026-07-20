/* @vitest-environment happy-dom */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ProblemLanguageSelect from './ProblemLanguageSelect';

const langs = {
  cc: { display: 'C++', pretest: 'cc.cc17' },
  'cc.cc17': { display: 'C++17' },
  'cc.cc17o2': { display: 'C++17 (O2)' },
  py: { display: 'Python' },
};

describe('problemLanguageSelect', () => {
  it('writes the preferred complete language key to the hidden field', () => {
    render(<ProblemLanguageSelect
      langRange={{ 'cc.cc17': 'C++17', 'cc.cc17o2': 'C++17 (O2)', py: 'Python' }}
      langs={langs}
      codeLang="cc.cc17o2"
    />);
    expect(document.querySelector<HTMLInputElement>('input[name="lang"]')?.value).toBe('cc.cc17o2');
  });

  it('updates the hidden field when the main language changes', () => {
    render(<ProblemLanguageSelect
      langRange={{ 'cc.cc17': 'C++17', 'cc.cc17o2': 'C++17 (O2)', py: 'Python' }}
      langs={langs}
      codeLang="py"
    />);
    const mainSelect = screen.getAllByRole('combobox')[0];
    fireEvent.change(mainSelect, { target: { value: 'cc' } });
    expect(document.querySelector<HTMLInputElement>('input[name="lang"]')?.value).toBe('cc.cc17');
  });

  it('updates the hidden field when the sub language changes', () => {
    render(<ProblemLanguageSelect
      langRange={{ 'cc.cc17': 'C++17', 'cc.cc17o2': 'C++17 (O2)' }}
      langs={langs}
      codeLang="cc.cc17"
    />);
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[selects.length - 1], { target: { value: 'cc17o2' } });
    expect(document.querySelector<HTMLInputElement>('input[name="lang"]')?.value).toBe('cc.cc17o2');
  });
});
