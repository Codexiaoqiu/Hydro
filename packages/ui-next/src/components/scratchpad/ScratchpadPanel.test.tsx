import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ScratchpadPanel } from './ScratchpadPanel';

vi.mock('@monaco-editor/react', () => ({
  default: ({ 'aria-label': ariaLabel }: { 'aria-label'?: string }) => (
    <textarea aria-label={ariaLabel} data-testid="mock-editor" />
  ),
}));

const t = vi.fn((key: string) => {
  const map: Record<string, string> = {
    'Scratchpad.PretestInput': 'Input',
    'Scratchpad.PretestOutput': 'Output',
    'Scratchpad.CopyOutput': 'Copy output',
    'Scratchpad.ClearOutput': 'Clear output',
    'Scratchpad.UnsavedConfirm': 'Unsaved changes. Continue?',
  };
  return map[key] ?? key;
});
vi.mock('../../lib/i18n', () => ({ useTranslate: () => t }));

vi.mock('idb-keyval', () => ({
  get: vi.fn(() => Promise.resolve(undefined)),
  set: vi.fn(() => Promise.resolve()),
}));

const baseArgs = {
  pdoc: { docId: 1, title: 'T', pid: 'p1', config: { type: 'default', langs: ['cpp'] }, content: { en: 'body' } },
  tdoc: undefined,
  UserContext: { _id: 1 },
  pretestConnUrl: 'ws://x',
  postSubmitUrl: '/s',
  getSubmissionsUrl: '/r',
  contentText: 'body',
  contentLangs: ['en'],
  preferredLang: 'en',
  mode: 'normal' as const,
  problemId: 1,
  onExit: vi.fn(),
};

describe('ScratchpadPanel', () => {
  it('renders both panes', () => {
    render(<ScratchpadPanel {...baseArgs} />);
    expect(screen.getByRole('complementary', { name: /problem statement/i })).toBeInTheDocument();
    expect(screen.getByRole('toolbar')).toBeInTheDocument();
  });

  it('Alt+Q triggers onExit when confirm is accepted', () => {
    const onExit = vi.fn();
    window.confirm = vi.fn(() => true);
    render(<ScratchpadPanel {...baseArgs} onExit={onExit} />);
    fireEvent.keyDown(window, { key: 'q', altKey: true });
    expect(onExit).toHaveBeenCalledOnce();
  });
});
