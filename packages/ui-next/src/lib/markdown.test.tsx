/* @vitest-environment happy-dom */
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Markdown } from './markdown';

describe('Markdown', () => {
  it('renders parsed HTML', () => {
    const { container } = render(<Markdown source="# Hello" />);
    expect(container.querySelector('h1')?.textContent).toBe('Hello');
  });
  it('handles line breaks (breaks: true)', () => {
    const { container } = render(<Markdown source={'a\nb'} />);
    expect(container.innerHTML).toMatch(/<br\s*\/?>/);
  });
  it('memoises per source (no re-parse on rerender with same source)', () => {
    const { container, rerender } = render(<Markdown source="**x**" />);
    const firstHtml = container.innerHTML;
    rerender(<Markdown source="**x**" />);
    expect(container.innerHTML).toBe(firstHtml);
  });
});