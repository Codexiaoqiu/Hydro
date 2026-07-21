import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ScratchpadProvider } from './useScratchpadState';
import { ScratchpadToolbar } from './ScratchpadToolbar';

// Mock useTranslate to return English strings regardless of locale.
// The global setup pins __hydro_locale to zh_CN, so without this
// mock the aria-labels would be Chinese and the English regex
// assertions in the brief would always fail.
const t = vi.fn((key: string) => {
  const map: Record<string, string> = {
    'Scratchpad.RunPretest': 'Run Pretest',
    'Scratchpad.SubmitSolution': 'Submit',
    'Scratchpad.Exit': 'Exit',
    'Scratchpad.Pretest': 'Pretest',
    'Scratchpad.Records': 'Records',
  };
  return map[key] ?? key;
});
vi.mock('../../lib/i18n', () => ({ useTranslate: () => t }));

const baseArgs = {
  postSubmitUrl: '/submit',
  pretestConnUrl: 'ws://x',
  getSubmissionsUrl: '/r',
  problemId: 1,
  pdoc: { config: { type: 'default', langs: ['cpp', 'py'] } },
  tdoc: undefined,
  UserContext: { _id: 1 },
  onExit: vi.fn(),
  setRid: vi.fn(),
};

function wrap(ui: React.ReactNode) {
  return render(<ScratchpadProvider initialLang="cpp" initialCode="">{ui}</ScratchpadProvider>);
}

describe('ScratchpadToolbar', () => {
  it('renders Run Pretest, Submit, and Exit buttons', () => {
    wrap(<ScratchpadToolbar {...baseArgs} />);
    expect(screen.getByRole('button', { name: /run pretest/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /exit/i })).toBeInTheDocument();
  });

  it('calls onExit when exit button clicked', () => {
    const onExit = vi.fn();
    wrap(<ScratchpadToolbar {...baseArgs} onExit={onExit} />);
    fireEvent.click(screen.getByRole('button', { name: /exit/i }));
    expect(onExit).toHaveBeenCalledOnce();
  });
});
