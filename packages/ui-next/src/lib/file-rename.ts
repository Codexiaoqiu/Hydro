export interface RenameChange {
  oldName: string;
  newName: string;
}

export interface RenamePreview {
  changes: RenameChange[];
  duplicates: string[];
  collisions: string[];
  invalid: Array<{ name: string; reason: string }>;
  /** Set when the find pattern is not a valid RegExp; changes is left empty. */
  error?: string;
}

export interface RenameOptions {
  prefix?: string;
  suffix?: string;
  /** RegExp source applied to the original name before prefix/suffix. */
  find?: string;
  /** Replacement string (supports `$1` capture-group references). */
  replace?: string;
  /** RegExp flags for `find` (e.g. `g`, `i`). */
  flags?: string;
}

const EMPTY: Omit<RenamePreview, 'error'> = { changes: [], duplicates: [], collisions: [], invalid: [] };

function applyOne(name: string, options: RenameOptions, re: RegExp | null): string {
  let result = name;
  if (re) result = result.replace(re, options.replace ?? '');
  return `${options.prefix ?? ''}${result}${options.suffix ?? ''}`;
}

/**
 * Pure preview of a batch rename. Never performs I/O — the caller decides
 * whether to submit based on the returned `error`, `invalid`, `duplicates`
 * and `collisions`.
 *
 * @param selected names selected for renaming
 * @param options prefix / suffix / RegExp find-replace
 * @param existing full list of file names in scope, used to detect collisions
 *   with files that are not themselves being renamed. Defaults to `selected`.
 */
export function previewRename(
  selected: string[],
  options: RenameOptions = {},
  existing: string[] = selected,
): RenamePreview {
  let re: RegExp | null = null;
  if (options.find) {
    try {
      re = new RegExp(options.find, options.flags);
    } catch (e) {
      return { ...EMPTY, error: (e as Error).message };
    }
  }

  const changes: RenameChange[] = [];
  const invalid: Array<{ name: string; reason: string }> = [];
  const newNames: string[] = [];

  for (const oldName of selected) {
    const newName = applyOne(oldName, options, re);
    if (newName === '') {
      invalid.push({ name: oldName, reason: 'Resulting name is empty.' });
      continue;
    }
    if (newName.includes('/')) {
      invalid.push({ name: oldName, reason: 'Resulting name may not contain "/".' });
      continue;
    }
    newNames.push(newName);
    if (newName !== oldName) changes.push({ oldName, newName });
  }

  // Duplicates: two selected names produce the same result.
  const counts = new Map<string, number>();
  for (const n of newNames) counts.set(n, (counts.get(n) ?? 0) + 1);
  const duplicates = [...counts.entries()].filter(([, c]) => c > 1).map(([n]) => n);

  // Collisions: a produced name matches an existing file that is not itself
  // being renamed away.
  const selectedSet = new Set(selected);
  const existingSet = new Set(existing);
  const collisions: string[] = [];
  const seen = new Set<string>();
  for (const { newName } of changes) {
    if (seen.has(newName)) continue;
    if (existingSet.has(newName) && !selectedSet.has(newName)) {
      collisions.push(newName);
      seen.add(newName);
    }
  }

  return { changes, duplicates, collisions, invalid };
}
