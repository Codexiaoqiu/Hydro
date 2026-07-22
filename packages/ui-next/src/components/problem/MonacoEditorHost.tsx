import type { ReactNode } from 'react';

// Monaco editor host. The actual `@monaco-editor/react` integration is
// stubbed while we wire up the surrounding UI; this file exists so the
// lazy() loader in `ProblemConfigEditor` can resolve a wrapper component
// that accepts `children` and passes them through unchanged.
export function MonacoEditorHost({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}