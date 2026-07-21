import type { OnMount } from '@monaco-editor/react';
import { lazy, Suspense, useEffect, useState } from 'react';
import styles from './CodeEditor.module.css';

const MonacoEditor = lazy(() =>
  import('@monaco-editor/react').then((m) => ({ default: m.Editor })),
);

export interface CodeEditorProps {
  value: string;
  onChange: (val: string) => void;
  language: string;
  height?: number;
  'aria-label'?: string;
}

function readScheme(): 'light' | 'dark' {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function CodeEditor({
  value, onChange, language, height = 360, ...rest
}: CodeEditorProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => readScheme());

  useEffect(() => {
    const onThemeChange = () => setTheme(readScheme());
    window.addEventListener('hydro:theme-change', onThemeChange);
    return () => window.removeEventListener('hydro:theme-change', onThemeChange);
  }, []);

  const handleMount: OnMount = (_editor, _monaco) => {
    // No image upload; pure code editor. Hook left for future extensions.
  };

  return (
    <div
      className={styles.root}
      style={{ height }}
      aria-label={rest['aria-label']}
      data-testid="code-editor"
    >
      <Suspense fallback={
        <textarea
          className={styles.fallback}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          wrap="off"
          aria-label={rest['aria-label']}
        />
      }>
        <div className={styles.editor}>
          <MonacoEditor
            height="100%"
            language={language}
            value={value}
            onChange={(v) => onChange(v ?? '')}
            onMount={handleMount}
            theme={theme === 'dark' ? 'vs-dark' : 'light'}
            options={{
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              minimap: { enabled: false },
              wordWrap: 'off',
            }}
          />
        </div>
      </Suspense>
    </div>
  );
}

export default CodeEditor;