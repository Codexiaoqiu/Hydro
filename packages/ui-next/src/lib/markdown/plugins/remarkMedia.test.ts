// remarkMedia.test.ts
import { describe, expect, it } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { remarkMedia } from './remarkMedia';

function process(md: string): string {
  return unified()
    .use(remarkParse)
    .use(remarkMedia)
    .use(remarkStringify)
    .processSync(md)
    .toString();
}

describe('remarkMedia', () => {
  it('handles @[youtube](url)', () => {
    const result = process('Watch @[youtube](https://youtube.com/watch?v=abc) here');
    expect(result).toContain('https://youtube.com/watch?v=abc');
    expect(result).toContain('youtube');
  });

  it('handles @[bilibili](url)', () => {
    const result = process('See @[bilibili](https://bilibili.com/video/av123)');
    expect(result).toContain('https://bilibili.com/video/av123');
  });

  it('handles @[pdf](url)', () => {
    const result = process('Read @[pdf](https://example.com/doc.pdf)');
    expect(result).toContain('https://example.com/doc.pdf');
    expect(result).toContain('pdf');
  });

  it('handles @[vimeo](url)', () => {
    const result = process('@[vimeo](https://vimeo.com/123)');
    expect(result).toContain('https://vimeo.com/123');
  });

  it('does not modify regular links', () => {
    const result = process('[normal](https://example.com)');
    expect(result).toContain('https://example.com');
    expect(result).not.toContain('data-media=');
  });

  it('does not modify email addresses', () => {
    const result = process('email@example.com');
    expect(result).toContain('email@example.com');
  });
});
