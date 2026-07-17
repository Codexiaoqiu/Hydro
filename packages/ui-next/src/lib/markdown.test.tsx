/* @vitest-environment happy-dom */
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Markdown } from './markdown';

describe('markdown', () => {
  it('renders headings', () => {
    const { container } = render(<Markdown source="# Hello" />);
    expect(container.querySelector('h1')?.textContent).toBe('Hello');
  });
  it('renders bold via markdown (no reparse on rerender)', () => {
    const { container, rerender } = render(<Markdown source="**x**" />);
    const firstHtml = container.innerHTML;
    rerender(<Markdown source="**x**" />);
    expect(container.innerHTML).toBe(firstHtml);
    expect(container.querySelector('strong')?.textContent).toBe('x');
  });
  it('escapes raw HTML rather than injecting it', () => {
    const { container } = render(
      <Markdown source={'<script>window.__pwn=1</script>\n\nsafe text'} />,
    );
    // react-markdown escapes raw HTML, so no <script> element is created and
    // the literal text is rendered as text content.
    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).toContain('<script>window.__pwn=1</script>');
    expect(container.textContent).toContain('safe text');
  });
  it('renders GFM tables (remark-gfm enabled)', () => {
    const source = '| a | b |\n|---|---|\n| 1 | 2 |';
    const { container } = render(<Markdown source={source} />);
    expect(container.querySelector('table')).not.toBeNull();
    expect(container.querySelectorAll('td').length).toBe(2);
  });
});
