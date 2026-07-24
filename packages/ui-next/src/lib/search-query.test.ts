import { describe, expect, it } from 'vitest';
import { parseSearchQuery, stringifySearchQuery } from './search-query';

describe('parseSearchQuery', () => {
  it('splits supported keyword filters from free text', () => {
    expect(parseSearchQuery('category:dp difficulty:3 namespace:system shortest path')).toEqual({
      category: 'dp',
      difficulty: '3',
      namespace: 'system',
      text: 'shortest path',
    });
  });

  it('supports quoted filter values and leaves unknown filters in free text', () => {
    expect(parseSearchQuery('category:"dynamic programming" owner:alice knapsack')).toEqual({
      category: 'dynamic programming',
      text: 'owner:alice knapsack',
    });
  });

  it('returns an empty object for blank input', () => {
    expect(parseSearchQuery('   ')).toEqual({});
  });
});

describe('stringifySearchQuery', () => {
  it('quotes whitespace in filter values so category chip queries remain valid', () => {
    expect(stringifySearchQuery({ category: 'dynamic programming', text: 'knapsack' }))
      .toBe('category:"dynamic programming" knapsack');
  });
});
