import { describe, expect, it } from 'vitest';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { remarkImageSize } from './remarkImageSize';

function process(md: string): string {
  return unified()
    .use(remarkParse)
    .use(remarkImageSize)
    .use(remarkStringify)
    .processSync(md)
    .toString();
}

describe('remarkImageSize', () => {
  it('parses =100x100 width x height', () => {
    const result = process('![alt](image.png =100x100)');
    expect(result).toContain('width="100"');
    expect(result).toContain('height="100"');
  });

  it('parses =200x width only', () => {
    const result = process('![alt](image.png =200x)');
    expect(result).toContain('width="200"');
    expect(result).not.toContain('height=');
  });

  it('parses =x100 height only', () => {
    const result = process('![alt](image.png =x100)');
    expect(result).toContain('height="100"');
    expect(result).not.toContain('width=');
  });

  it('leaves image unchanged when no size suffix', () => {
    const result = process('![alt](image.png)');
    expect(result).not.toContain('width=');
    expect(result).not.toContain('height=');
  });

  it('falls back to original url when size spec is invalid', () => {
    const result = process('![alt](image.png =abc)');
    expect(result).toContain('image.png');
    expect(result).not.toContain('width=');
  });
});
