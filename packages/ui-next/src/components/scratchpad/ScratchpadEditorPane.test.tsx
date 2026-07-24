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
    'Scratchpad.RunPretest': 'Run Pretest',
    'Scratchpad.SubmitSolution': 'Submit',
    'Scratchpad.Exit': 'Exit',
    'Scratchpad.Pretest': 'Pretest',
    'Scratchpad.Records': 'Records',
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

  it('filters remote-judge languages by validAs, pretest, or remote_judge metadata', () => {
    wrap(
      <ScratchpadEditorPane
        pdoc={{
          config: {
            type: 'remote_judge',
            langs: [
              { key: 'cpp', display: 'C++', validAs: { codeforces: '54' } },
              { key: 'py', display: 'Python', pretest: 'python3' },
              { key: 'java', display: 'Java', remote_judge: true },
              { key: 'rust', display: 'Rust' },
              { key: 'pas', display: 'Pascal', pretest: false },
            ],
          },
        }}
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

    const options = Array.from(screen.getByRole('combobox').querySelectorAll('option'))
      .map((option) => option.value);
    expect(options).toEqual(['cpp', 'py', 'java']);
  });

  it('disables Run Pretest when the websocket URL is empty', () => {
    wrap(
      <ScratchpadEditorPane
        pdoc={{ config: { type: 'default', langs: ['cpp'] } }}
        pretestConnUrl=""
        postSubmitUrl="/s"
        getSubmissionsUrl="/r"
        problemId={1}
        UserContext={{ _id: 1 }}
        onExit={() => {}}
        rid={null}
        setRid={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /run pretest/i })).toBeDisabled();
  });

  it('gates record fetching and streaming with UserContext.canViewRecord', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    wrap(
      <ScratchpadEditorPane
        pdoc={{ config: { type: 'default', langs: ['cpp'] } }}
        pretestConnUrl="ws://x"
        postSubmitUrl="/s"
        getSubmissionsUrl="/r"
        problemId={1}
        UserContext={{ _id: 1, canViewRecord: false }}
        onExit={() => {}}
        rid={null}
        setRid={() => {}}
      />,
    );
    screen.getByRole('button', { name: /records/i }).click();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
