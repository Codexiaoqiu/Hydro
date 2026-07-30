/**
 * Rewrite `(file://...)` references inside a contest's prose to the public
 * storage path (`{docId}/file/public/...`). Mirrors ui-default's
 * `components/contest/contestDescription.html` macro expansion so descriptions
 * authored as `See (file://diagram.png)` render against the contest's file
 * namespace instead of the bare `file://` scheme.
 */
export function rewriteContent(raw: string, docId: string): string {
  return raw
    .replace(/\(file:\/\//g, `(${docId}/file/public/`)
    .replace(/="file:\/\//g, `="${docId}/file/public/`);
}
