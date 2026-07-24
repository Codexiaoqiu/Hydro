import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ScratchpadEditorPane } from './ScratchpadEditorPane';
import { ScratchpadPanel } from './ScratchpadPanel';
import {
  SCRATCHPAD_SETTINGS_CHANGE_EVENT,
  SCRATCHPAD_SETTINGS_STORAGE_KEY,
  ScratchpadSettings,
} from './ScratchpadSettings';
import { ScratchpadProvider } from './useScratchpadState';

vi.mock('@monaco-editor/react', () => ({
  default: ({
    'aria-label': ariaLabel,
    theme,
    options,
  }: {
    'aria-label'?: string;
    theme?: string;
    options?: { fontSize?: number };
  }) => (
    <textarea
      aria-label={ariaLabel}
      data-testid="mock-editor"
      data-theme={theme}
      data-font-size={options?.fontSize}
    />
  ),
}));

vi.mock('./ScratchpadProblemPane', () => ({
  ScratchpadProblemPane: () => <aside aria-label="Problem statement" />,
}));

vi.mock('idb-keyval', () => ({
  get: vi.fn(() => Promise.resolve(undefined)),
  set: vi.fn(() => Promise.resolve()),
}));

function editorPane() {
  return (
    <ScratchpadProvider initialLang="cpp" initialCode="">
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
      />
    </ScratchpadProvider>
  );
}

describe('ScratchpadSettings', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.dataset.theme = 'light';
  });

  it('loads the defaults and persists each setting immediately', () => {
    const onSettingsChange = vi.fn();
    window.addEventListener(SCRATCHPAD_SETTINGS_CHANGE_EVENT, onSettingsChange);

    render(<ScratchpadSettings />);

    const pretestInterval = screen.getByRole('spinbutton', { name: /pretest interval/i });
    const editorTheme = screen.getByRole('combobox', { name: /editor theme/i });
    const fontSize = screen.getByRole('spinbutton', { name: /font size/i });

    expect(pretestInterval).toHaveValue(5);
    expect(editorTheme).toHaveValue('auto');
    expect(fontSize).toHaveValue(14);

    fireEvent.change(pretestInterval, { target: { value: '8' } });
    fireEvent.change(editorTheme, { target: { value: 'vs-dark' } });
    fireEvent.change(fontSize, { target: { value: '18' } });

    expect(JSON.parse(localStorage.getItem(SCRATCHPAD_SETTINGS_STORAGE_KEY)!)).toEqual({
      pretestInterval: 8,
      editorTheme: 'vs-dark',
      fontSize: 18,
    });
    expect(onSettingsChange).toHaveBeenCalledTimes(3);
    expect((onSettingsChange.mock.calls.at(-1)?.[0] as CustomEvent).detail).toEqual({
      pretestInterval: 8,
      editorTheme: 'vs-dark',
      fontSize: 18,
    });

    window.removeEventListener(SCRATCHPAD_SETTINGS_CHANGE_EVENT, onSettingsChange);
  });

  it('restores valid saved values from localStorage', () => {
    localStorage.setItem(SCRATCHPAD_SETTINGS_STORAGE_KEY, JSON.stringify({
      pretestInterval: 2,
      editorTheme: 'vs-light',
      fontSize: 16,
    }));

    render(<ScratchpadSettings />);

    expect(screen.getByRole('spinbutton', { name: /pretest interval/i })).toHaveValue(2);
    expect(screen.getByRole('combobox', { name: /editor theme/i })).toHaveValue('vs-light');
    expect(screen.getByRole('spinbutton', { name: /font size/i })).toHaveValue(16);
  });

  it('follows hydro theme changes when the editor preference is auto', () => {
    render(editorPane());
    const editor = screen.getByTestId('mock-editor');

    expect(editor).toHaveAttribute('data-theme', 'vs-light');

    document.documentElement.dataset.theme = 'dark';
    fireEvent(window, new CustomEvent('hydro:theme-change'));

    expect(editor).toHaveAttribute('data-theme', 'vs-dark');
  });

  it('applies setting changes to the Monaco editor immediately', () => {
    render(
      <>
        <ScratchpadSettings />
        {editorPane()}
      </>,
    );

    fireEvent.change(screen.getByRole('combobox', { name: /editor theme/i }), {
      target: { value: 'vs-dark' },
    });
    fireEvent.change(screen.getByRole('spinbutton', { name: /font size/i }), {
      target: { value: '20' },
    });

    expect(screen.getByTestId('mock-editor')).toHaveAttribute('data-theme', 'vs-dark');
    expect(screen.getByTestId('mock-editor')).toHaveAttribute('data-font-size', '20');
  });

  it('is available as a tab in the scratchpad panel', () => {
    render(
      <ScratchpadPanel
        pdoc={{ docId: 1, title: 'T', config: { type: 'default', langs: ['cpp'] } }}
        UserContext={{ _id: 1 }}
        pretestConnUrl="ws://x"
        postSubmitUrl="/s"
        getSubmissionsUrl="/r"
        contentText="body"
        contentLangs={['en']}
        preferredLang="en"
        mode="normal"
        problemId={1}
        onExit={() => {}}
      />,
    );

    expect(screen.queryByRole('tabpanel', { name: /scratchpad settings/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /settings/i }));
    expect(screen.getByRole('tabpanel', { name: /scratchpad settings/i })).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: /pretest interval/i })).toBeInTheDocument();
  });
});
