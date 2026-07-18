/* @vitest-environment happy-dom */
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MarkdownPreview } from './MarkdownPreview';

describe('markdownPreview', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders placeholder for empty source', () => {
    render(<MarkdownPreview source="" />);
    expect(screen.getByTestId('markdown-preview-placeholder')).toBeTruthy();
  });

  it('renders headings after debounce window', () => {
    render(<MarkdownPreview source="# Hello" />);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByRole('heading', { level: 1, name: 'Hello' })).toBeTruthy();
  });

  it('debounces rapid source updates to one render', () => {
    const { rerender } = render(<MarkdownPreview source="# A" />);
    rerender(<MarkdownPreview source="# B" />);
    rerender(<MarkdownPreview source="# C" />);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByRole('heading', { level: 1, name: 'C' })).toBeTruthy();
  });

  it('renders GFM tables', () => {
    render(<MarkdownPreview source={'| a | b |\n|---|---|\n| 1 | 2 |'} />);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByRole('table')).toBeTruthy();
  });

  it('does not crash on very long input', () => {
    const longInput = '# '.repeat(50000);
    expect(() => {
      render(<MarkdownPreview source={longInput} />);
      act(() => {
        vi.advanceTimersByTime(200);
      });
    }).not.toThrow();
  });
});
