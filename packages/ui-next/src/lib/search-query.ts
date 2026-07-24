export interface SearchQuery {
  category?: string;
  difficulty?: string;
  namespace?: string;
  text?: string;
}

const FILTER_RE = /(^|\s)(category|difficulty|namespace):(?:"((?:\\.|[^"])*)"|'((?:\\.|[^'])*)'|([^\s]+))/g;

function unescape(value: string): string {
  return value.replace(/\\([\\"'])/g, '$1');
}

function quoteFilterValue(value: string): string {
  return /\s/.test(value) ? `"${value.replace(/[\\"]/g, '\\$&')}"` : value;
}

export function parseSearchQuery(query: string): SearchQuery {
  const result: SearchQuery = {};
  const text = query.replace(FILTER_RE, (_match, _space, key: keyof SearchQuery, doubleQuoted?: string, singleQuoted?: string, bare?: string) => {
    result[key] = unescape(doubleQuoted ?? singleQuoted ?? bare ?? '');
    return '';
  }).replace(/\s+/g, ' ').trim();
  if (text) result.text = text;
  return result;
}

export function stringifySearchQuery(query: SearchQuery): string {
  const filters = (['category', 'difficulty', 'namespace'] as const)
    .filter((key) => query[key])
    .map((key) => `${key}:${quoteFilterValue(query[key]!)}`);
  if (query.text?.trim()) filters.push(query.text.trim());
  return filters.join(' ');
}
