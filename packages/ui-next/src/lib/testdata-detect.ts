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
 *
 * I-6: prefer the server's `readSubtasksFromFiles` (with a minimal config)
 * so the heuristic stays aligned with what the judge will see at runtime.
 * The client-side fallback is only used when the @hydrooj/common module is
 * unavailable in the bundle.
 */
export function detectSubtasks(files: string[]): DetectedSubtask[] {
  // Try to use @hydrooj/common::readSubtasksFromFiles when available; the
  // server's signature is `(files, config)` so we pass a minimal config.
  let readSubtasksFromFiles: ((files: string[], cfg: unknown) => unknown) | null = null;
  let normalizeSubtasks: ((raw: unknown, check: (n: string) => string, t?: string, m?: string) => { subtasks: unknown[] }) | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const subtask = require('@hydrooj/common/subtask');
    if (typeof subtask.readSubtasksFromFiles === 'function') {
      readSubtasksFromFiles = subtask.readSubtasksFromFiles;
    }
    if (typeof subtask.normalizeSubtasks === 'function') {
      normalizeSubtasks = subtask.normalizeSubtasks;
    }
  } catch {
    // Fall through to client-side heuristic.
  }

  if (readSubtasksFromFiles && normalizeSubtasks) {
    try {
      const raw = readSubtasksFromFiles(files, {}) as unknown[];
      // checkFile is the server's file-existence check; the client doesn't
      // touch the filesystem, so a permissive identity function is fine.
      const normalized = normalizeSubtasks(raw, (n: string) => n, '1000ms', '256m');
      const subtasks = normalized.subtasks;
      if (Array.isArray(subtasks) && subtasks.length > 0) {
        return subtasks.map((s: any, idx: number) => ({
          id: idx + 1,
          cases: Array.isArray(s.cases)
            ? s.cases.map((c: any) => ({ input: String(c.input ?? ''), output: String(c.output ?? '') }))
            : [],
          score: typeof s.score === 'number' ? s.score : DEFAULT_SCORE,
        }));
      }
    } catch {
      // fall through to client-side
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

    // Skip output files — their input pair will be added when the input file is processed
    if (!isInput) continue;

    // Determine the matching output extension for this input file's extension
    let outExt = '';
    for (const e of inputExts) {
      if (lower.endsWith(e)) {
        // Find the corresponding output extension at the same index in outputExts (or first match)
        const idx = inputExts.indexOf(e);
        outExt = outputExts[idx] ?? outputExts[0];
        break;
      }
    }
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