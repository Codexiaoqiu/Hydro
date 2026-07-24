import type { OnMount } from '@monaco-editor/react';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import styles from './MarkdownEditor.module.css';
import { MarkdownPreview } from './MarkdownPreview';

const MonacoEditor = lazy(() =>
  import('@monaco-editor/react').then((m) => ({ default: m.Editor })),
);

export interface MarkdownEditorProps {
  value: string;
  language?: 'markdown' | string;
  onChange: (val: string) => void;
  onUpload?: (files: File[]) => Promise<string[]>;
  onSubmit?: () => void;
  height?: number | string;
  'aria-label'?: string;
}

function readScheme(): 'light' | 'dark' {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function MarkdownEditor({
  value, language = 'markdown', onChange, onUpload, onSubmit, height = 360, ...rest
}: MarkdownEditorProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => readScheme());
  const onSubmitRef = useRef(onSubmit);
  const onUploadRef = useRef(onUpload);
  onSubmitRef.current = onSubmit;
  onUploadRef.current = onUpload;

  useEffect(() => {
    const onThemeChange = () => setTheme(readScheme());
    window.addEventListener('hydro:theme-change', onThemeChange);
    return () => window.removeEventListener('hydro:theme-change', onThemeChange);
  }, []);

  const handleMount: OnMount = (editor, monaco) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => onSubmitRef.current?.());

    const uploadPastedFiles = async (files: File[]) => {
      const upload = onUploadRef.current;
      if (!upload) return;
      const supported = files.filter((file) => file.type.startsWith('image/') || file.type === 'application/zip');
      if (!supported.length) return;
      const urls = await upload(supported);
      const markdown = urls.map((url, index) => (
        supported[index]?.type.startsWith('image/')
          ? `![](${url})`
          : `[${supported[index]?.name || 'file.zip'}](${url})`
      )).join('\n');
      if (markdown) editor.trigger('keyboard', 'type', { text: markdown });
    };

    editor.onDidPaste((event) => {
      const clipboardData = event.clipboardEvent?.clipboardData;
      if (clipboardData?.files.length) void uploadPastedFiles(Array.from(clipboardData.files));
    });

    if (onUpload) {
      editor.addAction({
        id: 'hydro.upload-image',
        label: 'Upload Image',
        contextMenuGroupId: 'hydro',
        run: async () => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.multiple = true;
          input.onchange = async () => {
            const upload = onUploadRef.current;
            if (!input.files?.length || !upload) return;
            const urls = await upload(Array.from(input.files));
            editor.trigger('keyboard', 'type', { text: urls.map((u) => `![](${u})`).join('\n') });
          };
          input.click();
        },
      });
    }
  };

  return (
    <div className={styles.root} style={{ height }} aria-label={rest['aria-label']}>
      <div className={styles.pane}>
        <Suspense fallback={<textarea className={styles.fallback} value={value} onChange={(e) => onChange(e.target.value)} />}>
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
              wordWrap: 'on',
            }}
          />
        </Suspense>
      </div>
      <div className={styles.previewPane}>
        {/* key={value} forces remount on language switch (parent passes a new
            content slice), flushing the preview immediately instead of
            waiting for the 150ms debounce. */}
        <MarkdownPreview key={value} source={value} />
      </div>
    </div>
  );
}
