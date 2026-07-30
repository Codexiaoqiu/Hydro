/**
 * Rewrite `file://` references inside a markdown source to the public file
 * route. Mirrors ui-default's markdown pre-processing so preview surfaces
 * and the stored problem statement render the same way.
 */
export function rewriteFileReferences(source: string): string {
  return source.replace(/file:\/\/([^\s)]+)/g, '/file/$1');
}
