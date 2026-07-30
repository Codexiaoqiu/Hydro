/** Cap the printable content to 300 lines of 100 columns, matching ui-default. */
export const MAX_LINES = 300;
export const MAX_LINE_WIDTH = 100;

/**
 * Truncate content so that the highlight pipeline never produces an
 * unbounded printable payload. Mirrors `pages/contest_print.page.tsx` in
 * ui-default so a 30 MB source file still fits in the kiosk print window.
 */
export function truncatePrintContent(content: string): string {
  const finalContent: string[] = [];
  let cnt = 0;
  for (const line of content.split('\n')) {
    cnt += Math.ceil(line.length / MAX_LINE_WIDTH);
    if (cnt > MAX_LINES) break;
    finalContent.push(line);
  }
  return finalContent.join('\n');
}
