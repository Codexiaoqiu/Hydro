const NAMES: Record<number, string> = {
  1: 'Accepted',
  2: 'Wrong Answer',
  3: 'Time Limit Exceeded',
  4: 'Memory Limit Exceeded',
  5: 'Runtime Error',
  6: 'Compile Error',
  7: 'System Error',
  8: 'Output Limit Exceeded',
};

export function statusText(status: number): string {
  return NAMES[status] ?? `Status ${status}`;
}
