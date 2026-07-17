/* @vitest-environment happy-dom */
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Article } from './Article';

describe('article', () => {
  it('renders markdown from content prop', () => {
    const { container } = render(<Article content={'# Hello\n\nWorld'} />);
    expect(container.querySelector('h1')?.textContent).toBe('Hello');
    expect(container.querySelector('p')?.textContent).toBe('World');
  });

  it('renders markdown from string children', () => {
    const { container } = render(<Article>{'## Heading\n\ntext'}</Article>);
    expect(container.querySelector('h2')?.textContent).toBe('Heading');
    expect(container.querySelector('p')?.textContent).toBe('text');
  });

  it('passes through ReactNode children as-is', () => {
    const { container } = render(
      <Article><span data-testid="custom">custom</span></Article>,
    );
    expect(container.querySelector('[data-testid="custom"]')?.textContent).toBe('custom');
  });

  it('renders GFM tables via remark-gfm', () => {
    const { container } = render(
      <Article content={'| a | b |\n|---|---|\n| 1 | 2 |'} />,
    );
    expect(container.querySelector('table')).toBeTruthy();
  });

  it('escapes raw HTML (XSS-safe)', () => {
    const { container } = render(<Article content="<script>alert(1)</script>" />);
    expect(container.querySelector('script')).toBeNull();
  });

  it('prefers content prop over children when both are strings', () => {
    const { container } = render(
      <Article content="# From content"># From children</Article>,
    );
    expect(container.querySelector('h1')?.textContent).toBe('From content');
  });

  it('renders fenced code blocks', () => {
    const { container } = render(
      <Article content={'```js\nconsole.log(1)\n```'} />,
    );
    expect(container.querySelector('pre code')?.textContent).toContain('console.log(1)');
  });

  it('renders links', () => {
    const { container } = render(<Article content="[link](https://example.com)" />);
    const a = container.querySelector('a');
    expect(a?.getAttribute('href')).toBe('https://example.com');
    expect(a?.textContent).toBe('link');
  });
});

describe('article — extended plugins', () => {
  it('renders ==mark== as <mark>', () => {
    const { container } = render(<Article content="==highlight==" />);
    expect(container.querySelector('mark')?.textContent).toBe('highlight');
  });

  it('renders KaTeX inline formula', () => {
    const { container } = render(<Article content="$a + b$" />);
    expect(container.querySelector('.katex')).toBeTruthy();
  });

  it('renders fenced code with language class for highlight.js', () => {
    const { container } = render(
      <Article content={'```js\nconst x = 1;\n```'} />,
    );
    const code = container.querySelector('pre code');
    expect(code).toBeTruthy();
  });

  it('extracts sample pair into SamplePair component', () => {
    const md = '## 样例输入\n```\n1 2\n```\n```\n3\n```';
    const { container } = render(<Article content={md} />);
    expect(container.textContent).toContain('1 2');
    expect(container.textContent).toContain('3');
  });
});
