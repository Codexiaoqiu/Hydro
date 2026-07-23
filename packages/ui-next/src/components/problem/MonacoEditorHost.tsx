import Editor from '@monaco-editor/react';
import type { OnChange } from '@monaco-editor/react';
import { useEffect, useMemo, useRef } from 'react';
import { validateProblemConfigYaml } from '../../lib/yaml-config';

// Real Monaco editor host. Lazy-loaded by `ProblemConfigEditor` so that the
// heavyweight `monaco-editor` bundle is only pulled in on the actual config
// page (not on the SSR pass or on happy-dom test runs).

export interface MonacoEditorHostProps {
  value: string;
  onChange: (nextYaml: string) => void;
  height?: number;
  /** Debounce interval for forwarding onChange. Default 300ms. */
  debounceMs?: number;
}

export function MonacoEditorHost({
  value,
  onChange,
  height = 400,
  debounceMs = 300,
}: MonacoEditorHostProps) {
  const debouncedRef = useRef<number | null>(null);
  const lastEmittedRef = useRef<string>(value);
  const handleChange: OnChange = (next) => {
    if (next === undefined) return;
    if (next === lastEmittedRef.current) return;
    if (debouncedRef.current !== null) window.clearTimeout(debouncedRef.current);
    debouncedRef.current = window.setTimeout(() => {
      lastEmittedRef.current = next;
      onChange(next);
    }, debounceMs);
  };

  useEffect(() => () => {
    if (debouncedRef.current !== null) window.clearTimeout(debouncedRef.current);
  }, []);

  // Markers updated whenever the value changes. We surface real validation
  // errors from the same AJV schema that the page uses, so editors see
  // errors inline (rather than only in the page-level error list).
  const handleMount = useMemo(
    () => (editor: import('monaco-editor').editor.IStandaloneCodeEditor, monaco: typeof import('monaco-editor')) => {
      const model = editor.getModel();
      if (!model) return;
      const update = (raw: string) => {
        let parsed: unknown = null;
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const jsyaml = require('js-yaml');
          parsed = jsyaml.load(raw);
        } catch {
          monaco.editor.setModelMarkers(model, 'hydro-config', [{
            severity: monaco.MarkerSeverity.Error,
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 1,
            message: 'YAML parse error',
          }]);
          return;
        }
        const result = validateProblemConfigYaml(parsed);
        if (result.ok) {
          monaco.editor.setModelMarkers(model, 'hydro-config', []);
          return;
        }
        const markers = (result.errors ?? []).map((err) => ({
          severity: monaco.MarkerSeverity.Error,
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: 1,
          endColumn: 1,
          message: `${err.instancePath || '/'} ${err.message ?? ''}`.trim(),
        }));
        monaco.editor.setModelMarkers(model, 'hydro-config', markers);
      };
      update(model.getValue());
      model.onDidChangeContent(() => update(model.getValue()));
    },
    [],
  );

  return (
    <Editor
      height={height}
      language="yaml"
      theme="vs-dark"
      value={value}
      onChange={handleChange}
      onMount={handleMount}
      options={{
        minimap: { enabled: false },
        fontSize: 13,
        wordWrap: 'on',
        scrollBeyondLastLine: false,
      }}
      loading={<div style={{ padding: 'var(--space-4)', color: 'var(--text-mute)' }}>Loading editor…</div>}
    />
  );
}
