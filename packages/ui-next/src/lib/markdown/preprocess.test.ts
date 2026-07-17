import { describe, expect, it } from 'vitest';
import { preprocessContent } from './preprocess';

describe('preprocessContent', () => {
  it('returns pure markdown when no sample anchor is found', () => {
    const md = '# Title\n\nThis is a problem description.';
    const blocks = preprocessContent(md);
    expect(blocks).toEqual([{ type: 'markdown', body: md }]);
  });

  it('splits Chinese single sample pair', () => {
    const md = [
      '# 题目描述',
      '',
      '计算 a + b。',
      '',
      '## 样例输入',
      '',
      '```',
      '1 2',
      '```',
      '',
      '```',
      '3',
      '```',
    ].join('\n');
    const blocks = preprocessContent(md);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toEqual({ type: 'markdown', body: '# 题目描述\n\n计算 a + b。' });
    expect(blocks[1]).toMatchObject({
      type: 'samples',
      pairs: [{ num: 1, input: '1 2', output: '3' }],
    });
  });

  it('splits English sample pair', () => {
    const md = [
      '## Sample Input/Output',
      '',
      '```',
      '1 2',
      '```',
      '',
      '```',
      '3',
      '```',
    ].join('\n');
    const blocks = preprocessContent(md);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].type).toBe('markdown');
    expect(blocks[1]).toMatchObject({ type: 'samples', pairs: [{ num: 1 }] });
  });

  it('splits Japanese sample pair', () => {
    const md = [
      '## サンプル入力',
      '',
      '```',
      '1 2',
      '```',
      '',
      '```',
      '3',
      '```',
    ].join('\n');
    const blocks = preprocessContent(md);
    expect(blocks[1]).toMatchObject({ type: 'samples' });
  });

  it('splits multiple sample pairs with sequential numbering', () => {
    const md = [
      '## 样例输入',
      '',
      '```',
      '1 2',
      '```',
      '```',
      '3',
      '```',
      '## 数据范围',
      'small',
      '## 样例输入',
      '```',
      '4 5',
      '```',
      '```',
      '9',
      '```',
    ].join('\n');
    const blocks = preprocessContent(md);
    const samples = blocks.filter((b) => b.type === 'samples');
    expect(samples).toHaveLength(2);
    if (samples[0].type === 'samples') {
      expect(samples[0].pairs[0].num).toBe(1);
      expect(samples[0].pairs[0].input).toBe('1 2');
    }
    if (samples[1].type === 'samples') {
      expect(samples[1].pairs[0].num).toBe(2);
      expect(samples[1].pairs[0].input).toBe('4 5');
    }
  });

  it('falls back to markdown when anchor matches but no fenced code follows', () => {
    const md = '# Title\n\n## 样例输入\n\nno code here\n';
    const blocks = preprocessContent(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('markdown');
  });

  it('keeps content after sample block as next markdown block', () => {
    const md = [
      '## 样例输入',
      '```',
      '1',
      '```',
      '```',
      '2',
      '```',
      '## 数据范围',
      'small',
    ].join('\n');
    const blocks = preprocessContent(md);
    expect(blocks).toHaveLength(3);
    expect(blocks[2]).toMatchObject({ type: 'markdown', body: '## 数据范围\n\nsmall' });
  });
});
