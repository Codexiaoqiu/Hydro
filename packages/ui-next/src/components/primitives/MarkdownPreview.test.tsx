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

  it('rewrites file references to encoded /file paths', () => {
    render(<MarkdownPreview source="![](file://missing%20image.png)" />);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByTestId('markdown-preview').querySelector('img')?.getAttribute('src')).toBe('/file/missing%20image.png');
  });

  it('marks an image as broken when it fails to load', () => {
    render(<MarkdownPreview source="![](missing.zip)" />);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    const image = screen.getByTestId('markdown-preview').querySelector('img') as HTMLImageElement;

    image.dispatchEvent(new Event('error'));

    expect(image.className).toContain('broken');
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
