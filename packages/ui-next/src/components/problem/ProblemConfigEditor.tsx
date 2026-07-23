import type { ReactNode } from 'react';
import { lazy, Suspense } from 'react';
import { parseProblemConfigYaml } from '../../lib/yaml-config';
import styles from './ProblemConfigEditor.module.css';

// Lazy wrapper that accept a host component as children: by exporting a
// wrapper component instead of the bare Monaco `Editor`, we can let the
// parent compose the inner implementation via children. React.lazy()
// requires a module with `default` export, so the host lives in its own
// file (this matches the prior pass-through layout).
const MonacoWrapper = lazy(() =>
  import('./MonacoEditorHost').then((m) => ({ default: m.MonacoEditorHost })),
);

export interface ProblemConfigEditorProps {
  value: string;
  onChange: (nextYaml: string, parsed: ReturnType<typeof parseProblemConfigYaml>) => void;
  height?: number;
}

function FallbackTextarea({ value, onChange, height }: ProblemConfigEditorProps) {
  return (
    <textarea
      className={styles.textarea}
      value={value}
      style={{ height: height ?? 400 }}
      onChange={(e) => {
        const v = e.target.value;
        onChange(v, parseProblemConfigYaml(v));
      }}
      spellCheck={false}
    />
  );
}

export function ProblemConfigEditor(props: ProblemConfigEditorProps) {
  // SSR: happy-dom / vitest always render the textarea fallback. The
  // fallback forwards `parseProblemConfigYaml` so any test that types into
  // it still exercises the validation pipeline.
  if (typeof window === 'undefined') return <FallbackTextarea {...props} />;
  return (
    <Suspense fallback={<FallbackTextarea {...props} />}>
      <MonacoWrapper
        value={props.value}
        onChange={(next) => props.onChange(next, parseProblemConfigYaml(next))}
        height={props.height}
      />
    </Suspense>
  );
}
