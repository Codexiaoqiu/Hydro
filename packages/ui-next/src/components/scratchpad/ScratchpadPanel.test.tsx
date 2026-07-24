import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ScratchpadPanel } from './ScratchpadPanel';

vi.mock('react-resizable-panels', () => ({
  Group: ({ children, defaultLayout, onLayoutChanged }: {
    children: ReactNode;
    defaultLayout?: Record<string, number>;
    onLayoutChanged?: (layout: Record<string, number>, meta: { isUserInteraction: boolean }) => void;
  }) => (
    <div data-testid="scratchpad-split" data-layout={JSON.stringify(defaultLayout)}>
      {children}
      <button
        type="button"
        onClick={() => onLayoutChanged?.({ problem: 38, editor: 62 }, { isUserInteraction: true })}
      >
        Resize panes
      </button>
    </div>
  ),
  Panel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Separator: () => <div role="separator" />,
}));

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

beforeEach(() => {
  window.localStorage.clear();
});

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

  it('renders a draggable separator between problem and editor panes', () => {
    render(<ScratchpadPanel {...baseArgs} />);
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });

  it('restores and persists the pane layout', () => {
    window.localStorage.setItem('scratchpad/layout', JSON.stringify({ problem: 45, editor: 55 }));
    render(<ScratchpadPanel {...baseArgs} />);
    expect(screen.getByTestId('scratchpad-split')).toHaveAttribute(
      'data-layout',
      JSON.stringify({ problem: 45, editor: 55 }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Resize panes' }));
    expect(window.localStorage.getItem('scratchpad/layout')).toBe(
      JSON.stringify({ problem: 38, editor: 62 }),
    );
  });
});
