/* @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('updates the hidden field when the main language changes', async () => {
    const user = userEvent.setup();
    render(<ProblemLanguageSelect
      langRange={{ 'cc.cc17': 'C++17', 'cc.cc17o2': 'C++17 (O2)', py: 'Python' }}
      langs={langs}
      codeLang="py"
    />);
    const trigger = screen.getAllByRole('button')[0];
    await user.click(trigger);
    await user.click(screen.getByRole('option', { name: 'C++' }));
    expect(document.querySelector<HTMLInputElement>('input[name="lang"]')?.value).toBe('cc.cc17');
  });

  it('updates the hidden field when the sub language changes', async () => {
    const user = userEvent.setup();
    render(<ProblemLanguageSelect
      langRange={{ 'cc.cc17': 'C++17', 'cc.cc17o2': 'C++17 (O2)' }}
      langs={langs}
      codeLang="cc.cc17"
    />);
    const triggers = screen.getAllByRole('button');
    await user.click(triggers[triggers.length - 1]);
    await user.click(screen.getByRole('option', { name: 'C++17 (O2)' }));
    expect(document.querySelector<HTMLInputElement>('input[name="lang"]')?.value).toBe('cc.cc17o2');
  });
});