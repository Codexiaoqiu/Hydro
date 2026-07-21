import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ScratchpadProvider } from './useScratchpadState';
import { PretestPanel } from './PretestPanel';

// Mock useTranslate to return English strings regardless of locale.
// The global setup pins __hydro_locale to zh_CN, so without this
// mock the aria-labels would be Chinese and the English regex
// assertions in the brief would always fail.
const t = vi.fn((key: string) => {
  const map: Record<string, string> = {
    'Scratchpad.PretestInput': 'Input',
    'Scratchpad.PretestOutput': 'Output',
    'Scratchpad.CopyOutput': 'Copy output',
    'Scratchpad.ClearOutput': 'Clear output',
  };
  return map[key] ?? key;
});
vi.mock('../../lib/i18n', () => ({ useTranslate: () => t }));

function wrap(ui: React.ReactNode) {
  return render(<ScratchpadProvider initialLang="cpp" initialCode="">{ui}</ScratchpadProvider>);
}

describe('PretestPanel', () => {
  it('renders input textarea and empty output pre initially', () => {
    wrap(<PretestPanel />);
    // Use getByRole for the textarea (only textbox with "input" accessible name)
    expect(screen.getByRole('textbox', { name: /input/i })).toBeInTheDocument();
    // Both the output pre and buttons contain "output" in their aria-labels,
    // so getAllByLabelText is used; filter to the pre element (has data-pretest-output)
    const outputEls = screen.getAllByLabelText(/output/i);
    const outputPre = outputEls.find((el) => el.getAttribute('data-pretest-output') === 'true');
    expect(outputPre).toBeInTheDocument();
    expect(outputPre?.textContent).toBe('');
  });

  it('exposes copy and clear buttons', () => {
    wrap(<PretestPanel />);
    expect(screen.getByRole('button', { name: /copy output/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clear output/i })).toBeInTheDocument();
  });
});
