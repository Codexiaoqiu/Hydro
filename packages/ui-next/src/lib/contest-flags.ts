import type { SerializedTdoc } from '../sections/types';

export const KNOWN_RULES: ReadonlyArray<{ key: string, label: string }> = [
  { key: 'acm', label: 'XCPC' },
  { key: 'oi', label: 'OI' },
  { key: 'ioi', label: 'IOI' },
  { key: 'strictioi', label: 'IOI(Strict)' },
  { key: 'ledo', label: 'Ledo' },
  { key: 'homework', label: '作业' },
];

export function rulesFromTdocs(tdocs: SerializedTdoc[]): typeof KNOWN_RULES {
  if (!tdocs.length) return KNOWN_RULES;
  const present = new Set(tdocs.map((tdoc) => tdoc.rule));
  return KNOWN_RULES.filter((rule) => present.has(rule.key));
}
