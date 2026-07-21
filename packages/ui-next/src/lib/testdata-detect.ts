export interface DetectedSubtask {
  id: number;
  cases: { input: string; output: string }[];
  score: number;
}

const DEFAULT_SCORE = 10;

/**
 * Client-side fallback detection when @hydrooj/common::subtask exports
 * don't match the expected signatures.
 *
 * Detects two naming conventions:
 *   - Plain:     1.in / 1.out / 2.in / 2.out  → single subtask, all cases
 *   - Subtask-Case: 1-1.in / 1-1.out / 1-2.in / 1-2.out / 2-1.in / 2-1.out
 *                  → grouped by subtask number (first segment)
 */
export function detectSubtasks(files: string[]): DetectedSubtask[] {
  // Try to use @hydrooj/common if signatures match
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let readSubtasksFromFiles: any;
  let normalizeSubtasks: any;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const subtask = require('@hydrooj/common/subtask');
    readSubtasksFromFiles = subtask.readSubtasksFromFiles;
    normalizeSubtasks = subtask.normalizeSubtasks;
  } catch {
    readSubtasksFromFiles = null;
    normalizeSubtasks = null;
  }

  if (
    readSubtasksFromFiles
    && normalizeSubtasks
    && typeof readSubtasksFromFiles === 'function'
    && typeof normalizeSubtasks === 'function'
  ) {
    // Check expected signatures: readSubtasksFromFiles(files) -> no config param
    const sig = readSubtasksFromFiles.toString();
    // If signature includes 'config' or second param, fall back to client-side
    if (!sig.includes('config')) {
      try {
        const raw = readSubtasksFromFiles(files);
        const normalized = normalizeSubtasks(raw, (n: string) => n, '1000ms', '256m');
        return normalized.subtasks.map((s: any, idx: number) => ({
          id: idx + 1,
          cases: s.cases.map((c: any) => ({ input: c.input, output: c.output })),
          score: s.score ?? DEFAULT_SCORE,
        }));
      } catch {
        // fall through to client-side
      }
    }
  }

  // Client-side fallback
  return clientSideDetect(files);
}

function clientSideDetect(files: string[]): DetectedSubtask[] {
  // Find pairs using the same heuristics as @hydrooj/common/subtask.ts
  const inputExts = ['.in', '.IN', '.txt', '.TXT', '.in.txt', '.IN.TXT'];
  const outputExts = ['.out', '.OUT', '.ans', '.ANS', '.out.txt', '.OUT.TXT'];

  const cases: { input: string; output: string; subtaskId: number }[] = [];

  for (const file of files) {
    const lower = file.toLowerCase();
    const isInput = inputExts.some((e) => lower.endsWith(e));

    let base = file;
    let ext = '';

    // Strip extension to find base name
    for (const e of [...inputExts, ...outputExts]) {
      if (lower.endsWith(e)) {
        ext = file.slice(-e.length);
        base = file.slice(0, -e.length);
        break;
      }
    }
    if (!ext) continue;

    // Determine output extension
    const outExt = outputExts.find((e) => e.toLowerCase() === lower.slice(-e.length).toLowerCase());
    if (!outExt) continue;

    const outFile = base + outExt;
    if (!files.includes(outFile)) continue;

    // Determine subtask id from base name
    // Format: [subtask-]case  (e.g. 1-1, 1-2, or just 1)
    const dashIndex = base.indexOf('-');
    let subtaskId = 1;
    if (dashIndex !== -1) {
      const maybeNum = Number(base.slice(0, dashIndex));
      if (Number.isSafeInteger(maybeNum) && maybeNum > 0) {
        subtaskId = maybeNum;
        base = base.slice(dashIndex + 1);
      }
    }

    // Remaining base should be a case number
    const caseNum = Number(base);
    if (!Number.isSafeInteger(caseNum) || caseNum < 1) continue;

    cases.push({ input: file, output: outFile, subtaskId });
  }

  if (cases.length === 0) return [];

  // Group by subtask id
  const bySubtask = new Map<number, typeof cases>();
  for (const c of cases) {
    if (!bySubtask.has(c.subtaskId)) bySubtask.set(c.subtaskId, []);
    bySubtask.get(c.subtaskId)!.push(c);
  }

  // Sort by subtask id, then return
  return Array.from(bySubtask.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, group], idx) => ({
      id: idx + 1,
      cases: group.map((c) => ({ input: c.input, output: c.output })),
      score: DEFAULT_SCORE,
    }));
}
