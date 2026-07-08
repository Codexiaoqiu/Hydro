const RULE_TEXT: Record<string, string> = {
  acm: 'XCPC',
  oi: 'OI',
  ioi: 'IOI',
  strictioi: 'IOI(Strict)',
  ledo: 'Ledo',
  homework: '作业',
};

/** Human-readable label for a contest/homework rule code. Unknown codes pass through. */
export function ruleText(rule: string): string {
  return RULE_TEXT[rule] ?? rule;
}