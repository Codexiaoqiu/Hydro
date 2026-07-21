import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ScratchpadProvider } from './useScratchpadState';
import { ScratchpadEditorPane } from './ScratchpadEditorPane';

// Mock @monaco-editor/react so Editor doesn't try to load Monaco from CDN in happy-dom.
vi.mock('@monaco-editor/react', () => ({
  default: ({ 'aria-label': ariaLabel }: { 'aria-label'?: string }) => (
    <textarea aria-label={ariaLabel} data-testid="mock-editor" />
  ),
}));

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

describe('ScratchpadEditorPane', () => {
  it('renders toolbar', () => {
    wrap(
      <ScratchpadEditorPane
        pdoc={{ config: { type: 'default', langs: ['cpp'] } }}
        pretestConnUrl="ws://x"
        postSubmitUrl="/s"
        getSubmissionsUrl="/r"
        problemId={1}
        UserContext={{ _id: 1 }}
        onExit={() => {}}
        rid={null}
        setRid={() => {}}
      />,
    );
    expect(screen.getByRole('toolbar')).toBeInTheDocument();
  });

  it('renders pretest panel by default', () => {
    wrap(
      <ScratchpadEditorPane
        pdoc={{ config: { type: 'default', langs: ['cpp'] } }}
        pretestConnUrl="ws://x"
        postSubmitUrl="/s"
        getSubmissionsUrl="/r"
        problemId={1}
        UserContext={{ _id: 1 }}
        onExit={() => {}}
        rid={null}
        setRid={() => {}}
      />,
    );
    expect(screen.getByLabelText(/input/i)).toBeInTheDocument();
  });
});
